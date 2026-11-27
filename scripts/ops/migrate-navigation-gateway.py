#!/usr/bin/env python3
"""Owner-operated first migration of the existing hosted gateway.

Run only from a reviewed root-private staging directory. No broker policy,
other service, user account or browser profile is changed. The owner must
pause dispatch and choose a maintenance window before --apply.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import time
import urllib.request

UNIT = "navigation-assistant-gateway.service"
BASE = Path("/opt/operium/releases/navigation-assistant-gateway")
DROP_DIR = Path("/etc/systemd/system") / (UNIT + ".d")
DROP = DROP_DIR / "zz-release.conf"
LOCK = Path("/run/navigation-gateway-migration.lock")
ENTRY = "scripts/ops/navigation-assistant-gateway.js"
NODE = "/usr/bin/node"
HOOKS = ("ExecCondition", "ExecStartPre", "ExecStartPost", "ExecReload",
         "ExecStop", "ExecStopPost", "SupplementaryGroups", "AmbientCapabilities")
PROPS = ("User", "Group", "WorkingDirectory", "ExecStartEx", "DropInPaths",
         "FragmentPath", "MainPID", "ActiveState", "NoNewPrivileges",
         "CapabilityBoundingSet", "Environment", *HOOKS)
HEX40 = re.compile(r"[a-f0-9]{40}")
HEX64 = re.compile(r"[a-f0-9]{64}")
USER = re.compile(r"hosted-[a-z0-9]+")


def require(ok, reason):
    if not ok:
        raise RuntimeError(reason)


def run(*args, timeout=20):
    return subprocess.run(args, check=True, text=True, capture_output=True,
                          timeout=timeout, cwd="/", env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
                                                "LANG": "C"}).stdout


def unit_state():
    output = run("/usr/bin/systemctl", "show", UNIT, "--all",
                 *[arg for p in PROPS for arg in ("-p", p)])
    return dict(line.split("=", 1) for line in output.splitlines() if "=" in line)


def baseline_user(s):
    user = s.get("User", "")
    old = "/home/" + user + "/src/cogentia"
    require(USER.fullmatch(user) and s.get("Group") == user, "unexpected_workspace_identity")
    require(s.get("WorkingDirectory") == old and
            s.get("ExecStartEx", "").startswith(
                "{ path=" + NODE + " ; argv[]=" + NODE + " " + old + "/" + ENTRY + " ; flags= ; ")
            and " ; {" not in s["ExecStartEx"], "unexpected_baseline_entry")
    require(s.get("FragmentPath") == "/etc/systemd/system/" + UNIT and
            not s.get("DropInPaths") and s.get("ActiveState") == "active" and
            s.get("NoNewPrivileges") == "no" and all(not s.get(k) for k in HOOKS),
            "unexpected_baseline_configuration")
    require(s.get("Environment") == "NAV_ASSIST_GATEWAY_PORT=8776 NAV_ASSIST_GATEWAY_INSTANCE=" + user,
            "unexpected_gateway_environment")
    return user


def protected(path, *, directory=True, private=False):
    info = path.lstat()
    return (stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)) and (
        info.st_uid == 0 and not info.st_mode & (0o077 if private else 0o022)
        and path.resolve() == path)


def protected_ancestors(path):
    for p in (path, *path.parents):
        require(protected(p), "unprotected_release_ancestor")


def unpack(archive, dest, revision, expected_hash):
    """Verify the archive before extraction, allow only bounded regular files."""
    require(archive.stat().st_size <= 2_000_000, "archive_size_limit")
    data = archive.read_bytes()
    require(len(data) <= 2_000_000 and hashlib.sha256(data).hexdigest() == expected_hash,
            "archive_digest_mismatch")
    import io
    seen = set()
    total = 0
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as bundle:
        for member in bundle:
            name = PurePosixPath(member.name)
            if name == PurePosixPath(".") and member.isdir():
                continue
            require(not name.is_absolute() and ".." not in name.parts and name not in seen
                    and len(seen) < 256, "invalid_archive_path")
            seen.add(name)
            allowed = str(name) in {"REVISION", "RELEASE.json", "package.json",
                                    "scripts", "scripts/ops", ENTRY, "node_modules",
                                    "node_modules/ws"} or name.parts[:2] == ("node_modules", "ws")
            require(allowed and (member.isdir() or member.isfile()), "unexpected_archive_member")
            target = dest.joinpath(*name.parts)
            if member.isdir():
                target.mkdir(mode=0o755, parents=True, exist_ok=True)
                continue
            total += member.size
            require(total <= 4_000_000, "archive_size_limit")
            target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            with bundle.extractfile(member) as source, target.open("xb") as output:
                shutil.copyfileobj(source, output)
            target.chmod(0o644)
    manifest = json.loads((dest / "RELEASE.json").read_text())
    require(manifest.get("schema") == "cogentia.navigation-gateway-release/v1" and
            manifest.get("revision") == revision and manifest.get("scope") == "gateway-only" and
            manifest.get("deployment") is False and (dest / "REVISION").read_text() == revision + "\n" and
            hashlib.sha256((dest / ENTRY).read_bytes()).hexdigest() == manifest.get("entry_sha256"),
            "release_manifest_mismatch")
    version = manifest["ws"]["version"]
    require(re.fullmatch(r"\d+\.\d+\.\d+", version) and
            json.loads((dest / "node_modules/ws/package.json").read_text())["version"] == version and
            json.loads((dest / "package.json").read_text()) == {
                "private": True, "type": "module", "dependencies": {"ws": version}},
            "release_dependency_mismatch")
    return manifest


def health():
    with urllib.request.urlopen("http://127.0.0.1:8776/health", timeout=3) as response:
        return json.load(response)


# Node 22 includes the WebSocket client; this fixed read-only probe runs under
# the service account, not root, and never imports workspace-owned code.
INVENTORY = """
const socket=new WebSocket('ws://127.0.0.1:8776/assistant');
const timer=setTimeout(()=>process.exit(2),4000);
socket.addEventListener('open',()=>socket.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.instances',params:{}})));
socket.addEventListener('message',e=>{
 const m=JSON.parse(e.data);if(m.id!==1)return;
 if(!Array.isArray(m.result?.browsers)||m.result.browsers.length>1024)process.exit(3);
 console.log(JSON.stringify(m.result));clearTimeout(timer);socket.close();
});
socket.addEventListener('error',()=>process.exit(2));
"""


def inventory(user):
    data = json.loads(run("/usr/sbin/runuser", "-u", user, "--", NODE,
                          "--input-type=module", "-e", INVENTORY, timeout=8))
    ids = [b["browser_instance_id"] for b in data["browsers"]
           if b.get("registered") and isinstance(b.get("browser_instance_id"), str)]
    require(len(ids) == len(set(ids)), "duplicate_registered_instances")
    return {"registered": sorted(ids), "connections": len(data["browsers"]),
            "managed": data.get("managed_provider_registration") == 1}


def listeners():
    mesh = run("/usr/bin/tailscale", "ip", "-4").strip().splitlines()
    require(len(mesh) == 1 and re.fullmatch(r"100\.\d+\.\d+\.\d+", mesh[0]),
            "mesh_address_unconfirmed")
    rows = run("/usr/bin/ss", "-H", "-ltn", "sport", "=", ":8776").splitlines()
    addresses = {row.split()[3] for row in rows if len(row.split()) >= 5}
    require(addresses == {"127.0.0.1:8776", mesh[0] + ":8776"}, "gateway_listener_mismatch")
    return True


def restored(before, after):
    return set(before["registered"]).issubset(after["registered"])


def write_receipt(stage, name, value):
    tmp = stage / (name + ".tmp")
    with os.fdopen(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(tmp, stage / name)
    fd = os.open(stage, os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def verify_live(user, before, release=None):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            s = unit_state()
            pid = int(s.get("MainPID", "0"))
            expected = str(release) if release else "/home/" + user + "/src/cogentia"
            require(pid > 0 and s.get("ActiveState") == "active" and
                    s.get("User") == user and s.get("Group") == user and
                    s.get("WorkingDirectory") == expected and
                    s.get("Environment") == "NAV_ASSIST_GATEWAY_PORT=8776 NAV_ASSIST_GATEWAY_INSTANCE=" + user,
                    "live_unit_mismatch")
            require(Path("/proc", str(pid), "cwd").resolve() == Path(expected), "live_cwd_mismatch")
            require(s.get("ExecStartEx", "").startswith(
                "{ path=" + NODE + " ; argv[]=" + NODE + " " + expected + "/" + ENTRY + " ; flags= ; ")
                and " ; {" not in s["ExecStartEx"] and all(not s.get(k) for k in HOOKS),
                "live_entry_mismatch")
            listeners()
            h = health()
            require(h.get("ok") is True and h.get("instance") == user, "gateway_health_failed")
            after = inventory(user)
            require(restored(before, after), "registered_instances_not_restored")
            if release:
                import pwd
                uid = str(pwd.getpwnam(user).pw_uid)
                status = dict(line.split(":", 1) for line in
                              Path("/proc", str(pid), "status").read_text().splitlines() if ":" in line)
                require(s.get("NoNewPrivileges") == "yes" and not s.get("CapabilityBoundingSet") and
                        s.get("DropInPaths") == str(DROP) and status["Uid"].split() == [uid] * 4 and
                        status["NoNewPrivs"].strip() == "1" and
                        all(re.fullmatch("0+", status[k].strip()) for k in ("CapEff", "CapBnd", "CapAmb")) and
                        h.get("managed_provider_registration") == 1 and after["managed"],
                        "managed_gateway_runtime_unconfirmed")
            else:
                baseline_user(s)
            return {"pid": pid, "inventory": after}
        except (OSError, ValueError, RuntimeError, KeyError, subprocess.SubprocessError):
            time.sleep(2)
    raise RuntimeError("gateway_reconnection_unconfirmed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--apply", action="store_true",
                        help="owner confirms maintenance window and paused agent dispatch")
    args = parser.parse_args()
    os.umask(0o022)
    require(os.geteuid() == 0 and os.uname().nodename.split(".")[0] == "fracta2", "owner_context_required")
    require(HEX40.fullmatch(args.revision) and HEX64.fullmatch(args.sha256), "invalid_release_identity")
    stage = Path(__file__).resolve().parent
    require(protected(stage, private=True) and protected(Path(__file__).resolve(), directory=False),
            "root_private_stage_required")
    protected_ancestors(stage)
    archive = stage / ("navigation-gateway-" + args.revision + ".tar.gz")
    require(protected(archive, directory=False, private=True), "root_private_archive_required")
    user = baseline_user(unit_state())
    before_health_env = "NAV_ASSIST_GATEWAY_PORT=8776 NAV_ASSIST_GATEWAY_INSTANCE=" + user
    listeners()
    before_health = health()
    require(before_health.get("ok") is True and before_health.get("instance") == user,
            "baseline_health_unconfirmed")
    before = inventory(user)
    require(not before["managed"], "baseline_already_managed")
    release = BASE / args.revision
    require(not os.path.lexists(release) and not os.path.lexists(DROP_DIR) and not os.path.lexists(LOCK),
            "existing_migration_state")
    print(json.dumps({"status": "preflight", "revision": args.revision,
                      "registered": len(before["registered"]), "connections": before["connections"],
                      "old_gateway_drain_unobservable": True, "apply": args.apply}), flush=True)
    if not args.apply:
        with tempfile.TemporaryDirectory(dir=stage) as temp:
            unpack(archive, Path(temp), args.revision, args.sha256)
        return
    LOCK.mkdir(mode=0o700)
    changed = False
    installed = False
    restart_attempted = False
    complete = False
    try:
        write_receipt(stage, "migration-before.json", {"revision": args.revision, "inventory": before})
        # Check each ancestor before creating children; never traverse a symlink.
        for d in (BASE.parent, BASE):
            protected_ancestors(d.parent)
            d.mkdir(mode=0o755, exist_ok=True)
            protected_ancestors(d)
        release.mkdir(mode=0o755)
        installed = True
        unpack(archive, release, args.revision, args.sha256)
        protected_ancestors(release)
        # Preserve the service identity, environment and all original unit options.
        config = ("[Service]\nWorkingDirectory=" + str(release) + "\nExecStart=\nExecStart=" +
                  NODE + " " + str(release / ENTRY) +
                  "\nNoNewPrivileges=yes\nCapabilityBoundingSet=\nAmbientCapabilities=\n")
        require(protected(DROP_DIR.parent), "unprotected_systemd_parent")
        # Refuse any unexpected change since the initial baseline check.
        require(baseline_user(unit_state()) == user, "baseline_changed")
        DROP_DIR.mkdir(mode=0o755)
        changed = True
        with DROP.open("x") as f:
            f.write(config)
        DROP.chmod(0o644)
        run("/usr/bin/systemctl", "daemon-reload")
        effective = unit_state()
        require(effective.get("WorkingDirectory") == str(release) and effective.get("User") == user and
                effective.get("Group") == user and effective.get("NoNewPrivileges") == "yes" and
                not effective.get("CapabilityBoundingSet") and effective.get("DropInPaths") == str(DROP) and
                effective.get("ExecStartEx", "").startswith(
                    "{ path=" + NODE + " ; argv[]=" + NODE + " " + str(release / ENTRY) + " ; flags= ; ")
                and " ; {" not in effective["ExecStartEx"] and all(not effective.get(k) for k in HOOKS) and
                effective.get("Environment") == before_health_env,
                "effective_unit_mismatch")
        restart_attempted = True
        run("/usr/bin/systemctl", "restart", UNIT, timeout=40)
        after = verify_live(user, before, release)
        write_receipt(stage, "migration-result.json", {"status": "verified", "revision": args.revision,
                      "archive_sha256": args.sha256, **after})
        complete = True
        print(json.dumps({"status": "verified", "revision": args.revision, "pid": after["pid"],
                          "registered": len(after["inventory"]["registered"]), "release": str(release)}))
    except BaseException:
        if changed:
            try:
                DROP.unlink(missing_ok=True)
                DROP_DIR.rmdir()
                run("/usr/bin/systemctl", "daemon-reload")
                if restart_attempted:
                    run("/usr/bin/systemctl", "restart", UNIT, timeout=40)
                rollback = verify_live(user, before)
                write_receipt(stage, "migration-result.json", {"status": "rolled_back", **rollback})
                complete = True
                print("GATEWAY_MIGRATION_ROLLED_BACK", flush=True)
            except BaseException:
                print("GATEWAY_ROLLBACK_UNVERIFIED_LOCK_RETAINED", flush=True)
        else:
            complete = True
        # Keep any installed candidate for inspection; never delete it on uncertainty.
        if installed:
            print("Candidate release retained:", release, flush=True)
        raise
    finally:
        if complete:
            LOCK.rmdir()


if __name__ == "__main__":
    main()
