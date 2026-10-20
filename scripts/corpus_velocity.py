#!/usr/bin/env python3
"""Corpus velocity #267: reproducible, read-only monthly Git tree inventory.

Usage:
  python3 scripts/corpus_velocity.py --registry research/corpus-velocity-registry.json --out /tmp/corpus-velocity
Records missing repositories explicitly. Operates only on existing local clones;
never reads private repository contents into an automatically published export.
"""
import argparse
import csv
import datetime as dt
import json
import pathlib
import re
import subprocess

CODE = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".go", ".rs", ".c",
        ".h", ".cpp", ".hpp", ".java", ".sh", ".rb", ".php", ".sql", ".swift", ".kt"}
IGNORE = re.compile(r"(^|/)(node_modules|vendor|dist|build|coverage|generated|target|\.next)(/|$)")
LANG = {".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
        ".cjs": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
        ".py": "Python", ".rs": "Rust", ".go": "Go"}


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=True).stdout


def month_ends(start, end):
    y, m = map(int, start.split("-"))
    ey, em = map(int, end.split("-"))
    while (y, m) <= (ey, em):
        period = f"{y:04d}-{m:02d}"
        if m == 12:
            limit = dt.datetime(y + 1, 1, 1, tzinfo=dt.timezone.utc)
            y, m = y + 1, 1
        else:
            limit = dt.datetime(y, m + 1, 1, tzinfo=dt.timezone.utc)
            m += 1
        yield (limit - dt.timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ"), period


def tree_metrics(repo, commit):
    result = {"blobs": 0, "bytes": 0, "code_files": 0, "code_bytes": 0,
              "markdown_files": 0, "source_files": 0, "by_language": {}}
    # NUL-delimited Git tree output safely handles spaces and Unicode paths.
    entries = git(repo, "ls-tree", "-rz", "-l", commit).split(b"\0")
    for entry in entries:
        if not entry:
            continue
        meta, path_bytes = entry.split(b"\t", 1)
        bits = meta.split()  # split arbitrary whitespace; git ls-tree -l pads size field
        if bits[1] != b"blob":
            continue
        path = path_bytes.decode("utf-8", "surrogateescape")
        size = int(bits[3]) if bits[3].isdigit() else 0
        result["blobs"] += 1
        result["bytes"] += size
        suffix = pathlib.PurePosixPath(path).suffix.lower()
        if suffix == ".md":
            result["markdown_files"] += 1
        if suffix in CODE and not IGNORE.search(path):
            result["code_files"] += 1
            result["code_bytes"] += size
            lang = LANG.get(suffix, suffix)
            entry = result["by_language"].setdefault(lang, {"files": 0, "bytes": 0})
            entry["files"] += 1
            entry["bytes"] += size
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--start", default="2025-10")
    ap.add_argument("--end", default="2026-10")
    args = ap.parse_args()
    registry = json.loads(pathlib.Path(args.registry).read_text())
    rows = []
    for item in registry["repositories"]:
        name = item["name"]
        if item.get("visibility") != "public" or not item.get("included", True):
            rows.append({"repo": name, "status": "excluded", "reason": "privacy_or_scope"})
            continue
        repo = pathlib.Path(item["local_path"]).expanduser()
        if not (repo / ".git").exists():
            rows.append({"repo": name, "status": "missing", "reason": "local_checkout_absent"})
            continue
        for until, period in month_ends(args.start, args.end):
            try:
                head = git(repo, "rev-list", "-1", "--before=" + until, item.get("ref", "HEAD")).decode().strip()
                if not head:
                    rows.append({"repo": name, "period": period, "status": "not_created"})
                    continue
                metrics = tree_metrics(repo, head)
                rows.append({"repo": name, "period": period, "status": "ok", "commit": head, **metrics})
            except subprocess.CalledProcessError as e:
                rows.append({"repo": name, "period": period, "status": "error", "reason": e.stderr.decode(errors="replace")[:200]})
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "corpus-velocity.json").write_text(json.dumps({
        "schema_version": 1, "period_start": args.start, "period_end": args.end,
        "coverage": "partial_unless_registry_exhaustive", "metrics": rows,
        "limitations": ["Git tree snapshot, not churn", "code extension filter",
                        "generated/path exclusions heuristic", "no LOC/SLOC yet",
                        "no private-repository metrics exported"]}, indent=2) + "\n")
    fields = ["repo", "period", "status", "commit", "blobs", "bytes", "code_files",
              "code_bytes", "markdown_files", "reason"]
    with (out / "corpus-velocity.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} records; complete data only for available public clones.")


if __name__ == "__main__":
    main()
