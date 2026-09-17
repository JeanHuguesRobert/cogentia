---
title: COP packets for external side effects
subtitle: "#171 grants and traces as Cognitive Packets — not a third protocol"
author: Jean Hugues Noël Robert, with Grok Build
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-17"
status: "working-paper"
license: "CC BY-SA 4.0"
language: en
document_role: source
document_kind: research-paper
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related:
  - "cognitive_packets.md"
  - "../docs/continuations_and_cognitive_packets_for_agents.md"
  - "../docs/host_fs_desktop_commander.md"
  - "../docs/john-cli.md"
related_issues:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/171"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/184"
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: "2026-09-17"
  derived_from:
    - research/cognitive_packets.md
    - docs/continuations_and_cognitive_packets_for_agents.md
    - scripts/lib/side-effect-authorization.js
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "research-paper"
classification_confidence: "medium"
---

# COP packets for external side effects

`#171` is tracing, mandate, and budget — not a smaller toolbox. Native Gmail, GitHub, and git capacities stay. The missing piece was that grants and traces lived beside COP (`cogentia.host_capability_trace/v1`, a flat JSON grant file) instead of **as** Cognitive Packets.

This note forbids a third protocol. It maps the two-phase gate onto kinds that already exist.

## Do not invent

| Already there | Role |
|---|---|
| Cognitive Packet envelope + payload | Portable unit; kinds include continuation, decision, failure |
| John `cognitive_packet.v0` | Admission, hops, Ithaca, operational yield |
| `cop-surface-accounting.js` | Mandate, budget, hops, spend — no parallel ledger |

`cogentia.host_capability_trace/v1` is residual. New work stores hops on the packet envelope.

## Mapping

```text
PREPARE / EXPOSE  →  packet_kind: continuation
                     next_action: authorize or refuse this exact effect
                     traces: action_class, payload_hash (never the mail/git body)

AUTHORIZE         →  packet_kind: decision
                     decision: grant | refuse
                     authority: principal / mandate
                     reversibility: single-use
                     envelope.status: active  (compat: status "granted")

EXECUTE           →  hop  route_reason: effect-executed
                     native tool or Cogentia adapter (capacity stays)

VERIFY            →  envelope.status: completed | failed
                     hop  route_reason: effect-verified
                     optional COP-kernel spend when the kernel loads
```

Failure (missing grant, mismatch, replay) is `packet_kind: failure` or a decision packet with `envelope.status: failed`. Do not add `packet_kind: external_effect` unless hops on one treatment packet prove insufficient.

## File-backed first

Grants persist as packets in the existing store (`~/.cogentia/side-effect-authorization.json` or memory in tests). Flat fields (`authorization_id`, `status: granted`, `payload_hash`) remain so current validators keep working. The packet is the source of truth for hops and kind.

COP-kernel accounting is **not** required for this slice. When it loads, record one external-effect spend on VERIFY; until then, file hops are the trace.

## Native execute

A native `gmail__send_message` or `git commit` is still a capacity. Without VERIFY (consume + hop), mandate and budget are fiction. `cogentia_side_effect_record` attaches that hop after native execute. This note does not deny those tools.

## Code

- `scripts/lib/side-effect-packets.js` — continuation / decision builders, hops
- `grantSideEffectAuthorization` — decision packet + flat grant
- `*_prepare` — EXPOSE continuation on `packet`
- `markConsumed` — `completed` + `effect-verified` hop
- Mint UI: `node scripts/cogentia.js effect grant --from expose.json --confirm <payload_hash>` and MCP `cogentia_side_effect_grant`
