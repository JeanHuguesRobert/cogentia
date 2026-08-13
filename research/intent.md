---
title: "Intent"
subtitle: "Persistent, revisable commitments as the continuity layer between human purposes, mandates, actions, and effects"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-08-14"
version: "0.1"
status: "working-note — source doctrine"
language: "en"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "doctrinal-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
repository: "JeanHuguesRobert/cogentia"
canonical_path: "research/intent.md"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/intent.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "conversation checkpoint R28-R29"
  origin_date: "2026-08-14"
  derived_from:
    - "research/agent_resumable_cli.md"
    - "research/cognitive_packets.md"
    - "research/pipeline.md"
    - "research/corpus_navigation_audit.md"
    - "scripts/cogentia.v1-history.js"
    - "scripts/cogentia.js"
review:
  status: "unreviewed"
  reviewed_by: []
related_documents:
  - "research/agent_resumable_cli.md"
  - "research/cognitive_packets.md"
  - "research/pipeline.md"
  - "research/corpus_navigation_audit.md"
  - "research/posterite.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/traceability_of_flows_and_effects.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/exemplarity.md"
tags:
  - intent
  - intentions
  - agency
  - digital-twin
  - mandate
  - traceability
  - alignment
  - assurance
  - bdi
  - requirements-engineering
  - continuity
  - rational-exploration
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Intent

## 1. Purpose

This note stabilizes **Intent** as a first-class concept in Cogentia.

The immediate trigger is a concrete failure discovered during the evolution of `cogentia.js`: an earlier implementation treated repository-level `research/index.md` and `research/concepts.md` as rebuildable or refreshable corpus views, while a later refactoring preserved much of the surrounding architecture but silently lost part of that capability. No explicit decision had been made to abandon the underlying purpose. Historical metadata still recorded the previous contract.

The important failure was therefore not merely a missing command or a software regression. It was a **failure to preserve an intention through implementation change**.

This motivates a more general doctrine:

> **Implementations may change. Stabilized intents must not disappear silently with them.**

Intent is proposed here as the continuity layer connecting human purposes to specifications, mandates, plans, actions, resource use, observed effects, evidence, and later reassessment.

---

## 2. Definition

> **An Intent is a persistent, revisable commitment by an entity toward a desired possible state or class of outcomes, serving as a reference against which specifications, mandates, plans, actions, and observed effects can be interpreted and evaluated.**

In French:

> **Une intention est l’engagement persistant mais révisable d’une entité envers un état possible ou une classe de résultats recherchés, servant de référence pour interpréter et évaluer spécifications, mandats, plans, actions et effets observés.**

The terms are deliberate:

- **persistent** — an intent normally survives a change of plan or implementation;
- **revisable** — persistence is not immutability;
- **commitment** — an intent is stronger than a mere desire or considered possibility;
- **possible state or class of outcomes** — intent concerns what is sought, not necessarily how it is achieved;
- **reference** — intent provides a basis for later assurance, evaluation, and explanation.

---

## 3. Intent is not instruction, plan, mandate, or effect

Cogentia should maintain explicit distinctions between adjacent concepts.

### Desire

A state of affairs regarded as desirable by an entity.

### Goal

A state or result selected as a target of reasoning or action.

### Intent

A goal adopted as a persistent but revisable orientation of action.

### Specification

An interpretation of an intent made explicit enough to guide, constrain, or verify a realization.

### Mandate

Authority granted to an agent to act, within explicit limits, in service of one or more intents.

### Plan

A contingent strategy proposed for satisfying an intent under a mandate.

### Action

An act actually performed.

### Effect

An observed, inferred, or estimated change in reality attributable in whole or in part to action.

### Evidence

Material supporting a claim about intent, interpretation, mandate, action, resource use, or effect.

The following inequalities are therefore doctrinally important:

```text
Intent ≠ Instruction
Intent ≠ Specification
Intent ≠ Mandate
Intent ≠ Plan
Intent ≠ Implementation
Intent ≠ Effect
```

An instruction may express an intent imperfectly. A specification may formalize an interpretation of it. A mandate may authorize only a subset of possible actions that could serve it. A plan or implementation may be replaced while the intent remains unchanged.

---

## 4. Historical foundations and convergence

Intent is not introduced here as a new word or isolated invention. Several established traditions illuminate different parts of the problem.

### 4.1 BDI and commitment

Belief–Desire–Intention (BDI) architectures distinguish intention from mere desire and use intention as part of the persistence mechanism of rational agency. Classical work around BDI and commitment makes clear that an agent may change plans while retaining the intention that motivated them.

This supports a central Cogentia invariant:

> **Preserve the intent, not necessarily the plan.**

### 4.2 Goal-oriented requirements engineering

Goal-oriented requirements engineering separates high-level goals from their operationalization into requirements, responsibilities, and implementations. It also treats conflicts, alternatives, obstacles, and adaptation as first-class concerns.

This supports the chain:

```text
Intent
  ↓ interpretation
Specification
  ↓ allocation of authority/responsibility
Mandate
  ↓ planning
Plan
```

### 4.3 Intent specifications

Nancy Leveson’s work on Intent Specifications explicitly aims to preserve design rationale and support both top-down and bottom-up reasoning between high-level purpose, requirements, design decisions, and implementation.

This is especially relevant to long-lived agentic systems because it frames evolution as a problem of preserving the **why** while changing the **how**.

### 4.4 Intent-based autonomous systems

Intent-Based Networking formalizes a distinction between **Intent Fulfillment** and **Intent Assurance**. Fulfillment translates intent into actions; assurance observes the resulting system and checks whether its behavior remains compliant with the intended state.

Cogentia generalizes this pattern beyond networks.

### 4.5 Agent alignment

Modern agentic AI makes intent preservation operationally urgent. Long action trajectories, tool use, sub-agent delegation, code generation, and persistent memory introduce multiple opportunities for an agent to satisfy a local instruction while drifting from the principal’s broader intent.

The novelty is therefore not intention itself, but the need to make **intent provenance, interpretation, delegation, preservation, and assurance explicit at machine speed and across agent chains**.

---

## 5. Epistemic status of intents

A Digital Twin must never silently collapse inferred intention into declared intention.

Cogentia should distinguish at least four epistemic forms.

### 5.1 Declared Intent

The principal explicitly states or adopts the intent.

Example:

```text
principal: JHR
intent: "Repository-level corpus indexes must remain rebuildable."
status: declared
```

### 5.2 Inferred Intent

An agent reconstructs an intent from conversation history, actions, preferences, previous mandates, or other traces.

An inferred intent must preserve:

- provenance;
- evidence;
- inference method or rationale where useful;
- uncertainty or confidence;
- the fact that it is inferred rather than declared.

### 5.3 Negotiated Intent

An initially ambiguous or conflicting intent is clarified through interaction among relevant principals or agents.

### 5.4 Stabilized Intent

An intent has become explicit and stable enough to serve as an operational reference for mandates, plans, implementation choices, and assurance.

A stabilized intent remains revisable. Stabilization means that changes must become explicit transitions rather than silent reinterpretations.

---

## 6. Provenance and uncertainty

Two principles follow immediately.

> **No intent without provenance.**

and:

> **No interpretation without uncertainty.**

For a significant intent, the system should be able to reconstruct at least:

```text
who or what is the principal?
where did the intent come from?
was it declared, inferred, negotiated, or derived?
what evidence supports this reconstruction?
when was it stabilized?
what later revisions exist?
```

An agent may say:

> “I infer that the principal intends X, with the following evidence.”

It must not silently rewrite this into:

> “The principal explicitly intended X.”

This distinction is essential to faithful Digital Twins.

---

## 7. Intent does not create authority

Intent and Mandate solve different problems.

- **Intent** explains what outcome is sought and why action is oriented toward it.
- **Mandate** defines what an agent is authorized to do in pursuing it.

A known intent does not automatically authorize every technically available action.

A useful approximation is:

```text
Permitted Action
  ⊆ Technical Capability
  ∩ Mandate
  ∩ Relevant Intent
  ∩ Applicable Rules and Constraints
```

Therefore:

> **No delegation without mandate.**

and:

> **Intent may constrain authority; it does not create authority by itself.**

---

## 8. Intent lifecycle

An intent should be treated as a versioned object rather than mutable prose whose previous states disappear.

Possible transitions include:

```text
proposed
  ↓
declared / inferred
  ↓
negotiated
  ↓
stabilized
  ↓
active
  ↓
fulfilled | suspended | superseded | abandoned | invalidated
```

The vocabulary may later be normalized, but the principle is already clear:

> **No intent drift without trace.**

A revision should preserve:

- previous intent;
- new intent;
- reason for change;
- actor or principal responsible for the transition;
- supporting evidence;
- affected mandates, plans, implementations, and expectations.

This mirrors the accounting principle that better information should normally produce a compensating or reconciling event rather than silently rewriting history.

---

## 9. The Intent Chain

The minimal operational chain is:

```text
DESIRE
   ↓ adoption
INTENT
   ↓ interpretation
SPECIFICATION
   ↓ authorization
MANDATE
   ↓ planning
PLAN
   ↓ execution
ACTION
   ↓
EFFECT
```

Resource use forms a parallel branch:

```text
ACTION
   ↓
RESOURCE USE
   ↓
ACCOUNTING / RESOURCE TRACE
```

Evidence supports reconstruction across the chain:

```text
INTENT
   ↓
SPECIFICATION
   ↓
MANDATE
   ↓
PLAN
   ↓
ACTION ───→ RESOURCE ───→ ACCOUNTING
   ↓
EFFECT ───→ EVIDENCE
   ↓
ASSURANCE
   └──────────────→ INTENT
```

The loop is essential. Intent is not useful merely as a starting label; it must remain available as a reference after action.

---

## 10. Intent Fulfillment and Intent Assurance

Cogentia adopts and generalizes the distinction between fulfillment and assurance.

### Intent Fulfillment

The processes by which an intent is interpreted, decomposed, planned, delegated, executed, and adapted into actual action.

### Intent Assurance

> **Intent Assurance is the continuous, evidence-based assessment that specifications, mandates, plans, actions, resource use, and observed effects remain compatible with the relevant stabilized intents.**

Intent Assurance asks questions such as:

```text
Does the current specification still represent the intent?
Does the mandate authorize the chosen action?
Does the plan remain a plausible realization of the intent?
Did the action actually occur?
What resources did it consume?
What effects were observed?
Are those effects compatible with the intent?
Has new information made the intent obsolete or ambiguous?
```

Assurance must not be confused with proof of perfect human-intent understanding. Some edges of the chain are formally verifiable; others remain epistemic judgments that must retain provenance and uncertainty.

---

## 11. Preservation across implementation change

A major reason to make Intent explicit is software and organizational evolution.

Suppose:

```text
Intent I
  ↓
Implementation A
```

A refactoring may legitimately replace A with B:

```text
Intent I
  ↓
Implementation B
```

No regression has occurred if B continues to satisfy the relevant intent and invariants.

The dangerous transition is:

```text
Intent I
  ↓
Implementation A

REFRACTOR

Intent I
  ↓
∅
```

with no explicit decision explaining the disappearance.

This yields the invariant:

> **No stabilized intent may lose its effective realization without an explicit, attributable, and reviewable transition.**

A capability can disappear legitimately if another capability or mechanism continues to realize the same intent. The invariant protects intention, not historical implementation shape.

---

## 12. Intent Preservation Failure

An **Intent Preservation Failure** occurs when a previously stabilized intent ceases to be represented, implemented, or assured without an explicit transition explaining the change.

Typical causes include:

- refactoring;
- component replacement;
- migration between models or providers;
- agent handoff;
- summarization or context compression;
- incomplete specification extraction;
- mandate attenuation errors;
- code generation that optimizes for local tests but loses higher-level rationale;
- documentation drift;
- human attention limits during high-velocity development.

The last case is especially relevant in agentic engineering. The correct response is not merely to ask humans to pay more attention. The system should make unexplained losses salient.

---

## 13. First concrete case: `cogentia.js` v1 → v2

The evolution of `cogentia.js` provides an initial falsifiable example.

Historical evidence shows that the earlier CLI treated repository-level research indexes as maintained or rebuildable corpus structures. In particular, the historical implementation exposed commands to bootstrap and generate `research/index.md` entries and described `research/concepts.md` as a managed typed concept registry. Later metadata explicitly recorded both `research/index.md` and `research/concepts.md` as generated/rebuildable by `cogentia.js`.

The v2 refactoring deliberately changed the CLI architecture around:

```text
plan → apply → verify
```

but the current `concepts` command surface only exposes list/check behavior, while earlier refresh semantics are no longer fully implemented.

No corresponding architectural decision has been identified that intentionally abandons the prior intention.

The likely stabilized intent can therefore be reconstructed as:

> **Repository-level corpus navigation and concept indexes should remain maintainable and rebuildable by Cogentia tooling without requiring agents or humans to manually synchronize every derived view.**

The current divergence is thus best classified as:

```text
Intent Preservation Failure
```

rather than merely:

```text
missing feature
```

The repair should consequently do two things:

1. restore an effective realization of the intent;
2. create assurance capable of detecting a future unexplained disappearance.

The incident should become an **antibody**, not only a bug fix.

---

## 14. No Silent Capability Loss as a derived rule

A useful engineering rule follows:

> **No stabilized capability should disappear silently.**

But capability preservation is subordinate to intent preservation.

The stronger rule is:

> **No stabilized intent may lose its realization silently.**

This avoids freezing architecture. A capability can be removed when:

- the intent is explicitly abandoned;
- the intent is superseded;
- another mechanism satisfies it;
- the capability is proven irrelevant to the stabilized intent.

What is forbidden is unexplained semantic loss.

---

## 15. Declared architecture ↔ observed implementation

Intent Assurance suggests a general correspondence test analogous to strict accounting.

For accounting:

```text
Reality → Ledger completeness
Ledger → Reality soundness
```

For intention and architecture:

```text
Declared Intent → Observed Implementation completeness
Observed Implementation → Declared Intent soundness
```

### Completeness

Every active stabilized intent that requires implementation should have an observable realization, explicit exception, or unresolved continuation.

### Soundness

Every significant implementation capability should have a reconstructible intent, mandate, requirement, or explicit experimental status.

This yields a practical target:

> **Intent ↔ Implementation correspondence, modulo explicit experimentation, uncertainty, deprecation, and transition.**

The point is not to force one-to-one mapping. It is to make unexplained divergence detectable.

---

## 16. Implications for Digital Twins

A faithful Digital Twin is not primarily a stylistic imitation of its principal.

> **A faithful Digital Twin is an agent capable of preserving, reconstructing, refining, and serving the principal’s intents under explicit mandates while keeping interpretation, uncertainty, action, and effects traceable.**

The Twin may change:

- model;
- provider;
- codebase;
- host machine;
- internal plan;
- tool implementation;
- delegated sub-agents.

Continuity depends instead on the reconstructibility of:

```text
Principal
   ↓
Intent
   ↓
Mandate
   ↓
Action
   ↓
Effect
```

This makes **intentional continuity** a more fundamental Digital Twin property than persona continuity.

---

## 17. Implications for Cognitive Packets

Intent is a natural candidate for explicit linkage in Cognitive Packets.

A packet need not contain the full intent definition, but should be able to carry or resolve references such as:

```text
intent_ref
principal_ref
mandate_ref
plan_ref
parent_intent_ref
interpretation_status
```

A delegated packet may attenuate mandate while still referring to the same higher-level intent, or may introduce a local sub-intent explicitly derived from it.

This allows a downstream effect to be traced back through:

```text
Effect
  ↑
Action
  ↑
Packet
  ↑
Mandate
  ↑
Intent
  ↑
Principal
```

---

## 18. Implications for Rational Exploration of the Possible

Intent connects naturally to Rational Exploration of the Possible.

Exploration produces candidate possibles. Desire and evaluation may make some possibles attractive. Intent is the transition by which an entity adopts a possible as an orientation of action.

One possible sequence is therefore:

```text
Possible
  ↓ evaluation
Desire
  ↓ adoption
Intent
  ↓ mandate / experimentation
Action
  ↓ observation
Effect
  ↓ learning
Possible space updated
```

Intent is therefore neither the Possible itself nor its prediction. It is a commitment made within the Possible.

---

## 19. Core doctrine

The current doctrine can be summarized by the following rules.

### I1 — Intent has provenance

> **No intent without provenance.**

### I2 — Interpretation preserves uncertainty

> **No interpretation without uncertainty.**

### I3 — Intent does not create authority

> **No delegation without mandate.**

### I4 — Drift is explicit

> **No intent drift without trace.**

### I5 — Plans and implementations are replaceable

> **Preserve the intent, not necessarily the plan.**

### I6 — Realization loss must be explicit

> **No stabilized intent may lose its effective realization without an explicit, attributable, and reviewable transition.**

### I7 — Effects return to intent

> **Intent Fulfillment without Intent Assurance is incomplete.**

### I8 — Formal verification does not erase the interpretation problem

> **A verified specification is not automatically a verified representation of human intent.**

---

## 20. Relationship to stabilization

Intent doctrine is a specific instance of a broader Cogentia objective: **reliable, revisable stabilization of the link between reality and its representations**.

The goal is not to freeze intentions, institutions, implementations, or agents.

The goal is to make meaningful transformations reconstructible:

```text
what was intended?
what was understood?
what was authorized?
what was planned?
what was done?
what changed?
what did it cost?
what evidence remains?
did the outcome still serve the intent?
```

A useful general formulation follows:

> **A significant transformation should leave an explainable difference.**

Intent provides the upper reference point of that explanation.

---

## 21. Research and implementation programme

The doctrine is mature enough to guide experiments but not to claim a complete formal theory.

Immediate research questions include:

1. What minimum Intent object can be represented without over-formalizing human purposes?
2. How should declared, inferred, negotiated, and stabilized intents be represented and versioned?
3. How should conflicting intents and priority relations be represented?
4. How should intent references interact with mandates and Cognitive Packets?
5. Which parts of Intent Assurance can be deterministic, which require agents, and which require the principal?
6. How can capability/contract diffs detect possible Intent Preservation Failures during refactoring?
7. Can corpus metadata and tests expose contradictions between declared generated views and actual CLI capabilities?
8. How should an Intent Ledger or event stream relate to existing Cogentia registers rather than creating another unnecessary silo?
9. How can private or sensitive intents be referenced without leaking their contents across public traces?
10. How can the doctrine scale from a single Digital Twin to collective entities and nested organizations?

The first implementation experiment should use the real `cogentia.js v1 → v2` regression:

```text
recover historical intent
→ restore index/concept maintenance capability
→ encode its contract
→ add intent-preservation regression checks
→ test future refactoring against the contract
```

This turns an accidental loss into a reusable mechanism for preventing future losses.

---

## 22. References and intellectual lineage

The doctrine draws on, but is not reducible to, several established lines of work:

- Anand S. Rao and Michael P. Georgeff, **BDI Agents: From Theory to Practice**, First International Conference on Multiagent Systems, 1995.
- Philip R. Cohen and Hector J. Levesque, work on intention and commitment, including **Intention = Choice + Commitment**.
- Goal-Oriented Requirements Engineering, notably work by Axel van Lamsweerde on goals, obstacles, operationalization, and responsibility assignment.
- Nancy G. Leveson, **Intent Specifications**, and subsequent work on human-centered intent specifications and preservation of design rationale.
- IRTF RFC 9315, **Intent-Based Networking — Concepts and Definitions**, especially the distinction between Intent Fulfillment and Intent Assurance.
- Recent agent-alignment and coding-agent monitoring work that evaluates actions against user intent rather than only local instruction compliance.

Primary reference entry points:

- https://aaai.org/papers/icmas95-042-bdi-agents-from-theory-to-practice/
- https://ntrs.nasa.gov/citations/19990089302
- https://ntrs.nasa.gov/citations/19990080916
- https://datatracker.ietf.org/doc/rfc9315/
- https://openai.com/index/how-we-monitor-internal-coding-agents-misalignment/

---

## 23. Continuation

This note should be revisited after the first implementation of Intent Preservation checks in `cogentia.js`.

The key falsification question is practical:

> **Can a meaningful stabilized intent disappear from an evolving Cogentia system without either remaining effectively realized or producing an explicit unresolved transition?**

If the answer remains yes, the doctrine has not yet been operationalized strongly enough.
