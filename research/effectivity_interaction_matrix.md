---
title: "Effectivity Interaction Matrix"
subtitle: "Generic source-first model for actors, requests, triggers, routing, responses, evidence, capability effects and continuations"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: '2026-10-02'
version: '0.1'
status: "working-paper — generic specification"
language: en
license: CC BY-SA 4.0
document_role: source
document_kind: specification
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/effectivity_interaction_matrix.md
provenance:
  origin_type: corpus-generalization
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "generalized from Capable / Campagne du Réel matrix, 2026-10-02"
  origin_date: '2026-10-02'
  derived_from:
    - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/capable/campaign/matrix.md
    - research/Cogentia-and-Cogentigram.md
    - research/operational_stance.md
    - research/cognitive_packets.md
    - research/latent_human_space_and_cogentigraphic_booster.md
review:
  status: unreviewed
  reviewed_by: []
tags:
  - effectivity
  - interaction
  - matrix
  - capability
  - routing
  - evidence
  - cogentia
  - digital-twin
  - reality-test
  - janus
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: strong
---

# Effectivity Interaction Matrix

## 1. Purpose

The **Effectivity Interaction Matrix** (EIM) is a generic, source-first representation of interactions in which an actor seeks information, a decision, a transmission, an action, a remedy, or another concrete effect from another actor or system.

It is designed to answer a simple operational question:

> **What was asked, of whom, under which conditions, what happened, what evidence exists, what capability was gained or lost, and what becomes possible next?**

The EIM is not limited to public administration, litigation, politics, persons, or organizations.

Possible subjects include:

- natural persons;
- institutions;
- administrations;
- courts;
- companies;
- associations;
- agents;
- historical actors;
- collective entities;
- campaigns;
- projects;
- machine systems;
- Living Books and their contribution workflows.

## 2. Core abstraction

The minimum causal chain is:

```text
subject
→ request / expected effect
→ target actor
→ trigger / context
→ observable response or non-response
→ routing / decision / transmission
→ evidence
→ effect on practical capability
→ next possible action
```

Canonical compact form:

```text
Entity × Request × Trigger × Response × Routing × Evidence × Capability Effect × Continuation
```

## 3. Foundational distinction

The EIM MUST distinguish at least four roles:

```text
information_holder
≠ decision_authority
≠ transmitter
≠ controller_or_reviewer
```

A single actor may occupy several roles, but they must not be collapsed by default.

This distinction prevents common inference errors such as:

- assuming that the person who possesses a trace can decide;
- assuming that the decision-maker personally possesses the trace;
- assuming that a receiving office is the legally competent authority;
- assuming that an intermediary's silence proves absence at the source.

## 4. Generic record

A matrix row represents one **effectivity question**.

Suggested minimal record:

```yaml
id:
subject_entity:
counterparty_entity:
request:
request_kind:
first_trace:
last_followup:
trigger:
information_holder:
decision_authority:
transmitter:
controller_or_reviewer:
routing_required:
routing_observed:
response_state:
evidence_status:
priority_mode:
effect_on_capacity:
next_possible_actions: []
precedents: []
sources: []
```

## 5. Extended record

Recommended richer form:

```yaml
id:
matrix_id:

subject_entity:
counterparty_entity:
subactor:
actor_role: []

request:
request_kind:
requested_effect:
request_scope:
first_trace:
last_followup:

trigger:
trigger_kind:
trigger_date:
why_relevant_now:

age:
priority_mode:
priority_rank:

information_holder:
decision_authority:
transmitter:
controller_or_reviewer:

routing_required:
routing_target:
routing_observed:
routing_date:
routing_trace:

response_state:
response_date:
response_summary:
partial_dimensions_closed: []
open_dimensions: []

evidence_status:
evidence_refs: []
evidence_available_now:
evidence_available_at_relevant_time:
historical_availability_status:

effect_on_capacity:
capacity_kind:
capacity_delta:
irreversibility:
time_sensitivity:

next_possible_actions: []
next_actor:
deadline:

precedents: []
comparison_scope:
level_of_examination:

epistemic_status:
confidence:
notes:
sources: []
```

## 6. Response states

Recommended controlled vocabulary:

- `YES`
- `NO`
- `PARTIAL`
- `REFUSED`
- `ROUTED`
- `PENDING`
- `SILENCE`
- `NOT_FOUND`
- `NOT_RECORDED`
- `CHECKING`
- `NON_COMMUNICABLE`
- `UNKNOWN`

These states are **observable process states**, not legal conclusions.

## 7. Evidence states

Recommended controlled vocabulary:

- `ESTABLISHED`
- `CONTESTED`
- `UNKNOWN`
- `PENDING`
- `NOT_TREATED`
- `REFUTED`
- `SUPERSEDED`

An EIM implementation may extend this list, but MUST preserve the distinction between:

```text
no evidence found
≠ evidence of absence
```

## 8. Silence rule

Silence is an observable event.

It MAY establish:

- that no response was received through a defined channel by a defined time;
- that a requested routing was not observed;
- that a known acknowledgement was absent.

It MUST NOT automatically establish:

- inexistence of the requested document;
- absence of an internal action;
- absence of competence;
- intent;
- refusal, unless the applicable rule explicitly gives silence that legal effect.

Canonical rule:

> **Absence of evidence is not evidence of absence unless an independent rule makes the inference valid.**

## 9. Historical availability rule

The EIM MUST separate:

```text
document exists now
≠ document existed then
≠ document was available to the relevant actor then
≠ document was actually considered then
```

These are distinct fields or distinct questions.

## 10. Trigger rule

A follow-up is not interpreted only by temporal proximity.

A new trigger may change the practical importance of an old unanswered request.

Generic model:

```text
old request
+ new procedural / operational event
→ new urgency or utility
→ justified follow-up
```

Triggers may include:

- new deadline;
- new decision;
- new refusal;
- new invitation to use a remedy;
- change of competent authority;
- new evidence;
- new dependency;
- upcoming meeting;
- publication;
- operational incident.

## 11. Priority modes

The EIM separates **existence of a question** from **execution priority**.

Recommended modes:

- `none` — all rows intentionally non-hierarchical;
- `procedural` — ordered by deadline / remedy usefulness;
- `operational` — ordered by contribution to current objective;
- `risk` — ordered by potential irreversible harm;
- `information_gain` — ordered by expected reduction of uncertainty;
- `custom`.

Priority MUST NOT imply epistemic importance unless explicitly stated.

## 12. Capability effect

The matrix is about **effectivity**, not merely correspondence.

Every row SHOULD ask:

> What practical capability is changed by the answer, non-answer, routing, refusal or uncertainty?

Examples:

- ability to file a remedy;
- ability to verify a fact;
- ability to act before a deadline;
- ability to coordinate;
- ability to publish accurately;
- ability to obtain a document;
- ability to make a decision;
- ability to falsify a hypothesis.

Suggested direction:

- `opens`
- `improves`
- `preserves`
- `delays`
- `reduces`
- `blocks`
- `unknown`

## 13. Continuation semantics

An EIM row should produce one or more possible continuations:

```text
state observed
→ allowed / useful next actions
→ next actor or system
→ new matrix rows
```

The matrix is therefore compatible with **Cognitive Packets** and resumable continuations.

A row may become:

- closed;
- partially closed;
- forked;
- superseded;
- escalated;
- converted into a Reality Test.

## 14. Janus mode

The EIM supports both retrospective and prospective use.

### Retrospective

```text
traces
→ reconstruct interaction
→ classify state
→ infer capability effect
```

### Prospective

```text
current matrix state
→ predict likely next response / routing / delay
→ timestamp hypothesis
→ observe reality
→ compare
→ update model
```

Prospective outputs SHOULD be frozen before outcome where feasible.

## 15. Reality Test mode

A Twin or Cogentigram may use the EIM as an observation surface.

Minimal protocol:

1. freeze current matrix state;
2. state prediction;
3. state confidence;
4. state alternatives;
5. wait for observable outcome;
6. compare;
7. score error;
8. update without deleting prior prediction.

This supports:

- institutional Cogentigrams;
- agent Cogentigrams;
- process Cogentigrams;
- historical reconstruction tests;
- operational digital twins.

## 16. Matrix instances

The generic EIM is a specification.

Each project instance may add fields, views and constraints.

Examples:

- legal / administrative interaction matrix;
- customer support matrix;
- research contribution matrix;
- historical command matrix;
- institutional Twin observation matrix;
- campaign execution matrix;
- scientific replication matrix.

The generic specification MUST remain independent from any one use case.

## 17. Views

Recommended projections:

- actor × request;
- chronology;
- open unknowns;
- routing graph;
- capability effects;
- deadlines;
- evidence state;
- ex-ante predictions;
- ex-post outcomes;
- precedent / recurrence;
- Twin observation feed.

## 18. Graph relation

The EIM is naturally a graph as well as a table.

Possible node classes:

- Entity
- Request
- Trace
- Trigger
- Response
- Decision
- Transmission
- Capability
- Continuation
- Reality Test

Possible edges:

- `addressed_to`
- `held_by`
- `decided_by`
- `transmitted_by`
- `triggered_by`
- `supported_by`
- `opens`
- `blocks`
- `routes_to`
- `supersedes`
- `tests`

## 19. Non-goals

The EIM is not:

- a mind-reading framework;
- a guilt attribution engine;
- a legal qualification by itself;
- a substitute for primary evidence;
- a universal ontology of institutions;
- a claim that all silence is meaningful;
- a scoring system for political actors.

## 20. Relationship with Cogentia Twins

Repeated EIM observations may reveal persistent structural regularities.

Therefore:

```text
EIM observations over time
→ candidate structural regularities
→ Cogentigram axes
→ Provisional Twin
→ ex-ante predictions
→ EIM outcomes
→ revision
```

This creates a closed but falsifiable learning loop.

## 21. Relationship with Living Books

A Living Book may:

- publish an EIM;
- derive narrative from it;
- expose unknowns;
- invite correction;
- feed a Twin;
- document ex-ante and ex-post tests.

But:

```text
EIM ≠ Living Book
Living Book ≠ Twin
Twin ≠ Cogentigram
Cogentigram ≠ episodic corpus
```

## 22. Canonical compact formula

> **Observe interactions as effectivity transitions, not merely messages.**

Or operationally:

```text
Who asked what, of whom, when, why now, who could actually act,
what was observed, what evidence supports it,
what capability changed, and what can happen next?
```

## 23. Status

v0.1 — first generic extraction from the Campagne du Réel implementation.

Next work:

- machine-readable schema;
- adversarial review;
- implementation profiles;
- validation on non-legal domains;
- integration with Twin / Living Book registry.
