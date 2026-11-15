---
schema: cogentia.agent_skill/v1
id: cogentia.side-effect-authorization
version: 4
status: "working-paper — experimental"
name: side-effect-authorization
description: >
  Two-phase authorization for sends and other external side effects (cogentia#171).
  Use before gmail.send, GitHub write, host.fs.write, or any effectful adapter.
title: "Side-effect authorization"
author: unknown
affiliation: unknown
date: null
last_modified_at: "2026-11-15"
license: CC BY-SA 4.0
language: en
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
effects: prepare_only
sources:
  - docs/host_fs_desktop_commander.md
  - docs/cogentia-mcp.md
  - instructions/AGENTS.shared.md
  - scripts/lib/side-effect-authorization.js
  - research/cop_side_effect_packets.md
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
---

# Side-effect authorization

```text
PREPARE → EXPOSE → AUTHORIZE → EXECUTE → VERIFY
```

The gate is **tracing, mandate, and budget** — not amputating tools.
Tool availability is not authority. Native Gmail/GitHub/git capacities stay.

Never mint a grant from chat. `authorizationFromUtterance` is always false.

Before a write-class execute, **classify the effect against the standing mandate**, then follow the shortest lawful path (do not demand an interactive grant automatically for every comment, commit, DNS record or deploy):

1. EXPOSE the exact payload (Cogentia `*_prepare` tools, or an equivalent preview).
2. Locate the **existing standing authorization** and determine whether this is an ordinary recoverable operation within it. Reuse that durable mandate and its already verified authority at dispatch; no new per-act human mandate. Where a high-impact action truly needs independent Principal approval, use the mint UI and verified issuer when available, never forge a grant from chat or workflow narration. A valid, explicit Packet mandate can itself authorize an in-scope operation. In particular, when the owning Issue's acceptance/return contract requires a result report there, its mandate authorizes one factual comment on that same Issue, bounded to the declared fields; do not request a second approval or a separate UI grant for that report. Do not widen this exception to other GitHub writes, publication, disclosure, or third-party contact. Provider and account controls still apply.
3. EXECUTE with the native tool **or** the Cogentia adapter.
4. VERIFY: if you used a Cogentia `*_write`/`_send` adapter, consume already happened. For other native effects, call `cogentia_side_effect_record` with the applicable authorization, target, payload and a redacted receipt when that recorder is available. For the owning-Packet report exception, verify the exact comment and retain its returned comment ID as the Packet's execution receipt; do not block the mandated result on a separate Principal-facing grant.

Reads stay ungated. Drafts are PREPARE, not EXECUTE.

## Mandate-derived low-risk autonomy and reserved acts (Cogentia #285)

**Standing mandate first, per-act ceremony exceptional (Principal clarification 2026-11-15).** A durable authority for ordinary bounded work must support many independent technical effects with automatic validity/scope/revocation/budget checks, not ask for a fresh signature or human attention for every low-risk operation. Examples include direct-main non-sensitive corpus corrections, idempotent static-site publication of already agreed public material, and **creation of one nonconflicting DNS-only CNAME** beneath an existing Principal-controlled zone to a known reviewed origin. These are technical maintenance acts, not communications committing the Principal to third parties. Do not extend that presumption to NS/MX/mail changes, domain transfer, financial commitments, public declarations under the Principal's name, disclosure or unauthorized privilege escalation.

The existing `assessPresumedEffect` is *advisory*. The current `mintMandateDerivedGrant` supports only the narrowly constrained JHN workspace `host.fs.write` path, and the deployed `host.process.run` lacks the configured trusted mission resolver. This is an **implementation gap**, not a reason to repeatedly interrupt the Principal, issue one-off DNS mandates, or say the existing policy has been cryptographically activated. Correct the shared authority adapter once; until then distinguish `user-delegated` from `COP-admitted` in receipts, and preserve genuine issuer/provider constraints. Caller-supplied references are not independent authorization evidence.

**Hard boundary:** email is draft-only. Prepare/update the draft, identify it to the Principal, and leave sending to the Principal. Neither a general mandate nor a previous approval can authorize an outbound email. The implementation rejects every agent send grant, including caller-supplied claims of explicit consent, until a trusted interface can verify an exceptionally justified, current, act-specific approval. The same preparation-without-emission rule governs other acts comparably committing the Principal to third parties, including public postings and formal submissions.

At intermediate milestones, continue useful allowed work automatically instead of asking for "continue"; request human judgment only when a substantive decision or hard gate requires it. Stop on successful verified completion, not on an arbitrary substep.

## Gmail

`gmail__create_draft` / `list_drafts` / `get_message` are fine without a grant.
`gmail__send_message` / `send_draft` / `forward` / `reply_all` are disabled in the current implementation; prepare a draft and notify the Principal. `direct_send_exception` fields supplied by a caller are not accepted as proof of approval.
Prefer `cogentia_communication_prepare` then execute (native send or `cogentia_communication_send`).

## GitHub writes

`github__issue_read` / `list_issues` are ungated. Ordinary `github__add_issue_comment` / `issue_write` actions within the standing coding/maintenance mandate require a verified scope and receipt, **not a second human mandate each time**; higher-impact public commitments are separate. Exception: the active owning Issue's explicit acceptance/return contract can authorize one factual result comment on that same Issue, limited to its stated fields. Verify the native tool receipt and do not ask again for this required Packet trace.
Prefer `cogentia_github_prepare` then execute when available.

## WhatsApp

Agent JHN still does not call Baileys `sendMessage` directly. `requestOutboundSend` is the enqueue frontier. In-mandate self-chat replies: JHN mints and consumes the COP grant itself (no Principal judgment). Out-of-mandate never reaches send (policy / usage-grant / `SEND_ENABLED`). Principal mint is for effects outside that mandate (e.g. Grok + Gmail), not for every JHN ping.

## Git commit / push

`git status` / `diff` / `log` are ungated.
`git commit` / `git push` **within the standing coding/maintenance mandate** require bounded scope, optimistic conflict checks and trace, but **no repeated Principal confirmation**. A valid reusable standing COP authorization may admit the exact effect automatically. Effects outside mandate or with material exposure still require their appropriate independent authorization.
Prefer `cogentia_git_prepare` then execute (native git or `cogentia_git_write`).
