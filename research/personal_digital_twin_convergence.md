---
title: "Personal Digital Twin Convergence Note"
subtitle: "Coupling, validation, authority, and counterfactual exploration"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-08-12"
status: "source note — surgical integration bridge"
version: "0.1"
license: "CC BY-SA 4.0"
language: "en"
repository: "cogentia"
canonical_path: "cogentia/research/personal_digital_twin_convergence.md"
document_role: "source"
document_kind: "research-note"
visibility: "public"
lifecycle_state: "working"
related_research:
  - cogentia/research/cogentia-digital-twin.md
  - cogentia/research/digital_twin_trust_model.md
  - cogentia/research/individual_and_collective_digital_twins.md
  - cogentia/research/digital_twin_ubiquity.md
  - barons-Mariani/research/potentics.md
provenance:
  origin_type: "literature-convergence review"
  origin_date: "2026-08-12"
  derived_from:
    - "ScienceDirect LeapSpace — Personal digital twin technology, generated 2026-08-12"
review:
  status: "unreviewed"
  reviewed_by: []
update_policy: "UP-DEFAULT-REVIEWED"
---

# Personal Digital Twin Convergence Note

## 1. Purpose

This is a compact integration note, not a new competing definition of the Cogentia Digital Twin. Its purpose is to record a useful convergence between the existing Cogentia corpus and the recent Personal/Human Digital Twin literature, and to identify three surgical consequences for the corpus:

1. distinguish **coupling level** from the epistemic/architectural role of an artefact;
2. separate **Fidelity**, **Trust**, and **Authority** as independent axes;
3. connect strict digital-twin counterfactual capability to **Potentics / Rational Exploration of The Possible**.

The triggering literature synthesis reports a tightening use of *personal digital twin*: increasingly, the term denotes an individualized, dynamically updated, predictive representation with an ongoing link to the represented person, rather than a static avatar, profile, or one-off simulator. It also reports a recurring distinction between digital model, digital shadow, and digital twin based primarily on synchronization and coupling over time.

Cogentia converges with that tightening while making a stronger architectural claim: the continuity of a sovereign twin cannot be reduced to the current model, runtime, agent, index, or platform.

```text
Twin ≠ model
Twin ≠ agent
Twin ≠ corpus alone
Twin ≠ one running instance
Twin ≠ platform
```

The owner-rooted continuity instead resides in the governed relation among subject, corpus, structural signature, interpretive structures, mandates, lineage, provenance, traces, correction, revocation, and portability.

## 2. Two orthogonal taxonomies

Recent digital-twin taxonomies commonly use a coupling ladder:

```text
digital model  -> representation without ongoing coupling
digital shadow -> one-way or partial updating
digital twin   -> continuous updating, often bidirectional coupling
```

Cogentia already uses another distinction:

```text
raw archive     -> undifferentiated trace
governed corpus -> versioned, attributable, contestable source substrate
RAG index       -> semantic projection over canonical sources
digital twin    -> governed interpretive structure operating on a corpus
free simulation -> unconstrained generation
```

These classifications must **not** be merged. They answer different questions:

- the model/shadow/twin axis asks **how strongly and continuously the representation is coupled to the represented entity**;
- the archive/corpus/RAG/twin/simulation distinction asks **what epistemic and architectural role the object plays**.

A RAG index may be refreshed continuously and still not become a twin. A governed twin may temporarily operate with delayed synchronization and still remain the same owner-rooted twin, while its instance must disclose reduced freshness or fidelity.

This distinction prevents a category error: synchronization is necessary to characterize *twinning depth*, but synchronization alone does not create governed identity, mandate, sovereignty, provenance, or interpretation.

## 3. Closed loop and the Cogentia feedback cycle

The recent literature increasingly treats the operational closed loop as central:

```text
data acquisition
-> model update
-> simulation / analysis
-> recommendation or action
-> monitoring
-> new data
```

Cogentia generalizes this beyond healthcare:

```text
governed corpus
-> interpretation
-> proposal / simulation / action under mandate
-> trace
-> observed result
-> correction
-> corpus
```

This is compatible with the broader corpus doctrine of iterative action, observation, correction, and useful failure. A twin is therefore not merely a model *about* its principal; it is a governed participant in a feedback process whose own outputs and errors return to the corpus as traceable evidence.

## 4. Fidelity ≠ Trust ≠ Authority

The literature's validation gap exposes a distinction that should become explicit in Cogentia.

### Fidelity

**Question:** how well does the twin represent the principal for the task and domain claimed?

Possible evidence includes calibration against observed behavior, longitudinal stability, drift measurement, prospective prediction, counterfactual performance, and explicit uncertainty.

### Trust

**Question:** how much justified confidence has accumulated that the twin behaves dependably under stated conditions?

Trust is developmental and empirical. It grows through sourced retrieval, successful tasks, correction, dry-runs, reversibility, disclosure of uncertainty, and owner feedback.

### Authority

**Question:** what is this instance permitted to do?

Authority derives from mandate, maturity profile, capability policy, risk class, and revocability. It does **not** derive from representational fidelity.

Core invariant:

```text
Fidelity ≠ Trust ≠ Authority
```

and, preserving the existing rule:

```text
Fidelity is not authority.
```

A high-fidelity twin can be consultative and powerless. A lower-fidelity operational agent can hold a narrow but real mandate. The dangerous configuration is not fidelity itself but **high fidelity + broad weakly governed authority + poor traceability**.

A future instance should therefore be able to expose at least:

```yaml
validation:
  fidelity_claim: "..."
  domain: "..."
  evidence: []
  calibration_date: "..."
  uncertainty: "..."
  known_failures: []
  drift: "..."

trust:
  maturity_profile: "..."
  evidence: []

authority:
  mandate_id: "..."
  capability_profile: "..."
  revocable: true
```

## 5. Counterfactual capability and Potentics

A strict strand of the Personal/Human Digital Twin literature requires more than individualized initialization and dynamic updating: it also expects the ability to simulate **counterfactuals**.

That requirement creates a direct bridge to Potentics.

A Cogentia Digital Twin should eventually be able to distinguish three layers:

```text
1. observed principal
   evidence about what the principal actually said, did, preferred, or decided

2. inferred structure
   revisable structural signatures, heuristics, preferences, constraints, and patterns

3. counterfactual projection
   what the governed model predicts under conditions that have not occurred
```

The third layer is not biography and must never be written back as observed fact.

A useful counterfactual output therefore has the form:

```yaml
counterfactual:
  scenario: "..."
  corpus_cutoff: "..."
  assumptions: []
  inferred_invariants: []
  predicted_response: "..."
  uncertainty: "..."
  status: "simulation_not_observation"
```

This turns the twin into an instrument for the **Rational Exploration of The Possible** without confusing simulation with the person.

In Potentics terms, a twin can help explore how potentialities change under alternative actions, environments, constraints, mandates, or information states. The twin becomes a scenario instrument for estimating and testing possible trajectories, while provenance preserves the boundary between actual traces and hypothetical projections.

## 6. Validation as an explicit research programme

Recent reviews repeatedly report that validation, benchmarking, interoperability, uncertainty treatment, and long-term evidence lag behind the ambition of Personal/Human Digital Twins. Cogentia should treat this not as a secondary implementation concern but as a research programme.

Minimum questions:

- What claims of fidelity are being made, and for which domain?
- Against what ground truth can each claim be tested?
- How stable are results across time, models, providers, and prompt/runtime changes?
- How is drift detected?
- How are confidence and uncertainty exposed rather than hidden behind fluent output?
- Which counterfactual predictions can later be compared with actual outcomes?
- Can negative results and failures be conserved as calibration evidence?

The last point creates a particularly strong bridge with Potentics: a failed prediction, if preserved with its assumptions and evidence, is not wasted output. It updates the estimate of the twin's fidelity and the explored potentiality.

## 7. Literature anchors

Useful anchors surfaced by the 2026-08-12 LeapSpace synthesis include:

- Drummond, D. & Gonsard, A. (2024), *Definitions and Characteristics of Patient Digital Twins Being Developed for Clinical Use: Scoping Review*, JMIR, DOI `10.2196/58504`.
- Tudor et al. (2025), *A scoping review of human digital twins in healthcare applications and usage patterns*, npj Digital Medicine, DOI `10.1038/s41746-025-01910-w`.
- Lin et al. (2024), *Human digital twin: a survey*, Journal of Cloud Computing, DOI `10.1186/s13677-024-00691-z`.
- Gaffinet et al. (2025), *Human Digital Twins: A systematic literature review and concept disambiguation for industry 5.0*, Computers in Industry, DOI `10.1016/j.compind.2024.104230`.
- Vallée et al. (2026), *Digital twins in fertility, assisted reproductive technology and pregnancy: a systematic review*, Reproductive BioMedicine Online, DOI `10.1016/j.rbmo.2025.105281`.
- Zhu & Yang (2025), *Towards human digital twin: Reviewing human modelling and simulation*, Journal of Industrial Information Integration, DOI `10.1016/j.jii.2025.100975`.
- de Kerckhove (2021), *The personal digital twin, ethical considerations*, Philosophical Transactions of the Royal Society A, DOI `10.1098/rsta.2020.0367`.

These references support convergence and research questions; they do not by themselves validate Cogentia's stronger claims about sovereignty, anti-capture, mandates, or multi-instance governance. Those remain contributions/hypotheses of the Cogentia corpus and must be presented as such.

## 8. Propagation rule

This note is an integration bridge. The intended surgical propagation is:

- `cogentia-digital-twin.md`: add the emerging model/shadow/twin coupling taxonomy and state that it is orthogonal to Cogentia's owner-rooted continuity;
- `digital_twin_trust_model.md`: make `Fidelity ≠ Trust ≠ Authority` explicit and add a minimal validation/uncertainty schema;
- `barons-Mariani/research/potentics.md`: add the counterfactual digital twin as an instrument for Rational Exploration of The Possible, with the invariant `simulation ≠ observation`.

Once those insertions are made and backlinks are generated, this note may remain as a literature-convergence record rather than become another canonical definition.
