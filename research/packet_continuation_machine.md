---
title: "Packet/Continuation Machine — distributed branching computation model"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-23"
last_modified_at: "2026-09-04"
status: "working-note"
version: "0.4"
license: "CC BY-SA 4.0"
language: "en"
repository: "JeanHuguesRobert/cogentia"
canonical_path: "cogentia/research/packet_continuation_machine.md"
document_role: "source"
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
source_or_derived: "source-document"
human_validation_required: true
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "cogentia/research/alan_turing_mcp.md"
  - "cogentia/research/cognitive_packets.md"
  - "inseme/research/packet_attractor_fractanet.md"
  - "Inox/research/fractanet_language_abstractions.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/issues/54"
tags:
  - cogentia
  - alan
  - continuation
  - cognitive-packet
  - fractanet
  - distributed-computing
  - branching
  - speculative-execution
  - rational-exploration
---

# Packet/Continuation Machine

## 0. Status

This note records a candidate architecture and research hypothesis. It is not yet a claim of historical novelty. Individual ingredients have substantial prior art; the research question is whether their particular composition and governance form a useful and distinct computational architecture.

## 1. Core proposition

A suspended continuation is a **Packet**.

```text
Continuation ⊆ Packet
```

A computation therefore does not intrinsically belong to the machine currently executing it. Its future may be serialized, persisted, transported, attracted by a capability, resumed elsewhere, branched into competing or complementary continuations, and recombined.

Canonical short forms:

> **A Continuation is a Packet.**

> **A computation does not belong to the machine currently executing it.**

> **The Network is the Computer when continuations can travel, branch, compete and recombine.**

The last sentence intentionally extends the historical Sun Microsystems slogan: the network becomes the execution substrate not merely when data or remote calls cross it, but when the future of a computation itself can move through it.

## 2. Direct style is syntax, continuation is semantics

Alan deliberately reconciles ordinary direct-style programming with distributed continuation semantics.

Source may remain simple:

```alan
weather = mcp weather.forecast location="Corte"
plan = call optimize weather=$weather
approval = mcp human.approve proposal=$plan
result = mcp energy.execute plan=$plan
return result=$result
```

The apparent call/return syntax MUST NOT imply naïve RPC semantics. An effectful operation may instead mean:

```text
Need(capability, arguments)
+ Continuation(current computation)
+ Mandate
+ Policy
+ Budget
+ Trace
       ↓
Packet
       ↓
capability resolution / attraction / mediation
       ↓
zero, one or many executions
       ↓
Event(s) / Artifact(s) / Result(s)
       ↓
resume / branch / combine / terminate
```

Thus the problem with RPC is not necessarily its surface syntax. The problem is assigning synchronous local-call semantics to a distributed interaction. Alan may preserve the convenient syntax while giving it Packet/Continuation semantics.

## 3. Abstract machine

A minimal Packet/Continuation Machine (PCM) state can be described as:

```text
M = (P, K, C, S, E, B, G)
```

where:

- `P` = active and suspended Packets;
- `K` = available capabilities and capability attractors;
- `C` = contexts and constraints;
- `S` = durable and working state;
- `E` = Events and Artifacts already produced;
- `B` = budgets and resource envelopes;
- `G` = governance: mandates, rights, policies, responsibility and trace requirements.

A transition is not fundamentally an instruction-pointer increment. It is a transformation:

```text
(Packet, Capability, Context, State, Budget, Governance)
    → {Packet'0 ... Packet'n} + Events + Artifacts + State'
```

`n` may be:

- `0`: terminal, failed, refused or absorbed;
- `1`: ordinary continuation;
- `>1`: branching exploration, replication, quorum, alternative strategy or speculation.

## 4. Branching as a first-class operation

A continuation MAY be resolved by launching several branches:

```text
                    Continuation Packet C
                           │
                     branch policy
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
            C1            C2            C3
             ↓             ↓             ↓
        local solver     LLM agent      human
             ↓             ↓             ↓
            R1            R2            R3
             └─────────────┼─────────────┘
                           ↓
                 combine / choose / prune
                           ↓
                    Continuation C'
```

Branches MAY differ in:

- algorithm;
- language/runtime;
- physical location;
- provider;
- model;
- human or machine executor;
- cost;
- latency;
- energy source;
- trust level;
- epistemic method.

This makes the model more general than parallel execution of identical code paths.

## 5. Resolution policy

Branching is bounded rational exploration, not uncontrolled fan-out.

A branch policy may consider:

```text
expected information gain
expected utility
latency
compute cost
energy/exergy cost
confidence
independence/diversity
trust
privacy
jurisdiction
mandate
remaining budget
deadline
reversibility
```

Example:

```text
budget = 100

branch:
  local_heuristic      cost<=5
  symbolic_solver      cost<=15
  specialist_agent     cost<=20
  high_quality_llm     cost<=40

continue when:
  confidence >= threshold
  OR sufficient independent agreement
  OR deadline reached
  OR budget exhausted
```

This connects execution semantics to Cogentia's Rational Exploration of the Possible: execution itself may be a governed exploration of possible continuations.

## 6. Recombination semantics

Multiple branches do not imply that one winner must simply replace all others. Recombination policies include:

```text
first-valid
best-score
quorum
majority
weighted-confidence
proof-check
human-select
merge-compatible
retain-disagreement
pareto-front
all-results
```

The runtime SHOULD preserve disagreement when disagreement is itself informative.

A recombination may produce:

```text
one continuation
multiple surviving continuations
an Event recording unresolved disagreement
a request for new evidence
a human decision point
termination
```

## 7. Relationship to Prolog

There is a useful analogy with Prolog search:

```text
choice point
→ alternative branches
→ exploration
→ pruning/backtracking
→ solution(s)
```

PCM generalizes the executor and branch type. A branch may be logical inference, SQL, numerical simulation, an LLM, a remote service, a sensor observation or a human decision. The search space is therefore not limited to a single logic-programming runtime.

A rough comparison:

```text
Prolog                  Packet/Continuation Machine
------                  ---------------------------
goal                    continuation / intent
clause                  capability / strategy
choice point            branch policy
proof branch            continuation packet
backtracking            pruning / alternate continuation
unification             result compatibility / binding
solution                event/artifact/result + continuation
single runtime model    heterogeneous capability network
```

## 8. Relationship to Von Neumann

The comparison is architectural, not a claim of replacement.

A simplified Von Neumann transition is:

```text
(memory, program_counter, instruction)
    → (memory', program_counter')
```

A PCM transition is closer to:

```text
(packet, state, available_capabilities, context, governance)
    → {packet'0 ... packet'n} + state' + events
```

Differences of emphasis:

- no privileged single program counter;
- location of execution is not intrinsic to the computation;
- suspended future computation is serializable and addressable;
- branching is first-class;
- heterogeneous executors are normal;
- governance, budget and trace are execution semantics, not external administration;
- persistence permits computation to outlive a process, node, runtime or session.

A conventional CPU remains a perfectly valid capability inside this architecture.

## 9. Capability attraction instead of central scheduling

PCM does not require a single omniscient scheduler.

A Packet can advertise what it needs; capability nodes/Packet Attractors can advertise what they are able and authorized to resolve.

```text
Packet need
    ↕
capability matching / attraction
    ↕
mandate + policy + budget + locality
    ↓
execution site emerges
```

This supports a distributed ecology rather than a mandatory central orchestrator.

### 9.1 Situated capability and productive interdependence

A concrete offer is more than an abstract Blueprint. A coding agent installed
on a particular machine and connected to a particular Principal account may
have valuable repository access, operational context, accumulated interaction
history, local tools, credentials, and situated competence. These properties
are dependencies, but they are not automatically capture or defects.

```text
situated capability
  = abstract capability
  + installation and locality
  + account-bound authority and context
  + accessible history and tools
  + declared dependencies and relations
```

The anti-capture objective is therefore not autarky or the refusal of every
dependency. It is a Principal's ability to understand, govern, compensate,
renegotiate, and, when necessary, reconfigure dependencies. A dependency is
more capture-prone when it is opaque, unilateral, irreplaceable in practice,
or makes the provider the sole residence of identity, mandate, or canonical
work state. It can be productive when its value, scope, costs, alternatives,
and recovery path remain visible and governable.

Continuation portability consequently does not mean that every selected
HandlerInstance is portable or that every situated advantage can be exported.
It means that loss or replacement of a situated capability does not make the
Task unintelligible: the durable Packet, authority, artifacts, and causal
lineage remain reconstructible, while the lost advantage and recovery cost are
declared.

### 9.2 Attraction is a governed judgment, not only a static score

The Pilot may filter deterministically on hard constraints, then rank or seek
human/LLM judgment among admissible offers. Relevant attraction factors include
the existing constraints plus:

```text
situated competence and relevant accessible context
continuity of the Principal/capability relation
dependency criticality and loss impact
substitutability, recovery path, and recovery cost
strength and location of backups or compensating capabilities
exit, revocation, and renegotiation conditions
```

No universal scalar can settle every trade-off. A strong account-bound Codex
installation may properly attract a coding Continuation because abandoning its
situated context would cost more than the dependency risk at that moment. The
selection rationale, declared dependency posture, and fallback or recovery
plan should become traceable artifacts. Where these criteria are incomparable,
selection is a judgment boundary, not hidden scheduler discretion.

## 10. Persistence and failure

A Continuation Packet SHOULD be able to survive:

- process termination;
- runtime restart;
- node failure;
- migration;
- long human delay;
- temporary network partition.

Therefore meaningful suspended state must be externalizable enough to be resumed without relying on a live stack frame in a particular process.

The distinction is:

```text
process recovery ≠ computation recovery
computation recovery = durable Packet + durable relevant state + trace
```

## 11. Governance is part of the machine

A branch that is technically executable is not necessarily legitimate.

For each continuation/effect, PCM must be able to preserve or resolve:

```text
mandate
rights
responsibility
budget bearer
policy
privacy/data regime
trace requirements
human validation anchor
expiry / TTL
```

This follows Alan's existing invariant:

```text
Tool availability is not authorization.
Authorization is not execution.
```

Therefore governance metadata is not merely control-plane annotation; it constrains valid machine transitions.

### 11.1 Bounded handler initiative

A continuation architecture can become needlessly bureaucratic if every
predictable next step is converted into a fresh human judgment request. The
opposite error is worse: treating prediction of the next step as authority to
perform it.

The useful boundary is the existing governance envelope.

```text
next_action_allowed :=
    within_mandate
    ∧ within_budget
    ∧ within_rights_and_disclosure
    ∧ within_effect_ceiling
    ∧ no_material_hidden_side_effect
    ∧ not_preempted_by_clearer_higher_priority

if next_action_is_high_confidence
and next_action_allowed
and action_is_read_only:
    execute directly
else:
    expose the exact continuation and its gate_or_priority
```

This is the **Next Logical Action Principle**: when the next action is highly
predictable and useful, the handler should not stop merely to describe it. It
SHOULD execute an already-authorized, non-impacting read directly; where the
step is effectful, costly beyond the envelope, disclosive, or otherwise gated,
it SHOULD surface the exact action and request only the missing authority.

`read_only` is not synonymous with `free` or `consequence-free`. Retrieval may
consume compute, quota, privacy budget, scarce human attention, or cause
provider-visible side effects. Autonomy can increase as consequence decreases,
but it never bypasses mandate or budget.

The architectural consequence is important: a Handler is responsible not only
for resolving the current continuation, but also for recognizing when the next
continuation is already determined enough to proceed inside the same envelope.
Unnecessary stopping is therefore a handler defect just as unauthorized
continuation is.

#### Priority is orthogonal to local continuation logic

Continuation semantics alone cannot determine global work order. A Packet may
have an obvious successor while another active Packet has a stronger claim on
the Principal's current attention, compute, deadline, or scarce execution
capacity.

```text
local next continuation
        ≠
global next priority
```

Therefore a Handler or distributed attraction mechanism SHOULD preserve
explicit priority signals and deliberate parking decisions before consuming
material resources on an otherwise admissible successor. This is not a call for
one omniscient scheduler: priority may remain distributed, stigmergic,
Principal-declared, deadline-driven, or policy-derived. The minimum invariant is
that local continuation certainty MUST NOT silently override a known stronger
priority.

Priority and authority remain orthogonal:

```text
authorized but lower-priority  → may remain parked
high-priority but unauthorized → remains gated
authorized + priority-fit      → eligible to proceed
```

### 11.2 Verified handoffs and native checkpointing

A continuation hop is semantically invalid when the next handler cannot
retrieve the input that the previous handler believes it has handed off.
Correct instructions are not enough.

```text
handoff_valid :=
    target_exists
    ∧ target_retrievable_by_next_handler
    ∧ target_content_or_version_verified
    ∧ immutable_identity_known_when_required
```

The check is performed against the next handler's actual access path, not the
sender's working memory. A local draft, an unpublished edit, or a mutable
branch name cannot silently stand in for the immutable artifact named in a
review or replay contract.

For Git-backed Corpus work, the simplest native semantics are generally
sufficient:

```text
stable path
→ evolving content
→ immutable commit checkpoints
```

Routine sequential revisions SHOULD keep one canonical path. The commit SHA is
the immutable causal frontier. Versioned filenames and branches SHOULD be
introduced only when they solve a concrete problem such as genuinely parallel
or incompatible variants, not as a second versioning system layered over Git.

A robust document-review handoff therefore follows:

```text
edit canonical file
→ required human arbitration
→ commit
→ fetch back from the shared repository
→ verify delivered content/version
→ obtain immutable SHA
→ hand off that SHA
```

This is the **Verified Handoff Principle**:

> **A continuation is not valid merely because its instructions are correct.
> Its declared input must exist, be accessible through the channel available to
> the next handler, and be independently retrievable before the handoff is
> issued.**

The principle is a FractaCognitive yield from the document-production work
tracked in `barons-Mariani#54`: a Reviewer handoff was prepared for a v0.4 that
existed in the Redactor's local working state but had not yet been published to
the GitHub path the Reviewer was told to inspect. The failure was not a lack of
information about the workflow; it was a failure to let the shared artifact
state answer before issuing the continuation. The correction therefore belongs
in handler architecture, not merely in an instruction to “be more careful.”

Together, bounded initiative and verified handoff give a useful rule:

> **Continue without needless permission inside the authorized envelope; never
> hand off an input you have not verified in the state the next handler will
> actually receive.**

## 12. Initial prior-art map

The architecture must be compared seriously with existing work before any novelty claim.

Important neighbours include:

- continuation-passing style and first-class continuations;
- Actor Model / Erlang supervision;
- dataflow machines;
- Oz/Mozart distributed dataflow, futures, logic variables and programmable search;
- distributed logic programming and parallel Prolog;
- Linda/tuple spaces;
- π-calculus and process calculi;
- mobile code / mobile agents;
- workflow and durable execution engines;
- futures/promises and async/await;
- speculative execution and branch-and-bound;
- distributed task systems and serverless workflows.

The closest historical neighbour found so far is arguably Oz/Mozart: it combines logic programming, constraint/search facilities, concurrent dataflow execution, capability-style security, and network-transparent distributed computation. That makes it a particularly important comparison target, not a reason to abandon PCM.

The candidate distinctive composition to investigate is:

```text
Serializable Continuations as Packets
+ direct-style language surface
+ capability attraction
+ heterogeneous distributed branching
+ programmable recombination
+ mandate / responsibility / policy
+ explicit budget and cost bearer
+ durable trace and artifacts
+ Rational Exploration of the Possible
```

Novelty, if any, should be claimed only for a precisely specified composition after deeper literature and implementation review.

## 13. Minimal executable experiment

A useful proof-of-concept should avoid building a new distributed runtime first.

Implement one Alan computation whose single apparent effect can resolve through several branches:

```alan
answer = explore weather.assess location="Corte"
return answer=$answer
```

Possible branch executors:

1. direct Open-Meteo/public API calculation;
2. local historical/model calculation;
3. LLM interpretation of available observations;
4. optional human observation.

The continuation is persisted as a Packet. Branches may execute on different available substrates. A recombination policy produces the result while preserving provenance and disagreement.

Acceptance criteria:

- source remains direct-style;
- suspension produces a serializable Packet;
- at least two branches can execute independently;
- the initiating process can terminate before completion;
- another runtime can resume/recombine;
- each branch has explicit cost/budget/provenance;
- disagreement is not silently erased;
- the final result links to all supporting Events/Artifacts.

## 14. Research questions

1. What is the minimal serializable continuation representation required by Alan?
2. Which state belongs in the Packet versus referenced durable Artifacts?
3. How are continuation identity and idempotence defined?
4. How should speculative side effects be prevented or compensated?
5. Which branch policies can be decentralized safely?
6. How should budgets be split, reclaimed and accounted across branches?
7. What constitutes branch independence for epistemic confidence?
8. How are human branches represented without pretending humans are deterministic functions?
9. What are the minimal recombination primitives?
10. Can the same semantics run from ESP32/Inox-micro through servers, LLMs and humans?
11. Which properties are already present in Oz/Mozart, distributed Prolog, workflow engines or mobile-agent systems?
12. Which remaining composition, if any, deserves a distinct architectural name?

## 15. Working interpretation

The proposed architecture shifts the fundamental abstraction from:

```text
instruction executed by processor
```

or:

```text
remote procedure executed by server
```

toward:

```text
Packet carrying a partially resolved computation
→ attracted by legitimate capability
→ transformed into Event/Artifact and possible Continuation Packets
```

The network is then not merely transport between computers. It participates in defining where and how computation continues.
