---
title: Session pause 2026-09-03 — resume from GitHub issues
subtitle: Index for successor agents; Anti-Capture pointer, not vendor memory
author: Jean Hugues Noël Robert, with Grok (xAI)
date: '2026-09-03'
document_role: operational
document_kind: continuation-index
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_research:
  - docs/continuations_and_cognitive_packets_for_agents.md
  - skills/continuation-handling/SKILL.md
  - research/agent_local_memory_anti_capture.md
  - instructions/AGENTS.shared.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: '2026-09-03'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Session pause 2026-09-03

Work from this coding session is **not** in a vendor chat log. Resume from GitHub.

## Resume handles

Complete workspace (all repos, WIP vs `origin/main`, Inox/`simpli` vs `master`):

```text
resume operium/46
resume GitHub Issue 46 of repository operium
```

This session only (Guide A/B, V2 hold, zg):

```text
resume cogentia/156
resume GitHub Issue 156 of repository cogentia
```

[operium#46](https://github.com/JeanHuguesRobert/operium/issues/46) is the **fleet index**. [cogentia#156](https://github.com/JeanHuguesRobert/cogentia/issues/156) is the **session index**. Execution happens on a **child**:

| Command | Authority |
| --- | --- |
| `resume operium/45` | Live Guide V2 flip — **hold**; A/B done |
| `resume cogentia/152` | zvec-grep (`zg`) P0 on Principal Windows PC |
| `resume cogentia/150` | R1 residue — merge PR #149 |
| `resume cogentia/151` | FBF attention, not Principal lock — merge PR #151 |
| `resume operium/44` | FBF backlog — merge Operium PR #44 |
| `resume cogentia/141` | Rossignol — PR #144; separate tree |
| `resume operium/46` | Fleet WIP vs main/master (Inox, Operium DNS/ONA/browser, inseme COP, ubikia, barons) |
| `resume Inox/34` | Spec/runtime audit — uncommitted on `master` |
| `resume operium/37` | DNS/mail branch `wip/mail-dns-cutover` (split before merge) |
| `resume inseme/61` | COP Trace-Centric; `inseme` checkout is clean `main` |

## Facts a successor must not re-litigate

- Public Guide is reachable. Fracta `mcp-cogentia` at Cogentia `3e09630`.
- `COGENTIA_GUIDE_ALLOW_V2_PROBE=true` only; **global V2 unset**.
- 11×2 Guide eval: V2 used, 0 fallback, ~1.75× slower, mixed quality — **no flip**.
- `zg` is Alibaba Zvec (`zvec-ai/zvec-grep`), not DeepSeek.
- No COP/Core rewrite. FBF does not lock or watch the Principal. Operium owns live fracta ops.

Eval JSON dumps are gitignored (`.cogentia/evals/guide/`). Durable A/B receipt: [operium#45](https://github.com/JeanHuguesRobert/operium/issues/45#issuecomment-5521839087).
