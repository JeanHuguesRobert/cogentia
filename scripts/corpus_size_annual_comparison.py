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
LIMITATIONS = [
    "the registered repository list is fixed across snapshots; a repository contributes zero before its verified repository or documented historical-origin creation date",
    "absence of a selected commit does not establish that the underlying project did not yet exist",
    "if a repository existed by a cutoff but has no selected main/master commit, its historical size is unknown; totals and percentages are lower-bound reconstructions",
    "snapshot selection uses Git commit timestamps, which are not independent archival timestamps",
    "individual repository growth percentages are not calculated when that repository has no baseline snapshot",
    "line counts are physical/nonblank lines, not language-aware SLOC",
    "PDF files are excluded from document counts; raw Git tree bytes still include every blob",
    "Git tree sizes count each repository copy separately",
]


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


def effective_creation_date(item):
    origin = item.get("historical_origin") or {}
    value = origin.get("created_at") or item.get("repository_created_at")
    if not value:
        return None
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(dt.timezone.utc)


def snapshot_status(item, cutoff, snap):
    if snap:
        return "ok"
    created = effective_creation_date(item)
    if created is None:
        return "creation_date_unverified"
    return "not_yet_created" if cutoff < created else "no_mainline_commit_by_cutoff"


def snapshot(repo, ref, cutoff):
    commit = git(repo, "rev-list", "--first-parent", "-1",
                 "--before=" + cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
                 ref).decode().strip()
    if not commit:
        return None
    metrics = tree_metrics(repo, commit)
    return {"commit": commit, "source_repository": None, "branch": ref.rsplit("/", 1)[-1],
            "ref": ref, **{key: metrics[key] for key in SIZE_FIELDS}}


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


def write_csv(path, rows, date_keys):
    fields = ["repo", "repository_created_at", "effective_created_at",
              "historical_origin_repository", "status", "branch", "ref",
              "snapshot_at", "snapshot_status", "source_repository", "source_branch", "source_ref", "commit"]
    fields += list(SIZE_FIELDS)
    with pathlib.Path(path).open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            for key in date_keys:
                snap = row.get("snapshots", {}).get(key)
                flat = {"repo": row["repo"],
                        "repository_created_at": row.get("repository_created_at"),
                        "effective_created_at": row.get("effective_created_at"),
                        "historical_origin_repository": (row.get("historical_origin") or {}).get("repository"),
                        "status": row["status"],
                        "branch": row.get("branch"), "ref": row.get("ref"),
                        "snapshot_at": key,
                        "snapshot_status": row.get("snapshot_statuses", {}).get(
                            key, "ok" if snap else "creation_date_unverified"),
                        "source_repository": snap.get("source_repository") if snap else None,
                        "source_branch": snap.get("branch") if snap else None,
                        "source_ref": snap.get("ref") if snap else None,
                        "commit": snap.get("commit") if snap else None}
                flat.update({field: snap.get(field) if snap else None for field in SIZE_FIELDS})
                writer.writerow(flat)


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
        created = effective_creation_date(item)
        creation_fields = {
            "repository_created_at": item.get("repository_created_at"),
            "repository_metadata_url": item.get("repository_metadata_url"),
            "metadata_verified_on": item.get("metadata_verified_on"),
            "effective_created_at": created.isoformat(timespec="seconds") if created else None,
            "historical_origin": item.get("historical_origin"),
        }
        origin = item.get("historical_origin") or {}
        origin_path = origin.get("path")
        origin_repo = root / origin_path if origin_path else None
        has_origin = bool(origin_repo and (origin_repo / ".git").exists())
        if not (repo / ".git").exists() and not has_origin:
            rows.append({"repo": name, **creation_fields, "status": "missing_checkout"})
            continue
        try:
            ref = mainline_ref(repo) if (repo / ".git").exists() else None
            if ref is None and not has_origin:
                rows.append({"repo": name, **creation_fields, "status": "missing_mainline_branch"})
                continue
            origin_ref = "refs/remotes/origin/" + origin.get("branch", "master")
            snapshots = {}
            handoff_value = origin.get("handoff_at") or item.get("repository_created_at")
            origin_handoff = (dt.datetime.fromisoformat(handoff_value.replace("Z", "+00:00"))
                               .astimezone(dt.timezone.utc) if handoff_value else None)
            for key, cutoff in zip(date_keys, args.snapshots):
                snap = snapshot(repo, ref, cutoff) if ref else None
                if snap:
                    snap["source_repository"] = name
                elif (origin_handoff and cutoff < origin_handoff and origin_repo
                      and (origin_repo / ".git").exists()):
                    snap = snapshot(origin_repo, origin_ref, cutoff)
                    if snap:
                        snap["source_repository"] = origin["repository"]
                snapshots[key] = snap
        except (OSError, subprocess.CalledProcessError, ValueError) as exc:
            reason = (exc.stderr.decode(errors="replace") if isinstance(exc, subprocess.CalledProcessError)
                      else str(exc))
            rows.append({"repo": name, **creation_fields, "status": "error", "reason": reason[:200]})
            continue
        statuses = {key: snapshot_status(item, cutoff, snapshots[key])
                    for key, cutoff in zip(date_keys, args.snapshots)}
        rows.append({"repo": name, **creation_fields, "status": "ok",
                     "branch": ref.rsplit("/", 1)[-1] if ref else None, "ref": ref,
                     "snapshots": snapshots, "snapshot_statuses": statuses})

    valid_rows = [row for row in rows if row["status"] == "ok"]
    points = []
    for date_key in date_keys:
        totals, count = sum_snapshots(valid_rows, date_key)
        unknown = [row["repo"] for row in valid_rows
                   if row.get("snapshot_statuses", {}).get(date_key) in
                   ("no_mainline_commit_by_cutoff", "creation_date_unverified")]
        points.append({"as_of": date_key, "active_repository_count": count,
                       "unknown_historical_size_count": len(unknown),
                       "unknown_historical_size_repositories": unknown,
                       "totals_status": "lower_bound" if unknown else "qualified",
                       "totals": totals})

    intervals = []
    for index in range(1, len(date_keys)):
        before_key, current_key = date_keys[index - 1:index + 1]
        newly_measurable = [row for row in valid_rows
                            if not row["snapshots"].get(before_key)
                            and row["snapshots"].get(current_key)]
        no_longer_measurable = [row for row in valid_rows
                                if row["snapshots"].get(before_key)
                                and not row["snapshots"].get(current_key)]
        portfolio_before, before_count = sum_snapshots(valid_rows, before_key)
        portfolio_current, current_count = sum_snapshots(valid_rows, current_key)
        intervals.append({
            "baseline_at": before_key,
            "as_of": current_key,
            "registered_repository_count": len(rows),
            "repositories_with_snapshot": {"baseline": before_count, "current": current_count},
            "historical_size_unknown": {
                "baseline": [row["repo"] for row in valid_rows
                             if row.get("snapshot_statuses", {}).get(before_key) in
                             ("no_mainline_commit_by_cutoff", "creation_date_unverified")],
                "current": [row["repo"] for row in valid_rows
                            if row.get("snapshot_statuses", {}).get(current_key) in
                            ("no_mainline_commit_by_cutoff", "creation_date_unverified")],
            },
            "fixed_registry_totals": compare_totals(portfolio_before, portfolio_current),
            "newly_measurable_repositories": [row["repo"] for row in newly_measurable],
            "no_longer_measurable_repositories": [row["repo"] for row in no_longer_measurable],
        })

    snapshot_counts = {point["as_of"]: point["active_repository_count"] for point in points}
    row_status_counts = dict(collections.Counter(row["status"] for row in rows))
    manifest = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "snapshots": date_keys,
        "registry_sha256": hashlib.sha256(registry_bytes).hexdigest(),
        "branch_policy": "main/master only; origin/HEAD when it resolves to main/master, otherwise origin/main, origin/master, local main, local master; historical_origin main/master supplies the lineage slot only before its recorded handoff date (or current repository creation date) and when no current snapshot exists; first-parent snapshots; never use HEAD or side branches",
        "source": "existing local Git clones; no fetch performed",
        "creation_metadata_basis": "repository_created_at from GitHub REST repository metadata; verified historical_origin used when recorded; source URLs and verification dates are in each registry entry",
        "commit_metadata_verification": "selected commit SHAs and Git timestamps checked through GitHub commit metadata on 2026-10-24",
        "commit_lineage_verification": {
            "verified_on": "2026-10-24",
            "method": "GitHub compare API: each selected snapshot SHA compared as base against the current main/master tip",
            "selected_snapshot_commit_count": len({snap["commit"] for row in valid_rows
                                                     for snap in row["snapshots"].values() if snap}),
            "result": "all selected snapshot commits are ancestors of their current main/master tip",
        },
        "registered_repository_count": len(rows),
        "historical_repositories_outside_fixed_scope": registry.get(
            "historical_repositories_outside_fixed_scope", []),
        "row_status_counts": row_status_counts,
        "snapshot_repository_counts": snapshot_counts,
        "fixed_registry_snapshots": points,
        "fixed_registry_year_over_year": intervals,
        "filters": {"code_extensions": sorted(CODE),
                    "document_extensions": sorted(DOCUMENTS),
                    "text_document_extensions": sorted(TEXT_DOCUMENTS),
                    "markdown_extensions": sorted(MARKDOWN),
                    "excluded_path_regex": IGNORE.pattern},
        "limitations": LIMITATIONS,
        "repositories": rows,
    }
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2) + "\n")
    csv_path = out.with_suffix(".csv")
    write_csv(csv_path, rows, date_keys)
    print(json.dumps({"registered_repositories": len(rows), "row_status_counts": row_status_counts,
                      "snapshot_repository_counts": snapshot_counts,
                      "json": str(out), "csv": str(csv_path)}))


if __name__ == "__main__":
    main()
