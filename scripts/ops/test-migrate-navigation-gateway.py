#!/usr/bin/env python3
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import sys
from types import SimpleNamespace
from contextlib import ExitStack, redirect_stdout
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("migration", Path(__file__).with_name("migrate-navigation-gateway.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.user = "hosted-fixture"
        self.old = "/home/" + self.user + "/src/cogentia"
        self.state = {"User": self.user, "Group": self.user,
                      "WorkingDirectory": self.old,
                      "ExecStartEx": "{ path=/usr/bin/node ; argv[]=/usr/bin/node " + self.old + "/" + m.ENTRY + " ; flags= ; }",
                      "FragmentPath": "/etc/systemd/system/" + m.UNIT,
                      "DropInPaths": "", "ActiveState": "active", "NoNewPrivileges": "no",
                      "Environment": "NAV_ASSIST_GATEWAY_PORT=8776 NAV_ASSIST_GATEWAY_INSTANCE=" + self.user}
        self.rev = "a" * 40

    def test_baseline(self):
        self.assertEqual(m.baseline_user(self.state), self.user)
        for key, value in (("Group", "root"), ("User", "root"), ("DropInPaths", "/tmp/x"),
                           ("ExecStartPre", "unsafe"), ("Environment", "other"),
                           ("ExecStartEx", self.state["ExecStartEx"].replace("flags= ;", "flags= privileged ;"))):
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                m.baseline_user({**self.state, key: value})

    def test_reconnection(self):
        before = {"registered": ["a", "b"], "connections": 10}
        self.assertFalse(m.restored(before, {"registered": ["b", "c"], "connections": 20}))
        self.assertTrue(m.restored(before, {"registered": ["b", "a", "c"], "connections": 3}))

    def test_listener_boundary(self):
        with patch.object(m, "run", side_effect=["100.64.1.2\n", "LISTEN 0 511 127.0.0.1:8776 0.0.0.0:*\nLISTEN 0 511 100.64.1.2:8776 0.0.0.0:*"]):
            self.assertTrue(m.listeners())
        with patch.object(m, "run", side_effect=["100.64.1.2\n", "LISTEN 0 511 0.0.0.0:8776 0.0.0.0:*"]):
            with self.assertRaises(RuntimeError):
                m.listeners()

    def bundle(self, path, extra=None):
        source = b"// fixture"
        files = {m.ENTRY: source, "REVISION": (self.rev + "\n").encode(),
                 "RELEASE.json": json.dumps({"schema": "cogentia.navigation-gateway-release/v1",
                     "revision": self.rev, "scope": "gateway-only", "deployment": False,
                     "entry_sha256": hashlib.sha256(source).hexdigest(), "ws": {"version": "8.21.3"}}).encode(),
                 "package.json": b'{"private":true,"type":"module","dependencies":{"ws":"8.21.3"}}',
                 "node_modules/ws/package.json": b'{"version":"8.21.3"}'}
        with tarfile.open(path, "w:gz") as t:
            for name, data in files.items():
                info = tarfile.TarInfo(name); info.size = len(data)
                t.addfile(info, io.BytesIO(data))
            if extra:
                t.addfile(extra)
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def test_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); archive = root / "release.tar.gz"
            digest = self.bundle(archive)
            target = root / "extract"; target.mkdir()
            self.assertEqual(m.unpack(archive, target, self.rev, digest)["revision"], self.rev)
            with self.assertRaisesRegex(RuntimeError, "archive_digest_mismatch"):
                m.unpack(archive, target, self.rev, "0" * 64)

    def test_reject_archive_escape_and_symlink(self):
        for info in (tarfile.TarInfo("../outside"), tarfile.TarInfo("/absolute"),
                     tarfile.TarInfo("node_modules/ws/link")):
            if info.name.endswith("link"):
                info.type = tarfile.SYMTYPE; info.linkname = "/etc/passwd"
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); target = root / "extract"; target.mkdir()
                archive = root / "release.tar.gz"; digest = self.bundle(archive, info)
                with self.assertRaises(RuntimeError):
                    m.unpack(archive, target, self.rev, digest)
                self.assertFalse((root / "outside").exists())

    def test_transaction_rollback_and_uncertain_lock(self):
        for rollback_ok in (True, False):
            with self.subTest(rollback_ok=rollback_ok), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); stage = root / "stage"; stage.mkdir()
                base = root / "releases" / "gateway"
                drop_dir = root / "unit.d"; drop = drop_dir / "zz-release.conf"
                lock = root / "lock"
                archive = stage / ("navigation-gateway-" + self.rev + ".tar.gz")
                digest = self.bundle(archive)
                release = base / self.rev
                effective = {**self.state, "WorkingDirectory": str(release),
                             "ExecStartEx": "{ path=/usr/bin/node ; argv[]=/usr/bin/node " + str(release / m.ENTRY) + " ; flags= ; }",
                             "DropInPaths": str(drop), "NoNewPrivileges": "yes", "CapabilityBoundingSet": ""}
                calls = []
                before = {"registered": ["a"], "connections": 1, "managed": False}
                rollback = {"pid": 42, "inventory": before}
                previous_umask = os.umask(0o022)
                try:
                    with ExitStack() as stack:
                        for key, val in {"BASE": base, "DROP_DIR": drop_dir, "DROP": drop, "LOCK": lock,
                                         "__file__": str(stage / "installer.py")}.items():
                            stack.enter_context(patch.object(m, key, val))
                        stack.enter_context(patch.object(sys, "argv", ["installer", "--revision", self.rev, "--sha256", digest, "--apply"]))
                        stack.enter_context(patch.object(m.os, "geteuid", return_value=0))
                        stack.enter_context(patch.object(m.os, "uname", return_value=SimpleNamespace(nodename="fracta2")))
                        for name in ("protected", "protected_ancestors", "listeners"):
                            stack.enter_context(patch.object(m, name, return_value=True))
                        stack.enter_context(patch.object(m, "unit_state", side_effect=[self.state, self.state, effective]))
                        stack.enter_context(patch.object(m, "health", return_value={"ok": True, "instance": self.user}))
                        stack.enter_context(patch.object(m, "inventory", return_value=before))
                        stack.enter_context(patch.object(m, "run", side_effect=lambda *a, **k: calls.append(a)))
                        stack.enter_context(patch.object(m, "verify_live", side_effect=[
                            RuntimeError("new_gateway_failed"),
                            rollback if rollback_ok else RuntimeError("rollback_failed")]))
                        stack.enter_context(redirect_stdout(io.StringIO()))
                        with self.assertRaisesRegex(RuntimeError, "new_gateway_failed"):
                            m.main()
                    self.assertFalse(drop_dir.exists())
                    self.assertTrue(release.is_dir())
                    self.assertEqual(sum(c[1] == "restart" for c in calls), 2)
                    self.assertEqual(lock.exists(), not rollback_ok)
                    if rollback_ok:
                        self.assertEqual(json.loads((stage / "migration-result.json").read_text())["status"], "rolled_back")
                finally:
                    os.umask(previous_umask)

    def test_private_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            m.write_receipt(root, "receipt.json", {"status": "verified"})
            self.assertEqual(json.loads((root / "receipt.json").read_text()), {"status": "verified"})
            self.assertEqual((root / "receipt.json").stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
