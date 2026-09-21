---
title: "Interrogating Reality"
subtitle: "Operational method for probing, trace, observation, and correction"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-16"
last_modified_at: "2026-09-21"
version: "0.5"
status: "working-method"
language: "en"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "methodological-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/interrogating_reality.md"
language_peer: "research/interroger_le_reel.md"
related_documents:
  - "research/interroger_le_reel.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/principe_rossignol.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/triangulation_du_reel.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/traceabilite_des_actes.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/fable_experimentale.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/realite_operationnelle_et_reflexivite.md"
  - "../interaction_packets/architecture.md"
  - "reality_probe_selection.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/serendipity_as_epistemic_force.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/interactions_registry_and_multichannel_messaging.md"
provenance:
  origin_type: "repository"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "b7dac4a6aaeea1016dc3d1bf33261715fde6f3a2"
  origin_date: "2026-09-21"
  derived_from: []
review:
  status: "unreviewed"
  reviewed_by: []
---

# Interrogating Reality

## Language parity

This document and [Interroger le Réel](interroger_le_reel.md) are **co-sovereign language peers**.

Neither is a derived product of the other in the doctrinal sense. Each has document_role: source, its own canonical address, and equal authority for the method. They are intended to remain in **semantic lockstep**.

The English artifact was initially rendered from the already-existing French artifact. That historical production direction does **not** create an authority direction.

> **Translation history is provenance, not hierarchy.**

If the two language peers diverge materially, the divergence is synchronization debt to be reconciled explicitly. An agent MUST NOT silently privilege one language merely because it was written first, is easier to retrieve, or is closer to the agent's default working language.

The English peer is particularly useful to AI agents because it removes an implicit, repeated translation step from retrieval and reasoning. That can reduce terminology drift, preserve stable operational vocabulary across prompts and tools, improve cross-language retrieval, and make citations reproducible across agents. This operational usefulness does not make English semantically superior.

## Purpose

**Interrogating Reality** is a method for moving from uncertainty to a traceable observation when missing information can reasonably be obtained through interaction with the world, a person, an institution, or a system.

Canonical formula:

> **Do not ask the model to complete Reality when Reality itself can be asked to answer.**

The method does not assume that every answer is true or that every silence has a causal meaning. It organizes a corrigible loop: state a sufficiently precise question, perform the lightest probe capable of producing an informative response, preserve the trace, qualify the observation, then revise the state of knowledge.

~~~text
knowledge state K(t)
        ↓
falsifiable / discriminating question
        ↓
minimal probe
        ↓
interaction with Reality
        ↓
raw trace
        ↓
qualified observation(s)
        ↓
K(t+1)
        ↓
continue | triangulate | stop
~~~

## 1. Position in the Corpus

The method is not an isolated doctrine. It operationalizes several existing principles:

- **Rossignol**: build a point where Reality can answer differently from what was expected;
- **Triangulation of Reality**: confront several access paths and several competing hypotheses;
- **Traceability of Acts**: preserve the act, its response, and negative traces without turning the anomaly into an explanation;
- **Experimental Fable**: turn an intuition into a hypothesis and then into a modest, reversible, documented experiment;
- **Interaction Packets**: give the interaction and its follow-up a durable, reusable form.

Interrogating Reality therefore mainly describes **the active acquisition cycle** that connects these components.

## 2. Two regimes: passive observation and active probe

### 2.1 Passive observation

When the trace already exists:

~~~text
search
→ retrieve
→ verify provenance and date
→ compare
→ qualify
~~~

Examples: public document, decision, registry, statistic, already-received correspondence, Git history.

### 2.2 Active probe

When the information is missing but a person or system can reasonably answer:

~~~text
question
→ target capable of answering
→ proportionate channel
→ minimal request
→ response / qualified absence
~~~

Examples: request a copy of a cited but unpublished document, ask whether a document still exists, identify who holds it, request a bounded factual clarification.

## 3. Prior: write down what is known before probing

A useful probe begins with an **explicit prior**. It can be very short:

~~~yaml
prior:
  statement: "The public report mentions a written contribution but does not reproduce it."
  evidence_ref: "public source"
  confidence: "high"
  unknown: "Is the complete contribution still available and communicable?"
~~~

The prior prevents retrospective rewriting of the initial state so that it appears to match the answer received.

## 4. Good probe

A probe is good when it is:

- **targeted**: it asks an identifiable question;
- **informative**: several possible answers would materially change the map;
- **proportionate**: cost and nuisance are low relative to the information sought;
- **non-leading when possible**: it does not force the expected answer and, when this matters, avoids needlessly revealing the investigation's internal categories or discriminants;
- **traceable**: target, date, channel, content, and response can be recovered;
- **reversible / corrigible**: a formulation error can be corrected without disproportionate damage;
- **simple**: the sophistication of the investigation must not contaminate the simplicity of the experiment.

> **The sophistication of the investigation should remain behind the simplicity of the probe.**

## 5. Minimal probe unit

A campaign may represent each probe as a small object:

~~~yaml
probe:
  id: probe:...
  campaign: ...
  question: ...
  prior_claim: ...
  prior_evidence: ...
  target: ...
  channel: email | form | phone | public-record | other
  status: planned | drafted | sent | answered | closed
  sent_at: null
  response_due_at: null
  parent_probe: null
  interactions: []
  observations: []
  next_action: null
~~~

This schema is conceptual: when an existing Interaction Packet is sufficient, do not create a competing format. A probe may be a projection or lightweight extension of the interaction registry.

## 6. Minimal response taxonomy

An interaction may produce one or more distinct observations:

~~~text
document_received
existence_confirmed
existence_unknown
possession_confirmed
possession_denied
communication_refused
partial_response
redirected
clarification_received
contradiction_detected
silence_observed
delivery_failed
~~~

Avoid shortcuts: a response may confirm a document's existence while refusing communication; a redirect may be useful without answering the substance; a received document may contradict the prior.

## 7. Discipline of silence

Silence is a bounded observation:

~~~text
no response observed
after a specified request
addressed to a specified target
through a specified channel
for a specified duration
~~~

It does not automatically mean:

~~~text
refusal
absence of the document
bad faith
concealment
fault
coordination
~~~

Formula:

> **Observed silence ≠ established cause of silence.**

A negative trace may nevertheless justify a continuation: one follow-up, another channel, another holder, a more precise request, or closure.

## 8. Competing hypotheses and escalation

After an anomaly, preserve several explanations until traces discriminate among them. Practical scale:

~~~text
noise / material error
→ misunderstanding
→ wrong channel / wrong holder
→ disorganization / siloing
→ inertia
→ negligence / systemic incentive
→ deliberate behavior
→ coordination between actors
~~~

This is not a mandatory sequence: direct evidence may immediately establish a stronger level. Without such evidence, the next probe should seek to **reduce the explanation space**, not confirm the preferred hypothesis.

## 8A. Graded counterfactual inference

Interrogating Reality favors situations in which the world can actually produce a new trace. Some objects, however, are **counterfactual by nature**: the actual world cannot directly show what would have happened if a past bifurcation had gone differently.

That observational limit does not justify automatic agnosticism.

> **Unobservable ≠ unknowable.**

> **Uncertain ≠ all hypotheses are equally plausible.**

A counterfactual can be **strongly constrained** when several observable conditions converge:

- the agent explicitly pursued the branch in question;
- the agent had the practical capability to take it;
- an identifiable, nearby bifurcation selects between branches;
- prior behavior or commitments make continuation coherent;
- competing alternatives are known or can be bounded.

Confidence should decrease with causal distance:

~~~text
near bifurcation + converging traces
→ strongly constrained counterfactual

additional intermediate links
→ increasing uncertainty

long cascade of descendants
→ weaker hypothesis, even when still informative
~~~

Reality can still be probed **around** the counterfactual: expressed intent, material capability, access conditions, the bifurcation decision, comparators, alternatives, and intermediate consequences. Such probes do not make the unrealized world observable; they narrow the space of scenarios compatible with the traces.

The discipline therefore avoids two symmetric errors:

~~~text
free fiction
≠
constrained counterfactual inference
≠
defensive agnosticism
~~~

A rigorous method does not turn plausibility into certainty; neither does it erase a real difference in plausibility supported by evidence.

## 9. Parallelism and proportionality

There is no arbitrary universal ceiling on the number of parallel probes.

~~~text
investigative capacity
→ permits parallelism

proportionality
→ limits nuisance per target and per channel
~~~

Rule:

> **Proportionality limits nuisance, not knowledge.**

Several independent holders may therefore be queried in parallel when that increases discriminating value. By contrast, multiplying identical follow-ups to the same person without new information degrades the method.

A local policy may, for example, limit unanswered follow-ups or require stopping after an explicit refusal.

## 10. From response to knowledge

Do not copy the respondent's formulation directly into the map as canonical truth.

~~~text
raw response
→ trace
→ directly observable facts
→ qualified observations
→ open questions
→ competing hypotheses
→ triangulation
→ map update
~~~

A holder's statement is a trace of what the holder states; a transmitted document may establish more; absence from their archives does not necessarily establish historical nonexistence.

## 11. Relationship to Interaction Packets

Interaction Packets are the natural support for probes when the interaction is consequential or must be followed over time.

~~~text
probe
  ↓
interaction packet
  ├── request
  ├── channel / external ids
  ├── response(s)
  ├── attachments / references
  ├── disclosure
  └── follow-up
       ↓
observation(s)
       ↓
Twin / Atlas / case file / other projection
~~~

Method and living traces remain separate: the generic method lives in Cogentia; live traces remain with the subject or case to which they belong.

## 12. Minimal pre-emission test

Before an external probe, ask:

~~~text
1. What exact information is missing?
2. What public trace establishes the prior?
3. Is this target capable of answering?
4. What is the smallest question that genuinely discriminates?
5. Which possible answers would change the map?
6. How will I record a partial response, refusal, or silence without overinterpreting it?
7. Could another independent target provide low-cost triangulation?
8. Does the wording reveal the answer, event, category, or discriminant I am specifically trying to observe?
9. Can I remove information without making the request unintelligible?
10. Would a more open first probe preserve a more independent response or an unanticipated discovery?
~~~

## 13. Abstract example

~~~text
Public trace: "written contribution X" cited but not attached
        ↓
Unknown: is the full text available?
        ↓
Probe A: ask the secretariat that received it
Probe B: ask the author who produced it
        ↓
A replies "not retained"; B transmits the document
        ↓
Observations:
- institutional possession not established / declared absent
- existence and content established by the author's source copy
        ↓
Map corrected
~~~

The divergence between A and B is not a failure: it produces exactly the information passive research did not provide.

## 14. Canonical formulas

> **Do not ask the model to complete Reality when Reality itself can be asked to answer.**

> **Reality's response is an observation before it is an explanation.**

> **Tracing an anomaly is not explaining its cause.**

> **A good probe reduces the hypothesis space; it does not make Reality confess what we already believed.**

> **Proportionality limits nuisance, not knowledge.**

## 15. Transform without breaking the chain of evidence

A probe is useful only if the knowledge it produces remains connected to what produced it. The method therefore adopts an invariant of **traceable non-loss**:

> **A transformation may simplify, project, aggregate, or reformat information; it must not silently erase what it does not understand.**

~~~text
Reality
 ↓
raw trace
 ↓
Packet
 ↓
projection
 ↓
analysis
 ↓
provisional conclusion
~~~

Each layer should permit return to the traces that produced the next layer.

Two requirements are distinct:

1. **semantic non-loss**: information omitted from a projection survives transformations and writes against a simplified view;
2. **historical non-loss**: relevant previous states remain addressable or reconstructible.

A transformation may therefore be locally destructive without being globally destructive, provided it preserves a durable reference to the richer object from which it derives.

This rule joins the [Packet-Backed Projection](../patterns/packet-backed-projection/PATTERN.md) pattern: SQL columns, summaries, public views, Atlases, or Twin states may be poorer projections than their source without their poverty becoming information destruction.

For an important transformation, preserve when relevant:

~~~text
input_ref
input_hash
transformation
transformation_version
output_ref
output_hash
performed_at
actor / agent
~~~

Operational formula for agents:

> **An agent may produce a simpler view; it must never confuse simplification with erasure of the source.**

## 16. First dogfood campaign

First structured application: reconstructing the published and unpublished preparatory corpus around parliamentary work on the institutional evolution of Corsica (2024–2026), especially written contributions, questionnaires, and working documents that are cited but not fully published.

The campaign file lives with its territorial subject in barons-Mariani/research/autonomia/, while the method remains here in Cogentia.

## 17. Epistemic shielding and serendipity aperture

A probe can be grammatically neutral while still being cognitively suggestive.

The risk is not limited to **answer suggestion**. An investigator may leak parts of the internal map into the probe itself and thereby shape the observation. Relevant forms include:

~~~text
answer leakage
    suggesting the expected answer

event leakage
    suggesting that a particular event occurred

category leakage
    imposing the investigator's own categories

causal leakage
    introducing a hypothesized causal relation

salience leakage
    revealing, through wording, order, contrast or repetition,
    what the investigator considers important
~~~

Working term:

> **Epistemic leakage** is the projection into a Reality Probe of elements from the investigator's internal representation that may structure the response being observed.

This extends the earlier requirement that a good probe be non-suggestive. A probe may avoid an explicit leading question and still disclose the ontology, chronology, causal frame or discriminant that the investigator hopes to recover.

### 17.1 Rich map, sparse probe

The investigator may and often should maintain a rich private prior:

~~~text
known traces
candidate chronologies
competing hypotheses
expected discriminants
counter-hypotheses
unknowns
~~~

That richness need not be exported into the probe.

> **The map may be rich; the probe should remain sparse.**

A compact form is:

> **Know richly. Ask sparsely. Compare afterwards.**

The prior is not discarded. It is frozen before the probe and used **after** the response to evaluate which elements appeared independently.

### 17.2 Hide the discriminant without falsifying Reality

When awareness of the investigator's intent could change the response, it can be useful to **mask the discriminant**.

Permissible techniques may include:

- free recall before targeted questioning;
- several truthful and comparable contextual topics;
- controlled variation in question order;
- symmetric questions whose wording does not single out the target hypothesis;
- low-cost positive or negative controls when they have genuine epistemic value.

This may be described as **probe blinding** or **controlled contextual noise**. It must not rely on fabricated facts, false memories or deceptive premises.

> **Hide the discriminant; do not falsify Reality.**

A separate privacy doctrine may permit a private respondent, in bounded circumstances, to protect a legitimate private boundary through defensive opacity or even defensive deception. That does **not** authorize the investigator to seed false facts, fabricated memories or deceptive premises into a Reality Probe. These are different roles and duties:

~~~text
respondent protecting a legitimate private boundary
    → privacy ethics

investigator trying to obtain evidence
    → probe-integrity discipline
~~~

The first concerns what a person may legitimately withhold or protect. The second concerns whether the observation has been contaminated by the investigator.

The purpose is not to manipulate the respondent into a preferred answer. It is to reduce the amount of information the probe itself gives away about what the investigator is trying to observe.

### 17.3 From open recall to explicit recognition

For human-source probes, a useful progression is:

~~~text
P0 — free recall
     minimal investigator framing
     maximal opportunity for spontaneous recall

P1 — broad, balanced themes
     controlled contextual noise

P2 — targeted discriminating questions
     narrower Possible Space

P3 — explicit recognition
     "Do you remember X?"
     high targeted discrimination,
     but known contamination
~~~

Evidence obtained at these stages should retain its elicitation provenance.

A fact recalled spontaneously at P0 is not epistemically equivalent to a fact merely recognized after explicit suggestion at P3.

### 17.4 Serendipity aperture

A probe optimized too tightly for a known question can prevent discovery that the question itself was incomplete, misframed or aimed at the wrong object.

A probe may therefore preserve a **serendipity aperture**: enough freedom for Reality to produce a high-value observation that was neither queried nor anticipated.

~~~text
low aperture
    closed yes/no probe
    strong targeted discrimination
    little room for unknown unknowns

medium aperture
    bounded domain, open response

high aperture
    free description / free recall
    weaker control, stronger opportunity for unanticipated attractors
~~~

The useful aperture depends on cost, risk, human attention, contamination risk and the expected value of unplanned discovery.

Invariant:

> **Do not design a probe so narrowly that Reality can answer only the questions we already know how to ask.**

### 17.5 Dual yield

After processing a probe, distinguish:

~~~text
targeted_yield
    what was learned about the uncertainty that motivated the probe

serendipity_yield
    what was learned that was not being sought
~~~

A serendipitous observation is not automatically important or true. It is an **unqueried attractor candidate** to be qualified, traced and, when valuable, tested by its own Reality Probe.

### 17.6 Epistemic leakage audit

Before emitting a consequential human-source probe, ask:

~~~text
- Did I reveal the answer I hope to obtain?
- Did I reveal an event whose existence I am trying to verify?
- Did I impose my own analytical categories on the source?
- Does wording, order or contrast reveal the true discriminant?
- Can I remove information without making the request unintelligible?
- Would free recall or a broader first probe produce a more independent observation?
- Is there enough aperture for Reality to surface something I did not anticipate?
~~~

Compact formula:

> **Know richly. Ask sparsely. Mask the discriminant when needed. Preserve an aperture for surprise. Compare afterwards.**

The response of Reality should be able not only to confirm or reject the current map, but also to expose what the map failed to contain.
