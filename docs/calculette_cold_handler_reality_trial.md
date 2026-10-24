---
title: "CALC-P1 — Independent Cold-Handler Reality Trial"
author: unknown
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-16"
last_modified_at: "2026-10-24"
version: "0.2"
status: "working-paper — experimental protocol"
license: "CC BY-SA 4.0"
language: en
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/calculette_cold_handler_reality_trial.md
document_role: operational
document_kind: agent-experiment-protocol
document_function: matched-cold-handler-trial
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 508fa97c57a725abcf9e2ec503f9868565abca60
  origin_date: "2026-10-16"
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# CALC-P1: independent cold-handler reality trial

Status: protocol, NOT evidence that an independent handler ran.

## Experimental boundary

A genuinely independent handler starts in a fresh agent session with **only**:
`Resume issue 241 of repository JeanHuguesRobert/cogentia.`
It must not receive this conversation, a private explanation, or the expected results below. It may discover the repository, rules, Issue, code, and tools by its own normal means.

The observer records start/end UTC time and counts repository/tool calls. Do not share the baseline or success criteria with the handler before its first response.

## Observer checklist (after receiving the handler's response)

1. State the Issue goal and actual next actionable step, with source links.
2. Identify AGENTS.md, instructions/AGENTS.shared.md, and docs/continuations_and_cognitive_packets_for_agents.md; read and apply relevant controls, not merely check their existence.
3. Distinguish accessible inputs, activated controls, and mandate/authority. Do not perform writes without suitable authority.
4. Reconcile the FBF fix in PR #234 with the cold-orientation implementation from PR #246, merged to `main` as `508fa97c57a725abcf9e2ec503f9868565abca60`. A code merge is not evidence of deployment or of a successful independent-handler trial.
5. Inspect Git evidence (locally or via GitHub) and distinguish verified data from claims; if the locally based `--delta-base` is usable, show baseline/head/commit count and any truncation. The count is not an invariant: PR #246 may advance.
6. Return a bounded next-action recommendation, remaining uncertainties, and zero-effects / actions actually taken. Do not manufacture authorization.

## Local matched-trial runner

`scripts/calculette-matched-cold-trial.py` runs one arm at a time. Use the same
clean repository revision and output directory for both arms:

```sh
python3 scripts/calculette-matched-cold-trial.py --arm control --root . --output-dir /tmp/cogentia-cold-trials-241
python3 scripts/calculette-matched-cold-trial.py --arm assisted --root . --output-dir /tmp/cogentia-cold-trials-241
```

It snapshots Issue #241 once, starts `codex exec` in read-only mode, and keeps
raw traces local. The generated summaries are unscored evidence; a human must
review the actual traces and compare both arms before claiming an effort gain.
The offline check script validates trace summarization only; it does not run
Codex or count as a handler trial.

Record for this trial: handler type/version, cold-session evidence reference, elapsed time, read calls, search calls, code commands, reorientations/corrections, outcome. A comparison with an unassisted cold resumption requires a matched trial on the same issue and revision, performed without the Calculette projection.

## Optional local read-only orientation

```sh
node scripts/cogentia.js calculette orient 'JeanHuguesRobert/cogentia#241' \
  --root "$(git rev-parse --show-toplevel)" \
  --delta-base a60b2678c47de8e439c0807a66d92ba02c040e92 --json
```

This output is input evidence, not mandate activation. When `--delta-base` is omitted, the Git delta is unknown. All git checks are local and read-only; the handler must establish provenance separately when that matters.

## Decision

The trial passes only when the independent handler actually demonstrates steps 1–6 and a reproducible observation is attached to Issue #241. Until then, `cold_handler_validated=false`, `effort_gain=unmeasured`; no improvement percentage may be claimed.
