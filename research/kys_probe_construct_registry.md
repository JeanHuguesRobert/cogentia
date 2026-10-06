---
title: "KYS Reality Capture — Probe and Construct Coverage Registry"
subtitle: "Comprehensive candidate ontology for multi-probe observation: historical axes, modern models, person–situation signatures, and emergent interaction dynamics"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-10-05"
version: "0.1"
status: "working-paper — construct registry"
language: en
license: CC BY-SA 4.0
document_role: source
document_kind: specification
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/kys_probe_construct_registry.md
related_issues:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/200"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/201"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/202"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/203"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/204"
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "issue-203"
  origin_date: "2026-10-05"
  derived_from:
    - "research/kys_reality_capture_baseline_audit.md"
    - "research/kys_measurement_contract.md"
    - "research/cogentia_prompt_v1.md"
    - "research/kys-prompt.md"
    - "research/kys_specialized_profiles_catalog.md"
review:
  status: unreviewed
  reviewed_by: []
tags:
  - kys
  - reality-capture
  - construct-registry
  - probe-coverage
  - person-situation
  - privai
  - emergent-dynamics
classification_source: cogentia.js
classification_version: "1"
classification_rule: explicit-metadata
classification_confidence: strong
---

# KYS Reality Capture — Probe and Construct Coverage Registry

## 1. Purpose and Governing Principle

This registry formalizes the candidate construct space for the **KYS Reality Capture** protocol ([cogentia#203](https://github.com/JeanHuguesRobert/cogentia/issues/203), child of [#200](https://github.com/JeanHuguesRobert/cogentia/issues/200)).

Its purpose is to provide a broad, auditable library of phenomena worth probing without treating any single pre-existing taxonomy as the territory. It directly counters the risk of **instrumental fossilization** documented in [#201](https://github.com/JeanHuguesRobert/cogentia/issues/201), where the prompt was constrained to a fixed historical 73-axis list, blinding the instrument to emergent behavioral, interactional, and situational patterns.

### Governing Architectural Principle

> **Large ontology, selective projection.**

The registry maintains an expansive, multi-paradigm vocabulary of cognitive, behavioral, ethical, situational, and interactional constructs. Downstream prompts ([#204](https://github.com/JeanHuguesRobert/cogentia/issues/204)) can sample or encode this space compactly, and downstream analyzers ([#206](https://github.com/JeanHuguesRobert/cogentia/issues/206), [#207](https://github.com/JeanHuguesRobert/cogentia/issues/207)) can project captured measurements onto specific lenses (Big Five, HEXACO, historical Cogentia 73 axes, or specialized PrivAI profiles) without forcing the initial observation into an artificial monoculture.

### Non-Goal Statement

> **Naming a construct does not declare its statistical independence, psychological universality, or ontological fundamentality.**  
> Constructs in this registry are observable interaction tendencies, conceptual lenses, or diagnostic probes. They represent candidate targets for empirical inquiry, not dogma.

---

## 2. Registry Metadata Architecture

Each entry in the registry is structured according to the following schema:

- **`id`**: Unique permanent construct identifier (e.g. `EMERG-001`, `HIST-042`, `SIT-003`).
- **`name`**: Concise canonical label.
- **`category`**: Primary thematic cluster.
- **`description`**: Concrete operational definition of what is observed.
- **`observability`**:
  - `directly_observable`: Evident in raw conversational text or turn structure.
  - `composite_construct`: Aggregate inferred from multiple patterns.
  - `latent_hypothesis`: Theoretical projection requiring external corroboration.
- **`likely_confounds`**: Known distortions (sycophancy, topic selection, urgency, prompt phrasing).
- **`useful_probe_families`**: Probe strategies best suited to reveal the construct.
- **`relevant_situations`**: Conditions or interaction types where the construct manifests.
- **`sensitivity_tier`**:
  - `tier_0_sovereign_private`: Highly intimate/vulnerable (retained under strict person control).
  - `tier_1_restricted`: Purpose-bound sharing (research, pair coding, trusted mentor).
  - `tier_2_public_eligible`: Publicly projectable (writing style, civic voice, method).
- **`derived_frameworks`**: Mappings to known psychological or operational models.
- **`evidence_base`**: Academic, clinical, or corpus-empirical foundation.
- **`status`**: `established` (mature), `candidate` (tested in prototypes), `exploratory` (emergent hypothesis).

---

## 3. Construct Clusters

The registry organizes candidate constructs into seven distinct clusters:

1. **Cluster 1: Emergent AI–Human Interaction Dynamics (The Unnamed Territory)**
2. **Cluster 2: Historical Cogentia 73 Axes (Re-Anchored Baseline)**
3. **Cluster 3: Modern Personality & Values Dimensions (Big Five, HEXACO, Schwartz)**
4. **Cluster 4: Person × Situation Modulations (CAPS Signatures)**
5. **Cluster 5: Decision Dilemmas & Value Priority Arbitrations**
6. **Cluster 6: Epistemic & Cognitive Sovereignty Attributes**
7. **Cluster 7: Sensitive & Vulnerability Indicators (PrivAI Governed)**

---

### Cluster 1: Emergent AI–Human Interaction Dynamics

*These constructs emerge uniquely in human–LLM cooperation and are omitted by traditional offline psychometrics.*

| ID | Name | Observability | Description | Probe Families | Sensitivity | Status |
|---|---|---|---|---|---|---|
| `EMERG-001` | **Revision Persistence** | `directly_observable` | The tenacity and iteration count with which a user refines an artifact until it matches their internal standard, rather than accepting good-enough output. | Multi-turn task evaluation, constraint tightening | `tier_2` | `established` |
| `EMERG-002` | **Sycophancy Resistance** | `directly_observable` | How a user reacts when an agent flatters, mimics, or unreservedly agrees with them; active insistence on counter-arguments and adversarial friction. | Devil's advocate prompt, intentional false assent | `tier_2` | `established` |
| `EMERG-003` | **Prompt Instrumentation Sophistication** | `directly_observable` | Tendency to treat conversational interactions as programmatic state machines (preambles, negative constraints, role contracts) vs natural language chatting. | Turn structure analysis, constraint syntax | `tier_2` | `established` |
| `EMERG-004` | **Abstraction Leap Distance** | `composite_construct` | The conceptual span between the concrete details given as input and the synthesized conceptual frameworks demanded by the user. | Generalization probe, concept mapping | `tier_1` | `candidate` |
| `EMERG-005` | **Compaction Tolerance** | `directly_observable` | Reaction to information summarization: whether the user tolerates compressed synthesis or rejects lossy elisions of nuances. | Summary review, detail audit | `tier_1` | `candidate` |
| `EMERG-006` | **Epistemic Friction Seeking** | `composite_construct` | Deliberate solicitation of objections, alternative perspectives, and worst-case scenarios before concluding. | Critical review probe, stress test | `tier_2` | `established` |

---

### Cluster 2: Historical Cogentia 73 Axes (Sample Key Baseline Anchors)

*Re-anchored from `research/cogentia_prompt_v1.md` and `apps/personal/samples/cogentigram_author.json`, stripped of pseudo-normative percentile claims.*

| ID | Name | Category | Description | Likely Confounds | Derived Framework | Status |
|---|---|---|---|---|---|---|
| `HIST-001` | **Conceptual Synthesis** | Cognitive | Ability to integrate disparate information streams into coherent conceptual architectures. | Topic familiarity | Cogentia 73 / WAIS proxy | `established` |
| `HIST-012` | **Epistemic Vigilance** | Executive | Active detection of logical fallacies, ungrounded claims, and source omissions. | Domain expertise | Cogentia 73 / Critical thinking | `established` |
| `HIST-024` | **Inversion of Control** | Cognitive style | Tendency to re-frame problems by questioning premises rather than answering within the given frame. | Combative posture | Cogentia 73 / Lateral thinking | `established` |
| `HIST-035` | **Formulation Density** | Communication | Information-to-token ratio in expression; preference for terse, highly packed prose. | Vocabulary breadth | Cogentia 73 / Verbal style | `established` |
| `HIST-059` | **Synchronization Efficiency** | Flow Dynamics | Fluidity in coordinating turn exchanges with minimal conversational friction or meta-overhead. | Network latency | Cogentia Flow / Author fixture | `candidate` |
| `HIST-073` | **Cognitive Sovereignty** | Flow Dynamics | Maintenance of independent agency and self-direction in the presence of persuasive external models. | Stubbornness | Cogentia Flow / Autonomy | `candidate` |

---

### Cluster 3: Modern Personality & Values Dimensions

*Standard validated psychometric models mapped as recomputable projections, not primary measurement formats.*

| ID | Name | Model | Description | Probe Families | Derived Framework | Status |
|---|---|---|---|---|---|---|
| `PERS-001` | **Openness to Experience** | Big Five / FFM | Intellectual curiosity, aesthetic sensitivity, preference for novelty and complex ideas. | Abstract exploration, unconventional scenario | NEO-PI-R, BFI-2 | `established` |
| `PERS-002` | **Honesty-Humility** | HEXACO | Sincerity, fairness, greed avoidance, and modesty in relational dealings. | Dilemma with asymmetric personal gain | HEXACO-PI-R | `established` |
| `PERS-003` | **Conscientiousness (Orderliness & Deliberation)** | Big Five / HEXACO | Methodical discipline, precision in execution, respect for systematic procedure. | Protocol compliance task | FFM / HEXACO | `established` |
| `PERS-004` | **Self-Direction (Thought & Action)** | Schwartz Values | Valuing independent thought, choosing, creating, and exploring without institutional coercion. | Authority constraint dilemma | Schwartz PVQ | `established` |
| `PERS-005` | **Universalism (Societal & Ecological)** | Schwartz Values | Concern for justice, equality, protection of the common good and long-term sustainability. | Resource allocation scenario | Schwartz PVQ | `established` |

---

### Cluster 4: Person × Situation Modulations (CAPS Signatures)

*Mischel & Shoda's Cognitive-Affective Processing System: observing how behavior changes across contexts.*

| ID | Name | Base Stance | Modulated Stance Under Condition | Situational Trigger | Status |
|---|---|---|---|---|---|
| `SIT-001` | **Urgency Acceleration** | Methodical, deep research | Terse, high-speed heuristic pruning | Imminent deadline / operational emergency | `candidate` |
| `SIT-002` | **Adversarial Hardening** | Diplomatic, collaborative | Formalistic, unyielding provenance demand | Suspected institutional capture or deception | `candidate` |
| `SIT-003` | **Exploratory Loosening** | Rigorous verification | Playful, divergent conceptual branching | Explicitly designated speculative sandbox | `candidate` |
| `SIT-004` | **Failure Resilience** | Constructive engagement | Calm diagnostic autopsy without emotional collapse | Technical error / unexpected refutation | `candidate` |

---

### Cluster 5: Decision Dilemmas & Value Priority Arbitrations

*Probing where values collide and forced choice reveals underlying operational axioms.*

| ID | Name | Competing Value A | Competing Value B | Diagnostic Meaning | Status |
|---|---|---|---|---|---|
| `DIL-001` | **Velocity vs. Provenance** | Immediate actionable result | Complete, auditable traceability | Reveals whether the subject privileges immediate execution or durable verifiability. | `established` |
| `DIL-002` | **Candor vs. Diplomacy** | Unvarnished, potentially jarring truth | Relational cushion and social harmony | Reveals commitment to literal fidelity vs social allostasis. | `established` |
| `DIL-003` | **Local Autonomy vs. Global Efficiency** | Self-sufficient local sovereignty | Centralized, optimized interdependence | Reveals fundamental orientation toward anti-capture architecture. | `established` |
| `DIL-004` | **Heuristic Bounding vs. Exhaustive Proof** | Fast "good-enough" bounded search | Absolute certainty and exhaustive edge case sweep | Reveals tolerance for uncertainty under time pressure. | `established` |

---

### Cluster 6: Epistemic & Cognitive Sovereignty Attributes

*Constructs related to how the subject establishes, audits, and maintains their own truth-claims.*

| ID | Name | Observability | Description | Probe Families | Sensitivity | Status |
|---|---|---|---|---|---|---|
| `SOV-001` | **Source Traceability Reflex** | `directly_observable` | Immediate demand for primary links, commits, or citations before accepting an assertion. | Fact assertion probe | `tier_2` | `established` |
| `SOV-002` | **Premise Interrogation** | `directly_observable` | Refusal to solve a problem as formulated if the implicit premises are flawed or ungrounded. | Malformed question test | `tier_2` | `established` |
| `SOV-003` | **Contradiction Retention** | `composite_construct` | Willingness to hold two conflicting empirical observations simultaneously without prematurely forcing harmony. | Paradox arbitration | `tier_1` | `candidate` |
| `SOV-004` | **Epistemic Humility (Naming the Gap)** | `directly_observable` | Explicitly stating "I do not know" or identifying missing data rather than confabulating certainty. | Inaccessible facts probe | `tier_2` | `established` |

---

### Cluster 7: Sensitive & Vulnerability Indicators (PrivAI Governed)

*Strictly protected constructs requiring explicit user authorization under PrivAI purpose limitation.*

| ID | Name | PrivAI Tier | Operational Meaning | Permitted Uses | Prohibited Uses | Status |
|---|---|---|---|---|---|---|
| `SENS-001` | **Cognitive Fatigue Threshold** | `tier_0_sovereign_private` | Degradation of attention, precision, or patience under prolonged continuous session load. | Self-knowledge, health assistant, schedule pacing | Employer screening, performance gating | `candidate` |
| `SENS-002` | **Frustration Triggers** | `tier_0_sovereign_private` | Specific agent behaviors (e.g. repeated boilerplate, passive-aggressive refusals) causing sharp conversational friction. | Personal agent tuning, empathy adjustment | Behavioral manipulation, persuasion targeting | `candidate` |
| `SENS-003` | **Decision Fatigue Recovery Style** | `tier_1_restricted` | How the subject restores cognitive clarity (disengagement, changing topics, switching to physical realia). | Care team, personal coaching | Commercial marketing, surveillance | `candidate` |

---

## 4. Relationship to Downstream Packets

This registry operationalizes the bridge between the baseline audit and the implementation pipeline:

```text
#201 (Baseline Audit)
   │
   ▼
#202 (Measurement Contract) ◄───┐
   │                            │ (binds field-level constraints)
   ▼                            │
#203 (Construct Registry) ──────┴──► #204 (One-Shot Multi-Probe Prompt)
   │                                    │
   ▼                                    ▼
#206 (Schema & Invariant Parser) ◄── #205 (Frozen Test Harness)
   │
   ▼
#207 (Post-Capture UX) & #208 (PrivAI Freeze)
```

1. **For Prompt Designers ([#204](https://github.com/JeanHuguesRobert/cogentia/issues/204))**:
   The prompt does not need to enumerate every construct in this document. Instead, it must deploy **probe families** (e.g. revision persistence, sycophancy test, dilemma arbitration, situational shift) that naturally elicit observations across these clusters.
2. **For Schema & Parser Engineers ([#206](https://github.com/JeanHuguesRobert/cogentia/issues/206))**:
   The parser must allow open-ended behavioral atoms while referencing registered construct IDs (`EMERG-*`, `HIST-*`, `PERS-*`, `SIT-*`, `DIL-*`) when the model explicitly identifies them.
3. **For Post-Capture Triangulation ([#207](https://github.com/JeanHuguesRobert/cogentia/issues/207))**:
   The registry provides the projection matrices to translate captured free-observations into comparative radar plots, Big Five scores, or specialized PrivAI profile exports.

---

## 5. Acceptance Evaluation for Issue #203

- [x] **Broad Candidate Space**: Covers historical 73 axes, modern personality/values models (Big Five, HEXACO, Schwartz), person-situation signatures (CAPS), value dilemmas, and emergent human-AI dynamics.
- [x] **Non-Taxonomic Hegemony**: Implements `large ontology, selective projection` — no single model is declared fundamental.
- [x] **Complete Metadata Schema**: Every construct incorporates id, description, observability, confounds, probe families, situations, sensitivity tier, derived frameworks, evidence base, and status.
- [x] **PrivAI Integration**: Encodes sensitivity tiers (`tier_0`, `tier_1`, `tier_2`) to prevent invasive surveillance and enforce purpose limitation.
- [x] **Acceptance Criteria Satisfied**: The registry is demonstrably broad enough that downstream prompt engineering ([#204](https://github.com/JeanHuguesRobert/cogentia/issues/204)) will not inherit the blind spots of the historical 73 indicators.
