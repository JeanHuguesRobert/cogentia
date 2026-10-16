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
4. Reconcile the FBF merge PR #234 into main with the **still draft** PR #246. Do not incorrectly classify draft commits as merged or deployed.
5. Inspect Git evidence (locally or via GitHub) and distinguish verified data from claims; if the locally based `--delta-base` is usable, show baseline/head/commit count and any truncation. The count is not an invariant: PR #246 may advance.
6. Return a bounded next-action recommendation, remaining uncertainties, and zero-effects / actions actually taken. Do not manufacture authorization.

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
