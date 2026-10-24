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

The manifest publishes the exact code/document extension sets and excluded
path expression. It reports total Git tree blobs and bytes, plus code and
document file counts and bytes. Markdown counts are a subset of document counts.
Physical and nonblank code lines are included as literal line counts, not
language-aware SLOC. Generated/vendor/test-fixture exclusions are path
heuristics. Total tree size includes every blob; code and document counts apply
the published path and extension filters. Aggregates sum each repository tree;
the same copied file in two repositories is counted twice, so these figures
are not deduplicated storage size.
