---
title: "Conceptual Gravity — Governed Conceptual Routing for a Self-Orienting Reactive Corpus"
description: "Working paper defining Conceptual Gravity as a governed model for routing cognitive needs through the smallest sufficient conceptual subgraph of a Reactive Corpus."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-08-29"
last_modified_at: "2026-08-29"
license: "CC BY-SA 4.0"
language: "en"

version: "0.3"
status: "working-paper"
document_role: "source"

canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/conceptual_gravity.md"
last_stamped_at: "unknown"

ai_assisted_by:
  - "GPT-5.6 Sol — exploration, Redactor drafting, review assimilation and restructuring"
  - "Grok (xAI) — decorrelated Reviewer of v0.1 and assimilation Reviewer of v0.2"

provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "unknown"
  origin_date: "2026-08-28"
  derived_from: []

review:
  status: "human-validated"
  reviewed_by:
    - "Jean Hugues Noël Robert"
  reviewed_at: "2026-08-29"

review_history:
  - target_version: "0.1"
    status: "decorrelated-external-review"
    reviewer: "Grok (xAI)"
    date: "2026-08-28"
    artifact: "review-conceptual-gravity.md"
  - target_version: "0.2"
    status: "assimilation-review-same-reviewer"
    reviewer: "Grok (xAI)"
    date: "2026-08-28"
    artifact: "review-conceptual-gravity-v02.md"
  - target_version: "0.3"
    status: "principal-validation"
    reviewer: "Jean Hugues Noël Robert"
    date: "2026-08-29"

update_policy: "UP-DEFAULT-REVIEWED"

related_concepts:
  - "Conceptual Gravity"
  - "Informational Gravity"
  - "Cognitive Packet"
  - "Reactive Corpus"
  - "Agile Learning"
  - "Le Réel Répond"
  - "Sleep Cycle"
  - "Optimistic Mainline Governance"
  - "Occam"
  - "Capability Symmetry"
  - "Mandated Agent"

changelog:
  - "v0.1 (2026-08-28) — initial Redactor working paper from the Conceptual Gravity exploration."
  - "v0.2 (2026-08-28) — assimilated decorrelated review, narrowed novelty claims relative to adaptive GraphRAG, introduced deterministic P0 sufficiency, disposable Concept Attractors, routing-trace corroboration, hostile-attraction handling, and benchmark-first implementation."
  - "v0.3 (2026-08-29) — corrected review metadata, added explicit benchmark expectation provenance, bounded live P0 traversal, typed routing-trace influence, and human validation of the working name and document for entry into the Corpus."
---

# Conceptual Gravity

## Governed Conceptual Routing for a Self-Orienting Reactive Corpus

### Object

This working paper explores **Conceptual Gravity** as a model for conceptual routing inside a Reactive Corpus.

Its starting point is practical.

As a Corpus grows, an Agent may retrieve documents that resemble a question while still failing to mobilize concepts that are doctrinally prior, operationally necessary, historically decisive, recently superseded, or otherwise required to avoid repeating an already resolved mistake.

The Human author then becomes an undocumented routing mechanism.

The purpose of Conceptual Gravity is to reduce this dependency by helping a Human or AI Agent determine:

> **What must I understand before I can treat this question faithfully in the current state of the Corpus?**

The proposed implementation capability is provisionally named:

`corpus.orient`

Conceptual Gravity is not proposed as a physical law, nor as a claim to have invented adaptive graph retrieval.

It is a working model for **governed conceptual orientation**.

The name **Conceptual Gravity** is human-validated for use in the Corpus. This validation concerns the Corpus vocabulary and conceptual pairing described below; it does not imply a claim of novelty as a generic graph-routing algorithm or a physical-style law.

### Associated documents

The present paper is related to existing Corpus work on:

- [Informational Gravity — Contextual Attraction for Cognitive-Packet Routing](informational_gravity.md);
- [Cognitive Packets](cognitive_packets.md);
- [Capability Symmetry](../patterns/capability-symmetry/PATTERN.md);
- [Optimistic Mainline Governance](optimistic_mainline_governance.md);
- [Simplicité d'action](simplicite_action.md);
- the Reactive Corpus and Sleep Cycle;
- *Le Réel Répond*;
- Mandated Agents and Principal Sovereignty.

*Informational Gravity* already exists as a human-validated source document in the Cogentia repository.

Conceptual Gravity deliberately reuses that established Corpus metaphor at a different routing layer.

### Update method

This document follows the Cogentia Redactor/Reviewer method.

Version 0.1 received a decorrelated external review.

Version 0.2 assimilated that review and was then checked by the same Reviewer for assimilation fidelity. That second pass is not treated as independent review of v0.2 or v0.3.

Version 0.3 corrected the remaining structural issues and received explicit human validation before entry into the Corpus.

The intended loop is:

```text
exploration
→ Redactor
→ decorrelated Reviewer
→ dispositions
→ revision
→ Principal arbitration
→ Reality Test
→ further learning
```

### Status note

Version 0.3 is a human-validated working paper.

In particular:

- **Conceptual Gravity** is validated as the current Corpus name;
- no universal attraction formula is claimed;
- no new concept-relation ontology is required before empirical need is demonstrated;
- the initial implementation deliberately tests whether substantially less machinery is sufficient.

# Abstract

A growing knowledge corpus creates an orientation problem before it creates a retrieval problem.

An Agent can retrieve semantically similar material and still miss concepts required for a faithful interpretation of the Corpus. When this repeatedly forces the original Human author to provide hints, that Human has become the Corpus's missing index.

This paper proposes **Conceptual Gravity** as a governed model of conceptual routing: the contextual attraction through which a cognitive need is directed toward concepts, relations and evidence relevant to its treatment.

The target is not maximal retrieval.

It is the **smallest sufficient conceptual subgraph**.

The proposed architecture separates three layers:

\[
Canonical\ Graph
+
Stigmergic\ Field
+
Ephemeral\ Context
\]

Canonical relations are governed Corpus assertions.

Routing traces are empirical evidence from use.

Ephemeral context represents the current question, task, mandate, budget and situation.

This separation allows a Corpus to learn how to navigate itself without silently converting successful traversals, Human corrections, popularity or model inference into doctrine.

Adaptive graph traversal, sufficiency-aware retrieval and cost-aware hybrid retrieval already exist as active GraphRAG research directions. The candidate contribution here therefore lies primarily not in inventing adaptive graph traversal, but in integrating conceptual routing into a **governed, provenance-preserving, capability-symmetric, self-correcting Reactive Corpus**.

The first implementation should deliberately remain small.

It should use the structure already present, expose one `corpus.orient` capability, run virgin-agent benchmarks, trace failures and only then allow actual use to reveal which additional relations or structures deserve to exist.

Self-orientation thereby becomes an application of **Agile Learning to the conceptual organization of the Corpus itself**.

# 1. The Human as Missing Index

A Corpus can contain the relevant knowledge and still fail operationally.

An Agent may:

- fail to know that relevant knowledge exists;
- use obsolete terminology;
- retrieve a concept while missing its prerequisites;
- miss an invariant;
- ignore a recent checkpoint;
- confuse an historical position with the current one;
- find implementation code without the doctrine it operationalizes;
- retrieve semantically similar passages while missing a concept expressed differently.

The interaction becomes:

```text
Agent searches
→ plausible material
→ incomplete answer

Human:
"You are missing X."

Agent searches again
→ better answer

Human:
"And X depends on Y."

Agent searches again
→ reconstructs the relevant conceptual neighborhood
```

The Human is not merely supplying information.

The Human is performing **conceptual routing**.

As the Corpus grows, this dependency becomes increasingly undesirable.

The operational goal is therefore:

> **A new Agent should be able to determine by itself what it must read to avoid reinventing, contradicting or impoverishing what the Corpus has already learned.**

# 2. Retrieval and orientation

Conventional retrieval approximates:

```text
Question
→ similar passages
→ documents
→ answer
```

Conceptual orientation adds a layer:

```text
Question
→ concepts
→ conceptual dependencies
→ evidence
→ documents
→ reasoning
→ answer
```

Semantic retrieval asks:

> What looks related?

Conceptual orientation asks:

> What must be taken into account?

The two overlap.

They are not identical.

Therefore:

> **Semantic similarity is evidence of possible relevance, not proof of conceptual necessity.**

# 3. Question → Concept → Source

The basic orientation proposal is:

```text
Question
→ Concept
→ Source
```

rather than relying only on:

```text
Question
→ Source
```

The fuller chain is:

```text
Question
→ initial concepts
→ conceptual route
→ relevant evidence
→ source documents
→ implementation evidence
→ reasoning
```

The concept graph is therefore a navigation skeleton.

It is not the Corpus itself.

\[
ConceptGraph \neq Corpus
\]

\[
ConceptGraph \rightarrow Navigation(Corpus)
\]

Source documents retain their own provenance, status and authority.

# 4. Working definition

**Conceptual Gravity** is the contextual attraction through which a cognitive need is routed toward concepts that are useful or necessary for treating it faithfully in the current state of a Corpus.

Operationally:

> **Conceptual Gravity routes a cognitive need toward the smallest conceptual subgraph sufficiently rich to support faithful reasoning.**

It is:

- contextual;
- task-dependent;
- time-dependent;
- explainable;
- bounded by cost and attention;
- sensitive to governance;
- distinct from global popularity.

It is not assumed to be reducible to one universal scalar score.

# 5. A grammar, not a law

For exploratory reasoning we may write:

\[
G_C(q,c,\kappa,t)
\]

where:

- \(q\): cognitive need;
- \(c\): candidate concept;
- \(\kappa\): current context;
- \(t\): current Corpus state.

A provisional grammar is:

\[
G_C = F(S,R,D,A,T,E,I,X)
\]

where factors may include:

- semantic fit;
- structural relations;
- explanatory dependencies;
- canonicality;
- temporal relevance;
- epistemic status;
- task intent;
- ambiguity and cost penalties.

This notation is descriptive.

It does **not** imply that P0 requires a numerical \(G_C\).

Indeed, P0 may work perfectly well with no gravity score at all.

# 6. Why retain “Gravity”?

The mechanism can equally be described as:

- conceptual routing;
- corpus orientation;
- adaptive concept traversal;
- governed orientation.

The word **Gravity** is therefore not algorithmically necessary.

Its usefulness comes from continuity with the already established Corpus concept of **Informational Gravity**.

Conceptual Gravity describes:

```text
cognitive need
→ attraction toward relevant concepts
```

Informational Gravity describes:

```text
Cognitive Packet
→ attraction toward mobilizable capacities
```

The common metaphor expresses contextual attraction under constraints.

No physical equation, force, mass or inverse-square law is implied.

The metaphor remains subordinate to the operational model.

# 7. Prior art

Adaptive structured retrieval is established prior art.

Current GraphRAG-family work already explores:

- query-dependent traversal;
- graph/text hybrid routing;
- evidence-sufficiency checks;
- adaptive expansion;
- cost-aware depth;
- agentic retrieval controllers;
- concept and knowledge-graph retrieval;
- path-aware reasoning.

Therefore Conceptual Gravity must not claim novelty merely for:

```text
query
→ graph traversal
→ sufficiency test
→ adaptive expansion
```

Those mechanisms should be reused where useful.

The relevant candidate contribution is elsewhere.

# 8. Candidate contribution

The working contribution is the combination:

\[
\boxed{
Adaptive\ Conceptual\ Routing
+
Corpus\ Governance
+
Epistemic\ Provenance
+
Learning\ without\ Canonization
+
Capability\ Symmetry
+
Boundary\ Detection
}
\]

The key question is not merely:

> Which path retrieves useful evidence?

It is also:

> **What authority does successful routing have to change what the Corpus asserts?**

The answer is:

> **None directly.**

Successful routing creates evidence.

Governance determines whether that evidence becomes structure.

# 9. The smallest sufficient conceptual subgraph

More context is not automatically better context.

Every additional concept or document consumes:

- Human attention;
- tokens;
- inference;
- latency;
- reading time;
- working memory;
- opportunities for distraction.

The target is therefore:

> **The smallest conceptual subgraph rich enough to avoid an impoverished, contradictory, obsolete or off-Corpus treatment of the question.**

This creates two opposing pressures:

\[
Coverage \uparrow
\]

\[
ContextCost \downarrow
\]

A pedagogical expression is:

\[
OrientationQuality
=
Sufficiency
-
\lambda ContextCost
-
\mu HumanBootstrapHints
\]

This SHOULD NOT be turned prematurely into one production KPI.

# 10. Sufficiency

Sufficiency is not a vague feeling.

P0 needs an explicit stopping policy.

For benchmarked queries, traversal stops when:

```text
all explicitly required benchmark targets are reached
OR
available structural closure is exhausted
OR
a configured budget is exhausted
OR
the result is explicitly incomplete, conflicting or external_required
```

Possible terminal states include:

```text
sufficient
structurally_exhausted
budget_exhausted
incomplete
conflicting
external_required
```

`structurally_exhausted` must remain distinct from `sufficient`.

It means only:

> **The configured P0 traversal has exhausted the structure it is authorized and able to inspect.**

It is not a declaration of epistemic completeness.

# 11. Live-query stopping

Normal `corpus.orient` calls will often have no benchmark gold set.

P0 therefore also requires hard live-query bounds.

A default policy should include explicit limits such as:

```text
max_seeds
max_hops
max_nodes
```

The exact initial values are implementation parameters, not doctrine.

The normal non-benchmark flow is:

```text
resolve bounded seed set
→ traverse existing explicit structure
→ respect max_hops / max_nodes
→ residual retrieval where useful
→ structurally_exhausted
```

unless another terminal condition occurs:

```text
budget_exhausted
incomplete
conflicting
external_required
```

A popular or highly connected seed must therefore not be allowed to explode the graph without bound.

# 12. Routes, not bags

A list such as:

```text
[
  Mandated Agent,
  Mandate,
  Principal,
  Principal Sovereignty,
  DHITL
]
```

loses information.

A route such as:

```text
Artificial-agent autonomy
  → Mandated Agent
  → Mandate
  → Principal
  → Principal Sovereignty
  → DHITL
```

explains why the concepts belong together.

A branch can also express contrast:

```text
Mandated Agent
  → failure mode
  → Artificial Person Autonomization
```

The route itself is evidence.

A system may retrieve all the right concepts through a misleading shortcut.

Therefore evaluation should consider the path, not merely final retrieval.

# 13. Typed relations: only when earned

Potentially useful relations include:

```text
required_before
canonical_for
operationalizes
implements
supersedes
contrasts_with
invariant_of
checkpoint_for
```

But v0.3 does not require any of these to be added for P0.

The rule is:

> **Do not create a relation type merely because it appears conceptually elegant.**

Instead:

```text
orientation failure
→ trace
→ repeated evidence
→ candidate relation
→ review
→ possible stabilization
```

Reality Tests should earn new ontology.

# 14. Structure first, similarity second

For this Corpus, an initial engineering preference is:

> **Structure first, similarity second.**

This is not a universal law.

A P0 pass may favor:

```text
exact concept names
→ existing aliases
→ explicit references
→ existing graph relations
→ canonical sources
→ checkpoints
→ implementation evidence
→ residual semantic/text search
```

Semantic search remains valuable for ambiguity, discovery and gaps.

The rule simply prevents stronger explicit structure from being discarded in favor of weaker similarity when the stronger relation already exists.

# 15. Concept Attractors

A **Concept Attractor** may be useful as a generated projection.

Its lifecycle must be explicit.

A Concept Attractor is:

> **a generated, disposable navigation projection over existing Corpus structure.**

It is not:

- an independent source;
- a manually maintained concept;
- a second ontology;
- a source of doctrine.

P0 therefore requires no persistent:

```text
attractors/*.yaml
```

A runtime may create a projection such as:

```yaml
concept: Mandated Agent

structural_neighbors:
  - Mandate
  - Principal Sovereignty

query_relevance:
  reason: "authority and delegation question"
```

and discard it immediately after use.

Thus:

\[
ProjectionIdentity \neq ConceptIdentity
\]

# 16. Three layers

Conceptual routing distinguishes:

\[
\boxed{
Canonical\ Graph
+
Stigmergic\ Field
+
Ephemeral\ Context
}
\]

## Canonical Graph

Contains governed Corpus assertions.

## Stigmergic Field

Contains evidence generated by use:

- traversals;
- corrections;
- benchmark outcomes;
- repeated co-mobilization;
- failures;
- recent usage;
- external corroboration;
- Kudos where semantically appropriate.

## Ephemeral Context

Contains the current:

- query;
- Principal;
- mandate;
- task;
- budget;
- Corpus view;
- loaded context;
- time requirement.

No layer silently collapses into another.

# 17. Trace authority

Stigmergic traces require an explicit influence class.

A minimal model is:

```yaml
routing_trace:
  influence: attention_only
```

or:

```yaml
routing_trace:
  influence: corroborated
```

An `attention_only` trace may influence discovery or ranking.

It MUST NOT by itself authorize structural expansion or become doctrine.

A `corroborated` trace may contribute evidence toward a candidate structural improvement.

It still does not become doctrine automatically.

Canonical structure belongs in the Canonical Graph, not as a third “trace authority” level.

Therefore:

\[
attention\_only
\not\Rightarrow
structural\ authority
\]

and:

\[
corroborated
\not\Rightarrow
canonical
\]

# 18. Human corrections and author-memory laundering

A Human correction is valuable evidence.

It is also dangerous.

Suppose:

```text
initial route:
Question → A → B
```

The Human says:

```text
You are missing C.
```

The new route becomes:

```text
Question → A → C → B
```

If C immediately becomes Corpus structure, the system may merely have laundered the author's private memory into apparently machine-discovered doctrine.

Therefore:

\[
HumanCorrection \neq CanonicalEvidence
\]

A Human correction creates a trace.

Nothing more is automatic.

# 19. Corroboration

The promotion path is:

```text
usage
→ trace
→ corroboration
→ repeated usefulness
→ candidate structure
→ review
→ canonical structure
```

Corroboration may include:

- a later virgin Agent succeeds without the original hint;
- another independent Agent reconstructs the same dependency;
- source evidence confirms the relation;
- distinct questions benefit from the same route;
- a decorrelated Reviewer independently identifies the dependency.

The precise corroboration policy should emerge from implementation.

The invariant is:

> **The evidence that created a trace must not, by itself, be sufficient to canonize that trace.**

# 20. Virgin-agent replay

A simple Reality Test is:

```text
Run 1:
  Agent misses Concept C.
  Human supplies hint.
  Trace recorded.

Run 2:
  fresh Agent
  same usable Corpus state
  no Human hint
```

Possible outcomes:

```text
A. reaches C correctly
B. still misses C
C. reaches C through a misleading path
D. over-expands
```

These outcomes distinguish useful learned orientation from accidental improvement.

# 21. Learned routing is not doctrine

The principal invariant is:

\[
\boxed{
LearnedRouting \neq CanonicalDoctrine
}
\]

The Corpus may learn:

> Queries of class Q often benefit from A → B.

without asserting:

> A canonically requires B.

This permits continuous learning without continuous constitutional change.

# 22. Discovery by use; constitution by governance

The lifecycle can be compressed as:

> **Discovery by use; constitution by governance.**

Usage discovers.

Trace preserves.

Replay tests.

Review interprets.

Governance stabilizes.

# 23. Agile Learning

A Self-Orienting Reactive Corpus applies **Agile Learning to its own conceptual organization**.

It does not attempt to predesign every future structure.

Instead:

```text
Try
→ Trace
→ Observe
→ Learn
→ Consolidate only when useful
```

Two working invariants follow:

> **Don't design the learning structure before learning has shown which structure is needed.**

> **Trace enough to recognize the structure when it emerges.**

The full loop is:

```text
Possible
→ Experiment
→ Trace
→ Pattern
→ Candidate Structure
→ Governed Stabilization
→ New Possible
```

Stabilization remains corrigible.

# 24. Occam and Optimistic Locking

Agile Learning relies here on two complementary principles.

**Occam**:

> Do not create structure before necessity.

**Optimistic Locking**:

> Do not require complete anticipation before allowing a bounded, inspectable experiment.

Together:

> **Occam prevents premature structure; Optimistic Locking prevents premature prohibition.**

This applies equally to:

- metadata;
- relation types;
- APIs;
- routing heuristics;
- benchmark fields;
- schemas.

# 25. Frontmatter as a micro-example

Suppose a useful document needs:

```yaml
related_concepts:
  - Conceptual Gravity
  - Agile Learning
```

The field need not be forbidden merely because a central schema has not anticipated it.

Nor does one use require immediate schema modification.

Instead:

```text
local need
→ bounded use
→ trace
→ recurrence?
→ candidate schema improvement
→ review
→ stabilization if useful
```

The Corpus can learn its own useful metadata structure.

# 26. Orientation failure modes

Initial failure classes include:

### MISSED_ATTRACTOR

A necessary concept was not reached.

### WRONG_ATTRACTOR

A concept displaced a better route.

### PREMATURE_STOP

Traversal ended too soon.

### OVEREXPANSION

Traversal continued after useful sufficiency.

### STALE_ATTRACTOR

A superseded concept was treated as current.

### CAPTURED_OR_INJECTED_ATTRACTOR

Orientation was distorted by hostile input, poisoned metadata, manipulated traces or strategically amplified concepts.

# 27. Gravitational monopolies

Repeated visibility can produce reinforcement:

```text
visible
→ selected
→ reinforced
→ more visible
```

Therefore:

\[
GlobalCentrality(c)
\not\Rightarrow
LocalRelevance(q,c)
\]

Useful countermeasures may include:

- context-specific relevance;
- decay;
- saturation;
- diversity;
- negative evidence;
- provenance;
- review status;
- caps on unreviewed influence.

Popularity must not become implicit doctrine.

# 28. Hostile traces

Poisoned queries are only one risk.

A more durable attack targets routing traces.

For example:

- malicious Agent corrections;
- repeated artificial traversal;
- manipulated usage statistics;
- injected aliases;
- false claims of canonicality.

Therefore every routing trace should retain provenance and influence class.

An unreviewed trace is `attention_only`.

It may attract inspection.

It cannot acquire structural authority by repetition alone.

# 29. Leaving the Corpus

A Corpus that becomes very good at navigating itself can become very good at staying inside itself.

Self-orientation therefore includes boundary detection:

\[
SelfOrientation
=
InternalOrientation
+
BoundaryDetection
\]

External research may be required for:

- current state of the art;
- current law;
- current standards;
- current prices;
- recent releases;
- events newer than Corpus evidence;
- external contradictions;
- domains the Corpus does not cover.

A legitimate orientation output is therefore:

```text
external_required
```

Hence:

> **Self-orientation includes knowing when to leave oneself.**

# 30. Conceptual Gravity and Informational Gravity

The two concepts operate on different routing planes.

Conceptual Gravity asks:

> **What must be considered?**

Informational Gravity asks:

> **Which mobilizable capacity can legitimately and usefully advance the resulting Cognitive Packet?**

The sequence is:

```text
Question
→ CONCEPTUAL GRAVITY
→ conceptual orientation
→ evidence
→ contextualized Cognitive Packet
```

then:

```text
Cognitive Packet
→ INFORMATIONAL GRAVITY
→ Human / Agent / tool / institution
→ continuation
```

A possible common abstraction such as `Contextual Attraction` is intentionally not stabilized here.

If recurring use demonstrates its utility, it can emerge later.

# 31. Capability Symmetry

Orientation is a capability.

Humans and AI Agents should be able to mobilize substantially the same semantic operation:

```text
                  ┌→ CLI
                  ├→ Human Web UX
corpus.orient ────┼→ MCP
                  ├→ HTTP API
                  └→ COP
```

Different projections are expected.

Different underlying semantics are not.

Equal capability access does not imply equal authority.

# 32. ACP and A2A

No ACP-specific Conceptual Gravity implementation is required.

An ACP Agent can use the same Cogentia MCP capability when that MCP server is explicitly admitted to its session.

A2A may later help Agents discover one another.

Neither requires duplication of the semantic orientation engine.

> **One semantic capability, multiple projections.**

# 33. Orientation Packet

An orientation result should explain its route.

A provisional shape is:

```yaml
schema: cogentia.orientation.v1

query: "Can an artificial agent become autonomous?"

resolved_concepts: []

conceptual_route: []

read_first: []

then_read: []

implementation_evidence: []

recent_checkpoints: []

open_questions: []

conflicts: []

missing_links: []

sufficiency:
  status: structurally_exhausted
  reason: "..."

routing_trace: []

orientation_confidence: provisional
```

Possible evidence classes include:

```text
explicit
derived_structurally
learned_routing_signal
semantic_candidate
unresolved
```

The schema itself remains provisional.

P0 should emit only fields shown useful by actual tests.

# 34. Benchmark before ontology

Before adding relation types, persistent Attractors or a gravity score, test the Corpus as it exists.

Begin with approximately five questions whose histories are already reasonably understood.

Candidate examples:

```text
Can John vote on behalf of Jean Hugues?

What does autonomous mean for an artificial agent in this Corpus?

How do Kudos affect Cognitive Packet routing?

What is the relation between Informational Gravity and Packet Attractors?

When should a Cogentia Agent leave the Corpus and perform external research?
```

The exact fixture set must be justified from reconstructible Corpus evidence.

# 35. Benchmark expectation provenance

A benchmark can itself reproduce the missing-index problem.

If a fixture says:

```yaml
must_reach:
  - Concept X
```

only because the author privately remembers X, the benchmark is circular.

Each expectation therefore records its basis.

Example:

```yaml
expectation_basis:
  type: explicit_source
  evidence:
    - "research/example.md"
```

Initial basis classes may include:

```text
explicit_source
registry_link
independent_reviewer
author_memory
```

The critical rule is:

> **An expectation supported only by `author_memory` may reveal a navigation problem, but MUST NOT by itself justify promotion of a new canonical relation.**

Human memory is valid evidence.

It must remain visibly Human evidence.

# 36. Candidate fixture

A provisional benchmark fixture may look like:

```yaml
question: "Can John vote on behalf of Jean Hugues?"

expected:
  must_reach: []
  should_reach: []
  must_not_treat_as_canonical: []

expectation_basis:
  type: explicit_source
  evidence: []

budget:
  max_seeds: 5
  max_hops: 3
  max_nodes: 30

external_research_expected: false
```

The numerical bounds are experiment parameters.

They are not canonical values.

# 37. Metrics

Useful evaluation dimensions include:

### Required-source recall

\[
Recall_{required}
=
\frac{required\ sources\ recovered}{required\ sources\ expected}
\]

### HumanBootstrapHints

How many additional Human hints were required?

Target:

\[
HumanBootstrapHints \rightarrow 0
\]

### ConceptualPathCoverage

Did the route reconstruct the required conceptual dependencies?

### Context cost

How much unnecessary material was loaded?

### Stop quality

Did traversal stop appropriately?

### Boundary quality

Did it detect when external research was required?

# 38. Benchmark failures are learning material

A benchmark failure should produce a trace, not merely a score.

Example:

```text
question
→ route
→ Concept C missed
→ answer impoverished
→ correction
→ trace
→ virgin replay
→ C still missed
```

This is evidence of navigation debt.

It is stronger evidence for a new relation than merely imagining one in advance.

Therefore:

> **Do not design the relation first. Let the failure tell us whether the relation is needed.**

# 39. Sleep Cycle

Normal use produces:

```text
questions
→ orientations
→ routes
→ stopping decisions
→ responses
→ corrections
→ outcomes
```

The Sleep Cycle can aggregate these traces and detect:

- recurrent misses;
- repeated useful paths;
- stale concepts;
- unexplained Human hints;
- excessive expansion;
- boundary failures.

It may then produce candidate Continuations.

Not doctrine.

# 40. Promotion lifecycle

The full path is:

```text
usage
→ routing trace
→ corroboration
→ repeated pattern
→ candidate structural improvement
→ review
→ human or mandated arbitration
→ canonical structure
```

This ties together:

- Le Réel Répond;
- Agile Learning;
- stigmergy;
- Sleep Cycle;
- Conceptual Gravity;
- Corpus governance.

# 41. P0

The first implementation should remain deliberately small.

Its public capability is:

```text
corpus.orient
```

Its question is:

> **Given this cognitive need and the current Corpus state, what existing conceptual and documentary structure should I traverse before answering?**

P0 should reuse:

- the concept registry;
- existing aliases;
- explicit references;
- backlinks;
- document metadata;
- canonical/source status;
- existing relations;
- checkpoints;
- implementation references;
- ordinary text retrieval.

P0 requires:

- no new ontology;
- no persistent Concept Attractors;
- no universal gravity score;
- no mandatory LLM judge;
- no routing-learning system.

# 42. P0 pipeline

A candidate flow is:

```text
query
→ resolve bounded seed concepts
→ traverse existing explicit structure
→ collect source references
→ collect checkpoints
→ collect implementation evidence
→ residual text retrieval where useful
→ deterministic terminal state
→ Orientation Packet
```

The simplest useful implementation wins.

# 43. P0 live defaults

When no benchmark exists:

```text
resolve seeds up to max_seeds
→ traverse explicit structure up to max_hops
→ never exceed max_nodes
→ optionally perform bounded residual search
→ structurally_exhausted
```

unless the process returns:

```text
budget_exhausted
incomplete
conflicting
external_required
```

This gives `corpus.orient` a testable default behavior without requiring an undocumented sufficiency judge.

# 44. P1

P1 exists only after observed P0 failures.

Possible additions include:

- missing relation types;
- routing traces;
- query-class signals;
- learned path preferences;
- improved sufficiency estimation;
- semantic graph expansion;
- orientation-gap Continuations.

Every proposed P1 feature should answer:

> **Which observed P0 failure requires this?**

If none does, defer it.

# 45. P2

Once the semantic operation proves useful, expose it symmetrically:

```text
CLI
MCP
HTTP
Web
COP
```

ACP consumes the MCP projection when admitted.

Symmetry tests verify semantic parity.

# 46. What not to build yet

Do not yet require:

```text
a Conceptual Gravity database
persistent Concept Attractor files
a new universal relation ontology
a reinforcement-learning router
a Contextual Attraction superclass
a universal attraction score
automatic canonization
multi-agent voting on concept relevance
```

These remain possible.

Possibility does not establish necessity.

# 47. Core working invariants

1. **Semantic similarity is not conceptual necessity.**

2. **Question → Concept → Source is often safer than Question → Source alone.**

3. **The target is the smallest sufficient conceptual subgraph, not maximal retrieval.**

4. **The route is evidence, not merely the destination.**

5. **Learned routing is not canonical doctrine.**

6. **A Human correction produces a trace, not a truth.**

7. **An unreviewed trace can influence attention, not authority.**

8. **Discovery by use; constitution by governance.**

9. **Self-orientation includes knowing when to leave the Corpus.**

10. **Global concept popularity does not imply local conceptual relevance.**

11. **Derived navigation projections are not source concepts.**

12. **Equal orientation capability does not imply equal authority.**

13. **Don't design the learning structure before learning has shown which structure is needed.**

14. **Trace enough to recognize the structure when it emerges.**

15. **Occam prevents premature structure; Optimistic Locking prevents premature prohibition.**

16. **The Corpus should not require its author to remain its missing index.**

# 48. Working formulations

## Conceptual Gravity

> **Conceptual Gravity is the contextual attraction through which a cognitive need is routed toward the smallest conceptual subgraph sufficiently rich to support faithful reasoning in the current state of a Corpus.**

## Self-orientation

> **Self-orientation is governed conceptual routing combined with the ability to detect when the Corpus itself is insufficient.**

## Agile Learning

> **Don't design the learning structure before learning has shown which structure is needed. Trace enough to recognize the structure when it emerges.**

## Governance

> **Discovery by use; constitution by governance.**

## Implementation discipline

> **Start with the structure that exists. Let observed orientation failures earn the right to create new structure.**

# Conclusion

The original problem is concrete.

As the Corpus grew, increasingly many Human hints were required before an Agent rediscovered concepts that the Corpus had already developed.

The Human author had become part of the indexing system.

Search quality can reduce this problem, but semantic similarity alone does not encode conceptual prerequisites, doctrinal relationships, supersession, implementation links or governed navigation.

Conceptual Gravity names the effort to make these routing relationships mobilizable.

The mechanism should not be overstated.

Adaptive graph traversal, sufficiency-aware retrieval and cost-sensitive graph/text routing already exist as active technical approaches. They should be reused rather than reinvented.

The more specific challenge is to integrate conceptual orientation into a Reactive Corpus whose knowledge has provenance, governance, temporal state and a distinction between what it asserts and what has merely proved useful during navigation.

This requires the separation:

\[
Canonical\ Graph
+
Stigmergic\ Field
+
Ephemeral\ Context
\]

and the invariant:

\[
LearnedRouting
\neq
CanonicalDoctrine
\]

The implementation strategy follows directly from Agile Learning.

Do not begin by constructing the elaborate Conceptual Gravity system that theory makes imaginable.

Begin with the smallest useful `corpus.orient`.

Use the structure already present.

Give it real questions.

Observe where a virgin Agent becomes lost.

Trace those failures.

Replay them.

Let repeated failures reveal missing structure.

Only then decide whether the Corpus needs a new relation, routing heuristic, Attractor, learned signal or abstraction.

The objective remains:

> **The Corpus should not require its author to remain its missing index.**

A Reactive Corpus should progressively learn how to find its own way through what it has learned.
