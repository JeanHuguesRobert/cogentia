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

## Symmetric MCP Projection (`cogentia_john_run`)

Following the Capability Symmetry pattern (#110), `john` is projected into the Cogentia MCP server ([`scripts/cogentia-mcp.js`](../scripts/cogentia-mcp.js)):

- **Tool Name**: `cogentia_john_run`
- **Input Parameters**: `prompt`, `capability`, `principal_id`, `mandate_id`, `budget_id`, `exposure`, `max_steps`, `max_tool_calls`, `max_elapsed_ms`, `handler`, `ithaca`, or full `request` object.
- **Output**: Structured MCP packet response containing `ok`, `packet_id`, `status`, `text`, `yield` (semantic + operational), `accounting`, and reconstructed `odyssey`.

External assistants and clients (Claude Desktop, IDEs, peer agents) can invoke the exact same COP-governed execution without duplicating the loop.

## Inter-Machine / Inter-Agent Handoff (`john handoff`)

`john handoff` enables cross-machine delegation between distinct environments that share **no RAM and no raw database files** (each machine maintains its own isolated SQLite cache):

```bash
# 1. Machine A: Pack a request into a sealed Cognitive Packet with Git provenance and Ithaca
node scripts/john.js handoff pack --request request.json --out sealed-packet.json [--target node:remote-worker]

# 2. Machine B: Unpack and inspect provenance without execution
node scripts/john.js handoff unpack --packet sealed-packet.json

# 3. Machine B: Execute locally with local SQLite and produce return yield targeting Ithaca
node scripts/john.js handoff run --packet sealed-packet.json --out return-yield.json
```

- **Sealed Packet**: Combines bounded values (prompt, limits, mandate, Ithaca) with verifiable references (Git commit SHA, branch).
- **Return Yield**: Produces a `john.yield.handoff` packet (`status: "solved"`) addressed to the original caller's Ithaca channel with full Odyssey hop trace.
- **Continuous Availability**: Supports direct next-hop routing optimization with automatic fallback to capability providers, attractor pool broadcast, and store & forward spooling.

## Interactive REPL & Modular Diagnostic Console (`john repl` / `john inspect`)

John provides an interactive console distinguishing **Conversational Mode** (standard execution) from **Diagnostic & Investigation Mode** (deep system introspection):

```bash
# Start interactive REPL console
node scripts/john.js repl [--mode diagnostic|conversational]

# CLI direct inspection commands
node scripts/john.js inspect capabilities [--filter <query>]
node scripts/john.js inspect topology [--probe <nodeId>]
node scripts/john.js inspect continuations [--status alive|all]
node scripts/john.js inspect packet --packet <packet.json>
```

### Modular Inspectors (`scripts/lib/john-diagnostic/inspectors/`)

The architecture decouples diagnostic capabilities into modular inspectors:
- **`CapabilityInspector`**: Introspects the catalogue of mobilizable capabilities, providers, rate cards, and risk classes (`none`, `read_only`, `bounded`, `consequential`).
- **`PacketOdysseyInspector`**: Reconstructs complete Odyssey journey traces, hop chains, residues, and Ithaca settlements.
- **`ContinuationInspector`**: Inspects paused judgment boundaries, pending human review tickets, and arbitration tokens (#80).
- **`AccountingInspector`**: Audits double-entry ledger postings, provisional token rates, and remaining budget headroom.
- **`TopologyInspector`**: Probes Fractanet node reachability, network latency, attractor pools, and spool queues.

### REPL In-Session Commands

Inside the REPL, dot commands provide instantaneous diagnostic inspection:
- `.mode [diagnostic|conversational]` — Toggle between full diagnostic event tracing and clean conversational output.
- `.capabilities [filter]` — List and filter available capabilities.
- `.cap <name>` — Inspect capability detail, audit limits, and rate card.
- `.topology` / `.probe <nodeId>` — Probe network latency and node reachability.
- `.continuations` — Inspect paused judgment boundaries.
- `.eval <prompt>` — Execute a single governed step and display its granular event trace.
- `.exit` / `.quit` — Terminate session.


