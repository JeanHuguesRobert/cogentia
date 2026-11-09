---
title: "COP Cognitive Packets, Tasks, Steps, Continuations and MCP Tasks 2026-07-28 — crosswalk"
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
  - ../docs/cogentia-mcp.md
  - https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md
---

# COP work identity and the MCP 2026-07-28 Tasks extension

## Problem in ordinary terms

Manage distributed to-do lists, with dependencies, fairly and reliably, while
using local capabilities first and ensuring that delegated results resume the
work that requested them. A to-do list is a *projection over a distributed
work graph*, not an additional canonical work registry.

## Prior art and existing decisions (do not re-invent)

- COP `Architecture.md` §2.4: a COP **Task** is an *optional, event-derived
  objective/lifecycle projection* within a Topic. A routable **CognitivePacket**
  is the canonical identity. Task IDs cannot confer authority over Packet
  locality, claims, budget or effects.
- COP §2.5: a **Step** is a finer-grained local execution projection; it
  belongs to a Task, and is not promoted into a separate Packet unless it
  needs independent routing, placement, suspension, claims, budget, effects
  or Ithaca. Both Task and Step must remain replayable projections.
- COP §2.7/§5.5: **Continuation** expresses the durable suspended state and
  conditions for resumption of the Packet computation. A handler's limited
  delegation must not make it the owner of the parent work.
- Inseme #169 and #170 (closed, 2026-10-18) made `CognitivePacket` the primary
  identity and the historical Task/Step/Job paths compatibility projections.
  `createPacketWithInitialContinuation` is the packet-first constructor;
  `createTaskWithInitialContinuation` is a compatibility facade.
- Cogentia `l8` historical antecedent (`research/cognitive_packets.md` §4.6):
  Task/Step decomposition predates COP, but native in-process continuation
  closures did not survive runtime boundaries.
- Cogentia `continuation placement` now offers a read-only locality-first
  handler candidate projection; it does not claim or execute work. Inseme
  #121 owns PacketClaim coordination, #113 external result admission/rejoin;
  Operium #165 has a bounded real-world packet consumer.

## MCP version verified

As at 2026-11-09, the latest **stable** MCP spec release is **2026-07-28**:
https://github.com/modelcontextprotocol/modelcontextprotocol/releases

Official MCP Tasks extension (SEP-2663):
https://github.com/modelcontextprotocol/ext-tasks/blob/main/specification/2026-07-28/tasks.md

In MCP 2025-11-25, Tasks were experimental in core. In 2026-07-28 they moved
into optional `io.modelcontextprotocol/tasks` and changed incompatibly.
The modern core is stateless, drops protocol session/initialization, and
supports `server/discover` plus per-request version/capabilities. The Tasks
extension is currently applied to `tools/call` and is advertised by the
client *per request*; if advertised, the server can elect to return a
`CreateTaskResult` (`resultType: "task"`) instead of a normal tool result.
`tasks/get`, `tasks/update`, `tasks/cancel` manage the task. `tasks/list` and
`tasks/result` from the old experimental surface are **not** part of this
modern extension. A created handle must already be durably retrievable.

`Task.status` is one of `working`, `input_required`, `completed`, `failed`,
`cancelled`; completed results are in `tasks/get`'s `result`, not a separate
`tasks/result`. Importantly, `completed` can include a tool-level `isError`
result: never equate MCP completion with COP mission success. MCP `ttlMs`
allows eventual deletion; it is **not** sufficient durable retention for a
COP packet. Likewise, `pollIntervalMs` is a client polling hint, not a fair
scheduler policy.

MRTR (`resultType: "input_required"`) addresses in-call exchange, whereas
MCP Tasks handle deferred, handle-backed execution; neither replaces the
COP child Continuation's semantic resumption contract. MCP's `Mcp-Method`
/ `Mcp-Name` headers are transport routing hints, not locality or effect
mandates. The protocol's stateless server architecture is compatible with
COP locality, but does not implement distributed COP coordination.

## Non-identical entities: adapter crosswalk

| Underlying COP | Possible MCP projection | Mandatory distinction |
|---|---|---|
| CognitivePacket | Opaque canonical `packetRef` returned in tool result / tool args | Never equate `taskId` to canonical Packet identity; references must survive task expiry |
| COP Task | Optional client-facing progress/status view | MCP Task only describes *one tool request*; not necessarily the whole objective graph |
| COP Step | Local tool operation or invocation substep | Keep local unless autonomously routable; no Step-to-Packet inflation |
| Continuation | Deferred task handle plus COP `continuationRef`, or `input_required` for a bounded exchange | A return slot and parent resume are COP semantics; an MCP Task does not transfer work ownership |
| Handler/FractaHandler | MCP tool-serving adapter with declared capability | Available/advertised does not prove handler competence, local closure, mandate or funding |
| COP Scheduler/PacketClaim | Not provided by MCP Tasks | COP keeps fairness, exclusive claim, epochs/fencing, locality and idempotent effects |
| COP Event/Artifact/Receipt | MCP terminal `result` / status projection and trace references | Do not convert tool completion into accepted Judgment or verified effect without COP checks |

## Minimal integration seam

1. Expose a **bounded** MCP tool that accepts an existing `packetRef` or
   `continuationRef`, *not* an arbitrary executable string. Discover the
   canonical Packet/Continuation and permitted handler capability through
   local COP views. Do not invent a global registry.
2. After capability negotiation, the server may offer a modern MCP Task
   handle. Persist a correlation mapping
   `taskId -> (packetRef, continuationRef, admitted request digest,
   handler capability, placement witness, return slot)` in an appropriate
   *local derived store*, not a new primary work identity.
3. Admit the claim through COP PacketClaim, and then mandate, budget and
   execution binding. Do not mark `working` as proof that any handler
   acquired an authorized claim. Delivery is at-least-once; effects need
   fencing/idempotence.
4. `tasks/get` projects the local COP state and may return
   `input_required`; `tasks/update` records bounded input evidence without
   letting a client rewrite the parent Packet; `tasks/cancel` is a request
   to reconcile cancellation and any in-flight effects, not necessarily
   a proof that work ceased.
5. Upon result, produce a COP receipt; validate, assimilate, and resume the
   parent. MCP task `completed` is distinct from result *accepted*, result
   *delivered* and work *resumed*. Retain canonical COP state beyond the
   transient MCP Task TTL.
6. Use provider-defined `pollIntervalMs` plus subscriptions or callbacks
   where supported, with bounded repair polling. The **COP Level-2 Scheduler**
   owns anti-starvation and capability/locality decisions, not MCP.

## Implementation inventory and remaining gap

Cogentia's MCP core already supports dual protocol eras, including
`2026-07-28` discovery, while its original `PROTOCOL_VERSION` constant
retains `2025-11-25` compatibility (`scripts/lib/cogentia-mcp-core.js`).
Inseme Ritornu MCP hub advertises the modern era. Current searched Cogentia,
Inseme and Operium MCP implementation paths do **not** expose
`io.modelcontextprotocol/tasks` / `tasks/get` / `tasks/update` / `tasks/cancel`
as a complete integrated feature. This is a **gap**, not proof they do not
exist in another unrelated installation.

First next step: implement a **thin, version-gated, read-only mapping** of
an existing COP Continuation to a modern MCP Task view, preserving the
canonical Packet ID and the receipt/return distinctions. Follow only after
proving that mapping with a real accepted tool invocation; defer
mutating `tasks/update`, claims, execution and cancel effects to the
existing COP/ONA authorized execution adapters. No new scheduler.
