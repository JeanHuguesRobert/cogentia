---
title: "Calculette of the Mind — A Fractal Instrument for Cognitive Economy"
subtitle: "Functional vision, locality-first architecture, evolving implementation and Cognitive Packet roadmap"
description: "Self-contained synthesis of the Calculette as an instrument to externalize deterministic cognitive bookkeeping, support Rational Exploration of the Possible under the Second Method, and participate in the Fractanet Learning Computer through local, governed, resumable Cognitive Packets. Separates established sources, verified code slices and proposed capabilities."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-16"
last_modified_at: "2026-10-16"
version: "0.5"
status: "working-paper — principal-approved synthesis"
license: "CC BY-SA 4.0"
language: en
document_role: adapted
document_kind: specification
document_function: "accessible explanation, evolving functional specification, implementation commentary, prioritized research and delivery roadmap"
target_audience:
  - general readers
  - human cognitive workers
  - AI agent handlers
  - Cogentia and Fractanet contributors
  - independent technical reviewers
target_scene: technical
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/calculette_of_the_mind.md"
ai_assisted_by:
  - "OpenAI GPT-6 — drafting and source-grounded synthesis"
provenance:
  origin_type: conversation
  origin_repository: unknown
  origin_ref: unknown
  origin_date: "2026-10-16"
  derived_from:
    - "https://github.com/JeanHuguesRobert/cogentia/issues/233"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-schema.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/lettre_descartes_joie_explorer_possible.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/musee-mariani/methodes/exploration_rationnelle_des_possibles.md"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/locality_principle.md"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractaxxxx.md"
    - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/learning_computer_genese_et_architecture.md"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/mneme_memory_architecture.md"
    - "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/level2_continuation_scheduler_r1b.md"
review:
  status: verified
  reviewed_by:
    - Jean Hugues Noël Robert
  reviewed_at: '2026-10-16'
related_projects:
  - Cogentia
  - Inseme
  - Fractanet
  - FractaCognition
  - Agent JHN
  - Personal Digital Twin
tags:
  - calculette
  - cognitive-economy
  - cognitive-load
  - cognitive-offloading
  - local-first
  - fractacognition
  - fractanet
  - cognitive-packet-switching
  - learning-computer
  - second-method
  - potentics
  - rational-exploration-of-the-possible
  - janus
  - capability-discovery
---

# Calculette of the Mind

**An instrument for thinking with less bookkeeping and more freedom to explore.**  
*Integrated synthesis and evolving technical specification, v0.5 — 16 October 2026.*

> **Thesis.** What a calculator does for mental arithmetic, the Calculette of the Mind seeks to do for the largest reasonable range of cognitive activities: externalize mechanical operations, preserve intermediate state, reveal errors and dependencies, and return scarce cognitive resources to interpretation, creation and responsible judgment.
>
> **Architectural refinement.** The instrument is *situated and fractal*: the simplest adequate calculation stays local. When a task exceeds its locality, the **unfinished cognitive work** can travel as a governed Cognitive Packet through the Fractanet, return to its semantic home (*Ithaca*), and change future exploration only when the learning has been warranted by Reality.

## 1. In ordinary language: why would someone need a Calculette?

A person solving a complicated problem spends attention on two very different things. One is the problem itself: imagining alternatives, recognizing consequences, forming judgments, deciding which questions matter. The other is administrative overhead inside the mind: *What was I doing? Which version did I check? Where did I put the evidence? Which branch was blocked? Did we already try this? What has changed? Whom must I ask?*

Computers excel at much of the second category. Asking a human—or an AI language model with a bounded working context—to repeatedly perform these tasks from memory is a waste of cognitive capacity. The Calculette deliberately transfers such bookkeeping to explicit, durable, inspectable mechanisms.

We informally call the released capacity **mental energy**. This is a useful design metaphor, **not** a claim that there exists one measurable physiological energy unit. For humans, the relevant constraints include attention, working memory, prospective memory and interruption cost. For artificial agents, they include context window, token expenditure, reliable state retention, tool availability, execution time and state reconstruction. These are not identical phenomena; their *engineering problem* is analogous.

Imagine three research hypotheses. One awaits an inaccessible archive; another can be tested today; a third seems unlikely but is not impossible. A human may forget why each was suspended. A fresh agent may invent a new plan and repeat costly work. A Calculette should instead preserve the branch identities, provenance and dependency conditions; present an accurate one-screen orientation; and recommend the smallest feasible next test. If the archive becomes accessible, a bounded event should invite re-examination of exactly the relevant branches—not awaken the entire network.

The Calculette is **not** a brain replacement, an omniscient database, a second monolithic AI, an authority to govern humans, or a magical proof engine. It is a **cognitive instrument**, useful precisely because its limits and operations are made explicit.

## 2. Three intellectual foundations, one operational instrument

| Foundation | Its responsibility | What the Calculette makes easier |
|---|---|---|
| **The Second Method** | Govern the production of knowledge: visible process, first-class objections, machine readability, traceability, and human political sovereignty. | Trace premises, objections, corrections, evidence and authorship without remembering them all. |
| **Potentics / Rational Exploration of the Possible (ERP)** | Explore possible futures without equating low probability, present blockage, unknown feasibility or true impossibility. Seek small discriminating encounters with Reality. | Keep possibility branches alive, distinguish statuses, enumerate missing means, design bounded tests and reopen viable paths. |
| **FractaCognition / Locality / Learning Computer** | Observe and improve cognition itself, at multiple situated scales; distribute unfinished work rather than surrender local ownership. | Externalize control, route work to useful capacities, recover it at Ithaca, and assimilate warranted lessons. |

This is a **crosswalk**, not a transfer of authority. The source doctrines remain at their own canonical addresses; this document specifies an instrument that serves them. The Second Method's Rule 0 remains explicit: artificial agents can participate in knowledge, but must not acquire political standing or exercise binding sovereign authority by mere technical capability. See [Second Method](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md).

ERP insists on a discipline often lost in automation: *unlikely does not mean impossible*. The Calculette must distinguish at least: `conceivable`, `unexamined`, `unknown`, `blocked_here_now`, `improbable`, `testable`, `attested_feasible`, `refuted_under_conditions`, `impossible_with_evidence`, `abandoned_by_choice`, and `realized`. These labels should not become one mutually exclusive super-state machine: some concern probability, some access, some evidentiary status, some deliberate disposition. Store independent **facets**, with provenance and conditions, instead of silently collapsing them.

A refutation under stated conditions need not refute every imaginable alternative. A negative experimental result is an observation about the tested arrangement. The Calculette should ask: **what, exactly, forbids this possibility?**—then offer the smallest safe, informative Reality Test. See [Letter to Descartes](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/lettre_descartes_joie_explorer_possible.md) and [Exploring possibilities to avoid missed futures](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/musee-mariani/methodes/exploration_rationnelle_des_possibles.md).

## 3. Cognitive economy as a design contract

### 3.1 Offload the deterministic first

A useful ordering of operations is:

1. **Remember exactly:** names, references, decisions, previous checks, timestamps, open loops.
2. **Compute and compare reliably:** sets, differences, stable identifiers, prerequisite closures, version changes, deadlines, accounting, deduplication.
3. **Track possibilities:** suspend, resume, branch, detect newly satisfied conditions, distinguish states and evidence.
4. **Organize attention:** offer only the relevant bounded delta and the next feasible action; retain everything else by reference.
5. **Escalate to judgment:** interpretation, hypothesis, uncertain inference, value conflict, contested facts or consequential decisions go to an appropriately qualified handler.

The aim is **net cognitive relief**, not maximal automation. An instrument that floods the user with alerts, opaque scores and elaborate dashboards can make the problem worse.

A tentative decision criterion is:

`net_benefit = avoided_reconstruction + avoided_repetition + prevented_error + saved_attention - tool_friction - verification_burden - interruption_cost - resource_cost`

This is a **measurement framework**, not an experimentally validated physical equation. Avoid one global score masking incomparable human, computational and governance costs. Report separate dimensions when necessary.

### 3.2 Examples of elementary cognitive operations

| Operation | Deterministic portion | Judgment boundary |
|---|---|---|
| `orient` | Resolve current objective, sources, applicable control, deltas and open obligations. | Which objective matters most? |
| `remember/recall` | Retrieve source-addressed traces with temporal and access filters. | Is the memory a reliable interpretation? |
| `compare` | Structural/textual diff, normalized equality, version order. | Is a semantic difference significant? |
| `relate` | Follow typed edges, detect cycles and missing dependencies. | Does one proposition truly entail another? |
| `fork/park/resume` | Preserve branch identity, cursor, budget and conditions. | Is an alternative still worth exploring? |
| `check` | Validate schema, prerequisite, mandate presence and invariants. | Do these checks suffice for this case? |
| `challenge` | Register objection, source, response and unresolved status. | Is the objection persuasive? |
| `probe` | Structure a test card, resources, expected discriminating observations and receipts. | Is the test ethical, informative and authorized? |
| `route` | Discover providers and match declared constraints. | May this provider be trusted with this work? |
| `assimilate` | Record observed outcomes and candidate reusable lessons. | What may legitimately generalize to future work? |

The list can grow, but every new operation must show inputs, outputs, observable effects, costs, limits, provenance, a useful acceptance test and why existing operations are insufficient.

## 4. Fractality without centralization

**Fractal** in this corpus denotes a recurring *grammar of situated self-observation, control, composition and learning*, not mathematical infinite self-similarity. A document, hypothesis, memory scope, Cognitive Packet, agent, project, institution or network may each maintain local orientation, conditions, traces, dependencies and improvement loops. Their causal structures and legitimate authorities can differ.

The [FractaXXXX research map](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractaxxxx.md) is an **open compositional grammar**, not a license to create a separate Fracta-named subsystem for every concern. Reuse existing COP, Cogentia, Operium, Mneme and registry components before inventing another platform. Composition operators (`route`, `fork`, `join`, `merge`, `suspend`, `resume`, `return`) have **different semantic types**; a join is not a merge, a judgment is not a mandate, and a packet delivered is not a task fulfilled.

### 4.1 The Minimum Sufficient Locality principle

The [Locality Principle](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/locality_principle.md) states: **keep state, history, interpretation, authority and computation within the smallest sufficient locality; cross boundaries by explicit reference or bounded projection.** The short form is *localize knowledge; distribute references*.

A locality is the smallest domain where an operation can be understood, governed and continued with all dependencies either local or explicitly identified. It is **not** necessarily a physical machine.

Keep distinct:

- **Locality:** logical domain of coherence and governance.
- **Placement:** where a particular materialization runs or resides.
- **Custody:** who controls that materialization and its access.
- **Handler:** current human, software or model processing the work.
- **Ithaca:** durable semantic home to which the packet's yield belongs.

One machine may host many localities; one locality may occupy several machines. Thus, *moving execution* need not transfer authority or memory ownership.

**Escalation order:** local read → local projection → explicit external reference → bounded remote query or packet → replication only when justified. **Ask there before copying here. Heavy data stays put; small mandates travel.** Privacy, attribution, trust boundary, freshness, network cost and legal jurisdiction are part of the decision, not afterthoughts.

### 4.2 The fractal cognitive loop

```text
Situated anchor (question, task, branch, packet, project)
    ↓ orient and identify applicable local control
Local deterministic operations / local evidence / local history
    ↓ no adequate authorized local route?
Discover remote capacity → bounded Cognitive Packet → routed handler(s)
    ↓ return with typed receipts and observations
Ithaca: reconcile / qualify / preserve original traces
    ↓ warranted assimilation (not automatic truth promotion)
Update local projections, reusable methods and future routing policy
    ↓ next situated exploration
```

At each scale the loop may recur. **Recursion is bounded** by budget, depth, termination conditions, visibility and authority. A handler's inability does not prove Fractanet-wide inability; conversely a network capability does not give the requesting local user the right to invoke it.

### 4.3 Local memory and situated attention

Mneme supplies **governed, addressable memory units**. A packet, agent, document or organization can have its own **situated projection** of relevant memories and dependencies. Importance is neither universal nor timeless. A branch may lose salience in one agent's working view while remaining critical to its packet or institution. Evaporation affects local attention, **never historical act logs**. Reinforcement must be attributable, bounded, deduplicated, authorization-filtered and resistant to self-amplifying loops.

A high-value design rule follows: **the Calculette should remember more than it displays**. Display only the smallest context sufficient to continue correctly. Preserve the rest durably and retrieve by reference.

### 4.4 Janus: two different bidirectionalities

A dependency graph has **upstream** prerequisites and **downstream** dependants. Janus adds another distinction: **retrospective** reconstruction of what was known at time *t*, versus **prospective** exploration of what might happen after *t*. The combination offers four lenses, not two equivalent directions:

| | Upstream | Downstream |
|---|---|---|
| Retrospective | What prior evidence or prerequisites supported this? | Which effects were actually observed after earlier changes? |
| Prospective | What resources, permissions or tests would make this feasible? | What results or documents might require review if it changes? |

A prospective impact candidate is **not** an observed consequence or an automatic invalidation. Retrospective reconstruction must not rewrite what earlier participants knew; distinguish `occurred_at` from `observed_at` and late import from an earlier event.

## 5. The Fractanet relationship: the network as the Learning Computer

The thesis of [The Network is the Learning Computer](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md) is narrower than a slogan about distributed computing: **packetize unfinished cognitive work; let it travel through replaceable handlers; return it to a durable semantic home; let validated experience change subsequent journeys.**

This gives the Calculette two complementary embodiments:

- **Local instrument:** a compact deterministic aid at the human, agent, packet or organizational locality. It does not need the whole network to compare documents or remember a suspended hypothesis.
- **Distributed capability:** where local resources are insufficient, a governed Cognitive Packet carries bounded objective, accessible inputs, control references and return contract through the Fractanet. Its identity need not belong to a given model, process or cloud provider.

**Storage is not learning.** Saving traces means the system can remember. Extracting a useful observation means it can describe experience. The *network learns* only if validated feedback changes future orientation, capability composition, routing, testing or action—in a way attributable and measurable against a baseline. That change may remain local, be shared by reference, or propagate selectively across other authorized localities. No central learning brain is required or presumed.

### 5.1 Packet identity, handler and return must not collapse

A packet is unfinished work plus an envelope defining control, lineage and possible continuations; a handler is a temporary contributor. Its **Ithaca** is not synonymous with its current storage or execution host. Preserve distinctions among packet identity, incarnation, mission, event, effect intent, receipt, and returned observation.

An adequate cold handoff must let a new handler recover: objective; applicable control plane and mandates; sources with verifiably reachable inputs; current branch and dependencies; prior observations and objections; what may be done next; budgets; and return contract. An unavailable reference is a **blocked input**, not permission to invent its contents. This is the Accessible Inputs Gate in [shared agent instructions](https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md).

### 5.2 Learning loop with Reality, not a hall of mirrors

```text
Intent and possibility
  → smallest informative Reality Test
  → Event / observation
  → qualification and attributable receipt
  → warranted correction / assimilation at Ithaca
  → revised local capability or routing policy
  → later independent Reality Test of the improvement
```

Self-consistent agents agreeing with one another are not enough. External facts, measurements, observed consequences and independent objections must be able to defeat the internal model. A test that fails its practical goal may still succeed epistemically by locating a boundary of the Possible. The system must preserve both outcomes, not report green CI as successful fulfillment.

### 5.3 Delegation, delayed effects and locality of responsibility

Store-and-forward may let the work outlive the sender, receiver or connection. But **accepted ≠ durably held ≠ delivered ≠ executed ≠ achieved**. Before any consequential effect, a late handler must check present mandate, intent revision, supersession, resource budget and idempotency. Replay must never silently duplicate external effects. Governance and political authority remain with the legitimate human/institutional locality. A routing success is not a blanket transfer of control.

## 6. Evolving functional contract

The following is a **candidate compositional API**, not a claim that all names are shipped. Reuse and wrap the current Core before extending vocabulary:

| Operation | Expected result | Boundary |
|---|---|---|
| `exploration.orient(anchor, scope)` | Bounded source-backed briefing, delta, unknowns and next feasible action. | Read; authorized references only. |
| `exploration.inspect(id)` | Source, status facets, dependency views and evidence. | No hidden graph leakage. |
| `exploration.recall(query, as_of)` | Attested temporal references and scoped memory view. | Reconstruction is not invention. |
| `exploration.fork/park/resume` | Branch-preserving continuation with cursor and budget. | No false exhaustion on yield. |
| `exploration.dependencies(id, direction)` | Upstream/downstream/impact paths, cycles and coverage. | Impact only suggests review. |
| `exploration.possibility_guard(id)` | Independent feasibility, evidence, probability, authorization and disposition facets. | Unknown ≠ impossible. |
| `exploration.probe_plan(id)` | Several bounded discriminating tests, preconditions and anticipated observations. | Proposal ≠ authorized execution. |
| `capabilities.discover(context)` | Callable providers, schemas, freshness, mandate gates and verified scope. | Declared ≠ live verified. |
| `packet.handoff / return` | Reachable inputs, lineage, receipts and assimilable observations. | Transport ≠ fulfillment. |
| `learning.propose / validate / propagate` | Locally attributable policy improvement candidate and its measured result. | No automatic global promotion. |

A capability claim should distinguish **declared**, **located**, **currently callable**, **authorized**, **tested in a bounded environment**, **executed**, and **outcome independently observed**. Introspection is not permission. A surface advertised as available must be tested for behavioral parity, not only counted.

A minimal possibility record can be a **projection of existing registers**, not a new authoritative global database:

```yaml
id: "owner/repo#233:branch-A"     # illustrative stable scoped ID
objective_ref: "https://..."
locality_ref: "cogentia://..."
ithaca_ref: "https://..."
possible_facets:
  feasibility: unknown              # or conditionally feasible / disproven under constraints
  access: blocked_here_now
  probability: unassessed
  disposition: suspended
conditions:
  - kind: requires
    target: "source:archive-X"
    evidence_ref: "https://..."
observations: []
objections: []
next_reality_test_ref: null
governance:
  mandate_ref: null
  visibility: public
coverage: "known-local-evidence-only"
```

Actual production identifiers, predicates and schemas must be adopted from canonical current registries and versioned only after a failing minimal alternative demonstrates a need.

## 7. Implementation: what is attested, what is not

**Evidence boundary (16 October 2026):** this section is based on Cogentia source files and the chronological engineering account in [issue #233](https://github.com/JeanHuguesRobert/cogentia/issues/233). Some implementation increments are described under [draft PR #235](https://github.com/JeanHuguesRobert/cogentia/pull/235); this document does **not** assert they have been merged to `main` or deployed to live Agent JHN. Reported CI successes are partial test evidence, not end-to-end service proofs.

| Existing artifact / location | Confirmed or reported role | Remaining gap |
|---|---|---|
| [`scripts/lib/continuation-frontier-f2a.js`](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/lib/continuation-frontier-f2a.js) | Append-only frontier projections, OR choice points, branch allocation. | Verify true budget-yield resumption and no false `branch_exhausted`. |
| [Level-2 scheduler note](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/level2_continuation_scheduler_r1b.md) | Separates readiness, viability and allocation. | Establish cold process and cross-handler reproducibility. |
| [`scripts/lib/agent-jhn-whatsapp/governed-harness.js`](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/lib/agent-jhn-whatsapp/governed-harness.js) | Bounded reasoner with governed capability registration. | Wire and independently test new capability on live target. |
| [`scripts/lib/capability-inventory.js`](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/lib/capability-inventory.js) | Inventory of CLI, MCP, skills, patterns and other declared projections. | Discovery of actual per-locality callable, authorized and live-verified capacity. |
| [`scripts/lib/symmetry-audit.js`](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/lib/symmetry-audit.js) | Five-surface inventory score (CLI, Web, MCP, API, packet). | Behavioral parity, not a count of declared slots. |
| [Mneme architecture](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/mneme_memory_architecture.md) | Governing distinction between durable mnemes, situated views and working context. | Durable production integration and redaction/portability tests. |
| `scripts/lib/dependency-janus.js` — [PR #235](https://github.com/JeanHuguesRobert/cogentia/pull/235) | Reported pure `upstream/downstream/impact` graph projection with scope filtering, bounded traversal and cycles. | Wider coverage, temporal history, federation and durable authoritative updates. |
| `scripts/lib/agent-jhn-whatsapp/dependency-step-capability.js` — PR #235 | Reported read-only `exploration.dependencies` capability for governed JHN harness. | Confirm deployment activation. |
| `scripts/lib/cogentia-mcp-core.js` — PR #235 | Reported MCP tool `cogentia_exploration_dependencies` on the same shared Core. | Live MCP/CLI/JHN equivalence; OpenAI-compatible tool calling separately. |
| `scripts/lib/calculette-bootstrap.js` — PR #235 | Reported read-only `cogentia.calculette_bootstrap/v1` and MCP discovery, verification marked `registry_only`. | Automatic cold-session entry and live status validation. |
| `scripts/lib/calculette-janus-seed.js` — PR #235 | Reported `as_of` deterministic seed/delta with event-time discipline. | Durable consolidated register and continued updates. |
| Registry/F2a/GitHub issue importers — PR #235 | Reported conservative public-only provisional prefill and open-issue queue, including multi-repo manifest. | Refresh live source roster, private authorization, full ingestion, provenance and persistence. |

**Known correction sequence:** PR [#234](https://github.com/JeanHuguesRobert/cogentia/pull/234) addressed F2a false exhaustion in a reported test slice. Treat merge status and the exact deployed regression as independently checkable. The initial #235 work also corrected an asynchronous test assertion. Continue Fix Bugs First: preserve correctness before expanding capability claims.

Not established: completed situated stigmergy engine; automatic live multi-node discovery; complete corpus ingestion; production durable Janus history; deployed universal `orient/inspect/recall`; robust end-to-end restart across providers; automatic assimilation changing routing choices; full parity across CLI/Web/MCP/API/Cognitive Packet surfaces. These are research and integration goals, **not features already delivered**.

## 8. Friends, not competitors: selectively reusable state of the art

| Friend | Relevant insight | Practical reuse / contrast |
|---|---|---|
| Distributed cognition / Edwin Hutchins | Thinking occurs across people, artifacts and environmental arrangements. | Measure the *whole human–instrument system*, not isolated model cleverness. |
| David Kirsh, *The Intelligent Use of Space* (1995) | Spatial organization reduces mental computation. | Compare a compact context map with plain text and a dependency table. |
| Risko & Gilbert, *Cognitive Offloading* (2016) | External tools can reduce internal cognitive demand. | Measure recall burden, resumption time and distraction introduced by the aid. |
| Prospective memory / external reminders | External cues can replace repeated mental monitoring. | Conditional, bounded, deduplicated reactivation; no blanket notification stream. |
| Make / Bazel / incremental computation | Recompute only the closure affected by changed inputs. | One typed dependency graph, forward and reverse projections. |
| Event sourcing / Temporal | Replay durable histories while protecting side effects. | Split deterministic reconstruction from consequential action receipts. |
| LangGraph and Letta/MemGPT | Checkpointed workflows and explicit agent memory management. | Reuse patterns; do not mistake framework demos for production guarantees. |
| MCP and A2A | Tool / agent discovery and interoperable delegation. | Adapt existing interfaces, preserving Cogentia mandate and evidence semantics. |
| Delay-Tolerant Networking, RFC 9171 | Asynchronous forwarding despite intermittent connectivity. | Explicit custody, lifetime and return obligations for packets. |
| Linda/blackboards, mobile agents/Telescript, cognitive packet networks | Coordination by shared spaces, moved work or learned paths. | Compare with COP packet identity and Ithaca; recognize substantial prior art. |
| Physarum and collective biological systems | Bounded analogies for adaptive distributed routing. | Inspiration for tests, **not** proof of equivalent biology or intelligence. |

Sources and fuller comparative context: [FractaXXXX](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractaxxxx.md), [The Network is the Learning Computer](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md), [RFC 9171](https://www.rfc-editor.org/rfc/rfc9171.html), [MCP](https://modelcontextprotocol.io/), [A2A](https://a2a-protocol.org/). An analogy or published interface is not an asserted institutional collaboration, nor an exact match of semantic guarantees. Check active implementation versions and licenses before integration.

## 9. Roadmap by expected cognitive gain / marginal effort

Scores below are **ordinal planning hypotheses**, not empirical measurements. Benefit is expected saved cognitive effort (1–5); marginal effort is estimated development cost (1–5) *after reuse of existing corpus mechanisms*. The ratio deliberately favors cheap deterministic functions, but should be re-estimated from Reality Tests and deployment costs. A small gain/effort ratio does not imply a function is unimportant or indefinitely dispensable.

| Rank | Candidate capability | Benefit | Effort | Ratio | Why first / caution |
|---:|---|---:|---:|---:|---|
| 1 | One-command cold orientation from an Issue / Packet | 5 | 1 | 5.00 | Existing issue refs and discovery; validate input reachability. |
| 2 | Suspend, preserve next action and resume | 5 | 1 | 5.00 | Avoid redoing cognition; fix false exhaustion first. |
| 3 | Distinguish unknown, blocked, unlikely and impossible | 5 | 1 | 5.00 | Huge anti-pruning benefit; use independent status facets. |
| 4 | Verify control, mandate and first-step preconditions | 5 | 1 | 5.00 | Deterministic guards; no policy-free action. |
| 5 | Source-backed change-delta briefing | 4 | 1 | 4.00 | Avoid rereading; provenance required. |
| 6 | Capture objections, experiments, references and receipts | 4 | 1 | 4.00 | Trace-first, no second truth store. |
| 7 | Open-loop queue across currently accessible repositories | 5 | 2 | 2.50 | Current importer foundation; coverage must be shown. |
| 8 | Reverse dependency / review-needed signals | 5 | 2 | 2.50 | Reuse #235 graph; avoid automatic invalidations. |
| 9 | Conditional possible reactivation | 5 | 2 | 2.50 | Wake on meaningful changed conditions; dedupe. |
| 10 | Local-first selective capability discovery | 5 | 3 | 1.67 | First resolve nearby providers before Fractanet routing. |
| 11 | Smallest informative Reality Test planner | 5 | 3 | 1.67 | Use checklists; judgment controls the test. |
| 12 | Accurate cold handoff / return to Ithaca | 5 | 4 | 1.25 | Requires cross-locality proof, privacy and receipts. |
| 13 | Situated salience and bounded evaporation | 4 | 4 | 1.00 | Local attention only; history must not disappear. |
| 14 | Learning future routes from validated returns | 5 | 5 | 1.00 | The Learning Computer's distinctive system-level test. |
| 15 | Composable higher-order inference and simulation | 5 | 5 | 1.00 | Valuable but epistemically hard; never call model reasoning deterministic. |

**Interpretation:** quick wins should actually be *delivered first*. Do not turn this research roadmap into a reason to postpone useful local calculation until distributed cognition is complete. Conversely, a simplistic MVP that records tasks but cannot resume and explain *why* they remain possible does not fulfill the instrument's full purpose.

## 10. Cognitive Packets: consolidation, not proliferation

The umbrella work locus is [Cogentia issue #233](https://github.com/JeanHuguesRobert/cogentia/issues/233). [PR #234](https://github.com/JeanHuguesRobert/cogentia/pull/234) and [PR #235](https://github.com/JeanHuguesRobert/cogentia/pull/235) are the principal recorded correction and implementation lines. Earlier draft identifiers `CALC-LOAD-*`, `CALC-FRIEND-*` and `CALC-ERP-*` are **planning labels**, not known existing GitHub issues. Avoid spawning all of them. Consolidate into the smallest sufficient dependency-ordered work packets, preferably child continuations of #233:

| Proposed packet | Focus | Prerequisite / acceptance |
|---|---|---|
| **CALC-P1 — Cognitive Relief, FBF First** | Fix yield-vs-exhaustion; cold orient, delta, next action, possibility facets, accessible-input and mandate guards. | A fresh handler resumes a real open issue without false history, invented rights or repeated work. |
| **CALC-P2 — Local Janus and Reactive Possible** | Source-backed dated prefill, bidirectional dependency impact, objection history and candidate reactivation. | A changed prerequisite signals only relevant authorized scopes; event history and unknowns remain intact. |
| **CALC-P3 — Situated Capability and Packet Handoff** | Reuse capability inventory and discovery, locality resolution, MCP/CLI adapters, bounded work packet, return receipt. | Two handlers in different localities reproduce governed observations without private leakage; no transport=fulfillment confusion. |
| **CALC-P4 — Fractal Learning and Measurement** | Scoped attention, actual relief metrics, feedback assimilation and selective propagation of validated methods. | A local correction changes a later decision or route with measured improvement and a reproducible counterexample/control baseline. |
| **CALC-P5 — ERP Reality Test Composer** | Compare small experiments by information gain, reversibility, accessible prerequisites and costs. | An improbable but live possibility remains testable; negative response updates the map without unauthorized effects. |

Each packet must identify: durable home, source doctrine, scope and authority, current state, first feasible action, required reachable inputs, explicit non-goals, tests, result/return contract, and effect ceiling. Do not equate an issue being open with its readiness for execution. The local `AGENTS.md` and current applicable control plane must be activated before work.

### 10.1 An integrative two-journey Reality Test

**Journey 1 (baseline):** Human A opens three hypotheses; one is suspended on a missing source, one is improbable, one is tested. Agent JHN records branches and source traces with the current authorized local mechanisms. Stop; terminate the handler session. Measure resumption time, missing facts, duplicate tool calls, memory demanded of the human, notifications and machine cost.

**Journey 2 (network):** A different handler, without original chat history and in a distinct accessible locality, receives only the Cognitive Packet and governing references. It discovers actual provider capabilities; confirms the required inputs and authority; resumes the branch; identifies the now-accessible source; proposes the smallest discriminating test; and returns an attributable result to the packet's Ithaca. A new local projection changes, but old historical acts do not. A later third task demonstrates whether a verified lesson has actually altered future routing or exploration.

**Hard failure conditions:** no reachable input; incompatible or inactive control; false impossibility from low probability or access failure; leaked private edge; false exhaustion on step budget; duplicate external side effect; delivery mistaken for achievement; self-validating AI-only consensus; or asserted learning without any changed subsequent behavior.

A successful test needs **independent Reality evidence** beyond green tests, including a control task where the Calculette is not used, or an equivalent baseline. If it does not measurably save net cognitive effort, redesign the interface or retire the feature rather than maintain an impressive but counterproductive complexity.

## 11. Implementation and governance invariants

1. **Truth, probability, feasibility, access, salience, execution readiness and authority are orthogonal.**
2. **Locality is logical, not merely a machine address.** Store authoritatively where the object belongs; move bounded work or references.
3. **No single global salience or dependence score.** Local scopes may overlap and refer to one another without being absorbed.
4. **History is append-only or provably reconstructible; attention may evaporate, acts may not.**
5. **Janus separates reconstructed prior knowledge, current evidence and forecasts.** Avoid retrospective fabrication.
6. **No current-capability inference from a dated catalog or past successful receipt.** Discover, authorize, probe.
7. **No implicit mandate escalation** through a tool, packet, router, copied document or learned policy.
8. **No global learning claim from mere data accumulation.** Validate that assimilated experience changes subsequent behavior and improves an externally meaningful outcome.
9. **No FractaX proliferation by nomenclature.** Reuse before adding components; use a discriminating Reality Test.
10. **Human political governance remains human.** Machines can inform, challenge, propose and compute, but not acquire sovereign authority through operation of the Calculette.
11. **Fix Bugs First**, especially where defects silently close possibilities, falsify history or duplicate consequential effects.
12. **Source before projection:** treat this synthesis as an evolving specification, not a silent replacement for its referenced sovereign source papers.

## 12. Current conclusion and next smallest useful act

The Calculette is best understood as a **local-first, fractally composable instrument for cognitive economy**, not an additional platform beside Cogentia. Its elementary functions preserve memory, check states, manage dependencies, support possibility exploration and prepare real-world tests. Its more advanced form borrows missing capacities from the Fractanet through governable Cognitive Packets. At Ithaca, warranted observations can improve local methods and, when appropriate, future routing across the learning network.

There is no need to wait for the full Learning Computer to deliver relief. **The first concrete deliverable** should be a one-command, evidence-backed cold orientation of an open Cognitive Packet, with correct branch viability, preconditions and next feasible action. It simultaneously tests the calculator analogy, ERP's refusal of premature impossibility, locality, source provenance, and the Second Method's auditability. The distributed feedback loop is then built on demonstrably useful local operations.

> **Remember locally. Calculate mechanically. Keep the Possible open. Delegate only what is necessary. Return to Ithaca. Learn only from what Reality supports.**

## 13. Source and implementation register

### Sovereign source and architecture documents

- [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — source method, objections, human governance boundary.
- [Letter to Descartes: The Joy of Exploring the Possible](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/lettre_descartes_joie_explorer_possible.md) — Potentics, improbability, rational as-if, small Reality Tests.
- [Exploring possibilities to avoid missed futures](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/musee-mariani/methodes/exploration_rationnelle_des_possibles.md) — past/future, latent capacities, Janus.
- [Locality Principle](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/locality_principle.md) — minimum sufficient locality and crossings.
- [FractaXXXX](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractaxxxx.md) — compositional grammar, FractaRouting and prior art.
- [The Network is the Learning Computer](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/the_network_is_the_learning_computer.md) — packet journeys, Ithaca, assimilation and learning.
- [Learning Computer: genesis and architecture](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/learning_computer_genese_et_architecture.md) — trace-centric and Reality-grounding research.
- [FractaCognition Principles](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractacognition_principles.md) — reflexive discipline and minimum sufficient locality.
- [Mneme Memory Architecture](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/mneme_memory_architecture.md) — governed memory and situated projections.
- [Registry of Registries](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/registry_of_registries.md) — source-local registry authority, federated views.
- [Level-2 Continuation Scheduler](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/level2_continuation_scheduler_r1b.md) — alternative branches and resumable frontier.
- [Shared Agent Instructions](https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md) — operational gates, capabilities and packets.
- [Canonical Agile Frontmatter Schema](https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-schema.md) — metadata and status requirements.

### Work loci and implementation evidence

- [Cogentia #233 — Calculette umbrella](https://github.com/JeanHuguesRobert/cogentia/issues/233).
- [Cogentia PR #234 — F2a regression correction](https://github.com/JeanHuguesRobert/cogentia/pull/234).
- [Cogentia PR #235 — Dependency/Janus/Bootstrap increments](https://github.com/JeanHuguesRobert/cogentia/pull/235).
- [Capability inventory](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/lib/capability-inventory.js) and [symmetry audit](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/lib/symmetry-audit.js).

**Evidence note:** These branch-specific implementation paths are referenced to their PR rather than assumed present on `main`. External prior-art examples are research friends, not endorsements, agreements or asserted compatible deployments. This synthesis is not itself evidence that the candidate capabilities are live.