---
title: "Agent John — proportionate COP delegation"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-06"
last_modified_at: "2026-11-06"
license: "CC BY-SA 4.0"
language: en
status: working-paper
document_role: source
document_kind: research-note
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-06-proportionate-delegation"
  origin_date: "2026-11-06"
  derived_from:
    - instructions/AGENTS.shared.md
    - research/integration/fractanet_principal_trust_2026-11-05.md
review:
  status: unreviewed
  reviewed_by: []
---

# Agent John — proportionate COP delegation

Owner: [#299](https://github.com/JeanHuguesRobert/cogentia/issues/299). Navigation acceptance: [#291](https://github.com/JeanHuguesRobert/cogentia/issues/291). This note interprets existing COP authority and the shared External Side-Effect Gate; it issues **no new mandate** and creates no competing authority store.

## Classes, not bureaucracy

| Class | Examples | Rule |
|---|---|---|
| Bounded private read | Inspect authorized DOM, read messages, examine files, search/index | Autonomous within independently verified identity, mandate, privacy and budget; no per-read human prompt |
| Recoverable internal edits | Local patches, tests, cache regeneration, reversible files | Autonomous with genuine bounded mandate, recovery and receipts |
| Unsent external preparation | Create/update one Gmail draft, fill an unpublished form | Candidate for verified narrowly recoverable delegated grant; not third-party emission. Remote changes still cross the existing effect gate |
| Third-party commitments | Send email or message, publish, submit, sign, represent, disclose | Prepare exact act; specific explicit Principal authorization required; email manual send default |
| Sensitive/financial/irreversible | Payments, purchases, security settings, highly sensitive disclosure, destructive actions, privileged super | Stronger scoped authorization and mandatory platform step-up; fail closed if absent |

Classify **actual consequences**, not only tool names. A read can leak privacy; a draft may send a notification on some platforms; a Git push may publish, deploy or trigger CI. The agent should raise only the consequential decision, never ask the human to approve harmless substeps. A durable, revocable, funded COP mandate avoids repeated human prompts but does not bypass third-party boundaries.

## Integration rule

Trusted channel authentication, Principal identity, COP MandateDeclaration, budget reservation, effect classification and disclosure rights are separate claims. The MCP tunnel alone does not make agent-held credentials proof of human presence. Verify once at the correct boundary, then reuse the scoped session and mandate for permitted actions. Resolve current Inseme canonical authority and budget before claiming any production permission; no auto-minted root grants.

The `assessPresumedEffect()` advisory helper now distinguishes unsent draft preparation from transmission; eligibility still requires within-mandate/budget, privacy clearance, verified recovery and negligible exposure. It does NOT authorize Gmail writes by itself. Existing `john-root-mandate.js` reserved classes remain prohibited. Tests cover draft-versus-send and financial/sensitive acts. No production policy switch or bank access has been performed.
