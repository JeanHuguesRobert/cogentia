---
title: "John CLI — headless event contract"
date: "2026-08-20"
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: experimental
update_policy: UP-DEFAULT-REVIEWED
language: en
related_issues:
  - cogentia#112
  - inseme#54
  - cogentia#113
  - cogentia#80
  - cogentia#110
---

# John CLI — headless event contract

`john` is the portable command projection of a Cogentia LogicalAgent. It does
not make a provider, a plugin or a coding CLI into the agent's durable identity.
COP remains the authority boundary for mandate, budget, exposure, accounting,
trace and imputation.

## v0 safe contract smoke & COP Cognitive Packet bridge

The implementation is dependency-free Node.js ESM and accepts one JSON
request file:

```bash
node scripts/john.js run --request request.json --format ndjson
node scripts/john.js run --request request.json --format human
# repository example:
node scripts/john.js run --request scripts/fixtures/john-request-example.json --format ndjson
```

The request follows [`john.request.v1`](../schemas/john.request.v1.schema.json).
Upon admission, the request is bridged to an authoritative COP **Cognitive Packet** (`protocol: "cognitive_packet.v0"`) with:

1. **Ithaca Target**: Durable semantic home & return target (defaults to caller stream/principal, or explicit `ithaca` object).
2. **Hop Chain (Odyssey Trace)**:
   - Hop 0: Ingestion/Admission (`node:workstation:john-cli`, `instance: john:logical-agent`).
   - Hop 1: Capability Handler Execution (`node:handler`, `instance: mock.echo`).
   - Hop 2: Return to Ithaca (`node:ithaca-node`, `instance: return_target`).
3. **Yield Separation**:
   - `semantic_yield`: The result/answer content.
   - `operational_yield`: Execution metrics (`observed_steps`, `elapsed_ms`, `provider_cost`).
4. **Distinct Lifecycle**:
   - `dispatched` → `solved` → `returned`.

Every request declares an `execution_budget`. `max_steps` is the first hard
bound on the loop; the companion limits bound tool calls, sub-agents, elapsed
time and external effects.

NDJSON is canonical. Human rendering is a projection. Every run emits exactly
one terminal event: `john.run.completed`, `john.run.failed`, or
`john.run.cancelled`.

## Next boundary

Connect real handler adapters (Agent Gateway runtimes, OpenAI-compatible models,
MCP connectors) behind the admitted invocation → receipt → settlement path.
MCP, SSE, OpenAI-compatible and Inseme projections consume the same event
objects rather than duplicate this loop.

