#!/usr/bin/env python3
"""Code and document size snapshots for main/master branches.

Usage:
  python3 scripts/corpus_velocity.py --registry research/corpus-velocity-registry.json --root /path/to/repos --out /tmp/corpus-velocity
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
DOCUMENTS = {".md", ".markdown", ".mdx", ".txt", ".rst", ".adoc",
             ".asciidoc", ".org", ".tex", ".pdf", ".doc", ".docx", ".odt"}
MARKDOWN = {".md", ".markdown", ".mdx"}
TEXT_DOCUMENTS = DOCUMENTS - {".pdf", ".doc", ".docx", ".odt"}
IGNORE = re.compile(r"(^|/)(node_modules|vendor|dist|build|coverage|generated|__generated__|snapshots?|fixtures|target|\.next)(/|$)")
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


def mainline_ref(repo):
    allowed_refs = {
        "refs/remotes/origin/main", "refs/remotes/origin/master",
        "refs/heads/main", "refs/heads/master",
    }
    refs = set(git(repo, "for-each-ref", "--format=%(refname)",
                   "refs/remotes/origin/main", "refs/remotes/origin/master",
                   "refs/heads/main", "refs/heads/master").decode().splitlines())
    default_ref = None
    try:
        candidate = git(repo, "symbolic-ref", "refs/remotes/origin/HEAD").decode().strip()
        if candidate in allowed_refs and candidate in refs:
            default_ref = candidate
    except subprocess.CalledProcessError:
        pass
    if default_ref:
        return default_ref
    for candidate in ("refs/remotes/origin/main", "refs/remotes/origin/master",
                      "refs/heads/main", "refs/heads/master"):
        if candidate in refs:
            return candidate
    return None


def tree_metrics(repo, commit):
    result = {"blobs": 0, "bytes": 0, "code_files": 0, "code_bytes": 0,
              "code_physical_lines": 0, "code_nonblank_lines": 0,
              "document_files": 0, "document_bytes": 0,
              "text_document_files": 0, "text_document_physical_lines": 0,
              "text_document_nonblank_lines": 0,
              "markdown_files": 0, "markdown_bytes": 0,
              "markdown_physical_lines": 0, "markdown_nonblank_lines": 0,
              "excluded_files": 0,
              "by_language": {}}
    line_blobs = []
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
        if suffix in DOCUMENTS:
            result["document_files"] += 1
            result["document_bytes"] += size
        if suffix in MARKDOWN:
            result["markdown_files"] += 1
            result["markdown_bytes"] += size
        if suffix in TEXT_DOCUMENTS:
            result["text_document_files"] += 1
            kind = "markdown" if suffix in MARKDOWN else "document"
            line_blobs.append((bits[2], kind, None))
        if suffix in CODE:
            result["code_files"] += 1
            result["code_bytes"] += size
            lang = LANG.get(suffix, suffix)
            language = result["by_language"].setdefault(
                lang, {"files": 0, "bytes": 0, "physical_lines": 0, "nonblank_lines": 0})
            language["files"] += 1
            language["bytes"] += size
            line_blobs.append((bits[2], "code", lang))
    if line_blobs:
        request = b"".join(sha + b"\n" for sha, _, _ in line_blobs)
        contents = git(repo, "cat-file", "--batch", input=request)
        cursor = 0
        for expected_sha, kind, lang in line_blobs:
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
            if kind == "code":
                result["code_physical_lines"] += physical_lines
                result["code_nonblank_lines"] += nonblank_lines
                language = result["by_language"][lang]
                language["physical_lines"] += physical_lines
                language["nonblank_lines"] += nonblank_lines
            else:
                result["text_document_physical_lines"] += physical_lines
                result["text_document_nonblank_lines"] += nonblank_lines
                if kind == "markdown":
                    result["markdown_physical_lines"] += physical_lines
                    result["markdown_nonblank_lines"] += nonblank_lines
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", required=True)
    ap.add_argument("--root", required=True,
                    help="directory containing local repository clones")
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
        ref = mainline_ref(repo)
        if ref is None:
            for _, period in periods:
                rows.append({"repo": name, "period": period,
                             "status": "missing_mainline_branch",
                             "reason": "main_or_master_ref_absent"})
            continue
        branch = ref.rsplit("/", 1)[-1]
        for until, period in periods:
            cutoff = min(dt.datetime.strptime(until, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc), now)
            partial = cutoff < dt.datetime.strptime(until, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
            try:
                head = git(repo, "rev-list", "--first-parent", "-1",
                           "--before=" + cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
                           ref).decode().strip()
                if not head:
                    rows.append({"repo": name, "period": period, "status": "not_created",
                                 "partial": partial, "branch": branch, "ref": ref})
                    continue
                metrics = tree_metrics(repo, head)
                rows.append({"repo": name, "period": period, "status": "ok",
                             "partial": partial, "branch": branch, "ref": ref,
                             "commit": head, **metrics})
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
        "branch_policy": "origin/HEAD when it resolves to main/master; otherwise origin/main, origin/master, local main, local master; snapshots use first-parent commits only",
        "source": "existing local Git clones; no fetch performed",
        "filters": {
            "code_extensions": sorted(CODE),
            "document_extensions": sorted(DOCUMENTS),
            "text_document_extensions": sorted(TEXT_DOCUMENTS),
            "markdown_extensions": sorted(MARKDOWN),
            "excluded_path_regex": IGNORE.pattern,
        },
        "limitations": ["Git tree snapshot, not churn", "code extension filter",
                        "generated/path exclusions heuristic",
                        "physical and nonblank line counts include comments and are not language-aware SLOC",
                        "no private-repository metrics exported"]}, indent=2) + "\n")
    fields = ["repo", "period", "status", "branch", "ref", "commit", "blobs", "bytes",
              "code_files", "code_bytes", "code_physical_lines", "code_nonblank_lines",
              "document_files", "document_bytes", "text_document_files",
              "text_document_physical_lines", "text_document_nonblank_lines",
              "markdown_files", "markdown_bytes", "markdown_physical_lines",
              "markdown_nonblank_lines",
              "excluded_files", "partial", "reason"]
    with (out / "corpus-velocity.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} records; complete data only for available public clones.")


if __name__ == "__main__":
    main()
