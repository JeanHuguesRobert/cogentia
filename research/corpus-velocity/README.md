# Code and document size data

The dated directories contain reproducible snapshots for the public subset
listed in [`../corpus-velocity-registry.json`](../corpus-velocity-registry.json).
Each JSON manifest records its generation time, registry SHA-256, selected
branch and commit, coverage, filters, period, and per-repository status.
`not_created`, `missing`, `missing_mainline_branch`, `excluded`, and `error`
are distinct outcomes; they must not be treated as zero.

## Git tree snapshots

Run from the Cogentia checkout, with local clones under the chosen root:

```sh
python3 scripts/corpus_velocity.py \
  --registry research/corpus-velocity-registry.json \
  --root /path/to/repository-clones \
  --start 2025-10 --end 2026-10 \
  --out research/corpus-velocity/2026-10
```

For each repository, the script selects `origin/HEAD` only when it resolves to
`main` or `master`; otherwise it tries `origin/main`, `origin/master`, local
`main`, then local `master`. It never falls back to `HEAD` or another branch.
For each month, it selects the latest first-parent commit on that branch at the
UTC month cutoff, then counts that commit's Git tree. The report stores the
branch, ref, and selected commit SHA. The current month is marked partial until
its end. The script reads existing local clones and does not fetch them.

For annual same-day snapshots (without monthly sampling), repeat `--snapshot`
once for each exact UTC cutoff:

```sh
python3 scripts/corpus_size_annual_comparison.py \
  --registry research/corpus-velocity-registry.json \
  --root /path/to/repository-clones \
  --snapshot 2022-10-24T17:40:04Z \
  --snapshot 2023-10-24T17:40:04Z \
  --snapshot 2024-10-24T17:40:04Z \
  --snapshot 2025-10-24T17:40:04Z \
  --snapshot 2026-10-24T17:40:04Z \
  --out research/corpus-velocity/2026-10/annual-snapshots.json
```

The report gives each year's portfolio size and year-over-year percentages,
plus comparisons on the fixed cohort measurable at every snapshot. Portfolio
percentages include repositories becoming measurable; fixed-cohort percentages
isolate size changes in the same repositories.

The manifest publishes the exact code/document extension sets and excluded
path expression. It reports total Git tree blobs and bytes, plus code and
document file counts and bytes. Markdown counts are a subset of document counts.
Physical and nonblank code and text-document lines are literal line counts;
binary documents are counted by files and bytes only. These line counts are
not language-aware SLOC. Generated/vendor/test-fixture exclusions are path
heuristics. Total tree size includes every blob; code and document counts apply
the published path and extension filters. Aggregates sum each repository tree;
the same copied file in two repositories is counted twice, so these figures
are not deduplicated storage size.
