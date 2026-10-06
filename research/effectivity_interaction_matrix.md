---
title: "Effectivity Interaction Matrix"
subtitle: "Generic source-first model for actors, requests, triggers, routing, responses, evidence, capability effects and continuations"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: '2026-10-02'
version: '0.2'
status: "working-paper — generic specification v0.2"
last_modified_at: '2026-10-06'
language: en
license: CC BY-SA 4.0
document_role: source
document_kind: specification
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/effectivity_interaction_matrix.md
provenance:
  origin_type: repository
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

## 16. Implementation Profiles and Concrete Incarnations

The generic EIM is an abstract specification. To be operational in specific environments without losing cross-domain comparability, the specification uses **Implementation Profiles**.

A profile defines:
- domain-specific vocabulary extensions;
- required or prohibited subsets of fields;
- domain-specific epistemic rules and invariants;
- bindings to external source registers and tools.

All profiles inherit from the canonical JSON Schema ([`schemas/effectivity-interaction-matrix-row.schema.yaml`](file:///C:/tweesic/cogentia/schemas/effectivity-interaction-matrix-row.schema.yaml)) and are verified by the automated validator ([`scripts/lib/eim-validator.js`](file:///C:/tweesic/cogentia/scripts/lib/eim-validator.js)) via `npm run test:eim`.

### Concrete Profiles

1. **`EIM-CAPABLE`** — Campaign Execution and Administrative Interaction
   - File: [`research/eim_examples/2026-10-02-capable-campaign.yaml`](file:///C:/tweesic/cogentia/research/eim_examples/2026-10-02-capable-campaign.yaml)
   - Scope: Electoral filings, candidacy registrations, grand elector rolls transparency, and ballot paper verifications under strict statutory deadlines.
   - Key Invariant: Campaign actions are grounded in observable traces, not intentions; administrative silence remains an observable process event without imputed refusal.

2. **`EIM-PREFECTURE`** — Administrative Query and Transparency Inquiries
   - File: [`research/eim_examples/2026-10-02-prefecture-p1-p18.yaml`](file:///C:/tweesic/cogentia/research/eim_examples/2026-10-02-prefecture-p1-p18.yaml)
   - Scope: 18 structured questions (P1–P18) testing prefectural response latency, transmission protocols, silence dynamics, and access to public documents.
   - Key Invariant: Explicit quad-role separation between prefectural departments; silence is recorded as an empirical event without speculative attribution.

3. **`EIM-TA`** — Judicial Review and Contentious Proceedings
   - File: [`research/eim_examples/2026-10-02-ta-d1-d10.yaml`](file:///C:/tweesic/cogentia/research/eim_examples/2026-10-02-ta-d1-d10.yaml)
   - Scope: Contentious proceedings before the Administrative Tribunal (emergency interim relief / référé, formal memorials, adversarial exchanges, judicial rulings).
   - Key Invariant: Judicial decisions explicitly document procedural triggers, adversarial deadlines, and immediate capacity shifts (`blocks`, `opens`, `preserves`).

4. **`EIM-TWIN-OBSERVATION`** — Longitudinal Observation Surface for Cogentia Twins / Reality Tests
   - File: [`research/eim_examples/eim-twin-observation-example.yaml`](file:///C:/tweesic/cogentia/research/eim_examples/eim-twin-observation-example.yaml)
   - Scope: Closed learning loop for digital twins and institutional Cogentigrams.
   - Epistemic Cycle:
     ```text
     freeze_state → ex_ante_hypothesis → observed_event → ex_post_comparison → error_record → structural_update_candidate
     ```
   - Key Invariant: Predictions must be frozen and timestamped prior to observing outcomes; ex-post revisions never delete the prior prediction.

5. **`EIM-NON-LEGAL-CONTRIBUTION`** — Participatory Editorial Boundary
   - File: [`research/eim_examples/eim-non-legal-contribution.yaml`](file:///C:/tweesic/cogentia/research/eim_examples/eim-non-legal-contribution.yaml)
   - Scope: Living Book contribution boundary (reader trace submissions, e.g. `#RT-LBF-001`, editorial deliberation, colophon attribution, delta magazine updates).
   - Key Invariant: Non-coercive interactions; contributions are observable participatory acts, evaluated through editorial capacity deltas without legal or administrative enforcement.

### Instrumented Reality Cases derived from *Moyens et finalités*

The following files are **applications of existing EIM semantics**, not new profiles:

6. **H4 — Heterogeneous parliamentary routes toward an amendment**
   - File: [`research/eim_examples/2026-10-06-moyens-finalites-h4.yaml`](eim_examples/2026-10-06-moyens-finalites-h4.yaml)
   - Purpose: freeze a prospective baseline separating public availability, actor-specific receipt, routing, substantive response, and causally attributable parliamentary uptake.
   - Key invariant: publication ≠ receipt ≠ routing ≠ consideration ≠ uptake.

7. **Remedial effectivity probe**
   - File: [`research/eim_examples/2026-10-06-moyens-finalites-remedial-probe.yaml`](eim_examples/2026-10-06-moyens-finalites-remedial-probe.yaml)
   - Purpose: distinguish abstract remedial power, case-specific availability, useful timing, and the practical capacity actually restored.
   - Key invariant: remedy exists ≠ remedy available in this case ≠ remedy timely ≠ historical capacity restored.

These cases are deliberately kept as examples under `EIM-TWIN-OBSERVATION` until repeated use justifies a distinct implementation profile.

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

## 19. Adversarial Review and Cognitive Failure Modes

Applying interaction matrices to human, institutional, or cognitive systems carries specific epistemic risks. The EIM explicitly identifies five primary cognitive traps and embeds structural countermeasures:

### Trap 1: Conflating Silence with Imputed Intent (Mind-Reading Trap)
- **Risk**: An observer treats administrative, editorial, or personal silence as an implicit refusal, tacit consent, or deliberate evasion.
- **Countermeasure**: In EIM, `SILENCE` is strictly an observable absence of communication within a given timeframe. It cannot be converted into `REFUSED` or `YES` unless an explicit statutory rule (such as formal silence-vaut-rejet or silence-vaut-accord) is documented as a distinct governing trace. The validator issues a semantic warning if `SILENCE` is paired with an inferred refusal in `response_summary`.

### Trap 2: Collapsing Procedural Roles (Monolithic Actor Trap)
- **Risk**: Treating an organization, institution, or collective body as a single monolithic mind, ignoring internal division of labor and friction.
- **Countermeasure**: The EIM enforces four distinct procedural roles:
  1. `information_holder`: who possesses the requested fact or document;
  2. `decision_authority`: who holds formal jurisdiction or power to grant or deny;
  3. `transmitter`: who channels the request or notification;
  4. `controller_or_reviewer`: who audits or reviews the act.
  The validator warns if all four roles are collapsed into an identical entity without explicit operational justification.

### Trap 3: Hindsight Bias / Retro-projection (Anachronism Trap)
- **Risk**: Judging an actor's past behavior based on evidence or documents that only became accessible later in the process.
- **Countermeasure**: Dual temporal indexing:
  - `evidence_available_now` (contemporary audit state);
  - `evidence_available_at_relevant_time` (state at interaction trigger);
  - `historical_availability_status` (explicit reason for disparity, e.g. `ongoing_silent_period`, `subsequent_disclosure`).
  The validator warns if contemporary evidence is asserted without declaring historical availability status.

### Trap 4: Conflating Procedural Routing with Substantive Disposition (Premature Closure Trap)
- **Risk**: Marking a request as resolved or closed simply because an acknowledgment or routing notification was transmitted.
- **Countermeasure**: Clear separation between `routing_observed` / `routing_target` and the terminal `response_state`. When a matter is routed, `response_state: ROUTED` preserves open tracking until the destination authority acts.

### Trap 5: Conflating Interaction Logs with Normative Judgment (Moralizing Trap)
- **Risk**: Using interaction matrices as a scoring tool for political praise or moral condemnation.
- **Countermeasure**: The EIM strictly records **effectivity transitions** (what capabilities were opened, preserved, delayed, reduced, or blocked) supported by primary evidence references (`evidence_refs`). Capacity deltas describe reachable operational paths, not moral or ethical worth.

## 20. Non-goals

The EIM is not:

- a mind-reading framework;
- a guilt attribution engine;
- a legal qualification by itself;
- a substitute for primary evidence;
- a universal ontology of institutions;
- a claim that all silence is meaningful;
- a scoring system for political actors.

## 21. Relationship with Cogentia Twins

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

## 22. Relationship with Living Books

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

## 23. Canonical compact formula

> **Observe interactions as effectivity transitions, not merely messages.**

Or operationally:

```text
Who asked what, of whom, when, why now, who could actually act,
what was observed, what evidence supports it,
what capability changed, and what can happen next?
```

## 24. Status and Promotion Decision

### Promotion Decision: Promoted to Specification v0.2

On **2026-10-05**, the generic Effectivity Interaction Matrix specification was formally evaluated and **promoted from v0.1 to v0.2**.

### Promotion Checklist Completed:
1. **Machine-readable Schema**: Formalized in [`schemas/effectivity-interaction-matrix-row.schema.yaml`](file:///C:/tweesic/cogentia/schemas/effectivity-interaction-matrix-row.schema.yaml).
2. **Automated Verification**: Independent validator [`scripts/lib/eim-validator.js`](file:///C:/tweesic/cogentia/scripts/lib/eim-validator.js) and test runner [`scripts/check-eim.js`](file:///C:/tweesic/cogentia/scripts/check-eim.js) added to CI via `npm run test:eim`.
3. **Multi-domain Profile Incarnations**:
   - `EIM-CAPABLE` (political/campaign interactions, 3 rows);
   - `EIM-PREFECTURE` (administrative queries, 18 rows);
   - `EIM-TA` (administrative court proceedings, 4 rows);
   - `EIM-TWIN-OBSERVATION` (Cogentia Twin reality test observation, 1 row);
   - `EIM-NON-LEGAL-CONTRIBUTION` (Living Book participatory contribution boundary, 2 rows).
4. **Adversarial Review Codified**: Detailed analysis of five cognitive traps (silence conflation, role collapse, hindsight bias, premature closure, moralizing) and structural schema guards.
5. **Non-legal Domain Validation**: Validated on participatory Living Book editorial boundary.

### Future Roadmap (v0.3 Candidate):
- Integration with Cogentia Twin registry and automated drift detectors.
- Automated Graph visualization export (Mermaid / DOT) from matrix YAML files.
- Longitudinal cross-matrix correlation engine.
