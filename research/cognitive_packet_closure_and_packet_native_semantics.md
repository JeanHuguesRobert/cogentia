---
title: "Cognitive Packet Closure and Packet-Native Semantics"
subtitle: "Granularity, causal continuity, placement, effects, and the requirements that emerge when packets become the primary unit of cognitive work"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica, France"
date: "2026-08-25"
last_modified_at: "2026-08-26"
version: "0.2"
status: "working source note"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
visibility: "public"
lifecycle_state: "working"
methodology:
  - "Second Method"
  - "Reactive Corpus"
  - "Cognitive Packet Switching"
related_documents:
  - "research/cognitive_packets.md"
  - "research/cognitive_packet_switching.md"
  - "research/documents_as_cognitive_packets.md"
  - "research/semantic_propagation_rule.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/src/packet.ts"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/COP_MANDATED_AGENT_SECURITY.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/jhn_architecture.md"
tags:
  - cognitive-packets
  - cognitive-packet-switching
  - packet-closure
  - continuation
  - call-cc
  - packet-granularity
  - causal-frontier
  - packet-placement
  - packet-store
  - event-effect-event
  - effect-intent
  - reactive-corpus
  - jhn-architecture
  - distributed-cognition
update_policy: "UP-DEFAULT-REVIEWED"
changelog:
  - "v0.1 (2026-08-25) — initial formalization of Packet Closure and packet-native semantics."
  - "v0.2 (2026-08-26) — clarified that Closure is relative to a declared admissible-handler environment; separated self-bootstrap from closure conformance; decomposed ambiguous lifecycle `forget`."
---

# Cognitive Packet Closure and Packet-Native Semantics

## 1. Status

This note records concepts that emerged from implementation and comparison work around Cognitive Packets, COP, the Reactive Corpus, *The Network is the Learning Computer*, and JHN Architecture.

The important methodological observation is that the concepts below were not introduced primarily to enrich a vocabulary. They repeatedly become necessary once the **packet** is treated as the primary unit of cognitive work.

The working hypothesis is therefore:

> **Packet-centric cognition has structural requirements. Closure, identity, lineage, placement, routing, effects, receipts, return, assimilation and lifecycle are not optional decorations; they are consequences of making cognitive work independently movable and continuable.**

The exact schemas remain provisional. The architectural pressures are the object of this note.

---

## 2. From continuation to Packet Closure

A continuation represents what remains of a computation.

In languages exposing `call/cc` or related continuation primitives, capturing a continuation is comparatively cheap conceptually because the continuation normally remains inside a runtime that already has access to the relevant process memory, code, bindings and execution conventions.

The runtime shares an implicit memory universe with the continuation.

Cognitive Packet Switching removes that assumption.

A packet may:

- leave the process that created it;
- leave the machine that created it;
- cross a network partition;
- wait for an arbitrary duration;
- move between heterogeneous runtimes;
- be handled by a human, program, LLM, institution or future system;
- survive replacement of its original provider;
- move through several storage technologies;
- return to an Ithaca that may itself have evolved.

The missing notion is **Packet Closure**.

### 2.1 Definition

> **Packet Closure is the condition under which, relative to a declared admissible-handler class and shared execution environment, a Cognitive Packet carries or can verifiably materialize the complete set of information required for a handler to continue the packet without reconstructing undocumented private context.**

Closure is therefore relational rather than absolute.

A useful notation is:

\[
Closed(p,h,E)=true
\]

where:

```text
p = the Cognitive Packet / Capsule being resumed
h = an admissible handler
E = the declared shared execution environment
```

`E` may legitimately include documented and reachable conventions such as:

```text
protocol version
schemas
handler contract
resolver rules
shared Corpus
public instructions
installed declared Skills
standard runtime / ABI conventions
```

Closure MUST NOT silently depend on:

```text
the previous handler's private session memory
untracked local notes
undocumented conversational context
unstated author intention
private conventions not declared by the packet or environment
```

This distinction matters because a zero-knowledge receiver is not automatically an admissible handler. Requiring every packet to teach an epistemically blank receiver the entire protocol, Corpus and surrounding civilization would make bounded closure impossible in practice.

A separate **self-bootstrap** profile may deliberately test whether a packet can teach enough protocol to a previously foreign handler. That is an additional capability, not the default conformance meaning of Packet Closure.

Closure does not mean that every byte of history is copied into every packet.

A packet can be closed by value, by stable reference, or by a materializable combination of both.

### 2.2 Closure modes

```text
INLINE CLOSURE
    required state travels physically with the packet

REFERENTIAL CLOSURE
    required state is available through stable, verifiable references

MATERIALIZABLE CLOSURE
    the packet declares enough store/location information for a resolver
    to retrieve and verify all required state before handling
```

A practical packet may mix all three modes.

The mode concerns **where required continuation state comes from**. It does not erase the admissible-handler contract. An INLINE packet may still assume a documented protocol or schema; a REFERENTIAL packet may be fully closed for a handler whose declared environment can resolve the references.

### 2.3 Closure versus self-description

Self-description and closure are related but distinct.

```text
self-description:
    how should this packet be interpreted?

closure:
    can the declared handler/environment obtain everything required
    to continue it without undocumented private context?

self-bootstrap:
    can a previously foreign receiver materialize enough protocol
    to become an admissible handler?
```

A packet may describe its schema perfectly while still containing a dangling reference. It is self-describing but not closed.

Conversely, two systems may share documented conventions that make a packet operationally closed without embedding a human-readable explanation of the entire protocol in every capsule.

The boundary should be explicit. For example, an admissible Reviewer handler might be defined as one that:

```text
MUST understand or materialize the declared Reviewer contract
MUST be able to resolve the declared Corpus references
MUST preserve stated markers, constraints and return semantics
NEED NOT know the originating conversation
NEED NOT share the previous model's private state
```

### 2.4 Closure and `call/cc`

The relationship to continuation primitives is structural.

A process-local continuation can rely on implicit shared memory:

```text
call/cc
→ continuation value
→ same runtime / address-space assumptions
```

A Cognitive Packet continuation cannot rely on that hidden process environment:

```text
continuation
→ Packet Closure
→ explicit or materializable dependencies
→ declared handler environment
→ transport
→ heterogeneous handler
→ resumption
```

Packet Closure can therefore be understood as one of the costs of making continuations **location-independent and runtime-independent**.

This does not imply that a Cognitive Packet serializes a native call stack. Closure may be reconstructed from code, inputs, memoized effects, Artifacts, Events, Corpus references, snapshots or other representations.

---

## 3. Packet Capsule and causal frontier

A packet that accumulated its complete immutable history at every hop would grow monotonically and eventually become impractical.

The travelling representation should therefore be distinguished from the complete historical truth.

A useful working distinction is:

```text
Packet identity
    stable identity of the cognitive work

Event / Artifact history
    append-only evidence of what happened

Packet snapshot
    current materialized state

Packet Capsule
    the bounded representation needed to move/resume the packet now
```

A Packet Capsule may contain:

```yaml
packet_id: ...
snapshot: ...
causal_frontier: ...
closure: ...
authority_context: ...
lineage: ...
placements: ...
ithaca: ...
```

The **causal frontier** identifies the historical point through which the capsule claims to represent the packet.

A receiver can then determine whether its local view is sufficient, stale, divergent or in need of materialization.

This makes `self-contained` compatible with bounded packet size.

---

## 4. Packet granularity

A packet boundary should not primarily be chosen by byte count, token count or duration.

A Cognitive Packet deserves independent identity when some portion of work can usefully be treated independently along one or more of these dimensions:

```text
routing
resumption
authorization
accounting
failure
retry
cancellation
branching
return
reuse
archival value
```

Working heuristic:

> **Split a Cognitive Packet when a portion of work can reasonably be routed, paused, retried, authorized, accounted for, cancelled, returned or reused independently.**

Conversely, large payload size alone does not require a new Cognitive Packet. A large dataset may remain an externally referenced Artifact inside the closure of one packet.

This makes Cognitive Packet granularity primarily **semantic and governmental**, secondarily computational, and only incidentally physical.

---

## 5. Fractal composition and lineage

Packet handling may create downstream packets whose resolution is necessary, useful or competitive with respect to the upstream packet.

COP already exposes composition patterns analogous to:

```text
fork
all / join
race / any
sequence
cascade cancellation
```

Packet-native reasoning requires at least two different relation structures.

### 5.1 Authority lineage

For responsibility and accounting, there should normally be one privileged upstream authorization path:

```text
Principal
→ mandate
→ root packet
→ downstream packet
→ downstream packet
```

This makes the origin of delegated authority reconstructible.

### 5.2 Semantic relations

Cognitive dependencies are not necessarily a tree. They naturally form a graph.

A result may depend on several packets; one packet may satisfy several others; a packet may supersede, contradict, derive from or cross-pollinate another packet.

Therefore:

```yaml
lineage:
  authority_upstream: packet-A

relations:
  - type: depends_on
    packet: packet-B
  - type: derived_from
    packet: packet-C
  - type: supersedes
    packet: packet-D
```

The authority tree and the semantic DAG must not be collapsed into one structure.

---

## 6. Packet identity is independent of storage

A Cognitive Packet is not a SQLite row, a PostgreSQL row, a GitHub Issue, a Git object or an archive object.

Those are placements or projections of the packet.

The same logical packet may have several placements simultaneously.

```text
Packet X
├── local SQLite placement
├── principal long-term SQL placement
├── Git/GitHub corpus placement
└── cold archive placement
```

The architectural invariant is:

> **Storage location is mutable metadata about a packet; it is not the packet's identity.**

This is required for mobility, replication, failover, sovereignty and long-term preservation.

---

## 7. Logical Packet Stores and physical bindings

Store identity should be separated from the technology implementing it.

For example:

```yaml
store_id: principal:john:longterm
binding:
  adapter: postgres
  provider: supabase
```

may later become:

```yaml
store_id: principal:john:longterm
binding:
  adapter: postgres
  provider: selfhosted
```

without changing packet identity or higher-level COP semantics.

### 7.1 Capability-based stores

A single universal `PacketStore` interface would hide important asymmetries.

Stores should instead advertise capabilities such as:

```text
ObjectStore
EventStore
SnapshotStore
SearchStore
IndexStore
ArchiveStore
TransactionalStore
SubscriptionStore
```

and characteristics such as:

```text
latency
durability
availability
retention
cost
maximum object size
transaction semantics
offline capability
search capability
jurisdiction
trust / sovereignty class
```

A routing or lifecycle policy can then select stores according to required properties rather than vendor names.

---

## 8. Placement, promotion and memory temperature

A Reactive Corpus naturally contains several memory temperatures.

A provisional hierarchy is:

```text
hot volatile memory
→ local working store
→ durable operational store
→ corpus / Git placement
→ cold archive
→ offline / posterity preservation
```

Movement between tiers is a lifecycle operation, but lifecycle vocabulary must not collapse unlike retention semantics:

```text
replicate
promote
cool
archive
restore
supersede
discard
erase
collect
```

In particular:

```text
DISCARD
    remove explicitly transient working state after its useful
    obligations and material residue have been transferred

COOL / ARCHIVE
    reduce active cognitive availability while preserving history

SUPERSEDE
    replace the current reference state while preserving prior history

ERASE
    intentionally destroy durable historical content under distinct authority
```

`ERASE` must not be implemented as an ordinary synonym of `DISCARD` or generic garbage collection. The historical fact of an authorized erasure should normally remain as a proportionate non-reconstructive Event when law, policy and evidence permit.

The important point is that the packet can move or change lifecycle placement without changing logical identity.

Placement and retention policy may consider:

```text
frequency of access
semantic authority
legal/evidentiary value
reconstructibility
cost
privacy
sovereignty
historical value
expected future reuse
```

---

## 9. Event → Effect → Event

A Reactive Corpus changes because something happens, which causes consequences, which generate further observable events.

The minimal loop is often written:

```text
Event → Effect → Event
```

In an implementation, however, the middle term cannot remain opaque.

An external effect may be irreversible, duplicated by retry, denied by a changed mandate, only partially committed, or observed differently from what was intended.

Packet-native execution therefore benefits from a more explicit cycle:

```text
Event
→ handler / rule / decision
→ EffectIntent
→ authority + budget + policy gate
→ Effect execution
→ EffectReceipt
→ Observation / Event
```

### 9.1 EffectIntent

An `EffectIntent` records what a packet is proposing to cause before the consequential boundary is crossed.

It may identify:

```yaml
effect_id: ...
packet_id: ...
caused_by_event: ...
principal_id: ...
mandate_version: ...
capability: ...
idempotency_key: ...
reversibility: ...
expected_effect: ...
```

### 9.2 EffectReceipt

An `EffectReceipt` records what the executor can attest happened:

```yaml
effect_id: ...
status: committed
actor: ...
committed_at: ...
evidence: ...
```

The receipt is not necessarily the final truth about the external world. It is evidence emitted by the executor.

### 9.3 Reality Response

For externally grounded cognition, an observation may still be required after execution:

```text
EffectReceipt
→ Reality
→ independent observation
→ Event
```

This preserves the Corpus principle that **Reality Responds**. An executor saying "done" and Reality actually exhibiting the expected consequence are distinct events.

---

## 10. Four chains that must remain distinguishable

Packet-native cognition repeatedly requires four related but different chains.

### Authority

```text
Principal → authority source → mandate → delegated actor
```

### Causality

```text
Event → decision → EffectIntent → Effect → observation → Event
```

### Execution

```text
node → handler → capability → provider / human / institution
```

### Custody

```text
placement A → placement B → archive → restoration
```

Collapsing these chains destroys useful accountability information.

A future audit should be able to answer independently:

- Who authorized this?
- What caused this?
- Who or what executed it?
- Where was the relevant state held?

---

## 11. Return, Ithaca and assimilation

Solving a packet locally is not the same as returning its yield, and return is not the same as assimilation.

The distinction remains:

```text
solved
→ returned to Ithaca
→ assimilated into durable cognitive state
```

Packet Closure adds an important consequence: the **Ithaca itself becomes part of the packet's closure semantics**.

A handler must know where the meaningful result belongs, or how to materialize that return target.

Assimilation can then generate new Events and new packets:

```text
packet yield
→ Ithaca
→ assimilation
→ corpus delta
→ semantic propagation event
→ downstream Cognitive Packets
```

This is how Cognitive Packet Switching and the Reactive Corpus become one continuous system rather than separate execution and documentation mechanisms.

---

## 12. Bounded propagation and quiescence

A reactive packet system can recursively create unlimited work.

Therefore packet propagation needs explicit boundedness.

Possible controls include:

```yaml
propagation:
  depth: ...
  max_depth: ...
  hop_budget: ...
  compute_budget: ...
  financial_budget: ...
  human_attention_budget: ...
  materiality_threshold: ...
  deduplication_scope: ...
```

A useful closure condition is:

> **A propagation becomes quiescent when every material descendant is assimilated, explicitly deferred, rejected, cancelled, superseded or budget-exhausted.**

Quiescence is not eternal completion. A later Event may awaken a dormant continuation.

---

## 13. Why these entities are packet-native necessities

Once the packet is made primary, the following questions become unavoidable:

| Question | Required concept |
|---|---|
| What is this work? | Packet Identity |
| Can another declared admissible handler continue it? | Packet Closure + Handler Environment |
| What exactly travels now? | Packet Capsule |
| Which history does this state represent? | Causal Frontier |
| Who authorized it? | Authority Lineage / Mandate |
| What spawned or depends on it? | Lineage + Semantic Relations |
| Where can its state be found? | Placement + Store Resolver |
| Who can handle it? | Capability / Routing / Attractor |
| What resources may it consume? | Budget / Accounting |
| What may it change outside itself? | EffectIntent |
| What was actually attempted/committed? | EffectReceipt |
| What did Reality answer? | Observation Event |
| Where does its result belong? | Ithaca |
| Did the system merely store or actually learn? | Assimilation |
| When may intermediate state disappear? | Lifecycle / GC / Archive |

The table is not claimed as a final ontology.

Its value is methodological: each concept answers a pressure produced by packetization itself.

---

## 14. Relation to the Reactive Corpus

The Reactive Corpus should not be understood as one database or one repository.

It is a durable cognitive environment spanning heterogeneous stores, source documents, events, artifacts, memories, indexes, projections and archives.

Cognitive Packets are active units moving through that environment.

A useful distinction is:

```text
Cognitive Packet Switching
    movement and transformation of bounded cognitive work

COP
    protocol invariants governing that movement, authority, effects,
    continuations, accounting and traceability

Reactive Corpus
    durable semantic environment changed by assimilated packet yields
    and capable of emitting new work when its state changes
```

The resulting loop is:

```text
Corpus state
→ Event
→ Cognitive Packet
→ handlers / branches / effects
→ Reality Response where relevant
→ return to Ithaca
→ assimilation
→ Corpus state'
→ Event
```

This is a computational realization of semantic propagation rather than merely a document build pipeline.

---

## 15. Relation to JHN Architecture

JHN Architecture proposes that the future of a computation should not fundamentally belong to the machine currently executing it.

Packet Closure sharpens that claim.

A location-independent continuation requires that the state needed for resumption be either:

- physically carried;
- stably referenced;
- or reconstructibly materialized.

The admissible handler/runtime may still contribute documented protocol knowledge and declared capabilities. What must disappear is dependence on **the particular previous process's hidden state**, not every shared convention.

Therefore a JHN machine cannot be defined only by active processors and local memory.

Its state must include at least:

```text
active Cognitive Packets
packet closures / causal frontiers
available capabilities
logical stores and placements
persistent Corpus / Artifacts / Events
governance and budgets
external effect state
trace / lineage
```

The classical process-local relation:

```text
PC + RAM + instruction stream
```

is replaced at the architectural level by something closer to:

```text
packet set
+ materializable closure
+ declared handler / capability environment
+ persistent memory field
+ governed effect boundary
```

Von Neumann machines remain efficient local handlers inside this wider machine.

---

## 16. Agile implementation plan

The concepts should be introduced through small Reality Tests rather than a large rewrite.

### Phase 0 — Vocabulary and compatibility

Goal: introduce no behavioral break.

- add `PacketClosure` and `PacketPlacement` provisional types;
- define a causal-frontier field or equivalent;
- document mapping from existing packet fields;
- keep all fields optional/experimental where possible.

Acceptance test: current COP tests pass unchanged plus schema round-trip tests.

### Phase 1 — Closure on one local packet

Goal: prove closure independently of distribution.

- create a packet whose payload references local durable state;
- declare the admissible handler/runtime assumptions;
- materialize the state through a resolver;
- destroy volatile handler state;
- resume from packet + closure + declared handler environment only.

Acceptance test: successful resumption after process restart with no undocumented private context from the previous handler.

### Phase 2 — Store abstraction across SQLite and PostgreSQL

Goal: separate logical store identity from provider binding.

- define logical `store_id`;
- implement SQLite and PostgreSQL/Supabase adapters behind capability interfaces;
- add packet placement registry/search.

Acceptance test: the same packet identity moves from SQLite to PostgreSQL and resumes on a second node.

### Phase 3 — Event/Effect materialization

Goal: make one consequential side effect explicit.

- add experimental `EffectIntent` and `EffectReceipt`;
- wrap one existing effect, preferably a GitHub mutation or another already traceable operation;
- enforce idempotency and mandate re-check before commitment.

Acceptance test: retry does not duplicate the effect; changed/revoked authority blocks commitment; receipt links back to packet and event.

### Phase 4 — Git/GitHub promotion

Goal: test packet granularity versus placement.

- promote a semantically significant operational packet into a Git/GitHub representation;
- retain the same logical packet identity;
- keep operational SQL placement searchable.

Acceptance test: GitHub becomes a durable placement/projection without becoming the packet ontology.

### Phase 5 — Offline Odyssey

Goal: exercise Packet Closure under real mobility.

```text
SQLite node A
→ offline handling
→ downstream packet
→ reconnect
→ PostgreSQL/Supabase
→ node B
→ return to Ithaca
→ assimilation
```

Acceptance test: no hidden state on node A is needed to complete the Odyssey; all additional assumptions are part of the declared handler/environment contract.

### Phase 6 — Archive / Posterity

Goal: prove long-term materializability.

- implement a minimal ArchiveStore interface;
- begin with a local/object-store mock before any Glacier-specific adapter;
- archive an assimilated packet and remove hot copies;
- restore from packet identity + locator metadata.

Acceptance test: closure, authority lineage and provenance remain reconstructible after restoration.

### Phase 7 — Conformance and optimization

Only after the above Reality Tests:

- promote stable concepts into COP Core invariants;
- add conformance tests for closure and stores;
- optimize packet capsules and causal-frontier compaction;
- evaluate content addressing, replication, signatures and cache policies;
- compare native COP mechanisms with reusable algorithms from durable-execution systems.

---

## 17. Research discipline

The architecture should remain packet-first without becoming vocabulary-first.

A new term should survive only if it resolves a recurring operational pressure.

The implementation should therefore continuously ask:

1. Does this concept become necessary because packets move independently?
2. Can the requirement be represented with a smaller existing concept?
3. Is the admissible-handler/environment contract explicit enough to make a closure claim falsifiable?
4. Does the proposed representation survive handler, node and store replacement without relying on predecessor-private state?
5. Does it preserve responsibility and evidence across external effects?
6. Does the implementation produce residue that falsifies or refines the model?

The intended loop is:

```text
packet hypothesis
→ implementation
→ Reality Test
→ residue
→ semantic correction
→ Reactive Corpus propagation
→ next implementation
```

The burden of implementing Cognitive Packet Switching is therefore also an experimental instrument: failures of the runtime can reveal missing concepts in the model of distributed cognition itself.
