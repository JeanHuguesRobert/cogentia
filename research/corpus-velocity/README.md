# Corpus velocity data

The dated directories contain reproducible snapshots for the public subset
listed in [`../corpus-velocity-registry.json`](../corpus-velocity-registry.json).
Each JSON manifest records its generation time, registry SHA-256, coverage,
filters, period, and per-repository status. `not_created`, `missing`,
`excluded`, and `error` are distinct outcomes; they must not be treated as zero.

## Git tree snapshots

Run from the Cogentia checkout, with local clones under the chosen root:

```sh
python3 scripts/corpus_velocity.py \
  --registry research/corpus-velocity-registry.json \
  --root /path/to/repository-clones \
  --start 2025-10 --end 2026-10 \
  --out research/corpus-velocity/2026-10
```

For each month, the script selects the latest commit reachable from the
registry ref at that month's UTC cutoff, then counts its Git tree. The report
stores the selected commit SHA. Commit counts are monthly deltas in the number
of commits reachable before each UTC month end; Git's committer timestamps
determine the month. The current month is marked partial until its end.

The manifest publishes the exact code-extension set and path expressions.
Physical and nonblank lines include comments and tests: these are line-count
proxies, not language-aware SLOC. `test_files` is inferred from path names; it
does not say whether tests ran or passed. Generated/vendor/test-fixture
exclusions are path heuristics. Git tree sizes include every blob, while code
counts apply the published filters.

## GitHub activity

Run the public API collector with an authenticated `gh` installation:

```sh
python3 scripts/corpus_velocity_github.py \
  --registry research/corpus-velocity-registry.json \
  --start 2025-10 --end 2026-10 \
  --out research/corpus-velocity/2026-10
```

It paginates public Issues and Pulls API records. Issue/PR creation is grouped
by `created_at`; merged PRs are grouped by `merged_at`, all in UTC. The API's
`since` parameter filters on `updated_at`, which includes in-range creations.
Merged PR count is only a count of accepted changes; it does not measure review
quality, effort, CI status, or the contents/size of the change. Deleted or
otherwise no-longer-retained records are absent.

Neither report measures code authorship across repositories, copied or
generated-code propagation, PR lead time, review workload, machine cost, or
economic value. A repository-level change should not be summed as unique new
code across the whole corpus without a separate duplicate/propagation audit.
