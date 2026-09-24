---
title: "KYS Reality Capture — baseline audit of the 73-axis protocol and existing UX"
description: "Audit for cogentia#201: reconstructs the historical 73-axis one-shot Cogentiscope, its implemented UX and parser behavior, the later KYS Snapshot pivot, and the baseline constraints for KYS Reality Capture v0."
author: "OpenAI GPT-5.6 Sol, under mandate of Jean Hugues Noël Robert"
date: "2026-09-25"
version: "0.1"
status: "working"
document_role: "source"
document_kind: "audit"
visibility: "public"
lifecycle_state: "working"
license: "CC BY-SA 4.0"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/kys_reality_capture_baseline_audit.md"
related_issues:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/200"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/201"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/199"
provenance:
  origin_type: "working-session"
  origin_date: "2026-09-25"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "issue-201"
  derived_from:
    - "research/cogentia_prompt_v1.md"
    - "research/kys-prompt.md"
    - "apps/personal/samples/cogentigram_author.json"
    - "research/cogentigram_jhn_march_vs_open_2026-08.md"
    - "research/kys_mvp_entry.md"
    - "research/kys_profile_privacy_and_public_specialized_profiles.md"
    - "research/cogentigram_for_agent_jhn_fidelity.md"
    - "apps/personal/src/pages/Snapshot.jsx"
    - "apps/personal/src/pages/Submit.jsx"
    - "apps/personal/src/pages/Results.jsx"
    - "apps/personal/src/components/PresentationPanel.jsx"
    - "apps/personal/src/components/FeedbackWidget.jsx"
    - "apps/personal/netlify/lib/parseCogentia.js"
    - "apps/personal/netlify/functions/process-analysis.js"
review:
  status: "awaiting human arbitration"
  reviewed_by: []
update_policy: "UP-DEFAULT-REVIEWED"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# KYS Reality Capture — baseline audit of the 73-axis protocol and existing UX

## 0. Purpose and scope

This document is the durable audit artifact for [cogentia#201](https://github.com/JeanHuguesRobert/cogentia/issues/201), child packet of [#200 — KYS Reality Capture v0](https://github.com/JeanHuguesRobert/cogentia/issues/200).

Its purpose is not to decide the new measurement contract or write the next prompt. It reconstructs what already exists so the new work does not lose useful mechanisms, repeat known mistakes, or silently rewrite historical evidence.

The audit covers four successive uses of the same broad idea:

1. **historical one-shot measurement** — the March 2026 73-axis Cogentia prompt;
2. **implemented advanced UX** — ingestion, scoring, projections and feedback around those 73 axes;
3. **KYS Snapshot pivot** — a smaller local-first, contestable mirror introduced in July 2026;
4. **operational reuse** — the historical structural profile later used as input to Agent JHN fidelity dogfood.

The key baseline conclusion is:

> The historical system had the breadth and multi-map post-processing that the future KYS Reality Capture needs, while the current Snapshot has the governance, contestability and local-first acquisition model that it needs. The new design should combine both, without carrying forward uncalibrated psychometric claims, lossy parsing, or premature collapse of multiple observations into one score.

---

## 1. Historical acquisition: Cogentia prompt v1.0

### 1.1 The original UX was already one-shot

`research/cogentia_prompt_v1.md` explicitly describes the protocol as one-shot: the person copies one prompt into their habitual AI agent and receives one structured JSON response.

The prompt makes the central architectural choice explicit:

```text
habitual conversational agent = measurement instrument
user = subject
Cogentia/PrivAI = downstream laboratory / interpreter
```

This remains a strong baseline. It exploits a representation already accumulated through ordinary interaction rather than asking the person to complete a new conventional questionnaire from scratch.

### 1.2 The prompt already collected instrument metadata

Before asking for scores, v1.0 asked the agent to identify:

- provider / agent name;
- exact model when known;
- platform;
- custom or fine-tuned status;
- estimated number of exchanges;
- persistent-memory availability and richness;
- main topics;
- interaction depth;
- observed recurrent patterns;
- salient traits;
- blind spots;
- global confidence and rationale.

This is methodologically valuable because it acknowledges that the observation depends on the instrument and on the accessible human–agent history.

### 1.3 The 73-axis layer mixed observation, constructs and derived scores

The prompt then requested 73 numbered outputs spanning:

- cognitive architecture;
- social interface;
- semiotics and language;
- axiology and arbitration;
- flow dynamics;
- derived scores;
- Cogentia+ extensions.

For each axis it requested:

```text
score       percentile 0–100
confidence  0–100
evidence    one short empirical rationale
```

It also required `score = null` when confidence was below 20.

This combination — score + uncertainty + evidence — is worth retaining conceptually. The problem is the interpretation of the score, not the existence of structured evidence and uncertainty.

### 1.4 The percentile claim exceeded the available calibration

The prompt instructed the agent to score against the “general adult population”, using the language of standardized psychometrics:

```text
50 = median
84 = +1 standard deviation
98 = +2 standard deviations
```

No empirical normative population, calibration sample, item-response model, or cross-model normalization process was supplied to the agent.

Therefore the historical value called a “percentile” is better understood as an **agent-produced relative judgment expressed on a percentile-like scale**, not an established population percentile.

The same problem applies to WAIS-like proxies and other derived psychometric labels. Their presence is historically useful, but the numerical semantics must not be inherited as if they had been validated.

---

## 2. The 59–73 divergence: a real instrument effect

### 2.1 What the prompt requested

In v1.0, ranks 59–65 were explicitly defined as derived scores:

- ICV proxy;
- IRF proxy;
- IVT proxy;
- E–S gap;
- fatigability slope;
- conversational entropy;
- multimodal synchronization.

Ranks 66–73 were Cogentia+ extensions such as epistemic curiosity, divergent creativity, risk relationship, functional perfectionism, learning style, decisional autonomy, emotional regulation and temporal orientation.

### 2.2 What the historical March fixture actually contains

`apps/personal/samples/cogentigram_author.json`, generated on 2026-03-03 by ChatGPT (`gpt-5-mini`) from 200+ deep exchanges, does not follow that requested tail.

Ranks 59–73 are instead fifteen `Flow Dynamics` axes:

```text
59  Synchronization Efficiency
60  Attention Reallocation
61  Environmental Adaptivity
62  Cognitive Redundancy
63  Temporal Consistency
64  Autonomy Index
65  Flow Sustainability
66  Information Bottleneck
67  Noise Resilience
68  Meta-Flow Awareness
69  Reflective Alignment
70  Decision Calibration
71  Resource Optimization
72  Outcome Consistency
73  Cognitive Sovereignty
```

The result is not merely a malformed response. Many of these axes are conceptually plausible and later became useful. That is precisely why the event matters: the instrument generated an alternative map which was then accepted into the corpus.

### 2.3 The parser allowed the divergence

`apps/personal/netlify/lib/parseCogentia.js` explains how this could happen.

The historical parser:

- required version `1.0`;
- required an `agent` object and an `indicators` array;
- accepted **65 or more** indicators;
- truncated arrays longer than 73;
- normalized score/confidence ranges;
- **did not validate that rank, name and category matched the 73 definitions in the prompt**.

It preserved the agent-returned `rank`, `category` and `name` values.

Consequently, a response could carry `cogentia_version: "1.0"` while materially departing from the v1.0 ontology and still be accepted as valid.

The code comment described the version check as an “integrity” check, but a version string alone did not verify that the prompt had been followed.

### 2.4 Candidate anti-pattern: instrumental fossilization

This historical sequence is useful as a first regression fixture for KYS Reality Capture:

```text
prompt specifies map A
→ agent emits plausible map B
→ permissive parser accepts B
→ B is stored and visualized
→ later work reuses B as a baseline
→ B acquires corpus authority through continued reuse
```

A provisional name for this failure mode is **instrumental fossilization**.

The lesson is not “reject every unexpected dimension”. Unexpected structure may be valuable. The lesson is to preserve the distinction:

```text
requested ontology
≠ observed agent output
≠ accepted normalized representation
≠ later canonical interpretation
```

Unexpected dimensions should be retained as evidence, not silently assimilated into the ontology the prompt allegedly measured.

---

## 3. Historical advanced product UX

### 3.1 Acquisition paths

The historical `apps/personal` advanced path supported three collection methods in `Submit.jsx`:

- automatic conversation retrieval from a shared URL;
- direct paste of the agent response;
- import of a `.json` or `.txt` file.

Even in paste/file mode, the implementation required a conversation URL. That requirement is unnecessary for the future one-shot copy/paste model and was later explicitly rejected by the Snapshot MVP.

### 3.2 Backend processing

`process-analysis.js` parsed and normalized the response, wrote analysis metadata to Supabase, stored indicator scores and launched presentation generation.

A critical baseline finding is that the field named `raw_json` was assigned the **already parsed and normalized object**:

```text
raw_json: parsed
```

It was not an immutable byte-for-byte preservation of the original agent response.

Because the parser could truncate surplus indicators and sanitize evidence before this write, information could be lost before the object called “raw” was stored.

This is a direct requirement for KYS-RC-06: future `RawMeasurement_t0` must be preserved separately from every parsed or normalized projection.

### 3.3 Results UX

The historical `/results/:id` view provided substantial analytical richness:

- agent/model metadata;
- agent-declared confidence and reliability;
- radar by broad category;
- top five high-scoring traits;
- detail of all 73 indicators;
- derived-score presentation;
- per-axis confidence/evidence;
- feedback from the person.

This progressive drill-down is useful and should inform KYS-RC-07.

### 3.4 Overclaim in reliability wording

The historical UI mapped the agent's declared reliability to user-facing statements including:

> “Ce profil a une forte valeur psychométrique.”

That statement was stronger than the available evidence. A rich conversational history may increase observational coverage, but it does not by itself establish standardized psychometric validity.

Future UX should distinguish at least:

```text
coverage of available history
agent confidence
probe convergence
predictive validation
external psychometric calibration
```

These are not interchangeable notions of reliability.

### 3.5 Multiple maps were already implemented

`PresentationPanel.jsx` exposed several views derived from the same 73 source indicators:

- Cogentia raw;
- Big Five;
- MBTI;
- DISC;
- Enneagram.

`presentationMappings.js` computed these deterministically from weighted combinations of the 73 axes. `generatePresentations.js` then asked Claude to produce short narratives for each representation.

This implementation contains an important idea worth preserving:

> one captured source can support multiple later maps.

But the future UI should make the derivation explicit. These frameworks are **projections of one source measurement**, not independent confirmations of the person.

The additional Claude narrative is another map transformation and should carry its own provenance instead of appearing as a transparent rendering of the source.

### 3.6 Human feedback was present but coarse

`FeedbackWidget.jsx` asked the user how much the profile resembled them on a five-point scale and, for lower ratings, which indicator ranks seemed inaccurate.

This established an important principle: the person may contest the agent-produced representation.

However, “does this resemble me?” collapses several distinct cases:

- wrong observation;
- right observation but wrong generalization;
- behavior valid only in one context;
- behavior valid only during one period;
- correct but private information;
- construct or projection rejected despite valid source observations.

The future annotation layer should preserve those distinctions.

---

## 4. The July 2026 KYS Snapshot pivot

### 4.1 Deliberate retreat from pseudo-precision

`research/kys_mvp_entry.md` explicitly removed from the entry product:

- the historical 73 indicators;
- uncalibrated percentiles / standard deviations;
- IQ- or WAIS-like scores;
- psychological diagnosis;
- MBTI, DISC and Enneagram by default;
- third-party generated narratives;
- automatic conversation-URL retrieval;
- mandatory account creation.

This was not abandonment of Cogentia. It was a product-level correction toward a safer epistemic primitive: make the agent's representation visible and contestable before claiming a full Cogentigram.

### 4.2 Current visible UX

The current navigation exposes `/snapshot` as “Mon miroir”; the old advanced routes remain in the code but are explicitly marked historical and hidden from primary navigation.

The Snapshot flow is:

```text
choose habitual agent
→ copy short prompt
→ paste prompt into that agent
→ copy one JSON response
→ paste response into KYS
→ parse locally
→ inspect claims
→ annotate claims
→ export personal draft
```

The prompt asks for five understandable categories:

- what the agent thinks it knows;
- what it infers;
- recurring topics;
- working style;
- unknowns.

It limits each category to five claims and uses qualitative confidence (`high`, `medium`, `low`).

### 4.3 Strong governance gains

The Snapshot MVP adds several mechanisms that should survive into Reality Capture:

- no connection to the agent account;
- no conversation URL;
- no raw conversation upload;
- local browser parsing;
- explicit separation of known / inferred / unknown;
- per-claim basis and confidence;
- human verdicts;
- `Ne pas conserver` as a direct user control;
- local draft storage;
- exportability;
- explicit statement that the result is not a certified KYS Profile.

The four current verdicts are:

```text
accepted
nuanced
rejected
private
```

This is a substantial improvement in contestability and person control.

### 4.4 The correction loop should not define the future storage model

The current Snapshot builds a second prompt from the user's verdicts and asks the habitual agent to produce a corrected JSON representation.

That is useful as an autonomy exercise, but it is not sufficient as the future scientific record. If the corrected output replaces the first one, we lose the historical distinction between:

```text
what the agent originally reported
and
what the person later corrected
```

For KYS Reality Capture, the first response should instead remain immutable and human corrections should be stored as a distinct annotation layer.

### 4.5 The current Snapshot also does not retain the true raw response

In `Snapshot.jsx`, the pasted response is parsed and normalized into `snapshot`, then local storage receives:

```text
{ snapshot: parsed, reviews: {} }
```

The export similarly serializes the normalized claims and reviews. The original pasted text is not included in the durable draft/export.

Therefore both historical generations share the same important gap in different forms:

> the system privileges a normalized representation over preservation of the original measurement event.

KYS-RC-06 should correct this.

---

## 5. August operational reuse: not an independent replication

The March fixture was later updated into `research/cogentigram_jhn_public_open.json` for Agent JHN dogfood.

`research/cogentigram_jhn_march_vs_open_2026-08.md` records the August method explicitly as:

```text
update_from_prior_cogentigram_plus_public_corpus_inference
```

with a conservative rule to keep prior scores unless public corpus evidence strongly justified a bump.

The resulting comparison shows:

- 73/73 axes preserved;
- 66 scores unchanged;
- 7 scores increased by exactly +1;
- 0 confidence values changed;
- 13 evidence strings rewritten.

This is evidence of continuity under an update procedure, **not an independent second measurement by Grok**.

The distinction matters for future triangulation. Reprocessing one map through another model is not equivalent to independently probing the same underlying evidence.

The updated profile became operational input to Agent JHN through a stack including:

```text
mandate subset
+ agent brief
+ specialized KYS answer-style capsule
+ compressed top-N structural Cogentigram
+ public corpus facts
```

That operational reuse is valuable because it creates a possible Reality Test: does a structural representation improve held-out behavioral or stylistic fidelity? But the historical scores should remain baseline evidence, not be retroactively promoted to validated ground truth.

---

## 6. KYS/PrivAI governance already supplies the disclosure architecture

`research/kys_profile_privacy_and_public_specialized_profiles.md` establishes a strong doctrine that the new capture should reuse:

```text
full structural Cogentigram = private by default
specialized KYS Profile = purpose-scoped projection
deliberate public dogfood = explicit exception
```

A specialized profile answers two separate questions:

1. **share what?**
2. **use for what?**

This means the future Reality Capture may be broad and privately rich without implying broad disclosure.

The baseline therefore supports the direction:

```text
measure broadly
preserve richly
infer conservatively
disclose selectively
```

The future schema should also distinguish rights over derived inferences, not only raw observations.

---

## 7. What should be retained

The following mechanisms have demonstrated enough value to remain explicit requirements unless later Reality tests falsify them.

### Acquisition

- one-shot copy/paste into the habitual conversational agent;
- provider neutrality;
- no requirement to expose the raw conversation;
- agent self-identification and declaration of accessible context;
- structured machine-readable response;
- explicit unknowns rather than forced completion.

### Measurement discipline

- evidence attached to claims;
- uncertainty/confidence attached to claims;
- instrument blind spots;
- broad coverage when the historical agent state is non-repeatable;
- preservation of unexpected output rather than silent deletion.

### User control

- local-first entry flow;
- human contestability;
- private / do-not-retain control;
- exportability;
- specialized purpose-scoped profiles rather than automatic full-profile sharing.

### Post-capture analysis

- progressive disclosure instead of dumping hundreds of fields at once;
- multiple alternative maps from one preserved source capture;
- ability to compare high-level views with lower-level evidence;
- longitudinal comparison when a later independent capture genuinely exists.

---

## 8. What should be retired or reinterpreted

### Retire as factual claims

- “percentile versus general adult population” without empirical calibration;
- standard-deviation language without a reference distribution;
- WAIS-like or diagnostic interpretation from conversational inference alone;
- “strong psychometric value” inferred merely from conversation depth;
- `prompt_verified = true` based only on a version field.

### Retire as acquisition requirements

- mandatory shared-conversation URL;
- arbitrary server-side fetch of conversation URLs;
- mandatory account for basic capture;
- a second agent call merely to rewrite the original measurement.

### Reinterpret

- historical 73 axes: **one map / historical construct set**, not the territory;
- Big Five / MBTI / DISC / Enneagram: **derived projections**, not independent validations;
- agent confidence: **instrument self-assessment**, not calibrated epistemic probability;
- “raw JSON”: must mean truly immutable raw capture, not normalized parsed data.

---

## 9. Historical fixtures that must remain unchanged

The following should be preserved as historical evidence and regression fixtures rather than retroactively corrected to match the theory we now prefer:

- `research/cogentia_prompt_v1.md`;
- `research/kys-prompt.md`;
- `apps/personal/samples/cogentigram_author.json`;
- `research/cogentigram_jhn_public_open.json`;
- `research/cogentigram_jhn_march_vs_open_2026-08.md`;
- the historical parser and advanced UX in Git history / current hidden routes as long as retained.

In particular, the 59–73 divergence in `cogentigram_author.json` should **not** be corrected in place. It is useful empirical evidence about model/protocol drift.

---

## 10. Baseline requirements handed to the child packets

### To #202 — Measurement contract

The contract should require explicit separation of:

```text
raw observation
derived inference
counter-evidence
unknown / missing coverage
circumstance
time / drift
instrument self-assessment
human annotation
rights / purpose
```

It should define the directly observed domain as the accessible human–agent interaction, with any transfer to the whole person treated as an explicit hypothesis.

### To #203 — Probe / construct coverage registry

The 73 historical axes belong in the registry as one historical map. They must not constrain discovery of additional atoms, situation variables, sensitive private dimensions or model-emergent candidates.

### To #204 — One-shot multi-probe prompt

The new prompt should retain one-shot UX while internally asking the same habitual agent to inspect its evidence through multiple deliberately different probes. Probe disagreement must remain visible in the output.

### To #205 — Frozen test harness

The historical 59–73 mismatch should become a regression test:

- can the new parser detect requested-schema drift?
- can it preserve unexpected dimensions without falsely certifying them as requested fields?
- can it retain both raw and normalized forms?

### To #206 — Capture schema and parser

At minimum preserve three layers:

```text
RawMeasurement_t0      immutable original response + acquisition metadata
NormalizedCapture_vN   parser projection with warnings and unknown fields preserved
HumanAnnotations_tN    later corrections / context / privacy choices
```

Derived views must be recomputable and separately versioned.

### To #207 — Post-capture UX

Recover the useful richness of historical `/results` but change the semantics:

- first show instrument coverage;
- then robust regularities;
- then circumstance dependence;
- then probe disagreements;
- then temporal patterns;
- only then alternative maps / frameworks.

### To #208 — Governance and freeze

Keep the PrivAI distinction between broad private capture and purpose-scoped disclosure. Protocol freeze must bind prompt, schema, parser compatibility, governance and test evidence together.

---

## 11. Baseline architecture emerging from the audit

The old and new systems can be reconciled as follows:

```text
HABITUAL AGENT
    │
    │ one-shot prompt
    ▼
RAW MEASUREMENT EVENT
    │
    ├── exact original response
    ├── agent / model / context metadata
    └── prompt / schema version
    │
    ▼
NORMALIZED CAPTURE
    │
    ├── observations
    ├── counter-observations
    ├── uncertainty
    ├── circumstances
    ├── temporal claims
    ├── unknowns
    └── instrument self-audit
    │
    ├──────────────► HUMAN ANNOTATIONS
    │                  confirm / nuance / contest / contextualize / privatize
    │
    ▼
DERIVED MAPS
    ├── Cogentia views
    ├── historical 73 projection
    ├── Big Five / HEXACO / other research views
    └── purpose-specific KYS Profiles
```

No lower box is allowed to rewrite the box above it.

Compact invariant:

> **Preserve the measurement event; version every interpretation.**

---

## 12. Issue #201 closure assessment

The issue's acceptance criterion is:

> Another handler can reconstruct the exact historical acquisition and post-capture UX without relying on the originating chat.

This audit satisfies that criterion at the design level, subject to human review and repository publication.

The remaining execution sequence is:

1. human reviews this audit;
2. commit it to `research/kys_reality_capture_baseline_audit.md`;
3. fetch it back from GitHub and verify the committed content;
4. reference the immutable commit from #201;
5. update #201 continuation / closure state;
6. release #202 and #203 as the next parallel packets.

Until those repository actions occur, #201 remains active.