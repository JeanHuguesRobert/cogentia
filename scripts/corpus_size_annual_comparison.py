#!/usr/bin/env python3
"""Compare same-day annual code/document snapshots on main/master only."""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
import pathlib
import subprocess

from corpus_velocity import CODE, DOCUMENTS, IGNORE, MARKDOWN, TEXT_DOCUMENTS
from corpus_velocity import git, mainline_ref, tree_metrics

SIZE_FIELDS = (
    "blobs", "bytes", "code_files", "code_bytes", "code_physical_lines",
    "code_nonblank_lines", "document_files", "document_bytes",
    "text_document_files", "text_document_physical_lines",
    "text_document_nonblank_lines", "markdown_files", "markdown_bytes",
    "markdown_physical_lines", "markdown_nonblank_lines",
)


def parse_cutoff(value):
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc
    if parsed.tzinfo is None:
        raise argparse.ArgumentTypeError("cutoffs must include a UTC offset")
    return parsed.astimezone(dt.timezone.utc)


def cutoff_key(cutoff):
    return cutoff.isoformat(timespec="seconds")


def snapshot(repo, ref, cutoff):
    commit = git(repo, "rev-list", "--first-parent", "-1",
                 "--before=" + cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
                 ref).decode().strip()
    if not commit:
        return None
    metrics = tree_metrics(repo, commit)
    return {"commit": commit, **{key: metrics[key] for key in SIZE_FIELDS}}


def sum_snapshots(rows, date_key):
    available = [row["snapshots"][date_key] for row in rows
                 if row.get("snapshots", {}).get(date_key)]
    return {key: sum(snapshot[key] for snapshot in available) for key in SIZE_FIELDS}, len(available)


def growth_percent(baseline, current):
    return None if baseline == 0 else round((current - baseline) * 100 / baseline, 1)


def compare_totals(baseline, current):
    return {
        key: {"baseline": baseline[key], "current": current[key],
              "change": current[key] - baseline[key],
              "growth_percent": growth_percent(baseline[key], current[key])}
        for key in SIZE_FIELDS
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", required=True)
    parser.add_argument("--root", required=True)
    parser.add_argument("--snapshot", dest="snapshots", action="append", type=parse_cutoff,
                        required=True, help="exact UTC snapshot cutoff; repeat once per year")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    if len(args.snapshots) < 2:
        parser.error("provide at least two --snapshot cutoffs")
    if args.snapshots != sorted(args.snapshots) or len(set(args.snapshots)) != len(args.snapshots):
        parser.error("--snapshot cutoffs must be unique and chronological")

    date_keys = [cutoff_key(value) for value in args.snapshots]
    registry_path = pathlib.Path(args.registry)
    registry_bytes = registry_path.read_bytes()
    registry = json.loads(registry_bytes)
    root = pathlib.Path(args.root).expanduser()
    rows = []
    for item in registry["repositories"]:
        if item.get("visibility") != "public" or not item.get("included", True):
            continue
        name = item["name"]
        repo = root / item["path"]
        if not (repo / ".git").exists():
            rows.append({"repo": name, "status": "missing_checkout"})
            continue
        try:
            ref = mainline_ref(repo)
            if ref is None:
                rows.append({"repo": name, "status": "missing_mainline_branch"})
                continue
            snapshots = {key: snapshot(repo, ref, cutoff)
                         for key, cutoff in zip(date_keys, args.snapshots)}
        except (OSError, subprocess.CalledProcessError, ValueError) as exc:
            reason = (exc.stderr.decode(errors="replace") if isinstance(exc, subprocess.CalledProcessError)
                      else str(exc))
            rows.append({"repo": name, "status": "error", "reason": reason[:200]})
            continue
        rows.append({"repo": name, "status": "ok", "branch": ref.rsplit("/", 1)[-1],
                     "ref": ref, "snapshots": snapshots})

    valid_rows = [row for row in rows if row["status"] == "ok"]
    points = []
    for date_key in date_keys:
        totals, count = sum_snapshots(valid_rows, date_key)
        points.append({"as_of": date_key, "repository_count": count, "totals": totals})

    intervals = []
    for index in range(1, len(date_keys)):
        before_key, current_key = date_keys[index - 1:index + 1]
        paired = [row for row in valid_rows
                  if row["snapshots"].get(before_key) and row["snapshots"].get(current_key)]
        newly_measurable = [row for row in valid_rows
                            if not row["snapshots"].get(before_key)
                            and row["snapshots"].get(current_key)]
        no_longer_measurable = [row for row in valid_rows
                                if row["snapshots"].get(before_key)
                                and not row["snapshots"].get(current_key)]
        before_totals, _ = sum_snapshots(paired, before_key)
        current_totals, _ = sum_snapshots(paired, current_key)
        portfolio_before, before_count = sum_snapshots(valid_rows, before_key)
        portfolio_current, current_count = sum_snapshots(valid_rows, current_key)
        intervals.append({
            "baseline_at": before_key,
            "as_of": current_key,
            "comparable_repository_count": len(paired),
            "comparable_repositories": [row["repo"] for row in paired],
            "comparable_cohort_totals": compare_totals(before_totals, current_totals),
            "portfolio_repository_counts": {"baseline": before_count, "current": current_count},
            "portfolio_totals": compare_totals(portfolio_before, portfolio_current),
            "newly_measurable_repositories": [row["repo"] for row in newly_measurable],
            "no_longer_measurable_repositories": [row["repo"] for row in no_longer_measurable],
        })

    stable_rows = [row for row in valid_rows
                   if all(row["snapshots"].get(key) for key in date_keys)]
    stable_points = []
    first_totals, _ = sum_snapshots(stable_rows, date_keys[0])
    for key in date_keys:
        totals, count = sum_snapshots(stable_rows, key)
        stable_points.append({"as_of": key, "repository_count": count, "totals": totals,
                              "growth_from_first_percent": {
                                  field: growth_percent(first_totals[field], totals[field])
                                  for field in SIZE_FIELDS}})

    snapshot_counts = {point["as_of"]: point["repository_count"] for point in points}
    row_status_counts = dict(collections.Counter(row["status"] for row in rows))
    manifest = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "snapshots": date_keys,
        "registry_sha256": hashlib.sha256(registry_bytes).hexdigest(),
        "branch_policy": "main/master only; origin/HEAD when it resolves to main/master, otherwise origin/main, origin/master, local main, local master; first-parent snapshots; never use HEAD or side branches",
        "source": "existing local Git clones; no fetch performed",
        "repository_count": len(rows),
        "row_status_counts": row_status_counts,
        "snapshot_repository_counts": snapshot_counts,
        "portfolio_snapshots": points,
        "year_over_year_portfolio_comparisons": intervals,
        "fixed_cohort_repository_count": len(stable_rows),
        "fixed_cohort_repositories": [row["repo"] for row in stable_rows],
        "fixed_cohort_snapshots": stable_points,
        "filters": {"code_extensions": sorted(CODE),
                    "document_extensions": sorted(DOCUMENTS),
                    "text_document_extensions": sorted(TEXT_DOCUMENTS),
                    "markdown_extensions": sorted(MARKDOWN),
                    "excluded_path_regex": IGNORE.pattern},
        "limitations": [
            "portfolio growth percentages include repositories first measurable since the previous snapshot",
            "comparable-cohort percentages use only repositories with snapshots at both dates",
            "repositories with no snapshot are not assigned a fabricated zero per-repository percentage",
            "line counts are physical/nonblank lines, not language-aware SLOC",
            "Git tree sizes count each repository copy separately",
        ],
        "repositories": rows,
    }
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2) + "\n")
    csv_path = out.with_suffix(".csv")
    fields = ["repo", "status", "branch", "ref", "snapshot_at", "snapshot_status", "commit"]
    fields += list(SIZE_FIELDS)
    with csv_path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            for key in date_keys:
                snap = row.get("snapshots", {}).get(key)
                flat = {"repo": row["repo"], "status": row["status"],
                        "branch": row.get("branch"), "ref": row.get("ref"),
                        "snapshot_at": key,
                        "snapshot_status": "ok" if snap else "not_created",
                        "commit": snap.get("commit") if snap else None}
                flat.update({field: snap.get(field) if snap else None for field in SIZE_FIELDS})
                writer.writerow(flat)
    print(json.dumps({"repositories": len(rows), "row_status_counts": row_status_counts,
                      "snapshot_repository_counts": snapshot_counts,
                      "fixed_cohort": len(stable_rows),
                      "json": str(out), "csv": str(csv_path)}))


if __name__ == "__main__":
    main()
