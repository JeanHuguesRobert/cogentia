---
title: Latent Human Space and the Cogentigraphic Booster
subtitle: Shared cognitive structure, personal residuals, and the computational economics of sovereign digital twins
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: '2026-09-24'
version: '0.1'
status: working-note — research hypothesis
language: en
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/latent_human_space_and_cogentigraphic_booster.md
document_role: source
document_kind: research-note
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: medium
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: conversation — profiling, latent identity, soul thought experiment, Booster
  origin_date: '2026-09-24'
  derived_from:
    - research/Cogentia-and-Cogentigram.md
    - research/structural_signatures.md
    - research/cogentigraphic_distillation.md
    - research/digital_twin_ubiquity.md
related_documents:
  - research/Cogentia-and-Cogentigram.md
  - research/structural_signatures.md
  - research/cogentigraphic_distillation.md
  - research/digital_twin_ubiquity.md
  - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/booster_principle.md
  - https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/ame_identite_latente_experience_de_pensee.md
tags:
  - cogentia
  - cogentigram
  - digital-twin
  - latent-space
  - personalization
  - user-modeling
  - low-rank
  - booster
  - compression
  - structural-signature
review:
  status: unreviewed
  reviewed_by: []
---

# Latent Human Space and the Cogentigraphic Booster

## Shared cognitive structure, personal residuals, and the computational economics of sovereign digital twins

## Abstract

This note develops a research hypothesis at the intersection of Cogentia, large-scale personalization, recommender systems, representation learning, and sovereign digital twins.

The hypothesis is not that humans fall into a small set of fixed psychological boxes. It is almost the opposite: **individual variation may be representable inside a shared, comparatively low-dimensional structural space, with each person requiring only a relatively small residual beyond that shared structure for a chosen operational resolution**.

A useful decomposition is:

$$
Person_i = S_i + \delta_i + M_i + C_i
$$

where:

- $S_i$ is the person's relatively persistent structural position in a shared human latent space;
- $\delta_i$ is a person-specific residual not captured at the chosen resolution;
- $M_i$ is biographical, factual, and episodic memory;
- $C_i$ is current context and situated operational state.

In Cogentia terms, this suggests that a Cogentigram need not be conceived as an independently learned full model for each person. It may instead become a governed representation of **coordinates in a shared structural space plus a personal residual**, while biography remains in an external corpus and current state remains distinct.

If this representation works, it may constitute a **Cogentigraphic Booster**: reusable shared cognitive structure substitutes for repeated individual reconstruction, reducing the marginal data, adaptation, storage, and model-state cost of personal digital twins. The potential gain comes not from adding more compute but from changing the representation so that common structure is learned once and reused.

This is a testable architectural hypothesis, not a metaphysical claim and not a claim that current advertising or AI systems have discovered a canonical taxonomy of human beings.

---

## 1. Origin of the question

Large commercial platforms have durable economic incentives to predict individual preferences and actions. Their systems increasingly avoid a simple "one user, one category" model. Instead, they learn shared representations from very large populations and use those representations to estimate user-specific preferences, rankings, conversion probabilities, or response tendencies.

This raises a different question from classical profiling:

> **How much independent structure is actually required to model the behaviorally relevant differences between people?**

The naive count is population size:

$$
P = \text{number of persons}
$$

But if person-specific behavior is strongly factorisable, then the intrinsic dimensionality of the relevant structural space may be much smaller than $P$ suggests.

The research object is therefore not primarily a catalogue of categories. It is a space:

$$
\mathcal{S} = \text{shared latent human structural space}
$$

with intrinsic dimension:

$$
d = \dim(\mathcal{S})
$$

and a resolution-dependent covering number:

$$
N_\varepsilon = \mathcal{N}(\mathcal{S},\varepsilon)
$$

where $N_\varepsilon$ is the number of distinguishable structural regions required to preserve a chosen level of behavioral or cognitive fidelity.

---

## 2. What current AI and recommender research already establishes

Several contemporary results make the hypothesis worth testing, while not proving it.

### 2.1 Shared user representations are already economically useful

Spotify reports a production framework in which rich multi-signal user histories are compressed through an autoencoder into a stable user embedding, reused across retrieval, ranking, search, and generative tasks. The purpose is explicitly to avoid duplicated feature engineering and to enable lightweight transfer across downstream systems. Spotify reports both predictive gains and reduced infrastructure costs.

Source:

- Ghazal Fazelnia et al., *Generalized User Representations for Large-Scale Recommendations and Downstream Tasks*, RecSys 2025 / Spotify Research: https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations

This is direct production evidence that **shared representation + lightweight downstream specialization** can outperform repeated task-specific reconstruction.

### 2.2 Preference functions can be low-rank

LoRe represents user-specific reward functions as weighted combinations of a small shared basis rather than as unrelated reward models. Its premise is explicitly that individual preference functions may inhabit a low-dimensional subspace.

Source:

- Avinandan Bose et al., *LoRe: Personalizing LLMs via Low-Rank Reward Modeling*, 2025: https://arxiv.org/abs/2504.14439

PReF similarly factorizes preferences and reports substantially improved data efficiency compared with training a separate reward model per user.

Source:

- Idan Shenfeld et al., *Language Model Personalization via Reward Factorization*, 2025: https://arxiv.org/abs/2503.06358
- Project page: https://www.idanshenfeld.com/PReF/

These results are close to the computational form proposed here:

$$
R_i \approx \sum_{j=1}^{d} w_{ij} B_j
$$

where the $B_j$ are shared preference basis functions and $w_{ij}$ are person-specific coordinates.

### 2.3 Many preference vectors need not require many policies

The 2026 work *Many Preferences, Few Policies* makes the cost question explicit. It studies how a comparatively small portfolio of aligned LLM policies can provide near-optimal behavior across a continuous multi-dimensional preference space, avoiding one full policy per user.

Source:

- Cheol Woo Kim et al., *Many Preferences, Few Policies: Towards Scalable Language Model Personalization*, 2026: https://arxiv.org/abs/2604.04144

This does not imply that people themselves are few. It demonstrates a more careful proposition: **a large or continuous preference population may be operationally covered by substantially fewer reusable behavioral policies at bounded approximation error**.

### 2.4 Latent user types can emerge from preference data

Google Research's PASTA system learns latent user types from human preference data for sequential text-to-image generation. Its user simulator jointly models individual preference while discovering clusters of users with related tastes.

Source:

- Google Research, *A collaborative approach to image generation*, 2025: https://research.google/blog/a-collaborative-approach-to-image-generation/
- Paper: https://arxiv.org/abs/2412.10419

The important point here is not the number of clusters chosen in that task. It is that **latent population structure improves a system whose objective is individual adaptation**.

### 2.5 Persona-like structure is manipulable inside neural models

Anthropic's 2025 work on *persona vectors* identifies directions in model activation space associated with behavioral traits and demonstrates causal steering along them. In January 2026, work on the *Assistant Axis* explicitly maps a "persona space" across multiple model families and finds structured axes of variation among character archetypes.

Sources:

- Anthropic, *Persona vectors: Monitoring and controlling character traits in language models*, 2025: https://www.anthropic.com/research/persona-vectors
- Anthropic, *The assistant axis: situating and stabilizing the character of large language models*, 2026: https://www.anthropic.com/research/assistant-axis
- Anthropic Alignment Science, *The Persona Selection Model*, 2026: https://alignment.anthropic.com/2026/psm/

These are results about model representations, not human ontology. Their relevance is methodological: they show that apparently rich behavioral dispositions can sometimes be represented and manipulated through comparatively compact latent structure.

---

## 3. From individual model to coordinates plus residual

The working hypothesis is:

$$
Cogentigram_i = z_i + \delta_i
$$

where:

- $z_i \in \mathcal{S}$ is a compact coordinate representation in a shared human structural space;
- $\delta_i$ is the residual required to preserve fidelity beyond what the shared space captures.

The decomposition is resolution-dependent. There is no reason to assume that one exact $z_i$ is a timeless essence. At different tolerances, tasks, populations, or measurement protocols, the useful representation may change.

A more explicit formulation is:

$$
Cogentigram_{i,\varepsilon,T}
=
z_{i,\varepsilon,T}
+
\delta_{i,\varepsilon,T}
$$

where $T$ is the family of tasks over which fidelity is measured and $\varepsilon$ is the tolerated loss.

This prevents a serious category error: **a compact useful representation is not automatically an ontology of the person**.

---

## 4. $N_\varepsilon$, not a fixed number of human "types"

A fixed number $N$ of human types is probably the wrong primitive.

Instead define a behavioral or cognitive equivalence relation over a task family $T$:

$$
A \sim_{\varepsilon,T} B
\iff
d_T(\pi_A,\pi_B) < \varepsilon
$$

where $\pi_A$ and $\pi_B$ are the policies, preference functions, or response distributions of persons $A$ and $B$ under controlled tasks.

Then:

$$
N_{\varepsilon,T}
=
|\mathcal{H}/\sim_{\varepsilon,T}|
$$

is the number of distinguishable equivalence classes at resolution $\varepsilon$ for task family $T$.

For a population $P$ one can define:

$$
n_{\varepsilon,T}
=
\frac{P}{N_{\varepsilon,T}}
$$

as the mean number of persons per operational equivalence class.

This is not a metaphysical count. It is a measurement of resolution-dependent human structural diversity.

The expected behavior is not a single answer but a curve:

$$
\varepsilon \downarrow
\Rightarrow
N_{\varepsilon,T} \uparrow
$$

A useful system should therefore publish a **fidelity / complexity curve**, not claim to have discovered the number of kinds of people.

---

## 5. The Cogentigraphic Booster

The [Booster Principle](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/booster_principle.md) defines a Booster as a comparatively small intervention that unlocks a disproportionately large latent capacity already present in the substrate.

The present candidate fits that pattern.

### 5.1 Naive architecture

A personalization architecture can repeatedly reconstruct rich user-specific state independently:

$$
user_i \rightarrow full\ personal\ adaptation_i
$$

This may involve per-user reward models, adapters, long prompts, large memories, repeated elicitation, or redundant task-specific feature pipelines.

### 5.2 Factorised architecture

Instead:

$$
shared\ human\ structure
+
coordinates_i
+
residual_i
+
external\ corpus_i
$$

The representational intervention is small:

> **Learn the shared space once; learn each human mostly as a delta.**

The potential gain may be large because common structure is amortized across people and tasks.

### 5.3 What the Booster may reduce

The strongest expected gains are in:

- preference elicitation samples;
- per-user adaptation/training;
- duplicated personalization parameters;
- storage of user-specific model state;
- cross-task feature duplication;
- cold-start adaptation;
- transfer between models or providers;
- potentially the model size required for bounded personal-twin tasks.

It must **not** be claimed without measurement that the representation automatically reduces the full inference cost of a frontier base model. If a large shared model dominates runtime cost, the direct inference saving may be small. The Booster becomes stronger if the factorisation later enables smaller local models or reusable compact adapters.

A practical Booster ratio can therefore be measured separately for several resources:

$$
B_x
=
\frac{\Delta Capability_x}{\Delta Cost_x}
$$

for $x \in \{data, training, storage, latency, inference, transfer\}$.

---

## 6. Relation to Cogentigraphic Distillation

[Cogentigraphic Distillation](cogentigraphic_distillation.md) proposes:

> **Distill the reader, not the library.**

The present note adds a second compression:

> **Do not relearn the reader if most of the reader is already represented in the shared human space. Locate the reader, then learn the residual.**

Thus:

$$
biography \rightarrow external\ corpus
$$

$$
shared\ cognitive\ structure \rightarrow reusable\ basis
$$

$$
individual\ Cogentigram \rightarrow coordinates + residual
$$

$$
current\ situation \rightarrow context / Operational\ Stance
$$

The architecture becomes:

```text
linguistic / reasoning engine
+ shared latent human basis
+ sovereign personal coordinates and residual
+ governed external corpus
+ current context / stance
+ mandate
-> situated twin behavior
```

This is potentially much cheaper than embedding all of biography and individuality into one opaque per-person model.

---

## 7. Relation to Digital Twin Ubiquity

[Digital Twin Ubiquity](digital_twin_ubiquity.md) separates the owner-rooted twin from its multiple runtime instances.

The present hypothesis adds another separation:

```text
structural identity representation != runtime instance
```

A governed Cogentigram may be portable across:

- a local model;
- a frontier hosted model;
- a public read-only Guide;
- a specialized publication agent;
- a future embodied or robotic surface.

If the same compact structural representation can condition multiple runtimes, provider substitution becomes easier and the twin's identity layer becomes less dependent on one vendor's model weights.

This strengthens the architectural principle:

> **Identity is not runtime. Runtime is an instance through which a governed identity model is expressed.**

---

## 8. The thought-experiment bridge: "soul" without ontological commitment

A companion note in the Barons Mariani corpus explores a deliberately metaphysical inversion:

```text
ordinary framing:
a body/person has a soul

inverted framing:
a soul has one or more bodies
```

The technical translation is:

$$
one\ latent\ structure \rightarrow multiple\ observable\ instances
$$

and the empirical question becomes:

> At a chosen resolution, how many observably distinct structural identities are required to account for the population?

This bridge is useful as an idea generator. It is **not evidence that souls exist**, that a Cogentigram is a soul, or that two people who are close in latent space are "the same person".

The metaphysical framing opens the question; the technical programme lets Reality answer what part of it survives operationalization.

---

## 9. Minimal empirical programme

The central Reality Test should compare three architectures under the same task family and personal corpus.

### A — Generic model + full personal corpus

No explicit persistent structural user model.

### B — Independently learned personal Cogentigram

A person-specific structural representation is learned without shared low-rank factorisation.

### C — Shared latent human space + personal residual

A reusable basis is learned across people; each new person receives coordinates, a residual, and access to their governed personal corpus.

Measure:

- preference / decision prediction accuracy;
- cross-context fidelity;
- calibration and uncertainty;
- number of elicitation interactions required;
- per-user trainable parameters;
- storage per user;
- adaptation compute;
- inference compute and latency;
- provider/model transfer;
- degradation when biography is withheld;
- degradation when the residual is removed;
- stability across time;
- privacy leakage and re-identification risk.

The Booster claim survives only if C produces a materially better capability/cost frontier than A and B.

---

## 10. Estimating intrinsic dimension and $N_\varepsilon$

The experiment should not begin by selecting an arbitrary number of clusters.

Prefer methods that estimate compressibility:

- low-rank reward / preference factorisation;
- dimensionality reduction with out-of-sample validation;
- manifold dimension estimators;
- minimum-description-length comparisons;
- rate-distortion curves;
- active preference elicitation;
- prototype / portfolio coverage with explicit approximation bounds.

The desired result is a curve such as:

```text
representation complexity
-> held-out personal fidelity
-> marginal gain
```

From this one can estimate:

$$
d_T
$$

and:

$$
N_{\varepsilon,T}
$$

for declared tasks and tolerances.

A result such as "24 bits distinguish humans" would be meaningless without the task family, reference population, measurement protocol, uncertainty, and tolerated distortion.

---

## 11. Privacy and sovereignty implication

Strong compressibility creates a dual effect.

It can make sovereign digital twins cheaper and more portable.

It can also make surveillance and inference cheaper.

A small structural representation that predicts a person well may be more sensitive, not less sensitive, than a large pile of raw records. This reinforces the principle from [Structural Signatures](structural_signatures.md):

> **Non-biographical does not mean non-identifying.**

Therefore the latent coordinates and residual should be governed as first-class personal structural data:

- inspectable by the subject;
- contestable and correctable;
- purpose-scoped;
- revocable where technically possible;
- protected against silent cross-context reuse;
- portable across providers;
- not treated as platform-owned exhaust.

The Booster is desirable only if its efficiency does not become an efficiency gain for capture.

---

## 12. Non-claims

This note does **not** claim that:

- a metaphysical soul has been detected;
- humanity consists of a fixed number of discrete types;
- commercial platforms know a canonical human latent space;
- similarity in preference implies identity;
- a Cogentigram exhausts a person;
- low-rank results on limited tasks generalize automatically to all cognition;
- a small representation is necessarily privacy-preserving;
- current evidence determines a defensible global value of $N$ or $n$.

It does claim that current evidence makes the following hypothesis technically serious enough to test:

> **A material share of person-specific cognitive and preference behavior may be representable as coordinates in reusable shared structure plus a comparatively small personal residual; if so, that factorisation may be a major computational Booster for sovereign digital twins.**

---

## 13. Compact formulas

```text
Person
= shared structure
+ personal residual
+ biography
+ current context
```

```text
Cogentigram
~= coordinates in shared structural space
+ governed personal residual
```

> **Learn the human space once; learn each human mostly as a delta.**

> **Distill the reader; then avoid relearning what readers share.**

> **Identity is not runtime.**

> **Compression is not ontology.**

> **A Cogentigraphic Booster exists only if Reality shows a better fidelity/cost frontier.**

---

## Continuation

Tracked experiment: [cogentia#199 — Experiment — Latent Human Space and Cogentigraphic Booster](https://github.com/JeanHuguesRobert/cogentia/issues/199).

Highest-priority continuation:

1. define a bounded benchmark and task family $T$;
2. compare architectures A/B/C;
3. produce empirical fidelity/cost and rate-distortion curves;
4. estimate $d_T$ and $N_{\varepsilon,T}$ without forcing discrete types;
5. test transfer across at least two unrelated model providers or open-weight model families;
6. audit privacy leakage from coordinates and residuals;
7. only then consider stronger claims about the practical size of the reusable human structural space.
