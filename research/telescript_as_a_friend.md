---
title: "Telescript as a Friend"
subtitle: "Friendship Analysis and Historical Reality Test for Cognitive Packets, Continuations and Fractanet"
description: "A friends-before-competitors analysis of General Magic's Telescript as prior art, reusable evidence, historical Reality Test and possible conceptual ancestor for packetized resumable capability routing."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-29"
last_modified_at: "2026-09-30"
version: "0.2"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/telescript_as_a_friend.md"
document_role: "source"
document_kind: "research-paper"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
target_scene: "technical / academic"
document_function: "research / prior-art friendship analysis / Reality Test"
tags:
  - telescript
  - general-magic
  - mobile-agents
  - cognitive-packets
  - continuations
  - packetization
  - fractanet
  - prior-art
  - friends-before-competitors
  - reality-test
  - capability-routing
  - authority
  - permits
methodology:
  - "Friends before competitors"
  - "living state-of-the-art"
  - "bidirectional conceptual translation"
  - "Reality Test"
  - "rule-inventory test"
  - "explicit provenance and influence uncertainty"
provenance:
  origin_type: "conversation"
  origin_repository: "unknown"
  origin_ref: "unknown"
  origin_date: "2026-09-29"
  derived_from:
    - "packetization_delimited_continuations_review_packet_v2.md"
    - "review-packetization_delimited_continuations.md"
    - "cogentia/instructions/AGENTS.shared.md — Friends before competitors"
review:
  status: "unreviewed"
  reviewed_by: []
input_reviews:
  - "Claude Sonnet 5.5 adverse review, 2026-09-29"
author_prior_exposure:
  status: "reported"
  statement: "The author reports having known Telescript and having found it interesting at the time."
  interpretation: "This prior knowledge is recorded for transparency. It is not treated as evidence of intellectual descent or causal influence. Several relevant ideas were also part of the broader public technical culture and were later rediscovered or reconstructed independently in the present work."
human_validation_required: true
changelog:
  - "v0.1 (2026-09-29) — initial friendship analysis, bidirectional translation, historical Reality Test, rule inventory and residue map."
  - "v0.2 (2026-09-30) — removed implied intellectual genealogy from Telescript; records prior knowledge transparently while treating overlap as rediscovery/convergence unless a specific dependency is demonstrated."
---

# Telescript as a Friend

## Friendship Analysis and Historical Reality Test for Cognitive Packets, Continuations and Fractanet

**Jean Hugues Noël Robert, baron Mariani**  
Institut Mariani / C.O.R.S.I.C.A.  
29 September 2026

## Abstract

General Magic's **Telescript** is one of the strongest historical precedents surfaced during adverse review of the working hypothesis that **packetization** and **bounded resumable continuations** are highly generative mechanisms for heterogeneous distributed capability.

This note deliberately does not treat Telescript as a novelty threat. It applies the Corpus rule:

> **Look for friends before competitors. Seek kinship, reuse and composition before differentiation. Preserve what remains different.**

Telescript is therefore treated first as a **friend**: a system that already explored, implemented and operationally tested mechanisms that now reappear in Cognitive Packets, Cognitive Packet Switching and Fractanet.

The comparison shows substantial kinship around mobile units carrying program and state, explicit movement, rendezvous, service selection, bounded authority, bounded resource consumption, failure handling and execution resumption after movement.

The historical value is greater than a mere priority claim. Telescript provides **already-paid Reality Tests**. It shows what becomes difficult when executable work moves through a heterogeneous network: identity, authority, permissions, resource budgets, host trust, service discovery, runtime dependence and ecosystem bootstrap.

At the same time, significant residue remains around declarative/descriptive continuations, handler substitution across human/AI/software/institutional boundaries, delayed external observation, acceptance before resumption, physical incarnation, custody, cross-protocol return paths and the separation between packet, mission, holder, handler and authority.

The useful conclusion is therefore:

```text
Telescript
→ historical friend
→ reusable mechanisms
→ already-paid Reality Tests
→ architectural warnings
→ composable ancestor
→ explicit residual questions
```

---

# 1. Why this analysis exists

An adverse review of *Packetization + Delimited Continuations* identified Telescript as the strongest single prior-art precedent for the software-domain part of the hypothesis.

That finding should be retained. But the Corpus does not treat prior art primarily as competition.

The relevant methodological rule is **Friends before competitors**. When materially relevant adjacent work appears, the first questions are:

1. What conceptual kinship exists?
2. What results, vocabulary, methods, implementations, tests or evidence can be reused?
3. Are the works compatible or composable?
4. Can one serve as specialization, implementation, Reality Test, benchmark, constraint or extension of the other?
5. What productive disagreement or unresolved residue remains?

Only then should difference and novelty be assessed.

This note follows that order.

---

# 2. Historical object: what Telescript actually was

Telescript was developed by General Magic in the first half of the 1990s as a language and runtime architecture for **mobile software agents**.

Its basic universe contained **agents** and **places**.

An agent was not merely a remote request. It could carry executable program and state, move between Telescript places, and then resume execution at its destination. A place provided an execution environment and could itself host services. A Telescript engine interpreted the language, maintained places, scheduled execution, supported communication and managed transport.

This matters because the architecture explicitly moved **computation toward capability**, rather than moving all remote data back toward a fixed computation.

A canonical operation was `go`:

```text
agent at place A
→ go(ticket)
→ program + state transported
→ place B
→ next instruction executes at B
```

The mobile-agent white paper describes the essential effect plainly: if the trip succeeds, the agent's next instruction executes at its destination.

This is more than messaging. It is an executable remainder crossing an execution boundary.

Telescript also distinguished movement from interaction. Two co-located agents could `meet`, and a `petition` described the requested counterpart and terms of the meeting. Historical documentation further shows a security model based on identity/authority and `permit` objects limiting actions and resource consumption.

---

# 3. Relevant Telescript primitives

## 3.1 Agent

A Telescript agent combines roughly:

```text
identity
+ authority
+ program
+ mutable state
+ current place
+ permitted actions/resources
```

This is already a warning against mapping it one-to-one to a Cognitive Packet. Cognitive Packet Switching tends to separate **work identity** from any particular handler. Telescript bundles more roles together.

## 3.2 Place

A place is a virtual location hosted by a Telescript engine. It can host agents and services.

Depending on context, its nearest modern analogues include:

```text
handler environment
runtime
capability locality
rendezvous domain
security domain
```

The bundling of these roles is historically important.

## 3.3 `go`

`go` moves an agent. Conceptually, networking becomes part of the execution model.

Instead of:

```text
program
→ serialize request
→ remote RPC
→ return data
```

Telescript permits:

```text
program + state
→ move
→ resume near resource
```

This is one of the strongest points of kinship with portable continuation work.

## 3.4 Ticket

Travel is parameterized by a **ticket**. A cautious mapping is:

```text
ticket
≈ route / destination / movement constraint
```

not:

```text
ticket = Cognitive Packet
```

The ticket constrains a movement of an already-existing agent.

## 3.5 `meet`

Two co-located agents can `meet`. This distinction is valuable:

```text
movement
≠ rendezvous
≠ interaction
```

Routing something near a capability does not imply that the capability has accepted or processed it.

## 3.6 Petition

A `meet` operation uses a **petition** describing the desired counterpart and terms of interaction. Historical material indicates matching by identity, authority or class/service-like criteria.

That gives a direct ancestor-like mechanism for:

```text
required capability
→ candidate provider
→ rendezvous
```

Therefore **handler resolution cannot be treated as an unexplored modern invention**. Telescript is a friend precisely because it already tested part of this design space.

## 3.7 Authority and identity

Agents and places were associated with identity and authority. Incoming agents could be judged according to the authority under which they operated, and an agent could inspect the authority of a place or another agent.

The design therefore recognizes that:

```text
code
≠ identity
≠ authority
```

even though it packages those concepts more tightly than current Cogentia doctrine tends to prefer.

## 3.8 Permit

A **permit** limits what an agent or place may do. General Magic material describes both qualitative and quantitative limits, including rights to execute certain instructions or create agents and limits on lifetime, size and computation.

Crucially, destination regions may reduce effective privileges but not silently extend them beyond what the agent already holds.

This is a strong historical friend for rules such as:

```text
portable continuity
≠ portable privilege
```

and for monotonically restrictive mandate composition.

---

# 4. First friendship result: a capability-routing skeleton already exists

A minimal Telescript sequence can be abstracted as:

```text
purpose
→ agent created
→ travel requirement
→ ticket
→ go
→ place
→ petition
→ meet
→ service interaction
→ continuation of execution
```

Current vocabulary might instead say:

```text
mission
→ packet / continuation
→ capability requirement
→ route
→ handler locality
→ handler resolution
→ execution
→ result / next continuation
```

These sequences are not identical, but their **structural kinship is strong**.

The methodological conclusion is simple:

> **Mine Telescript for mechanisms, tests and failure modes before trying to differentiate from it.**

---

# 5. Bidirectional translation I — Telescript → Cogentia / Fractanet

| Telescript construct | Nearest current construct | Overlap | Residue / caution |
|---|---|---|---|
| Agent | mobile executable handler-state bundle | strong | Cognitive Packet normally separates work from handler |
| Place | capability locality / runtime / rendezvous domain | strong | current locality may be physical, institutional or virtual |
| Engine | runtime / handler infrastructure | strong | Fractanet should not require one universal runtime |
| `go` | mobility / handoff / continuation relocation | strong | Telescript moves executable state; modern handoff may be descriptive |
| Ticket | route / movement constraint | partial | not a packet identity |
| `meet` | handler rendezvous / invocation | strong | current processing may be asynchronous or remote |
| Petition | capability/service matching request | strong | current matching may be distributed, semantic or human |
| Identity / authority | identity + authority provenance | partial | current doctrine separates holder, mandate and authority further |
| Permit | bounded mandate / resource budget | strong | terminology around “capability” needs care |
| Failed `go` / `meet` | explicit error/continuation path | strong | current system may reroute to another handler |
| Clone | fork | partial | current fork separates packet/content/mission/incarnation identities |
| Telescript Cloud | capability network | strong | Fractanet aims at heterogeneous protocols and substrates |

The important lesson is that several principles we might otherwise formulate abstractly already had concrete implementation forms.

---

# 6. Bidirectional translation II — Cogentia / Fractanet → Telescript

This direction is more discriminating.

| Current construct | Nearest Telescript expression | Fit | What becomes awkward |
|---|---|---|---|
| Cognitive Packet | mobile agent or data carried by agent | partial | packet should survive handler replacement |
| executable continuation by value | moving agent state/code | strong | tied to Telescript runtime |
| continuation by reference | remote identity/ticket/place reference | partial | state remains within Telescript fabric |
| descriptive continuation | data/procedure encoded by application | weak/partial | no common human-readable resume contract |
| handler | agent/place/service | partial | human/institutional handler is external |
| handler resolution | petition / class / authority matching | strong | current routing may span protocols and non-Telescript entities |
| mandate | permit + authority | strong but bundled | current mandate may be legal/social/institutional |
| budget | permit allowances | strong | direct reusable precedent |
| locality | place/region | strong | current locality includes data/authority locality |
| external observable result | message / returning agent | partial | delayed trace from arbitrary external system is broader |
| acceptance before resumption | application protocol | weak/partial | not a clear first-class core distinction |
| human handler | external service represented by agent | weak | human becomes hidden behind software proxy |
| physical book carrying mission | external-world proxy | weak | custody, uniqueness and handwriting are outside runtime |
| object biography | external persistent record | weak | not intrinsic to mobile-agent semantics |
| QR / paper / photograph return path | external bridge | weak | support changes outside Telescript execution fabric |
| mission identity distinct from carrier | manual modelling | partial | Telescript agent naturally bundles purpose/state/carrier |
| execution ≠ observation ≠ notification ≠ correlation ≠ acceptance ≠ resumption | application-level decomposition | partial | not obviously a Telescript core chain |

This table identifies the **residue** more usefully than a novelty claim does.

---

# 7. Reuse: mechanisms worth inheriting

## 7.1 Permits as an ancestor of bounded mandate

Telescript makes autonomous mobility inseparable from bounded authority.

A useful modern abstraction is:

```text
origin mandate
∩ destination policy
∩ handler authority
= effective act envelope
```

The implementation need not be copied, but the constraint should be.

## 7.2 Resource budgets as first-class constraints

Telescript permits bound lifetime, size, computation and agent creation.

A current Cognitive Packet may analogously carry or reference:

```text
compute budget
token budget
money budget
time budget
network/effect budget
risk envelope
```

A handler should not silently enlarge them.

## 7.3 Movement and meeting are distinct

Telescript's `go` / `meet` distinction suggests preserving:

```text
route / transport
≠ rendezvous
≠ acceptance
≠ handling
```

This maps well to current control-plane/data-plane and result-acceptance distinctions.

## 7.4 Failure is ordinary

`go` and `meet` can fail. This is healthier than treating successful routing as assumed.

Modern transitions should include:

```text
no route
handler refuses
handler unavailable
mandate insufficient
result invalid
result late
```

as ordinary outcomes.

## 7.5 Identity and origin matter in open execution

Telescript anticipated the problem created when foreign executable entities enter another party's environment.

Modern agent systems recreate structurally similar problems. The lesson is to keep explicit:

```text
origin
principal
authority
handler
execution environment
evidence
```

rather than collapsing them into “the agent”.

---

# 8. Composition: what a modern architecture can add

## 8.1 Handler-neutral work identity

Telescript naturally says:

```text
agent carries purpose + state + execution
```

Cognitive Packet Switching aims more often at:

```text
packet carries work identity
handler is replaceable
```

This lets work survive replacement or failure of a particular executable agent.

## 8.2 Descriptive continuations

Telescript excels at **executable mobile continuation**.

Modern cooperation also needs a continuation that is:

```text
human-readable
self-describing
portable by copy/reference
not bound to one runtime
```

A Markdown Cognitive Packet can be resumed by unrelated AI systems or by a human without sharing virtual-machine state.

This trades strong execution semantics for interoperability and judgment.

## 8.3 Protocol plurality

Telescript aimed at a common execution substrate.

The current direction can tolerate multiple surfaces:

```text
MCP
A2A
GitHub
email
HTTP
clipboard
paper
human conversation
```

around a common continuation envelope.

This may be an important anti-capture difference.

## 8.4 External observation and delayed reconciliation

A current system can deliberately allow:

```text
external occurrence
→ trace
→ observation
→ normalization
→ correlation
→ validation
→ acceptance
→ resume
```

when the external actor never implements the originating protocol.

## 8.5 Humans and institutions as genuine handlers

A human need not be represented merely as a hidden stationary software agent.

A mission can be routed to a person because the person has judgment, legal authority, local presence, social relation, knowledge or dexterity.

The architecture should preserve that these are not interchangeable with computational capabilities.

## 8.6 Physical incarnation

A packet or mission can acquire a physical carrier.

That introduces:

```text
custody
scarcity
linearity
damage
loss
material transformation
physical provenance
```

which executable mobile-code systems do not naturally have to model.

---

# 9. Historical Reality Test: what Telescript's trajectory teaches

Telescript was implemented and tied to a commercial ecosystem, including AT&T PersonaLink. That makes its history useful evidence.

## 9.1 Ecosystem bootstrap matters

The value of mobile agents depended on useful Telescript destinations.

This creates a bootstrap loop:

```text
few places
→ little reason to send agents
→ little reason to deploy places
```

A modern lesson is:

> **Do not require universal Fractanet infrastructure before one packet becomes useful.**

Packets should be able to fall back to already-existing surfaces.

## 9.2 Universal runtime is a capture point

Telescript's semantics depended on the Telescript engine.

That enabled strong guarantees but created platform dependency.

A current architecture should ask whether continuity can survive loss of any one runtime:

```text
portable continuity state
> portable runtime assumption
```

when interoperability matters more than executable fidelity.

## 9.3 Security is not an afterthought

Historical mobile-agent work repeatedly identified security as a major barrier.

Two directions are distinct:

```text
protect host from visiting agent
protect visiting agent from host
```

The second is particularly difficult.

Modern remote AI execution has structurally similar trust problems.

Thus:

> **A handler must not automatically be trusted because routing found it.**

## 9.4 Bounded authority is valuable but complex

Telescript demonstrates that resource and authority control can be first-class. It also demonstrates that combining origin authority, destination restriction, agent identity and resource allowance produces nontrivial semantics.

The modern framework should reuse the idea while resisting unnecessary centralization.

## 9.5 Network-as-platform was prescient; common-runtime dependence may be the weaker part

Telescript's broad intuition — move active computation through a network of capabilities — remains powerful.

The more interesting contemporary question may be:

```text
What if the common layer is the packet/continuation envelope,
not the execution engine?
```

---

# 10. Physical-book Reality Test

Consider:

```text
mission
→ addressable copy of a publication
→ carried by a human
→ reaches another city/country/person
→ receives annotation/signature/drawing/result
→ circulates further
→ photographed or scanned later
→ external trace enters a digital system
→ result correlated to mission
→ continuation resumes
```

## 10.1 What Telescript models naturally

Telescript can model:

```text
mission software
→ agent
→ go(destination)
→ seek service
→ meet(handler proxy)
→ collect result
→ continue / return
```

It can also naturally represent travel failure, service unavailability, service-class matching, bounded permission/resource use and software identity/authority.

## 10.2 What becomes artificial

To model the physical book itself, software proxies would be needed for:

```text
the book
the carrier
the encountered person
the handwritten mark
the later photographer
the observer
```

The real semantics include facts outside the Telescript runtime:

```text
one physical object cannot be in two places at once
custody transfers
the object can be damaged or lost
annotation changes the object
a photograph is not the object
a signature claim is not proof of authorship
the handler may never know the digital system exists
```

These are not ordinary mobile-code semantics.

## 10.3 Residue exposed by the physical case

The physical case therefore foregrounds:

```text
linearity / shot-count
custody
incarnation
external observation
correlation
evidence
acceptance
```

The open question is whether these are new primitives, packet-envelope properties, handler policies, domain-specific payload semantics, or combinations of older mechanisms.

Telescript helps make that question precise.

---

# 11. Rule-inventory test

Claude's adverse review proposed testing whether the two-mechanism theory hides other operations. Telescript provides an ideal baseline.

| Operation | Telescript mechanism | Packetization? | Continuation/capture-resume? | Appears independent? |
|---|---|---:|---:|---:|
| identify work/agent | identity/telename | partial | no | likely |
| move | `go` + ticket | partial | partial | maybe |
| route/select destination | ticket/address | partial | no | likely |
| discover/select service | petition/class/authority | no | no | **yes candidate** |
| rendezvous | `meet` | no | no | **yes candidate** |
| authorize | authority + permit | no | no | **yes candidate** |
| bound resources | permit/allowance | envelope-like | no | policy/property |
| suspend | movement/operation boundary | no | yes | continuation |
| resume | next instruction at destination | no | yes | continuation |
| fail/reroute | exception/application logic | no | partial | composition |
| fork/clone | agent creation | packet-like | multi-shot-like | maybe |
| observe result | application state | no | partial | likely |
| correlate result | identity/application logic | no | no | likely |
| accept result | application logic | no | no | likely |
| revoke | permit/lifetime/authority mechanisms | partial | no | likely |
| transfer physical custody | outside model | no | no | **domain-specific candidate** |

This suggests a useful refinement:

> **Packetization and continuation may be generative mechanisms without being a complete instruction set.**

That may be more defensible and more useful than insisting that every operation reduces to two primitives.

---

# 12. A possible deeper factorization

The adverse review correctly observes an asymmetry:

```text
continuation
→ can be packetized
```

is packetization applied to a certain payload.

Whereas:

```text
packet
→ handler
→ continuation
```

requires a handler and a suspension/capture operation.

A more precise decomposition may be:

```text
REPRESENTATION:
packetize(x)

CONTROL:
suspend/capture(remainder)
resume(remainder, result)

COORDINATION:
resolve(requirements, candidates)

GOVERNANCE:
authorize(handler, act, mandate)

OBSERVATION:
observe/correlate/accept(effect)
```

The research question then becomes:

> **Which of these are truly independent primitives, and which can be derived or treated as policies over the others?**

This is a better Reality-Test target than defending a preselected number two.

---

# 13. Provenance: Telescript as a possible historical influence

The author reports having known Telescript and having found it interesting at the time.

This should be preserved rather than suppressed.

Possible histories include:

```text
direct remembered influence
latent / forgotten influence
conceptual familiarity shaping later intuitions
independent reconstruction from similar constraints
convergence plus historical influence
```

At present there is no basis to choose confidently among them.

Therefore this document should **not** claim independent rediscovery.

A cautious formulation is:

> **The author had prior exposure to Telescript. The degree to which that exposure influenced later Cognitive Packet / Fractanet concepts is unknown. Similarities should therefore be studied as possible continuity as well as convergence.**

That is stronger epistemically than a priority narrative.

---

# 14. What Telescript already paid for us

The most productive interpretation may be to treat Telescript as **historical experimental expenditure**.

General Magic and the mobile-agent community already paid to investigate questions such as:

- What happens when executable state moves?
- How does a host constrain foreign work?
- How does an agent carry identity?
- How does local policy restrict imported authority?
- How are resources bounded?
- How does mobile work find a service?
- How does travel fail?
- How do security concerns grow with mobility?
- What happens when useful destinations are scarce?
- What happens when the system requires a special runtime everywhere?

These are not merely citations.

They are **Reality Tests with historical outcomes**.

The current architecture should reuse their lessons before inventing substitutes.

---

# 15. What should not be copied automatically

Friendship is not assimilation.

## 15.1 Do not require mobile executable code

Moving code and runtime state is powerful but introduces severe trust and portability burdens.

Often it is enough to move:

```text
intent
bounded state
stable references
constraints
return contract
```

and let a local handler execute locally.

## 15.2 Do not require one universal execution language

A universal engine increases semantic strength but reduces openness. In a heterogeneous capability network, interoperability may matter more than exact mobile execution semantics.

## 15.3 Do not collapse authority into identity

Known origin does not imply authority to perform every act.

## 15.4 Do not treat service discovery as solved

Petitions are an important precedent, but current capability resolution may involve cost, trust, latency, jurisdiction, privacy, consent, availability, reputation and physical locality.

## 15.5 Do not assume mobility is always preferable

Sometimes moving computation is superior. Sometimes moving data is cheaper and safer. Sometimes neither should cross a locality boundary.

---

# 16. Friendship synthesis

```text
Telescript
  ├── executable mobile state
  ├── places / engines
  ├── go / ticket
  ├── meet / petition
  ├── authority / identity
  ├── permit / resource bounds
  └── historical deployment evidence
             │
             ▼
      FRIENDSHIP / REUSE
             │
             ▼
Cogentia / Fractanet
  ├── handler-neutral work identity
  ├── executable + replay + descriptive continuations
  ├── protocol plurality
  ├── human / AI / institutional handlers
  ├── external observation and reconciliation
  ├── explicit mandate separation
  ├── physical incarnation / custody
  └── packet-backed resumable cooperation
```

The arrows do not claim descent. They identify composable conceptual material.

---

# 17. What appears to remain after friendship analysis

## 17.1 The common layer may be an envelope, not a runtime

Telescript pursued a common executable runtime. The current work may instead pursue:

```text
common resumable envelope
+ heterogeneous local runtimes
```

This is architecturally meaningful if it can be demonstrated in real interoperability.

## 17.2 Work may survive its handler

In Telescript, the mobile agent carries its own execution.

In Cognitive Packet Switching:

```text
work identity
≠ current handler
```

A packet can in principle be resumed by another implementation or another class of actor.

## 17.3 External actors need not join the protocol

A human or third-party system can act under its own authority and leave an externally observable trace. The originating continuation may resume only later.

This **observed cooperation** pattern is a strong candidate residue.

## 17.4 Acceptance can be distinct from observation

A result being observed does not mean it is:

```text
correlated
attributed
valid
accepted
assimilated
```

This distinction is especially important with humans and physical traces.

## 17.5 Physical incarnation creates linearity and custody

Executable code can be copied. A physical object cannot be cloned without producing another object.

Thus physical participation forces explicit distinctions:

```text
copy
≠ move
≠ fork
≠ observation
```

---

# 18. Immediate Reality Tests

## RT-1 — Telescript rewrite of the physical-book mission

Translate the physical-book case as far as possible using only Telescript concepts. For every forced proxy or external assumption, record the residue.

**Pass condition:** a precise list of what Telescript models natively and what it cannot represent without externalization.

## RT-2 — Envelope instead of engine

Run one continuation through two unrelated agent systems or one AI and one human without requiring a shared runtime.

**Pass condition:** the same packet identity and resumption contract survive the handler change.

## RT-3 — Permit / mandate comparison

Map Telescript permit semantics to current mandate/budget rules.

**Pass condition:** identify what can be represented monotonically and where legal/social authority requires semantics beyond runtime permits.

## RT-4 — Rule inventory across three cases

Use:

1. software durable workflow;
2. human/AI continuation;
3. physical-object mission.

Classify every operation as: