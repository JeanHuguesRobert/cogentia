---
title: "Locality Principle"
subtitle: "Smallest sufficient locality, explicit crossing, and global reference without global capture"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica, France"
date: "2026-09-19"
last_modified_at: "2026-09-20"
version: "0.3"
status: "working-paper — locality doctrine candidate"
document_role: "source"
document_kind: "architecture-principle"
visibility: "public"
lifecycle_state: "working"
language: "en"
license: "CC BY-SA 4.0"
update_policy: "UP-DEFAULT-REVIEWED"
human_validation_required: true
review:
  status: "unreviewed"
  reviewed_by: []
related_documents:
  - "patterns/packet-backed-projection/PATTERN.md"
  - "research/registry_of_registries.md"
  - "research/mneme_memory_architecture.md"
  - "research/memory_and_corpus_sleep_cycle.md"
  - "research/agent_working_conventions.md"
  - "https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#control-data-plane-separation"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/cop_memory_profile.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/COP_STORE_AND_PERSISTENCE.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Invariants.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/fractacarta.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "Locality / COP Memory / FractaCarta exploration — 2026-09-19"
  origin_date: "2026-09-19"
  derived_from:
    - "patterns/packet-backed-projection/PATTERN.md"
    - "research/registry_of_registries.md"
    - "research/agent_working_conventions.md"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/cop_memory_profile.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/fractacarta.md"
tags:
  - locality
  - local-first
  - anti-capture
  - memory
  - fractacarta
  - cognitive-packets
  - fractanet
  - cop
  - minimum-sufficient-locality
  - federation
  - control-plane
  - data-plane
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
changelog:
  - "v0.3 (2026-09-20) — makes normative fractality and the meta-control-plane explicit: constitutional invariants, operating mechanisms, local rules, and situated acts preserve their authority boundary at every scale."
  - "v0.2 (2026-09-20) — relates Minimum Sufficient Locality to the control/data-plane distinction; records the authority boundary for Cogentia projections."
  - "v0.1 (2026-09-19) — first cross-Corpus formalization of locality, Minimum Sufficient Locality, locality closure, explicit crossing and global-reference-before-global-state."
---

# Locality Principle

## 1. Purpose

The Corpus already uses locality in several independently convergent forms:

- row-local history in Packet-Backed Projection;
- source-local authority in the Registry of Registries;
- local-first exploratory document placement;
- poly-indexed locality in COP/Memory;
- locality-aware capability resolution in Magistral and Fractanet;
- local caches and reconstructible projections in Cogentia;
- local Maps and recursive navigation in FractaCarta.

This note records the common architectural principle without turning locality prematurely into a new mandatory protocol entity.

The compact intuition is:

> **Keep state, history, interpretation, authority and computation within the smallest sufficient locality. Cross locality boundaries by explicit reference or bounded projection; centralize or replicate only when a demonstrated invariant requires it.**

An even shorter operational form is:

> **Localize knowledge; distribute references.**

---

## 2. Working definition

A **locality** is the smallest domain in which something can be correctly understood, governed or continued without implicit external dependency.

The important word is **implicit**.

A locality may depend on other localities. Such dependencies are legitimate when they are explicit, addressable and inspectable.

For an object or work item x, a useful locality-closure condition is:

~~~text
needed(x)
⊆
locality(x)
∪
explicit_external_refs(x)
~~~

A locality is therefore not necessarily self-contained in bytes. It is self-describing enough to make every dependency required for correctness visible.

---

## 3. Locality is not placement

Do not collapse logical locality into physical location.

Distinguish at least conceptually:

~~~text
Locality
    = domain in which the thing is intelligible / governable / continuable

Placement
    = where one materialization currently resides

Ithaca
    = semantic home to which the yield of a cognitive journey returns

Custody
    = who controls a materialization or access boundary

Handler
    = where processing happens now
~~~

These may coincide. They need not.

One logical locality may have several physical placements. One machine or database may host several independent logical localities.

Therefore:

~~~text
logical locality ≠ physical locality
registry identity ≠ storage identity
semantic home ≠ current execution location
~~~

---

## 4. Locality dimensions

The Corpus already identifies multiple axes along which useful cognitive neighborhood can be local:

- temporal;
- topical;
- causal;
- semantic;
- social;
- spatial;
- procedural;
- salience / consequence.

These axes help answer **where to search around an Anchor**.

A second set of locality concerns answers **where state should remain owned or interpreted**:

- semantic locality — information stays with the thing it describes when possible;
- historical locality — history stays with the thing whose history it is;
- governance locality — authority, privacy and policy remain as local as possible;
- computational locality — computation approaches data or activity when this reduces unnecessary transfer, capture or cost.

The two sets are related but should not be conflated.

---

## 5. Minimum Sufficient Locality

For a question, action or continuation Q, define provisionally:

~~~text
MSL(Q) = the smallest locality sufficient for Q
~~~

Sufficiency is relative to circumstances, including:

~~~text
task
mandate
risk / exposure
privacy
cost
latency
freshness
epistemic requirement
probative requirement
available capabilities
~~~

Examples:

~~~text
private brainstorming
→ shallow local context may suffice

public factual statement
→ assertion + provenance may be required

legal / probative use
→ source traces + custody + temporal context + audit may be required

local document edit
→ target file + local rules + relevant backlinks may suffice

cross-domain architectural decision
→ several localities + explicit correlation may be required
~~~

The purpose of MSL is not to discover an absolute smallest mathematical set. It is an engineering and cognitive criterion for avoiding needless global context while preserving correctness.

---

## 6. Explicit boundary crossing

Crossing a locality boundary is semantically meaningful.

A cross-locality read may change:

- disclosure;
- cost;
- latency;
- jurisdiction;
- trust domain;
- custody;
- authority requirements;
- freshness guarantees;
- failure modes.

Therefore cross-locality dependency should be explicit.

Preferred escalation:

~~~text
local read
→ local projection
→ explicit cross-locality reference
→ remote query / bounded projection
→ replication only when justified
~~~

Compact rule:

> **Ask there before copying here.**

This generalizes the Cogentia retrieval rule:

~~~text
Heavy data stays put.
Small mandates travel.
~~~

---

## 7. Reference, projection and replication are different

Do not collapse:

~~~text
REFERENCE
    I know how to identify / reach X.

PROJECT
    I hold a bounded representation of X for a declared purpose.

REPLICATE
    I hold another materialization of X.
~~~

Default preference:

~~~text
reference
→ projection if needed
→ replication if justified
~~~

### Control / data plane distinction

The [control/data plane separation](https://github.com/JeanHuguesRobert/Inox/blob/master/research/concepts.md#control-data-plane-separation)
is a complementary distinction. For any operation, the **control plane**
declares or selects what is to be considered, where it belongs, which boundary
applies, and which process may act. The **data plane** holds, transforms, or
delivers the actual values, documents, code, packets, or service effects.

The distinction is functional, not a claim that one repository or file belongs
to only one plane. A README, for example, is a public derived product in the
data plane; its opt-in navigation block is a control-plane projection. A
registry can discover an authoritative source without owning its contents.

For Cogentia, the boundary is practical:

| Function | Plane | Authority boundary |
|---|---|---|
| Repository registry, source references, visibility declarations, and generated-navigation plans | Control | Describe and route; do not become the only source of truth. |
| A `corpus apply` write to an explicit generated block | Data-plane effect under control | May refresh a deterministic projection only; it does not authorize a semantic rewrite. |
| Curated README prose, source documents, code, packets, and live service behavior | Data | Remain governed by their local source, maintainer, and applicable execution mandate. |
| Deployment routing, health, and apply evidence | Operational control | Operium owns this control plane; Cogentia must not create a competing one. |

Thus a control-plane operation may prepare, select, or coordinate a data-plane
effect without acquiring its semantic authority. A plan is not an execution
mandate; a registry reference is not custody; a generated projection is not a
replacement for the local source. When a judgment about meaning, public
commitment, or irreversible effect remains open, the control plane must expose
that boundary — for example through a continuation — rather than silently
cross it.

A global system should not copy a local source merely because it discovered it.

---

## 8. Local history / global reference

Packet-Backed Projection already states the local-history rule:

> **Keep history as local as the thing whose history it is; introduce global ordering or correlation only when a real cross-object invariant requires it.**

Thus:

~~~text
A17 → A16 → A15
B8  → B7
C42 → C41 → C40
~~~

should remain independently intelligible.

When one real Act links them:

~~~text
              Act X
            /   |   \
          A17   B8   C42
~~~

the cross-object invariant is represented by explicit correlation rather than by forcing every entity through one mandatory global history stream.

COP already reinforces this direction by not assuming global ordering and by using explicit causal references.

---

## 9. Global discovery is not global ownership

Distinguish three legitimate global functions:

~~~text
GLOBAL DISCOVERY
    where should I look?

GLOBAL CORRELATION
    which localities genuinely participate in the same phenomenon?

GLOBAL PROJECTION
    which map should I see for this question?
~~~

None implies:

~~~text
GLOBAL OWNERSHIP
~~~

A global index, graph, registry view or search service SHOULD be reconstructible when its inputs are local authoritative sources.

A useful anti-capture test is:

~~~text
destroy global index
→ discovery becomes harder
→ local knowledge remains intact
~~~

If destroying a reconstructible index destroys the only surviving knowledge, the architecture has silently moved authority into the projection layer.

---

## 10. Locality Closure

**Locality Closure** is a working design test, not yet a new COP wire object.

A locality is sufficiently closed for an operation when:

1. local material is enough to understand what is present;
2. every external dependency required for correctness is explicit;
3. a successor handler can discover those dependencies without hidden session state;
4. authority does not travel merely because data or continuity state travels;
5. loss of a global cache or index does not invalidate the local source.

A practical test:

> **If this locality is moved, copied, or handled by a cold replacement handler, which hidden dependencies break?**

Any dependency discovered by that test SHOULD either become local or become an explicit reference.

This connects Locality Closure to Packet Closure without asserting that the two are identical.

---

## 11. FractaCarta relation

FractaCarta provides the cartographic counterpart of locality.

A Map may span several localities without absorbing their Territory.

~~~text
                    Map M
                      │
          ┌───────────┼───────────┐
          │           │           │
      Locality A  Locality B  Locality C
          │           │           │
       refs A       refs B       refs C
~~~

Thus:

> **The scope of a Map does not determine the placement or ownership of its Territory.**

FractaCarta operations can cross locality boundaries explicitly:

- **ZOOM** may remain within one locality or expose a smaller one;
- **PIVOT** may request another projection over the same or federated localities;
- **REANCHOR** may make an element from another locality the Anchor of a new Map.

A REANCHOR may therefore be both a semantic navigation operation and an explicit locality-boundary crossing.

---

## 12. MemoryView relation

A MemoryView is a bounded, task-relative projection.

The locality principle suggests the stronger interpretation:

~~~text
MemoryView(Q)
≈
bounded representation of MSL(Q)
~~~

This does not mean a MemoryView must perfectly compute a unique MSL.

It means retrieval should seek the **smallest cognitively sufficient neighborhood** rather than maximize globally accumulated context.

The optimization target is therefore not merely:

~~~text
maximum semantic similarity under token limit
~~~

but closer to:

~~~text
smallest sufficient context
under mandate, risk, privacy, cost,
freshness and epistemic requirements
~~~

A MemoryView SHOULD expose enough information to expand when insufficient rather than preloading the entire memory graph.

---

## 13. Cognitive Packet relation

A Cognitive Packet need not contain the memory it depends on.

It may instead carry enough stable context to work where relevant memory resides:

~~~text
Cognitive Packet
├── mandate
├── intent / question
├── anchor
├── scope
├── budget
├── policy
├── stable references
├── capability requirements
└── return / Ithaca contract
~~~

The Packet travels.

Large or governed memory may remain local.

This supports:

~~~text
move work / query toward memory
rather than
copy all memory toward the handler
~~~

where capability, mandate, privacy and resilience permit.

Portable continuity state MUST NOT imply portable privilege or portable custody.

---

## 14. Store and federation relation

COPStore is a logical persistence contract. It MUST NOT be interpreted as requiring one global physical or semantic locality.

~~~text
one Store interface
≠ one process
≠ one database
≠ one provider
≠ one machine
≠ one global locality
~~~

A conformant deployment may expose several local stores or cooperate across placements while preserving local authority and local intelligibility.

Federation SHOULD first be expressed through:

~~~text
stable identifiers
explicit references
policy
verified exchange
bounded projections
reconstructible indexes
~~~

before introducing new core ontology such as mandatory MemoryDomain, Replica, Custodian or GlobalRegistry entities.

---

## 15. Mneme and memory lifecycle

The locality principle does not require Mneme to become a new storage silo.

A durable governed memory unit should retain or expose:

~~~text
identity
provenance
epistemic status
governance
lifecycle
locality / semantic home when relevant
explicit external dependencies
~~~

The Corpus Sleep Cycle may promote, cool, archive or forget memory without moving authority into one global memory store.

Locality and temperature are orthogonal:

~~~text
local ≠ hot
global ≠ durable
cold ≠ remote
replicated ≠ authoritative
~~~

---

## 16. Promotion on pressure

Globalization should be earned by observed need.

Generalized from Packet-Backed Projection:

~~~text
local-only
→ discovered / referenced
→ repeatedly queried
→ projected / indexed
→ materially reused
→ replicated or materialized when justified
~~~

This is **promotion on pressure** at the locality level.

Do not globalize an object merely because a global system can see it.

---

## 17. Design invariants

The initial locality invariants are:

1. **Local intelligibility.** A locality SHOULD be understandable without hidden external dependency.
2. **Explicit crossing.** External dependencies required for correctness SHOULD be explicit.
3. **Global reference before global state.** Prefer references and typed correlations to needless centralization.
4. **Projection before replication.** Request the bounded representation before copying the Territory.
5. **Local history / global reference.** Keep history local unless a real cross-object invariant requires correlation.
6. **No implicit global order.** Introduce global ordering only where the domain requires it.
7. **Authority stays local unless delegated.** Data movement, Packet movement or handler substitution MUST NOT silently widen authority.
8. **Indexes are not owners.** Global indexes, graphs and caches SHOULD remain reconstructible projections.
9. **Placement is not locality.** Physical storage and semantic home are distinct.
10. **Global Maps may span local Territory.** Cartographic scope does not imply ownership or replication.
11. **Expansion is explicit.** A bounded view SHOULD expose paths for deeper traversal instead of assuming exhaustive context.
12. **Locality is fractal and situated.** The useful locality may change with the operation and scale.

### Normative fractality and the meta-control plane

The same structure recurs at each scale of governed action. This is analogous
to, but does not substitute for, a legal architecture of constitutional norms,
organic mechanisms, regulations, and situated acts:

| Normative function | Corpus form | Boundary preserved at each scale |
|---|---|---|
| Constitutional invariant | Shared authority, privacy, provenance, and non-capture constraints | No local rule manufactures authority or cancels an inherited protection. |
| Operating mechanism | Mandate schema, update policy, registry, continuation, plan/apply/verify and audit | The mechanism makes a rule inspectable and enforceable; it is not the source of semantic truth. |
| Local rule | Repository, subsystem, or task mandate | It specializes and attenuates the inherited envelope for its own locality. |
| Situated act | Edit, generation, commit, deployment, publication, or continuation resolution | It remains attributable, evidenced, and subject to the effective local mandate. |

This recurrence is an **invariant of scale**, not a demand for identical files
or bureaucracy at every level. Any locality that governs acts should make
explicit: its source of authority, its scope and limits, its rule for change,
and the references from which it derives. Smaller localities may express this
more compactly; they may not make it disappear.

The **meta-control plane** is therefore not a superior central controller. It
is the recursively applicable arrangement that lets a control plane itself be
located, versioned, criticized, audited, and changed without silently crossing
its authority boundary. It protects the distinction between a rule that
coordinates an act and the mandate that can authorize that act.

---

## 18. Non-goals and restraint

This note does **not** yet introduce:

- a normative Locality schema;
- a mandatory locality_id;
- a global locality registry;
- a new replication protocol;
- a new distributed database;
- a new authorization object;
- a requirement that every source be physically local;
- a rule forbidding justified global transactions or ordering.

Each new core noun still carries the burden of proof.

The principle should first be tested through existing COP, Cogentia, FractaCarta and Fractanet primitives.

---

## 19. Reality Test direction

A useful combined Reality Test should start with knowledge retained in Locality A and a cold handler operating from Locality B.

The handler should begin with only a bounded mandate, Anchor and stable references.

Success requires that it can:

1. discover the relevant locality;
2. obtain a bounded MemoryView without copying the whole Territory;
3. identify what is known and its epistemic status;
4. inspect provenance and explicit dependencies;
5. expand by ZOOM, PIVOT or REANCHOR only when necessary;
6. cross locality boundaries explicitly;
7. survive replacement of the original handler and loss of global caches;
8. reach source evidence when the action requires stronger proof;
9. return useful yield to the proper Ithaca;
10. avoid acquiring authority merely because it acquired state.

The test should record residue rather than forcing every observed need into the first schema.

---

## 20. Stable working formula

~~~text
Keep what is locally intelligible local.
Make required external dependencies explicit.
Reference before centralizing.
Project before replicating.
Correlate globally only when Reality requires correlation.
Let Maps span localities without making the Map the owner of the Territory.
~~~

The architectural objective is not maximal decentralization as an end in itself.

It is **minimum necessary dependency under preserved intelligibility, authority, traceability and capacity to act**.
