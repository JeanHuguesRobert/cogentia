---
title: "COP surface accounting — Guide & Agent John"
date: "2026-08-13"
status: working
document_role: "source"
document_kind: "tutorial"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "tutorial"
classification_confidence: "medium"
---

# COP surface accounting — Guide & Agent John

## Problem (corrected)

Surface cost estimates alone are not COP. Spendings must hang off **Cognitive Packets** with mandate, optional budget reservation, hops, and upstream/downstream cascade — using **`@inseme/cop-kernel` packet accounting**, not a parallel mini-ledger.

## Governance convergence: comprehensive accountability without micromanagement (2026-10-31)

**Purpose:** make explicit how COP packet accounting serves the Sovereign Principal, the Cogentia Personal Digital Twin (Agent JHN), and delegated agents without making every low-risk step a human approval event. This is an architectural convergence target, **not a claim of current universal instrumentation or formal completeness**.

- **Trace consequential acts comprehensively; supervise proportionally.** Every governed effect is attributable to an actor, principal, mandate, causal packet, outcome and evidence. Small internal operations within a valid, bounded, recoverable mandate should flow without repeated Principal approvals. Human intervention is reserved for exceptions, reserved acts, material risk or exhausted authority.
- **Account in native resource dimensions and balanced entries.** The normative source is [COP/Accounting](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/COP_ACCOUNTING.md): append-only Events, exact balanced postings per conserved resource/unit/domain, reservations, settlement and compensating reversals. The packet-spend adapter below is **not** a second mutable ledger and its provisional USD estimates are **not** a substitute for authoritative double-entry postings.
- **Aggregate without concealing responsibility or double-counting.** Sub-agent activity is causally linked to the parent work packet. A consolidated budget/cost projection counts each underlying posting once; it does not replicate child spending as new parent spending. A batch may carry one human-readable receipt while preserving the verifiable evidence needed for accounting and investigation.
- **Apply mandate attenuation and budget control at effect boundaries.** A child mandate cannot widen its parent's powers; enforceable limits must be reserved before consequential execution and reconciled against observed use. Where the enforcement adapter is absent, report a coverage gap rather than claiming COP guarantees.
- **Append-only is necessary but not sufficient.** Corrections append new events. Completeness additionally requires mandatory interception of applicable effects, authenticated identities, failure/refusal traces, durable persistence, independent reconciliation and verification; tamper evidence and off-node attestation can strengthen the record without requiring blockchain.
- **Budget human attention explicitly.** Measure interruptions and decisions asked of the Principal separately from compute, money and quotas. Supervise exceptions asynchronously and deliver concise summaries; recording detail must not compel the Principal to inspect every tool call.

**Convergence indicators:** governed-effect coverage = externally inventoried governed effects linked to valid COP receipts / externally inventoried governed effects; and Principal supervisory burden = interruptions requiring human decisions / completed delegated work units. Neither denominator may be inferred solely from events already visible to COP. Measure observation gaps, non-instrumented tools and sampled reconciliation independently; do not report 100% coverage based on self-observation.

**Operating maxim:** *Trace comprehensively, control proportionally, authorize durably, supervise by exception, account with balanced entries, and report by synthesis.*

The distinction is between **completeness of accountability** and **granularity of intervention**. Durable COP evidence is the mechanism of responsibility, not a reason to introduce approval bureaucracy into every internal step.

## Integration

| Layer | Role |
|-------|------|
| `inseme/packages/cop-kernel/.../packetAccounting.js` | Authoritative create/spawn/spend/own/consolidated |
| `cogentia/scripts/lib/cop-surface-accounting.js` | Thin adapter: load COP, open turn packets, spawn steps, project API fields |
| Guide `produceGuideTurn` | Opens turn packet; synthesis spend on **downstream** `synthesis` packet |
| WhatsApp `buildGuideDraft` | Opens WhatsApp turn packet; local OpenAI spend on **downstream** `whatsapp_synthesis`; **does not** copy Guide spend lines |

## Cascade for one Guide turn

```text
urn:cop:packet:turn-…          (upstream / cascade root)
  mandate_id: mandate:fractavolta-public-guide:readonly
  treatment_id: treatment:guide-chat-turn
  own_spend: often $0
  └── downstream synthesis packet
        spending[]: provider tokens + provisional USD
```

`consolidated_spend(turn) = own(turn) + consolidated(synthesis)`.

## Anti double-count

- Guide HTTP and WhatsApp each open **their own** treatment packet.
- WhatsApp may *reference* `guide_packet_id` in payload only — never import Guide `spending[]`.
- Spend lines live on exactly one packet; rollup is projection only.

## Response fields

Guide JSON:

```json
{
  "cost_estimate": { "...", "cop": { "packet_id", "own_spend_usd", "consolidated_spend_usd" } },
  "cognitive_packet": { "kind": "cop_surface_turn_accounting/v1", "..." }
}
```

## Env

| Variable | Meaning |
|----------|---------|
| `COGENTIA_COP_SURFACE_ACCOUNTING` | default on; `0` disables |
| `COGENTIA_COP_PACKET_ACCOUNTING_PATH` | override path to packetAccounting.js |
| `COGENTIA_COP_ACCOUNT_ID` | debtor account URL |
| `COGENTIA_COP_BUDGET_RESERVATION_ID` | optional reservation |
| `COGENTIA_COP_SPEND_SPOOL` | optional NDJSON path for provisional traces |

## Tests

`node scripts/test-cop-surface-accounting.js`
