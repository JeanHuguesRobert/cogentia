---
title: "cogentia.js — Known Mechanical Limitations"
author: "Jean Hugues Noël Robert"
date: "2026-08-09"
status: "working-paper"
document_role: "operational"
document_kind: "known-issues"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "main"
  origin_date: "2026-08-09"
  derived_from: []
review:
  status: "unreviewed"
  reviewed_by: []
---

# cogentia.js — Known Mechanical Limitations

Not doctrine bugs, mechanical limits of the current `commit propose` / `apply` DHITL stale-guard.
Git remains the safety valve for cases below; use it directly rather than fighting the tool.

## `commit propose` cannot handle deletions

`cogentia.js commit propose <repo> --all` computes each staged file's SHA-1 for the stale-guard
by reading it from disk. A `git rm`'d file no longer exists on disk, so `propose` fails with
`❌ File not found: <path>` before producing a ref.

**Workaround:** when a changeset includes a deletion alongside modifications, skip
`commit propose` for it — commit directly: `git add <modified files> && git commit && git push`.
If the deletion is isolated, modifications can go through `cogentia.js` separately and the
deletion through a direct commit.

## `.cogentia/audit.jsonl` cannot go through propose/apply

Every `cogentia.js` invocation — including `propose` and `apply` themselves — appends to
`JeanHuguesRobert/.cogentia/audit.jsonl` (the tracked source-of-truth trace). This means the SHA
recorded at `propose` time is already stale by the time `apply` runs, even with zero human action
between the two calls: the stale-guard correctly detects a mid-flight modification, but that
modification is the tool's own eager write, not a real conflict.

**Workaround:** exclude `.cogentia/audit.jsonl` from any `commit propose --files` batch that
touches the registry repo; commit it directly with `git add .cogentia/audit.jsonl && git commit
&& git push`. The same constraint would apply to any other file `cogentia.js` writes during its
own ordinary operation; `audit.jsonl` is currently the only known case.
