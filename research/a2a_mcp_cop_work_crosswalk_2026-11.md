---
title: "A2A 1.0, MCP Tasks 2026-07-28 and COP Cognitive Packets — interoperability crosswalk"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: source
document_kind: architectural-report
visibility: public
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related:
  - cognitive_packets.md
  - cognitive_packet_switching.md
  - cop_tasks_steps_mcp_tasks_crosswalk_2026-11.md
  - https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md
---

# A2A 1.0, MCP Tasks and canonical COP work

## Purpose

Manage distributed, sometimes interdependent to-do lists reliably, with
locality-first matching of durable Continuations to replaceable FractaHandlers.
Do not make the agent, a tool invocation, a Task or a scheduling projection
own the underlying Cognitive Packet. This crosswalk extends the existing
MCP/COP note rather than creating a new work protocol.

## Normative references (verified 2026-11-09)

- Official A2A **1.0.0**, latest released version:
  https://a2a-protocol.org/v1.0.0/specification/
  Source: https://github.com/a2aproject/A2A/blob/main/docs/specification.md
  and https://github.com/a2aproject/A2A/blob/main/specification/a2a.proto
- Official MCP **2026-07-28** Tasks extension:
  https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html
- COP canonical semantics:
  `inseme/packages/cop-core/Architecture.md` §§2.4–2.7, 5.2, 5.5,
  `inseme/packages/cop-kernel/src/Cop-kerneltasks.js` packet-first constructors,
  Inseme #169/#170 (Task/Step compatibility), #121 (PacketClaim), #113 (external
  result and resumption), and Operium #165 (bounded real packet consumer).

The earlier Cogentia paper (§4.1 and later A2A state-of-art) correctly stated
that Cognitive Packets need not replace A2A. It did not yet map A2A 1.0's
asynchronous Task and multi-turn lifecycle to MCP 2026 and the current COP
Packet-first policy.

## Precise overlap, and limits

| Question | MCP Tasks 2026 extension | A2A 1.0 | COP |
|---|---|---|---|
| Interaction | Deferred `tools/call`, server-chosen durable Task | Agent-to-agent `SendMessage`, `SendStreamingMessage` | CognitivePacket / Continuation handled by replaceable FractaHandler |
| Capability discovery | MCP `server/discover`, tool/extension capabilities | `AgentCard`, skills, advertised streaming / push | Local capability offers + closure / mandate / budget checks |
| Work ID | `taskId` scoped to tool request | Agent-server-issued Task `id` | Canonical stable `packetRef`, with one or more `continuationRef` |
| Context | Explicit args, task state / outstanding input | `contextId` groups Messages and Tasks; `referenceTaskIds` relates tasks | Packet lineage, Events, Artifacts, parent continuation and return |
| Progress | `tasks/get`, optional notifications, `tasks/update` input | Get/List Task, streaming and push Task status/artifact updates | Replayable Events, frontier, claims, receipts, Yields |
| Result | `Task.result`; completion can include tool `isError` | Task Artifacts and history; may also answer with a stateless Message | Result evidence -> validation/acceptance -> return -> parent assimilation |
| Cancellation | `tasks/cancel`; acknowledgement does not guarantee work stopped | CancelTask and terminal Task status | COP governed cancellation, fencing, idempotency and effect reconciliation |
| Queue/fairness | Not prescribed | Not globally prescribed | COP Level-2 selection / anti-starvation; PacketClaim coordinated by Packet locality |
| Durability | Server task retention bounded by possible TTL | Agent owns Task state; agent-side persistence requirements | Persistent Packet/Event/Artifact references independent of any agent/task handle |

### A2A facts that matter

1. **Task is stateful**, with TaskStatus and Artifacts; `Message` may instead
   finish a stateless exchange. An A2A Task may carry multiple turns/history.
2. `contextId` **groups** multiple Tasks and Messages; `referenceTaskIds`
   are correlation references, not a dependency scheduler with authorization
   or parent/child execution semantics. In A2A 1.0, the server generates
   Task IDs, and it can infer context from an existing task; mismatched
   `contextId` / `taskId` are errors.
3. Tasks may progress asynchronously with polling, streaming and push
   notifications. Interrupted tasks can be resumed with further messages,
   including `input-required` and `auth-required` states. A2A 1.0 also has
   authenticated, client-scoped Task **listing**, unlike MCP Tasks 2026,
   which deliberately has no `tasks/list`.
4. AgentCard *advertises* an agent and its skills; it does not prove current
   node availability, semantic competence, admissible COP closure, mandate,
   accounting resources or exclusive PacketClaim.
5. Task `completed` means the A2A agent's task ended; it is **not**
   automatically evidence that the parent COP Packet's situated objective
   has been accomplished or its result assimilated.

## Adapter design (no competing primary work identity)

One canonical work identity, multiple client views:

```
                     CognitivePacket (COP packetRef)
                      ├─ Continuation A (continuationRef)
                      │   ├─ MCP Task projection (mcpTaskId, local tool client)
                      │   └─ A2A Task projection (agent-issued taskId, remote agent)
                      └─ Continuation B (later/new independent subwork)
```

The relationship may be **many-to-many over time**: retries, different
handlers, or tasks representing bounded phases can create multiple protocol
handles. Never infer exact identity from a matching title or `contextId`.
Persist provider-scoped correlation and immutable request/source digests:
`(protocol, remote server/agent identity, external taskId) ->
(packetRef, continuationRef, generation, result slot, authorized mandate ref,
placement witness, execution receipt refs)`.
This is a **derived correlation projection**, not a new independent global
Packet store. When the Packet was projected on demand from observed Acts,
record provenance and materialization/identity confidence; do not silently
promote a speculative lineage to canonical Packet authority.

- **MCP tool adapter:** use MCP Tasks only if the client negotiated
  `io.modelcontextprotocol/tasks`; otherwise use existing tools returning
  bounded synchronous results or a COP Continuation handle. MCP Task
  operations must not accept arbitrary writable effects by virtue of
  being available.
- **A2A handler adapter:** publish a bounded AgentCard for a genuine handler
  capability; send a Message referencing the canonical work and the
  requested bounded Continuation; persist A2A task correlation. A2A
  TaskStatus and Artifact updates become **candidate COP Events/Artifacts**
  that must be correlated, checked and accepted. An A2A Task result is not
  a mandate to assume the parent's work or to alter its next steps.
- **Scheduling:** local-first discovery (Cogentia continuation placement),
  COP PacketClaim at the appropriate Packet's authoritative locality,
  fenced effects, and a fair Level-2 eligible frontier. A2A/MCP external
  task states are observations, never claim locks.
- **Return:** deposit the validated result at the originating Continuation
  reply slot, resume the parent as its defined computation requires, and
  audit accepted/delivered/resumed as separate events. Push notifications
  accelerate observation; bounded pull/reconciliation repairs misses.

## What to build next

The priority is **not another scheduler** or another canonical Task type.
Make a small, deterministic adapter that translates an existing COP
Continuation/Packet context into an A2A request/Task correlation record,
while preserving correlation, expected response, return slot, locality and
separate authority checks. Initially pure/read-only, verified against an
actual A2A 1.0 schema fixture; no remote dispatch or claim is implied.
Then integrate it through the same COP handler-selection seam as the
MCP adapter, after validating client/server support and mandate boundaries.
Do not promise ChatGPT currently exposes A2A as a native client; this is
provider-neutral interoperability, not an observed product capability.
