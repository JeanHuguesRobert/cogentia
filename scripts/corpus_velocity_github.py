#!/usr/bin/env python3
"""Monthly issue/PR activity counts for registry-listed public repositories.

Requires the GitHub CLI (`gh`) and reads public Issues and Pulls API metadata.
It does not fetch titles, bodies, users, comments, or private repository data.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
import pathlib
import subprocess

from corpus_velocity import month_ends

JQ_RECORD = '.[] | [.created_at, (has("pull_request") | tostring)] | @tsv'


def count_created_records(repo, output, periods):
    counts = {period: {"issues_created": 0, "pull_requests_created": 0}
              for period in periods}
    for line in output.splitlines():
        if not line:
            continue
        fields = line.split("\t")
        if len(fields) != 2:
            raise ValueError("unexpected GitHub issue metadata row")
        created_at, is_pr = fields
        period = created_at[:7]
        if period not in counts:
            continue
        key = "pull_requests_created" if is_pr == "true" else "issues_created"
        counts[period][key] += 1
    return [{"repo": repo, "period": period, "status": "ok", **counts[period]}
            for period in periods]


def count_merged_records(repo, output, periods):
    counts = {period: {"merged_pull_requests": 0} for period in periods}
    for line in output.splitlines():
        if not line:
            continue
        merged_at = line
        period = merged_at[:7]
        if period not in counts:
            continue
        counts[period]["merged_pull_requests"] += 1
    return [{"repo": repo, "period": period, "status": "ok", **counts[period]}
            for period in periods]


def fetch_repo(repo, start, periods):
    since = f"{start}-01T00:00:00Z"
    command = ["gh", "api", "-X", "GET", "--paginate", "--jq", JQ_RECORD,
               f"repos/{repo}/issues", "-f", "state=all", "-f", f"since={since}",
               "-f", "per_page=100"]
    completed = subprocess.run(command, capture_output=True, text=True,
                               check=True, timeout=180)
    created = count_created_records(repo, completed.stdout, periods)
    # The PR list endpoint can be paginated completely. Group merged PRs by
    # merge time to count changes accepted in each month.
    pull_command = ["gh", "api", "-X", "GET", "--paginate", "--jq",
                    '.[] | select(.merged_at != null) | .merged_at',
                    f"repos/{repo}/pulls", "-f", "state=closed", "-f",
                    "sort=created", "-f", "direction=desc", "-f", "per_page=100"]
    pull_completed = subprocess.run(pull_command, capture_output=True, text=True,
                                    check=True, timeout=300)
    merged = count_merged_records(repo, pull_completed.stdout, periods)
    for created_row, merged_row in zip(created, merged):
        created_row.update({key: value for key, value in merged_row.items()
                            if key not in {"repo", "period", "status"}})
    return created


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", required=True)
    parser.add_argument("--start", default="2025-10")
    parser.add_argument("--end", default="2026-10")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    periods = [period for _, period in month_ends(args.start, args.end)]
    registry_path = pathlib.Path(args.registry)
    registry_bytes = registry_path.read_bytes()
    registry = json.loads(registry_bytes)
    rows = []
    failures = []
    for item in registry["repositories"]:
        if item.get("visibility") != "public" or not item.get("included", True):
            continue
        repo = item["name"]
        try:
            rows.extend(fetch_repo(repo, args.start, periods))
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError) as exc:
            if isinstance(exc, subprocess.CalledProcessError):
                reason = (exc.stderr or "").strip() or f"gh api exited {exc.returncode}"
            elif isinstance(exc, subprocess.TimeoutExpired):
                reason = "gh api timed out"
            else:
                reason = str(exc)
            failures.append({"repo": repo, "reason": reason[:240]})
            rows.extend({"repo": repo, "period": period, "status": "unavailable",
                         "issues_created": None, "pull_requests_created": None,
                         "merged_pull_requests": None}
                        for period in periods)
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    status_counts = dict(collections.Counter(row["status"] for row in rows))
    manifest = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "registry_sha256": hashlib.sha256(registry_bytes).hexdigest(),
        "schema_version": 1,
        "period_start": args.start,
        "period_end": args.end,
        "record_count": len(rows),
        "status_counts": status_counts,
        "coverage": "partial" if failures else "complete_for_registry",
        "retrieval": "GitHub REST Issues and Pulls APIs via gh; created_at and merged_at grouped by UTC month",
        "limitations": [
            "counts use currently retained public Issues API records; deleted records are absent",
            "since filters updated_at; all items created in-range are expected to be returned",
            "merged PR counts are an acceptance proxy, not evidence of review quality or human effort",
        ],
        "failures": failures,
        "metrics": rows,
    }
    (out / "github-activity.json").write_text(json.dumps(manifest, indent=2) + "\n")
    fields = ["repo", "period", "status", "issues_created", "pull_requests_created",
              "merged_pull_requests"]
    with (out / "github-activity.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"record_count": len(rows), "status_counts": status_counts,
                      "failures": len(failures), "out": str(out)}))


if __name__ == "__main__":
    main()
