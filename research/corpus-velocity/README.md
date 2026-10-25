---
title: Code and document size data
author: unknown
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: null
last_modified_at: 2026-10-24
license: CC BY-SA 4.0
language: en
status: working-paper — methodology
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/corpus-velocity/README.md
last_stamped_at: unknown
document_role: operational
document_kind: methodology
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 34cfe727b3f524bc76e74932ed52babe153aee1f
  origin_date: 2026-10-24
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Code and document size data

The dated directories contain reproducible snapshots for the public subset
listed in [`../corpus-velocity-registry.json`](../corpus-velocity-registry.json).
Each JSON manifest records its generation time, registry SHA-256, selected
branch and commit, coverage, filters, period, and per-repository status.
`no_mainline_commit_by_cutoff`, `missing`, `missing_mainline_branch`,
`excluded`, and `error` are distinct outcomes. The first means that the
selected mainline has no commit chosen by that cutoff; it does not mean the
project or repository did not yet exist. Missing or excluded data must not be
treated as zero.

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
its end. If the current repository has no commit by a cutoff, a registered
`historical_origin` main/master branch can supply that cohort member's tree
before the recorded handoff date; each row records the repository that
supplied the snapshot. If there is no explicit handoff date, the current
repository creation date is used. The script
reads existing local clones and does not fetch them.

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

The registry remains the same 24 public repositories at every date, including
L8, Side, Simpli, SimpliWiki, Tweesic, Water and Boxon on the same basis as newer projects. Tweesic is a separate Firebase project created from the Kudocracy prototype; both repository trees are counted, including shared and extracted code. Simpli has a separate entry from SimpliWiki; the overlapping engine lineage is counted in both trees.
Survey uses Kudocracy as its earlier lineage source. Simpli is both measured
as its own repository and used as the historical engine source for SimpliWiki
until the current Virteal content repository begins its own mainline history;
this overlapping lineage is counted in both registry entries. A repository created after a cutoff
contributes zero to the fixed-registry total at that date. Creation dates are
captured from GitHub repository metadata; a documented earlier repository
lineage may establish an earlier effective creation date, as for Inox, Survey,
Simpli, SimpliWiki and Tweesic. If a repository existed by a cutoff but has no selected
main/master commit or documented lineage tree, its historical size is unknown
and the total is marked as a lower bound. Snapshot selection uses Git commit
dates, which are not independent archival timestamps. The report separately
shows how many mainline trees could be reconstructed and which historical
sizes remain unknown.

The registry currently records no additional historical repositories outside
those 24.

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
