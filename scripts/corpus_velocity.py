#!/usr/bin/env python3
"""Corpus velocity #267: reproducible, read-only monthly Git tree inventory.

Usage:
  python3 scripts/corpus_velocity.py --registry research/corpus-velocity-registry.json --root ~/srv/cogentia/repos --out /tmp/corpus-velocity
Records missing repositories explicitly. Operates only on existing local clones;
never reads private repository contents into an automatically published export.
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import pathlib
import re
import subprocess

CODE = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".go", ".rs", ".c",
        ".h", ".cpp", ".hpp", ".java", ".sh", ".rb", ".php", ".sql", ".swift", ".kt"}
IGNORE = re.compile(r"(^|/)(node_modules|vendor|dist|build|coverage|generated|__generated__|snapshots?|fixtures|target|\.next)(/|$)")
TEST_PATH = re.compile(r"(^|/)(__tests__|tests?|specs?)(/|$)|\.(test|spec)\.")
DERIVED_MARKDOWN = re.compile(r"(^|/)(index|corpus-status|llms(-full)?|readme\.generated)\.md$", re.I)
LANG = {".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
        ".cjs": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
        ".py": "Python", ".rs": "Rust", ".go": "Go"}


def git(repo, *args, input=None):
    return subprocess.run(["git", "-C", str(repo), *args], input=input,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


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


def monthly_commit_counts(repo, ref, periods):
    if not periods:
        return {}, "complete"
    shallow = git(repo, "rev-parse", "--is-shallow-repository").decode().strip() == "true"
    first_month = dt.datetime.strptime(periods[0][1], "%Y-%m").replace(tzinfo=dt.timezone.utc)
    previous_cutoff = first_month.strftime("%Y-%m-%dT%H:%M:%SZ")
    previous_count = int(git(repo, "rev-list", "--count", "--before=" + previous_cutoff, ref).decode().strip() or 0)
    counts = {}
    for until, period in periods:
        current_count = int(git(repo, "rev-list", "--count", "--before=" + until, ref).decode().strip() or 0)
        counts[period] = max(0, current_count - previous_count)
        previous_count = current_count
    return counts, "partial_shallow_history" if shallow else "complete"


def tree_metrics(repo, commit):
    result = {"blobs": 0, "bytes": 0, "code_files": 0, "code_bytes": 0,
              "code_physical_lines": 0, "code_nonblank_lines": 0,
              "markdown_files": 0, "derived_markdown_files": 0,
              "source_files": 0, "test_files": 0, "excluded_files": 0,
              "by_language": {}}
    code_blobs = []
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
        # Missing blob size (e.g. partial clone) must never be represented as zero.
        if len(bits) < 4 or not bits[3].isdigit():
            raise ValueError(f"blob size unavailable for {path!r}; fetch blob objects")
        size = int(bits[3])
        result["blobs"] += 1
        result["bytes"] += size
        if IGNORE.search(path):
            result["excluded_files"] += 1
            continue
        suffix = pathlib.PurePosixPath(path).suffix.lower()
        if suffix == ".md":
            result["markdown_files"] += 1
            if DERIVED_MARKDOWN.search(path):
                result["derived_markdown_files"] += 1
        if TEST_PATH.search(path):
            result["test_files"] += 1
        if suffix in CODE:
            result["code_files"] += 1
            result["source_files"] += 1
            result["code_bytes"] += size
            lang = LANG.get(suffix, suffix)
            language = result["by_language"].setdefault(
                lang, {"files": 0, "bytes": 0, "physical_lines": 0, "nonblank_lines": 0})
            language["files"] += 1
            language["bytes"] += size
            code_blobs.append((bits[2], lang))
    if code_blobs:
        request = b"".join(sha + b"\n" for sha, _ in code_blobs)
        contents = git(repo, "cat-file", "--batch", input=request)
        cursor = 0
        for expected_sha, lang in code_blobs:
            header_end = contents.find(b"\n", cursor)
            if header_end < 0:
                raise ValueError("incomplete cat-file batch header")
            header = contents[cursor:header_end].split()
            if len(header) != 3 or header[0] != expected_sha or header[1] != b"blob":
                raise ValueError("unexpected cat-file batch response")
            size = int(header[2])
            start = header_end + 1
            blob = contents[start:start + size]
            if len(blob) != size or contents[start + size:start + size + 1] != b"\n":
                raise ValueError("incomplete cat-file batch object")
            cursor = start + size + 1
            physical_lines = blob.count(b"\n") + int(bool(blob) and not blob.endswith(b"\n"))
            nonblank_lines = sum(bool(line.strip()) for line in blob.splitlines())
            result["code_physical_lines"] += physical_lines
            result["code_nonblank_lines"] += nonblank_lines
            language = result["by_language"][lang]
            language["physical_lines"] += physical_lines
            language["nonblank_lines"] += nonblank_lines
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", required=True)
    ap.add_argument("--root", default=str(pathlib.Path.home() / "srv/cogentia/repos"),
                    help="directory containing local repository clones (default: ~/srv/cogentia/repos)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--start", default="2025-10")
    ap.add_argument("--end", default="2026-10")
    args = ap.parse_args()
    periods = list(month_ends(args.start, args.end))
    now = dt.datetime.now(dt.timezone.utc)
    registry_path = pathlib.Path(args.registry)
    registry_bytes = registry_path.read_bytes()
    registry = json.loads(registry_bytes)
    rows = []
    for item in registry["repositories"]:
        name = item["name"]
        if item.get("visibility") != "public" or not item.get("included", True):
            for _, period in periods:
                rows.append({"repo": name, "period": period, "status": "excluded", "reason": "privacy_or_scope"})
            continue
        repo = pathlib.Path(args.root).expanduser() / item["path"]
        if not (repo / ".git").exists():
            for _, period in periods:
                rows.append({"repo": name, "period": period, "status": "missing", "reason": "local_checkout_absent"})
            continue
        ref = item.get("ref", "HEAD")
        try:
            commit_counts, commit_history_status = monthly_commit_counts(repo, ref, periods)
        except (subprocess.CalledProcessError, ValueError):
            commit_counts, commit_history_status = {}, "unavailable"
        for until, period in periods:
            cutoff = min(dt.datetime.strptime(until, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc), now)
            partial = cutoff < dt.datetime.strptime(until, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
            try:
                head = git(repo, "rev-list", "-1", "--before=" + cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"), ref).decode().strip()
                if not head:
                    rows.append({"repo": name, "period": period, "status": "not_created", "partial": partial,
                                 "commit_count": commit_counts.get(period),
                                 "commit_history_status": commit_history_status})
                    continue
                metrics = tree_metrics(repo, head)
                rows.append({"repo": name, "period": period, "status": "ok", "partial": partial,
                             "commit": head, "commit_count": commit_counts.get(period),
                             "commit_history_status": commit_history_status, **metrics})
            except (subprocess.CalledProcessError, ValueError) as e:
                reason = (e.stderr.decode(errors="replace") if isinstance(e, subprocess.CalledProcessError)
                          else str(e))
                rows.append({"repo": name, "period": period, "status": "error",
                             "partial": partial, "reason": reason[:200]})
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    status_counts = {}
    for row in rows:
        status_counts[row["status"]] = status_counts.get(row["status"], 0) + 1
    (out / "corpus-velocity.json").write_text(json.dumps({
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "registry_sha256": hashlib.sha256(registry_bytes).hexdigest(),
        "record_count": len(rows), "status_counts": status_counts,
        "schema_version": 1, "period_start": args.start, "period_end": args.end,
        "coverage": "partial_unless_registry_exhaustive", "metrics": rows,
        "filters": {
            "code_extensions": sorted(CODE),
            "excluded_path_regex": IGNORE.pattern,
            "test_path_regex": TEST_PATH.pattern,
            "derived_markdown_regex": DERIVED_MARKDOWN.pattern,
        },
        "limitations": ["Git tree snapshot, not churn", "code extension filter",
                        "generated/path exclusions heuristic",
                        "physical and nonblank line counts include comments and are not language-aware SLOC",
                        "test_files is inferred from path names and does not indicate executed or passing tests",
                        "no pull-request, issue, CI, review-time, or machine-cost metrics",
                        "no private-repository metrics exported"]}, indent=2) + "\n")
    fields = ["repo", "period", "status", "commit", "blobs", "bytes", "code_files",
              "code_bytes", "code_physical_lines", "code_nonblank_lines", "markdown_files",
              "derived_markdown_files", "test_files", "excluded_files", "commit_count",
              "commit_history_status", "partial", "reason"]
    with (out / "corpus-velocity.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} records; complete data only for available public clones.")


if __name__ == "__main__":
    main()
