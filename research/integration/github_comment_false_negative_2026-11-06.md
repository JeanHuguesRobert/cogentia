---
title: "GitHub comment false-negative and verification before retries"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: 2026-11-06
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: incident-report
visibility: public
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-06-gh-comment-false-negative"
  origin_date: 2026-11-06
  derived_from:
    - instructions/AGENTS.shared.md
review:
  status: unreviewed
  reviewed_by: []
---

# Ambiguous GitHub comment outcome: observed false negative

**Owning packet:** Cogentia [#285](https://github.com/JeanHuguesRobert/cogentia/issues/285). Also relevant to #299 and packet-owned reporting.

## Evidence

A shell-backed command attempted two `gh issue comment` operations. The execution interface returned `This tool call was blocked by OpenAI's safety checks.` Independent GitHub queries later proved both comments existed: [#291 / 6686737480](https://github.com/JeanHuguesRobert/cogentia/issues/291#issuecomment-6686737480), timestamp 2026-11-06T14:06:52Z, and [#299 / 6686737957](https://github.com/JeanHuguesRobert/cogentia/issues/299#issuecomment-6686737957), 14:06:53Z. The write effects occurred despite the failure-shaped response. Its filtering layer and precise cause remain unknown.

## Reusable correction

Distinguish transport status, remote side effect and semantic fulfillment. Any ambiguous reply after a state-changing action means `OUTCOME_UNKNOWN`, not a proven failed execution. Read the destination, compare the exact target and payload or provider idempotency key and return `EFFECT_VERIFIED` only for independently confirmed effects. An absent, delayed, incomplete or conflicting observation remains uncertain, never a reason to retry blindly. Duplicates require reconciliation rather than another write.

The pure `scripts/lib/effect-outcome-reconciliation.js` helper compares target and SHA-256 of exact comment bodies. It never performs networking, retries or creates grants. It is an advisory building block, not integration into every provider's dispatch path. Tests cover the documented false-negative and negative/ambiguous observations. The common agent instructions require verification before retry for effects across providers. No increased rights to send emails, publish, disclose or pay.
