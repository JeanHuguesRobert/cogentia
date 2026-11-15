#!/usr/bin/env python3
"""Read-only audit of historical checkout content versus canonical Corpus checkouts.

No checkout, fetch, stash operation, mutation of Git refs or remote network access.
The detailed report may contain paths from private repositories: keep it private.
"""
import argparse
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

GENERATED = {
    "llms.txt", "llms-full.txt", "research/corpus-status.md",
    "research/index.md", "research/documents.md",
    "corpus-state.json", "corpus-state.md",
    "current-issues-list.md", "fix-bugs-first-dashboard.json",
    "fix-bugs-first-dashboard.md",
}
def git(repo, *args):
    try:
        return subprocess.run(["git", "-C", str(repo), *args], capture_output=True,
                              timeout=12, check=True).stdout
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None

def tree(repo, ref="HEAD"):
    value = git(repo, "ls-tree", "-rz", ref)
    if value is None:
        return None
    out = {}
    for entry in value.split(b"\0"):
        if not entry:
            continue
        header, filename = entry.split(b"\t", 1)
        mode, kind, oid = header.split()
        if kind == b"blob":
            out[filename.decode("utf-8", "replace")] = oid.decode()
    return out

def is_generated(name):
    return name in GENERATED or "/magazine/federated/" in name or (
        "/projections/" in name and name.endswith((".pdf", ".epub", ".html"))
    )

def audit_one(archived, canonical, external=None):
    source = tree(archived)
    current = tree(canonical) if canonical else (
        external.get("files") if external else None
    )
    status = git(archived, "status", "--porcelain", "-uall")
    stashes = git(archived, "stash", "list", "--format=%H")
    branches = git(archived, "for-each-ref", "--format=%(refname:short)|%(objectname)", "refs/heads")
    if source is None:
        return {"name": archived.name, "error": "unreadable-archive-tree"}
    only_old = sorted(set(source) - set(current)) if current is not None else sorted(source)
    modified = sorted(p for p in set(source) & set(current or {}) if source[p] != current[p])
    dirty = []
    for row in (status or b"").decode("utf-8", "replace").splitlines():
        if len(row) >= 4:
            dirty.append({"status": row[:2], "path": row[3:]})
    return {
        "name": archived.name,
        "archive_head": (git(archived, "rev-parse", "HEAD") or b"").decode().strip(),
        "canonical_found": current is not None,
        "canonical_head": (
            (git(canonical, "rev-parse", "HEAD") or b"").decode().strip()
            if canonical else (external.get("head") if external else None)
        ),
        "canonical_kind": "local" if canonical else (
            "verified-external-tree" if external else "missing"
        ),
        "tracked_archive": len(source),
        "tracked_main": len(current or {}),
        "same_blobs": sum(source[p] == current[p] for p in set(source) & set(current or {})),
        "different_blobs": len(modified),
        "old_only": only_old,
        "old_only_generated": [p for p in only_old if is_generated(p)],
        "old_only_candidate": [p for p in only_old if not is_generated(p)],
        "different_paths": modified,
        "dirty": dirty,
        "dirty_generated": [d["path"] for d in dirty if is_generated(d["path"])],
        "stashes": (stashes or b"").decode().splitlines(),
        "branches": (branches or b"").decode().splitlines(),
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--canonical", required=True, type=Path)
    parser.add_argument("--fallback", type=Path)
    parser.add_argument("--external-tree-map", type=Path,
                        help="Private JSON: repo name -> {head, files: {path: blob SHA}}")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if not args.archive.is_dir() or not args.canonical.is_dir():
        parser.error("archive and canonical roots must exist")
    external = {}
    if args.external_tree_map:
        external = json.loads(args.external_tree_map.read_text(encoding="utf-8"))
        for name, record in external.items():
            if (not isinstance(record, dict)
                or not isinstance(record.get("files"), dict)
                or not all(len(oid) == 40 for oid in record["files"].values())):
                parser.error("invalid external tree for " + name)
    records = []
    for item in sorted(args.archive.iterdir()):
        if not item.is_dir() or not (item / ".git").exists():
            continue
        target = args.canonical / item.name
        if not (target / ".git").exists() and args.fallback:
            target = args.fallback / item.name
        if not (target / ".git").exists():
            target = None
        records.append(audit_one(item, target, external.get(item.name)))
    totals = collections.Counter()
    for r in records:
        totals["archives"] += 1
        totals["missing_canonical"] += not r.get("canonical_found", False)
        totals["old_only_candidate"] += len(r.get("old_only_candidate", []))
        totals["old_only_generated"] += len(r.get("old_only_generated", []))
        totals["different_blobs"] += r.get("different_blobs", 0)
        totals["dirty_paths"] += len(r.get("dirty", []))
        totals["stashes"] += len(r.get("stashes", []))
        totals["branches"] += len(r.get("branches", []))
    report = {
        "schema": "cogentia.corpus_recovery_audit.v1",
        "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "roots": {"archive": str(args.archive), "canonical": str(args.canonical)},
        "totals": dict(totals),
        "repositories": records,
    }
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        fd, temp = tempfile.mkstemp(prefix=".recovery-audit-", dir=args.out.parent)
        try:
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(report, stream, ensure_ascii=False, indent=2)
                stream.write("\n")
            os.replace(temp, args.out)
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
    print(json.dumps({"checked_at": report["checked_at"], "totals": report["totals"],
                      "repositories": [{"name": r["name"],
                                        "old_only_candidate": len(r.get("old_only_candidate", [])),
                                        "different_blobs": r.get("different_blobs", 0),
                                        "dirty_paths": len(r.get("dirty", [])),
                                        "stashes": len(r.get("stashes", [])),
                                        "canonical_found": r.get("canonical_found")}
                                       for r in records]}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
