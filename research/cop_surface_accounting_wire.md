---
title: "COP surface accounting — Guide & Agent John"
date: "2026-08-13"
status: working
---

# COP surface accounting — Guide & Agent John

## Problem (corrected)

Surface cost estimates alone are not COP. Spendings must hang off **Cognitive Packets** with mandate, optional budget reservation, hops, and upstream/downstream cascade — using **`@inseme/cop-kernel` packet accounting**, not a parallel mini-ledger.

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
