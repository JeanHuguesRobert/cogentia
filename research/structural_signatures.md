---
title: "From Biometrics and Psychometrics to Structural Signatures"
subtitle: "Non-Biographical Identifying Structures, Cogentigrams, and Consent-Based Sovereign Digital Twins"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-05-22"
status: working-paper — Working paper
version: "0.9"
license: "CC BY-SA 4.0 for text; MIT for associated schemas or code"
spdx: "CC-BY-SA-4.0"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/structural_signatures.md
last_stamped_at: 2026-05-26
---

# From Biometrics and Psychometrics to Structural Signatures

## Non-Biographical Identifying Structures, Cogentigrams, and Consent-Based Sovereign Digital Twins

**Author:** Jean Hugues Noël Robert, baron Mariani  
**Affiliation:** Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica  
**Working paper:** v0.9  
**Date:** 2026-05-22  
**Project:** Cogentia / Cogentigram / Digital Twins / Structural Signatures  
**Status:** Stable working paper for public release and external review  
**License:** CC BY-SA 4.0 for text; MIT for associated schemas or code  

---

## Abstract

Current debates on digital identity often distinguish between biometric data, psychometric data, and biographical or episodic data. This distinction remains useful in administrative, legal, and security contexts, but it becomes increasingly fragile in the context of artificial intelligence systems capable of learning stable patterns across body, behavior, expression, language, cognition, and interaction.

This working paper proposes a classificatory framing of **non-biographical identifying structures**: observable, modelable, and relatively stable regularities that may allow recognition, re-identification, representation, or partial reconstruction of a person without directly encoding that person's life history. A system may contain no name, address, date of birth, institutional affiliation, private memory, or explicit life event, and nevertheless allow recognition through gait, voice, gesture, gaze, writing style, reasoning style, expressive transitions, or interactional patterns.

Within the Cogentia framework, this paper reformulates the **Cogentigram** as the set of non-biographical structural signatures that characterize the coherence, expression, cognition, behavior, and embodied presence of a person. In its narrow sense, the Cogentigram models cognitive and behavioral coherence. In its extended sense, it models what remains recognizable when biography is removed.

The paper argues that faithful digital twins should not be understood as mere aggregates of personal archives, memories, documents, or biographical traces. A consent-based sovereign digital twin depends on the articulation of at least three domains: narrative memory, evidential archives, and structural signatures. Biography gives the story. Archives give traces and evidence. The Cogentigram gives structural coherence.

This distinction clarifies both the technical promise and the ethical risk of future digital twins. **Non-biographical does not mean non-identifying.** The classical biometric / psychometric distinction is therefore insufficient. AI systems increasingly operate on structural signatures that cross the boundary between body, behavior, cognition, and identity.

Google Beam, formerly Project Starline, provides a contemporary example of the shift from flat video transmission toward synthesized embodied presence. However, immersive video conferencing is not the main subject of this paper. It is used as an entry point into a broader theory of structural identity, consent-based modeling, and the layered architecture of personal digital twins.

The paper concludes that such signatures call for fiduciary-style governance. A person's structural signature should not be treated as raw material for platforms. It should be treated as a sovereign model requiring contestability, auditability, provenance, and non-extractive governance. This strengthens the case for **PrivAI**, or for an equivalent non-extractive fiduciary institution capable of protecting structural personal models against platform capture.

**Keywords:** Cogentia, Cogentigram, digital twin, structural signatures, non-biographical data, biometric data, psychometric data, gait recognition, behavioral biometrics, embodied presence, consent, identity, privacy, PrivAI, AI governance.

---

## Version Note

**v0.9** is the publication-stabilization pass.

It incorporates the deflation, operational-boundary, entanglement, related-work, and recent-developments passes completed in v0.7–v0.8c. It corrects version consistency, adds a final operational boundary example, further deflates residual novelty and institutional claims, and updates the suggested [`research/index.md`](index.md) entry.

This version is suitable for wider circulation as a Cogentia working paper, while remaining open to external legal, biometric, technical, and governance review.

**v0.9 is considered stable for public release and external review.**

## 1. Purpose and Contribution

This working paper proposes a conceptual extension of the Cogentia framework.

Its central contribution is not the discovery of new signals. Gait recognition, voice recognition, stylometry, behavioral biometrics, continuous authentication, and human digital twins already study many of the relevant phenomena.

The contribution is **classificatory and architectural**: it groups these heterogeneous signals under a single privacy and digital-twin category when, and only when, they function as:

> **non-biographical identifying structures**.

These are not biographical memories. They do not directly say what happened to a person. They do not necessarily contain names, addresses, dates, relationships, institutions, or life events. Yet they may allow a person to be recognized, represented, simulated, or partially reconstructed because they capture stable structural regularities.

Examples include:

- gait;
- posture;
- gesture;
- gaze;
- voice;
- facial transitions;
- writing style;
- reasoning style;
- hesitation patterns;
- interactional timing;
- ways of restoring coherence after contradiction;
- habitual expressive transitions;
- embodied modes of presence.

The paper is organized around four claims.

### Claim 1 — Non-biographical does not mean non-identifying

A pattern may contain no biographical content and still identify a person.

### Claim 2 — The biometric / psychometric distinction is a legacy distinction

Many identifying structures cross the boundary between body, behavior, expression, cognition, and social interaction. Gait, voice, gaze, gesture, and writing style are not cleanly separable into biometric or psychometric categories. They are structural signatures.

### Claim 3 — The extended Cogentigram is the structural signature of a person

The Cogentigram is not only a model of reasoning. It is the set of non-biographical identifying structures that make a person recognizable across situations.

### Claim 4 — Structural signatures require fiduciary-style governance

Because structural signatures may identify, reconstruct, or impersonate a person without containing biographical memories, privacy cannot be protected by individual consent alone. **PrivAI**, or an equivalent non-extractive fiduciary institution, is proposed as one plausible response to the governance gap created by high-resolution personal structural models. The claim is not that existing regulators are irrelevant, but that dynamic personal models create operational needs that ordinary privacy compliance does not by itself fully operationalize.

---

### 1.1 Contribution and Non-Contribution

This paper does **not** introduce gait recognition, behavioral biometrics, soft biometrics, stylometry, human digital twins, self-sovereign identity, decentralized identity, personal data stores, federated learning, differential privacy, or synthetic presence systems. These are existing fields with substantial technical and legal literature.

It contributes something narrower:

1. a distinction between **biographical data** and **non-biographical identifying structures**;
2. an extension of the Cogentigram from a cognitive profile to a broader structural signature;
3. the principle that **non-biographical does not mean non-identifying**;
4. an architectural placement of embodied, expressive, behavioral, linguistic, and cognitive signatures inside consent-based sovereign digital twins;
5. an institutional argument that high-resolution structural models require fiduciary-style, non-extractive governance, whether through PrivAI or an equivalent structure.

The originality claimed here is therefore not empirical discovery. It is a reclassification of known and emerging modeling practices inside the Cogentia architecture.

---

## 2. Position within the Cogentia Corpus

This paper belongs to the individual-scale branch of the Cogentia corpus. It should be read as an extension of two prior documents:

- **The Sovereign Digital Twin: Cogentia, Cogentigram, Cogentiscope**, which introduced the personal-scale architecture of cognitive sovereignty;[^cogentia-digital-twin]
- **Cogentia and Cogentigrams**, which defined Cogentia as a persistent structural signature inferred through repeated AI-mediated interaction and the Cogentigram as its measurable representation.[^cogentia-cogentigram]

The present paper does not replace those definitions. It widens their domain.

Earlier Cogentia work emphasized the cognitive, behavioral, stylistic, and psychometric dimensions of the Cogentigram. This paper argues that the same logic must also include embodied and expressive structures: gait, posture, gesture, gaze, voice, facial transitions, and habitual modes of presence.

In this sense, the paper proposes a generalization:

> **The Cogentigram is not merely a cognitive profile. It is the non-biographical structural signature of a person.**

This also clarifies the relation between Cogentia Personal and Cogentia Commons. At the individual scale, structural signatures make a person recognizable across contexts. At the collective scale, Cogentia Commons makes reasoning traces, objections, revisions, decisions, and continuations accountable across contributors and agents.

The relation to **Cognitive Packets** is indirect but important.[^cognitive-packets] Cognitive packets define the portable unit of cognitive work: what must be transmitted so that another human or artificial agent can correctly continue a task. Structural signatures define the non-biographical continuity of the person or agent producing, receiving, or resuming that work.

Thus:

> **Cognitive packets preserve continuity of work. Structural signatures preserve continuity of recognizable agency.**

This article should therefore be catalogued in [`research/index.md`](index.md) near [`cogentia-digital-twin.md`](cogentia-digital-twin.md) and [`Cogentia-and-Cogentigram.md`](Cogentia-and-Cogentigram.md) as a working paper on the structural extension of the Cogentigram.

---

### 2.1 Relation to Existing Fields

This paper does not claim that gait recognition, stylometry, behavioral biometrics, soft biometrics, continuous authentication, multimodal identity modeling, human digital twins, self-sovereign identity, or privacy-preserving machine learning are new fields. They are not.

Its contribution is classificatory and architectural. It proposes to group these heterogeneous literatures under the concept of **non-biographical structural signatures** when, and only when, the modeled signal contributes to the recognition, representation, reconstruction, simulation, or governance of a person within a consent-based sovereign digital twin.

The novelty is not the existence of the signals. The novelty is their placement inside the Cogentia architecture: between biography, archives, cognitive structure, embodied presence, mandate, provenance, revocation, and institutional guardianship.

This also means that the paper must remain compatible with existing legal categories. A structural signature may be biometric data, profiling data, behavioral data, inferred data, or ordinary personal data depending on its source, use, precision, and jurisdiction. The concept proposed here is not intended to bypass existing law. It is intended to make a particular privacy problem more legible, including the contextual integrity problem created when signals collected for one purpose become usable for recognition, simulation, or governance in another context:[^nissenbaum-2010] the construction of a recognizable personal model from non-biographical regularities.

---


### 2.2 Related Work

This section is not intended as an exhaustive literature review. Its role is to locate the paper relative to fields that already study the signals and risks discussed here.

#### 2.2.1 Behavioral biometrics, soft biometrics, and continuous authentication

Behavioral biometrics already studies identification and verification through recurrent human patterns such as gait, touch dynamics, keystroke dynamics, voice, gesture, and motion traces. Smartphone-based continuous authentication surveys explicitly group gait, keystroke dynamics, touch gestures, voice, motion-based signals, and multimodal methods as behavioral biometric traits used for implicit and continuous user authentication.[^abuhamad-2020][^mahfouz-2018]

The present paper does not rename behavioral biometrics. It narrows the question differently. A behavioral biometric system usually asks whether a pattern can verify or identify a user for access, fraud prevention, monitoring, or security. Cogentia asks when such patterns become part of a consent-based sovereign digital twin: that is, when they contribute to the recognition, representation, reconstruction, simulation, or governed use of a person.

#### 2.2.2 Gait, voice, gaze, and embodied signatures

Gait recognition is a canonical example because it identifies a person through dynamic embodied structure rather than biographical content. Modern deep gait recognition surveys emphasize recognition at a distance, reduced need for active cooperation, and the privacy and security concerns created by improved performance.[^shen-2022] Privacy literature on behavioral biometric data also treats voice, gait, hand motion, eye-gaze, ECG, and EEG as behavioral traits that can leak sensitive information such as emotion or health.[^hanisch-2021]

This supports one of the paper's central claims: non-biographical does not mean non-identifying. It also supports the entanglement rule: a gait model may be structurally non-biographical while still leaking health, disability, fatigue, or age-related information.

#### 2.2.3 Stylometry, authorship attribution, and cognitive-expression signatures

Stylometry and authorship attribution show that text can carry identifiable structure without explicit biographical data. Writing style, syntactic patterns, lexical preferences, rhythm, argumentative habits, and source-code style can function as structural signatures. Recent work on programmer attribution explicitly bridges behavioral biometrics and source-code stylometry by treating stylistic, structural, and behavioral characteristics as attribution signals.[^horvath-2026] Recent LLM-based de-anonymization work also illustrates how authorship signals can be recovered at scale from text corpora.[^zhang-2026]

For Cogentia, this literature is important because it shows that cognitive-expression signatures can be identifying even when names, addresses, life events, and demographic markers are removed.

#### 2.2.4 Human digital twins, AI twins, and digital-twin privacy

Human digital twins and AI twins raise adjacent questions about model ownership, consent, autonomy, and privacy. Digital-twin privacy surveys in AI-robotics discuss privacy attacks, model extraction, data leakage, and the need to combine digital-twin systems with trustworthiness and governance frameworks.[^fernandez-2024] Recent work on AI twins frames simulated identities as extensions of persons and argues that platform-centered legal models are insufficient for personal autonomy and dominion over one's twin.[^jurcys-2026]

This paper differs by focusing not on the full twin, but on a particular component: the non-biographical structural signature that makes the twin recognizable and potentially faithful. In the Cogentia architecture, biography gives narrative, archives give evidence, mandate gives authority, and the Cogentigram gives structural form.

#### 2.2.5 Self-sovereign identity, DIDs, Solid, and personal data stores

Self-sovereign identity, decentralized identifiers, and personal data stores offer adjacent infrastructure for user-controlled identity and data access. The W3C DID specification defines decentralized identifiers as identifiers enabling verifiable, decentralized digital identity.[^did-core] Solid describes personal online data stores, or Pods, where users control which applications and agents may read or write documents.[^solid]

Cogentia does not replace these approaches. It adds a modeling problem that they do not automatically solve: even when data storage and identity credentials are user-controlled, AI systems may still infer structural signatures from interaction. Sovereignty over files and credentials is necessary, but not sufficient, for sovereignty over inferred personal models.

#### 2.2.6 Legal frameworks: GDPR and the EU AI Act

The GDPR already defines personal data broadly as any information relating to an identified or identifiable natural person, including indirect identification through factors specific to physical, physiological, genetic, mental, economic, cultural, or social identity.[^gdpr-art4] It also defines profiling as automated processing used to evaluate or predict aspects such as behavior, location, movements, health, preferences, interests, or reliability, and biometric data as technical processing of physical, physiological, or behavioral characteristics allowing or confirming unique identification.[^gdpr-art4][^gdpr-biometric]

The EU AI Act similarly defines biometric data in terms of physical, physiological, or behavioral characteristics, defines biometric identification and verification, and separately defines emotion recognition, biometric categorisation, and remote biometric identification systems.[^ai-act-definitions]

The paper's terminology therefore does not create a new legal category. It should be read as an architectural and governance layer over existing legal categories. A structural signature may be personal data, biometric data, profiling data, sensitive inferred data, or ordinary behavioral data depending on context, precision, use, and jurisdiction.

#### 2.2.7 Privacy-preserving machine learning and provenance

Federated learning, differential privacy, local-first processing, data minimization, provenance metadata, watermarking, and model cards are relevant mitigation families. They do not remove the underlying governance problem. A locally trained model may still be extractable. Differential privacy may reduce leakage but introduce utility trade-offs.[^dwork-2006] Provenance metadata may document lineage without making revocation technically complete.

For this reason, the paper treats technical protections and institutional guardianship as complementary. Technical architecture reduces risk. Fiduciary-style governance clarifies mandate, accountability, contestability, and permissible use.

#### 2.2.8 Immersive telepresence and embodied presence

Project Starline and Google Beam show the practical relevance of embodied presence. Google's 2021 Starline paper presents a high-fidelity telepresence system designed to improve copresence, nonverbal behavior, eye contact, gestures, body language, spatialized audio, and 3D audiovisual cues without special glasses.[^starline-2021] Google later described Beam as an AI-first 3D video communication platform that uses volumetric video models and light-field display technology to produce realistic 3D experiences from video streams.[^google-beam]

For this paper, Google Beam is not the subject. It is an entry point. It shows that presence is becoming computationally modeled. Cogentia asks what happens when embodied presence models become part of the broader structural signature of a person.

---


### 2.3 Recent Developments: 2025–2026

Several recent developments strengthen the need for the present framing.

First, the literature on **AI twins** has begun to treat simulated personal identity as a legal and ethical object in its own right. Jurcys et al. argue that AI twins — digital replicas incorporating knowledge, memories, psychological traits, and behavioral patterns — should be understood as intimate extensions of the self, and that natural persons should be recognized as moral and legal owners of such twins.[^jurcys-2026] This supports the Cogentia claim that high-fidelity personal models should not be treated as platform artifacts or ordinary datasets.

Second, the **Human Digital Twin** field is becoming more explicit and more systematic. Recent work reviews HDTs as dynamic, data-driven virtual representations of individuals, continuously updated with multimodal data, especially in health contexts.[^pan-2025] Other work proposes a holistic specification of HDTs across stakeholders, users, applications, and functionality levels: store, analyze, personalize, predict, control, and optimize.[^mandischer-2025] Cogentia differs from these approaches by foregrounding personal sovereignty, contestability, and non-biographical structural signatures rather than only medical prediction, workplace optimization, or system engineering.

Third, the **Digital Me** direction directly intersects with the narrow Cogentigram. Conversational HDT work now explicitly aims to model conversational style, memory, behavior, adaptive learning, and persistent digital identity.[^coll-2025] This confirms that conversational and cognitive twins are no longer speculative metaphors. They are emerging architectures.

Fourth, Google Beam and HP Dimension show that embodied telepresence has entered the enterprise market. HP Dimension is reported as a high-end device with a 65-inch light-field display, six high-speed cameras, spatial audio, and a price around USD 24,999, excluding the Google Beam software license.[^verge-hp] This strengthens both sides of the argument: the high-end hardware path is real, and the case for frugal, local-first alternatives remains open.

Fifth, provenance and watermarking have become central governance issues. Google has expanded SynthID and C2PA Content Credentials verification into major user-facing surfaces such as Search, Lens, Circle to Search, and Chrome, while public reporting also emphasizes the limits of metadata-only provenance when files are transformed, re-encoded, or stripped by platforms.[^verge-synthid-2026][^verge-labeling-2026] For Cogentia, this implies that structural signatures require two forms of governance: privacy governance at the model layer, and provenance governance at the representation layer.

Sixth, the implementation of the EU AI Act is increasingly relevant. The February 2025 prohibited-practices phase covers social scoring, manipulative dark patterns, exploitation of vulnerabilities, certain predictive policing uses, and emotion recognition in workplace and school contexts.[^reuters-ai-act-2025] This confirms that the legal frontier is no longer limited to raw biometric capture. It increasingly concerns behavioral, emotional, and social inference.

These developments do not prove the Cogentia framework. They do, however, make its problem space more urgent: personal models are becoming multimodal, embodied, conversational, legally contested, and representationally synthetic at the same time.

## 3. Introduction: From Video Communication to Presence Synthesis

Video conferencing is no longer limited to the transmission of flat audiovisual streams. Recent systems such as Google Beam, formerly Project Starline, point toward a different paradigm: the synthesis of embodied presence. Google describes Beam as an AI-first 3D video communication platform, derived from Project Starline, using AI volumetric video models to create calls that appear fully 3D from different perspectives, without requiring headsets or glasses.[^google-beam]

This technological direction matters because it reveals a deeper transition. The system does not merely transmit communication. It seeks to reconstruct presence. It attempts to preserve nonverbal cues such as gaze, posture, smiles, spatial orientation, gestures, facial expression, and subtle embodied signals that are usually weakened or lost in conventional video conferencing.

In enterprise form, this high-end path requires specialized hardware. HP describes HP Dimension with Google Beam as a 3D, AI-powered video communication solution for enterprise collaboration.[^hp-dimension] Contemporary press coverage has reported hardware features such as multi-camera capture and a light-field display, with a high enterprise price point.[^verge-hp]

But the underlying conceptual shift is broader than any single product. It suggests that future communication systems may increasingly rely on models of persons rather than raw audiovisual transmission alone.

The central hypothesis of this paper is that such systems should be understood as part of a broader movement toward **consent-based sovereign digital twins**. A person cannot be modeled faithfully through biography alone. A faithful digital twin requires not only a record of what happened to the person, but also models of what remains recognizable across situations: style of reasoning, bodily presence, gaze, voice, gestures, habitual transitions, and patterns of coherence.

This is the domain of the **Cogentigram**.

The Cogentigram was initially conceived as a structural model of cognitive and behavioral coherence: how a person reasons, reacts, decides, remembers, hesitates, prioritizes, and maintains continuity over time. The present article extends that concept. It argues that anything that allows a person to be identified independently of episodic or biographical data belongs to the extended domain of the Cogentigram, insofar as it is an observable, modelable, and relatively stable structural signature.

The essential distinction is therefore not between biometric and psychometric data. That distinction is increasingly artificial. The more fundamental distinction is between:

1. **biographical or episodic data**, which describe what happened to a person; and
2. **structural signatures**, which describe what remains recognizable about the person independently of those episodes.

This leads to a central principle:

> **Non-biographical does not mean non-identifying.**

---

## 4. Definitions

The following definitions are proposed for the purpose of this working paper. They are conceptual definitions, not legal definitions. Where they overlap with legal categories such as personal data, biometric data, profiling, or biometric identification, the legal framework must prevail in operational deployment.

### 4.1 Biographical or episodic data

**Biographical or episodic data** describe events, relations, places, dates, documents, institutional affiliations, actions, or experiences attached to a person's life.

They answer the question:

> What happened to this person?

Examples:

- date of birth;
- place of residence;
- education history;
- employment history;
- political or institutional roles;
- personal relationships;
- travels;
- medical events;
- legal events;
- personal documents;
- photographs as life records;
- correspondence;
- publications.

Biographical data are narrative. They give the story.

### 4.2 Structural signature

A **structural signature** is a stable or recurrent pattern that characterizes how a person appears, moves, speaks, writes, reasons, reacts, or interacts.

It answers the question:

> What remains recognizable across situations?

Examples:

- gait;
- voice;
- posture;
- gesture;
- gaze;
- writing rhythm;
- reasoning transitions;
- argumentative priorities;
- hesitation patterns;
- expressive micro-transitions;
- conversational timing;
- recovery after contradiction.

A structural signature does not necessarily encode life events. Yet it may be personally identifying.

### 4.3 Non-biographical identifying structure

A **non-biographical identifying structure** is an observable, modelable, and relatively stable pattern that may allow recognition or partial reconstruction of a person without directly encoding episodic or biographical information.

This category is the core classificatory framing of the paper.

It includes patterns that are:

- non-biographical;
- structural;
- potentially identifying;
- modelable by statistical, symbolic, neural, or hybrid systems;
- relevant to digital twins, identity systems, immersive presence, and AI governance.

### 4.4 Cogentigram

A **Cogentigram** is the set of non-biographical identifying structures that characterize the coherence, expression, cognition, behavior, and embodied presence of a person.

In compact form:

> **The Cogentigram is what remains recognizable when biography is removed.**

This definition should not be misunderstood as a claim that the Cogentigram is the person. It is a map, not the territory. It is a structured approximation, not an essence. It is contestable, revisable, incomplete, and context-dependent.

### 4.5 Consent-based sovereign digital twin

A **consent-based sovereign digital twin** is a layered model of a person that is generated, governed, audited, and used under the authority and legitimate interest of the person modeled, subject to legal and ethical limits.

It may include:

- biographical data;
- personal archives;
- memory traces;
- explicit preferences;
- legal and institutional context;
- structural signatures;
- Cogentigram layers;
- permissions and constraints;
- provenance records;
- revocation rules;
- posthumous governance instructions.

A sovereign digital twin is not merely a model of the person. It is a governed relation between the person, the model, the institution protecting the model, and the authorized contexts in which the model may act or be consulted.

---

## 5. Narrow and Extended Cogentigram

The term **Cogentigram** can now be used in two compatible senses.

### 5.1 Narrow Cogentigram

In its narrow sense, the Cogentigram is a structured representation of cognitive, stylistic, and behavioral tendencies inferred from AI-mediated interaction.

It models:

- reasoning style;
- decision architecture;
- argumentation patterns;
- cognitive flexibility;
- risk tolerance;
- memory organization;
- communication structure;
- emotional-relational tendencies;
- longitudinal drift;
- cognitive impedance.

This sense corresponds to the initial Cogentia work on persistent cognitive signatures.

### 5.2 Extended Cogentigram

In its extended sense, the Cogentigram is the set of non-biographical structural signatures that make a person recognizable across contexts.

It includes:

- cognitive signatures;
- linguistic signatures;
- behavioral signatures;
- expressive signatures;
- vocal signatures;
- embodied signatures;
- interactional signatures;
- temporal signatures.

The narrow Cogentigram is cognitive.  
The extended Cogentigram is structural.

The narrow Cogentigram models how a person reasons.  
The extended Cogentigram models what remains recognizable when biography is removed.

---

## 6. Boundary Condition: Identification Through Structure

Not every datum that identifies a person belongs to the Cogentigram.

A civil name, a passport number, an address, a phone number, a tax identifier, or a date of birth may identify a person, but they do so as administrative, legal, or biographical markers. They are identifying, but they are not structural signatures.

A datum belongs to the Cogentigram only when it identifies through structure.

This includes stable or recurrent patterns of:

- form;
- movement;
- rhythm;
- style;
- expression;
- reasoning;
- attention;
- reaction;
- interaction;
- coherence maintenance.

This boundary condition prevents conceptual inflation. The Cogentigram does not absorb all personal data. It absorbs only what contributes to the structural recognizability of the person.

A minimal operational rule is therefore useful:

> A signal qualifies as part of the extended Cogentigram only when its primary identifying power comes from intra-individual structural stability across contexts, rather than from external administrative, episodic, or contextual metadata.

For example, a gait model qualifies when its re-identification power comes primarily from kinematic invariants — rhythm, posture, stride dynamics, balance, and movement transitions — that remain sufficiently stable across clothing, lighting, location, and recording context. A travel history log does not qualify, even if it identifies the person, because its identifying power comes from episodic and contextual information rather than from structural recurrence.

The distinction can be summarized as follows:

| Datum | Identifying? | Biographical? | Cogentigram? | Reason |
|---|---:|---:|---:|---|
| Civil name | Yes | Often / administrative | No | Identifies by convention, not by structure |
| Passport number | Yes | Administrative | No | Legal identifier, not structural pattern |
| Date of birth | Yes | Yes | No | Biographical/civil marker |
| Address | Yes | Contextual | No | Locational marker |
| Travel history | Yes | Yes / episodic | No | Sequence of events, not structural signature |
| Medical diagnosis | Often | Contextual / sensitive | No | May explain structure but is not itself a Cogentigram layer |
| Face morphology | Yes | No | Partial | Structural morphology; stronger when dynamic expression is modeled |
| Gait | Yes | No | Yes | Structural embodied pattern |
| Posture | Potentially | No | Yes | Embodied pattern, especially longitudinally |
| Voice | Yes | No / mixed | Yes | Physiological and expressive structure |
| Accent | Potentially | Mixed | Edge case | Structural signal that may leak geography, class, or biography |
| Writing style | Potentially | No / mixed | Yes | Linguistic structure, with possible education or social leakage |
| Reasoning style | Potentially | No | Yes | Cognitive structure |
| Gesture pattern | Potentially | No | Yes | Embodied expressive structure |
| Interactional timing | Potentially | No | Yes | Behavioral-temporal structure |
| Social graph | Yes | Contextual / biographical | Usually no | Relational data; may inform a twin but is not itself structural style |

---

## 7. Why the Biometric / Psychometric Distinction Is Insufficient

The classical distinction between biometric and psychometric data assumes that bodily measurement and mental measurement are separable categories.

In practice, many AI-relevant identity signals are neither purely bodily nor purely mental.

Gait is bodily, but it is also behavioral.  
Voice is physiological, but it is also expressive.  
Gaze is ocular, but it also reflects attention.  
Gesture is physical, but it also reveals style, emotion, and interactional habits.  
Writing is linguistic, but it may reveal cognition, education, tempo, social positioning, and self-presentation.

These signals are better described as **structural signatures**.

The biometric / psychometric distinction is therefore a legacy distinction. It maps poorly onto AI systems that learn patterns across domains. Such systems do not need to know whether a signal is bodily, behavioral, cognitive, or expressive. They need only learn whether it is stable, predictive, identifying, or useful for reconstruction.

The more relevant axes are:

| Axis | Question |
|---|---|
| Biographical / non-biographical | Does the signal describe life events? |
| Identifying / non-identifying | Can the signal recognize or re-identify a person? |
| Static / dynamic | Is the signal fixed or temporal? |
| Morphological / behavioral / cognitive / expressive | What kind of structure is captured? |
| Voluntary / involuntary | Can the person control the signal? |
| Local / transmissible | Can the signal remain local or must it travel? |
| Revocable / non-revocable | Can the person meaningfully withdraw or rotate the signal? |
| Self-modeled / externally modeled | Is the model produced under the person's authority? |

This reframing is important for privacy and governance. A non-biographical model can still be deeply personal. A non-episodic structure can still be identifying. A structural signature can still be used for recognition, prediction, imitation, manipulation, exclusion, or surveillance.

---

## 8. Embodied Presence Layer

The term **physical appearance** is too narrow. It suggests a static visible surface. The relevant domain is broader: **embodied presence**.

The embodied presence layer of a Cogentigram models dynamic embodied signatures, including:

- gait;
- posture;
- gaze;
- voice;
- gestures;
- facial transitions;
- expressive timing;
- habitual modes of presence;
- spatial orientation;
- movement rhythm;
- interactional distance;
- bodily response to attention and stress.

This layer shares a crucial characteristic with the cognitive Cogentigram: it carries no biographical data by itself.

A gait model does not say where the person was born.  
A gesture model does not say whom the person knows.  
A voice-rhythm model does not say what happened in the person's life.  
A gaze-pattern model does not contain the person's memories.

Yet each may become identifying.

This creates the core privacy problem of the article:

> **A structural signature may be non-biographical, non-narrative, and still personally identifying.**

The embodied presence layer is therefore not a decorative extension of the digital twin. It is one of the most sensitive layers, precisely because it can make presence reconstructable without requiring biography.

---

## 9. From Google Beam to Frugal Immersive Presence

Google Beam illustrates a high-end path toward synthesized embodied presence. It uses specialized hardware and AI-mediated reconstruction to make remote participants appear spatially present.[^google-beam][^hp-dimension]

A distinct path is possible: frugal, local-first, software-centered, and compatible with ordinary hardware.

In the simplest case, when only one participant is physically present in a room, part of the immersive effect could be approximated with:

- a low-cost projector;
- a low-cost camera;
- gaze tracking;
- local identity recognition;
- local embodied-presence models;
- semantic extraction of minimal motion and attention signals;
- remote synthesis of the participant from the observer-relative point of view.

Instead of transmitting full high-bandwidth video streams, the system could transmit a minimal semantic representation:

- head orientation;
- gaze direction;
- posture state;
- gesture class;
- facial transition state;
- interactional timing;
- confidence values;
- consent and provenance metadata.

The receiving side would then synthesize a realistic representation using the authorized model of each participant.

This architecture would treat the participant's embodied presence model as a governed component of their sovereign digital twin. It should not be extracted, stored, transmitted, or reused as platform property.

This direction connects with earlier work in the Mariani Village project, where the immersive room was conceived as a student's cabin inside a movable container. The room is not merely a videoconferencing device. It is a personal learning, collaboration, and presence space, potentially connected to a broader digital twin architecture.

---

## 10. Digital Twin Architecture

A consent-based sovereign digital twin should distinguish at least five layers.

| Layer | Function | Example |
|---|---|---|
| Biographical layer | Narrative memory | life events, places, relationships |
| Archive layer | Evidence and traces | writings, documents, images, correspondence |
| Cogentigram layer | Structural recognizability | reasoning style, gait, voice, gesture, gaze |
| Mandate layer | Authorized uses | what the twin may do, say, infer, or refuse |
| Governance layer | Protection and contestability | consent, audit, revocation, provenance, PrivAI oversight |

The digital twin is faithful only when these layers are articulated.

Biography without structure gives a dossier, not a twin.  
Structure without biography gives recognizability without story.  
Archives without governance create extraction risk.  
Governance without structural clarity protects the wrong object.

The role of the Cogentigram is to provide structural coherence.

The role of the archive is to provide evidence.

The role of biography is to provide narrative.

The role of governance is to prevent the model from becoming an instrument of capture.

---

## 11. Privacy and Legal Implications

This paper does not provide legal advice. It proposes a conceptual framework that must be tested against applicable law.

Under the GDPR, personal data include information relating to an identified or identifiable natural person. Identifiability may be direct or indirect.[^gdpr-art4] Therefore, a structural signature that enables recognition or re-identification may fall within the scope of personal data even if it contains no biographical event.

The GDPR also defines biometric data as personal data resulting from specific technical processing relating to physical, physiological, or behavioral characteristics, allowing or confirming unique identification.[^gdpr-biometric]

The EU AI Act also gives importance to biometric identification, emotion recognition, biometric categorization, and high-risk uses of AI.[^ai-act]

The conceptual contribution of this paper is that such legal categories should be interpreted with attention to structural signatures.

A structural signature may be:

- non-biographical;
- non-verbal;
- non-documentary;
- inferred rather than explicitly provided;
- dynamic rather than static;
- distributed across many weak signals;
- identifying only when combined with a model.

This makes the governance problem harder.

A user may consent to a video call without understanding that the system can infer an embodied signature. A user may consent to text analysis without understanding that the system can infer a cognitive signature. A user may provide harmless fragments that, aggregated over time, become a highly identifying structural model.

The distinction between biographical and non-biographical data must therefore not be confused with a clean technical separability. Machine-learning systems entangle signals. A voice model may reveal regional origin or health conditions. A gait model may reveal disability, fatigue, age, or injury. A writing-style model may reveal education, social position, native language, or psychological state.

The distinction is still useful, but only as a governance distinction. It helps identify what kind of model is being constructed. It does not imply that non-biographical signatures are legally or ethically harmless.

### 11.1 Operational rule for entanglement

When layers are entangled, governance should default to the stricter layer.

A structural signature that may reveal biographical, demographic, medical, or sensitive information should not be governed as a merely non-biographical structure. A voice model that may reveal health or regional origin, a gait model that may reveal disability or injury, or a writing-style model that may reveal education or psychological state must carry this risk in its governance metadata.

This implies several operational requirements:

1. **Entanglement metadata** — models should indicate which sensitive or biographical inferences they may leak.
2. **Stricter-layer default** — when a signal crosses layers, consent and access rules should follow the more protective layer.
3. **Derivative propagation** — entanglement warnings should travel with derived models, synthetic outputs, exports, and archives.
4. **Revocation realism** — systems should distinguish between deletion, deactivation, deprecation, watermarking, and prohibition of future use, because learned structural derivatives may not always be literally removable.
5. **Contestability by layer** — the subject should be able to contest not only the raw data, but also the inferred structural layer and any sensitive leakage attached to it.

The legal and ethical question is therefore not only:

> Did the person provide this data?

It is also:

> Did the person authorize the construction, retention, transfer, or use of a structural model derived from this data?

---

## 12. PrivAI or Equivalent Fiduciary Guardianship

Structural signatures require fiduciary-style governance.

This paper uses **PrivAI** as the working name for such an institution, already present in the broader Cogentia corpus. However, the claim should be read in a general and cautious form:

> **PrivAI, or an equivalent non-extractive fiduciary institution, is one plausible institutional response to the governance gap created when structural signatures are modeled at sufficient depth to support recognition, reconstruction, simulation, delegation, or posthumous consultation.**

This is a governance thesis, not a finished institutional specification and not a claim that existing regulators, courts, data protection authorities, DPIAs, the GDPR, or the EU AI Act are irrelevant.

A non-biographical identifying structure can be more sensitive than many explicit biographical records. It may not reveal what happened to a person, but it can make the person recognizable, reproducible, predictable, manipulable, or imitable.

This creates a gap in ordinary privacy reasoning. Traditional privacy protection often focuses on:

- secrecy of personal facts;
- control of personal documents;
- minimization of collected data;
- consent to processing;
- access, rectification, deletion, and portability rights;
- objection to automated processing.

These remain necessary. They may not be sufficient for high-resolution structural models because many of the relevant harms occur at the level of inferred, derivative, or progressively accumulated models rather than at the level of a single disclosed record.

The governance gap is operational: who can inspect the model, contest its inferences, know which derivatives exist, verify whether a synthetic representation used a legitimate source, retire a posthumous twin, or prevent a platform from reusing structural identity patterns for purposes never contemplated at collection time? Existing legal regimes may provide rights and duties, but those rights still require institutions, standards, procedures, and technical artefacts that make them executable.

Structural signatures create additional risks:

- hidden extraction of identity patterns;
- reconstruction without archives;
- imitation without biography;
- emotional or cognitive manipulation;
- non-consensual embodied modeling;
- continuous authentication repurposed as surveillance;
- posthumous capture;
- downstream derivatives that cannot be meaningfully revoked;
- institutional or platform enclosure of the person's structural model.

A platform cannot be trusted to govern this alone when its business model benefits from extracting, refining, and monetizing personal models. Individual consent alone is also insufficient, because individuals rarely understand the full consequences of structural modeling, especially when the model is inferred progressively from many ordinary interactions.

### 12.1 Minimal Mandate

PrivAI, or an equivalent institution, would need at least the following mandate:

1. **Certification** — certify Cogentigram and structural-signature methodologies.
2. **Layer governance** — define which layers may be modeled, under what consent, and for what purpose.
3. **Audit** — audit extraction, inference, storage, transfer, and synthetic use.
4. **Contestability** — provide procedures for contesting inaccurate, abusive, or overreaching models.
5. **Revocation and retirement** — define what can be revoked, what can only be deprecated, and what derivatives must be destroyed or marked.
6. **Provenance** — maintain standards for model origin, training source, consent trail, and synthetic output provenance.
7. **Posthumous governance** — distinguish consultation, heritage, simulation, and prohibited delegation.
8. **Anti-capture safeguards** — prevent platforms, states, insurers, employers, or political actors from controlling the institution.
9. **Public-interest review** — evaluate exceptional uses, including research, forensic, medical, or memorial uses.

### 12.2 Limits of the PrivAI Claim

PrivAI would not replace regulators, courts, data protection authorities, the GDPR, the EU AI Act, or technical privacy methods such as federated learning and differential privacy.

Its role would be different: to act as a fiduciary-style guardian for structural personal models whose risks are distributed across technical, legal, psychological, memorial, and political domains.

This paper does not yet specify:

- the legal form of PrivAI;
- its funding model;
- its jurisdictional competence;
- its enforcement powers;
- its dispute-resolution procedures;
- its relationship with public regulators;
- its anti-capture governance design.

These are open requirements for a dedicated follow-up specification. The present paper argues that such an institution, or an equivalent non-extractive fiduciary structure, is a plausible and perhaps necessary response once the Cogentigram is extended from cognitive structure to structural identity. The necessity claim remains to be specified and tested against existing regulators, data trusts, fiduciary data governance models, and technical standards.

The institutional principle is therefore:

> **A person's structural signature should not be treated as raw material for platforms. It should be treated as a sovereign model requiring fiduciary-style protection.**

PrivAI is one proposed answer. The broader requirement is that non-biographical identifying structures should not be governed solely by the platform that extracts them or by individual consent mechanisms that cannot realistically anticipate derivative model use.

---

## 13. Governance Requirements

A legitimate structural-signature system should satisfy at least the following requirements.

### 13.1 Layered consent

Consent should be specific to each layer:

- archive use;
- biographical memory use;
- cognitive signature modeling;
- embodied presence modeling;
- interactional modeling;
- public representation;
- posthumous consultation;
- delegation or agentic action.

Consent to one layer must not imply consent to another.

### 13.2 Local-first processing

Whenever possible, raw embodied, linguistic, or cognitive data should remain local. External systems should receive only the minimum necessary representation, preferably under explicit authorization and audit.

### 13.3 Contestability

The modeled person must be able to contest:

- axis definitions;
- inferred traits;
- confidence levels;
- uses of the model;
- representations generated from the model;
- third-party claims based on the model.

### 13.4 Provenance and watermarking

Synthetic outputs derived from a person's structural signature should carry provenance metadata. A representation generated from a Cogentigram should not be passed off as raw video, direct speech, or unmediated presence.

### 13.5 Revocation and retirement

Models must have revocation rules. Some layers may be deactivated, rotated, degraded, or retired. Some outputs may remain as historical artifacts, but active generative use should remain governable.

### 13.6 Posthumous governance

A posthumous twin may be a cultural, historical, artistic, or familial artifact. It should not acquire political agency. It should not vote. It should not be captured by those who administer it.

The dead may be consulted. They must not govern the living.

---

## 14. Second-Method Stress Test

This section applies a compact second-method stress test. The objective is not to defend the paper rhetorically, but to expose the main objections in a form that can improve the framework.

### Objection 1 — Overextension

**Objection.** The extended Cogentigram becomes too broad. If it includes gait, voice, gesture, reasoning, writing style, gaze, and interactional timing, it risks becoming a synonym for all personal modeling.

**Response.** This objection is valid unless the boundary condition is enforced. The Cogentigram does not include all personal data. It includes only what identifies through structure. Administrative identifiers, life events, locations, and documents are not Cogentigram data merely because they identify. They belong to other layers of the digital twin.

**Revision retained.** A datum belongs to the Cogentigram only when it identifies through structure.

### Objection 2 — Privacy

**Objection.** Modeling a person through non-biographical signatures may be more intrusive than collecting explicit biographical data, because the person may not know what is being inferred.

**Response.** Correct. This is the reason for the paper, not an objection against it. The category of non-biographical identifying structures makes visible a privacy risk that otherwise remains hidden.

**Revision retained.** PrivAI, or an equivalent non-extractive fiduciary institution, is treated as one plausible governance response to structural-signature risks, not as a substitute for law, regulators, or technical safeguards.

### Objection 3 — Deepfake and imitation

**Objection.** A high-resolution embodied Cogentigram could enable more convincing deepfakes, impersonation, and manipulation.

**Response.** Correct. Any serious model of embodied presence can be abused. The appropriate answer is not to deny the possibility of modeling, because platforms will model anyway. The answer is to make the model sovereign, consent-based, local-first, auditable, provenance-marked, and institutionally protected.

**Revision retained.** No embodied-presence layer should be deployed without provenance, watermarking, and revocation mechanisms.

### Objection 4 — Legal sufficiency

**Objection.** Existing legal categories such as personal data, biometric data, profiling, and high-risk AI systems already cover these issues.

**Response.** Partly. Existing law provides necessary protection, but it does not give a precise conceptual vocabulary for structural signatures that are non-biographical, dynamic, distributed, and model-dependent. The proposed framework helps interpret and operationalize legal duties in systems that infer identity through structure.

**Revision retained.** The paper does not replace legal categories. It supplies a technical-conceptual layer beneath them.

### Objection 5 — Identity realism

**Objection.** A structural signature is not the person. A digital twin built from signatures may be persuasive without being faithful.

**Response.** Correct. The Cogentigram is a map, not the territory. Fidelity requires structural coherence, biographical anchoring, evidential archives, consent, contestability, and governance. A structural model alone can produce recognizability without truth.

**Revision retained.** The paper must distinguish recognition, representation, fidelity, and legitimacy.

---

### 14.6 Related-Work Objection

**Objection.** The paper repackages existing fields under new names.

**Response.** The objection is partly accepted. The paper must not claim novelty where the literature already exists. Behavioral biometrics, soft biometrics, stylometry, continuous authentication, human digital twins, self-sovereign identity, and privacy-preserving machine learning already cover many underlying signals and risks. The contribution is not the discovery of those signals. It is their architectural placement inside Cogentia as layers of a consent-based sovereign digital twin.

**Revision requirement.** The paper must continue to maintain a clear related-work map and explicitly distinguish its classificatory contribution from prior empirical and technical fields.

---

## 15. Open Problems

The framework opens several research and governance problems.

1. **Resolution threshold.** At what point does a structural signature become identifying enough to require special protection?

2. **Consent granularity.** How should consent be separated across cognitive, embodied, linguistic, and interactional layers?

3. **Model drift.** How should structural signatures change over time without freezing a person into an obsolete model?

4. **Fidelity metrics.** How can one distinguish a faithful digital twin from a plausible imitation?

5. **Representation marking.** What standard should mark outputs generated from a person's structural signature?

6. **Posthumous control.** Who may maintain, consult, degrade, retire, or contest the structural model of a deceased person?

7. **Collective extension.** Can communities, institutions, or movements have non-biographical structural signatures analogous to individual Cogentigrams?

8. **Adversarial protection.** How can persons defend against unwanted structural modeling by platforms or hostile actors?

9. **PrivAI design.** What legal form, governance structure, funding model, and accountability mechanisms are required for a non-profit guardian of sovereign digital twins?

---

## 16. Conclusion

The future of digital identity will not be limited to names, documents, faces, or voices. It will increasingly involve structural signatures: embodied, expressive, linguistic, cognitive, behavioral, and interactional patterns that make a person recognizable across contexts.

The classical distinction between biometric and psychometric data is insufficient for this future. AI systems do not respect that boundary. They learn patterns wherever patterns exist.

The key distinction is different:

> **Biography tells what happened. The Cogentigram models what remains recognizable. The digital twin emerges when narrative memory, evidential archives, structural coherence, and consent-based governance are articulated.**

Non-biographical does not mean non-identifying.

A person can be recognized by how they walk, speak, write, hesitate, look, gesture, prioritize, reason, respond, and restore coherence over time. These patterns do not necessarily tell the person's life story. They may nevertheless identify, reconstruct, represent, or imitate the person.

This is why the extended Cogentigram matters.

It names the structural layer of personal identity that AI systems are increasingly able to infer. It also makes clear why such modeling must not be left to platforms. Structural signatures call for sovereignty, consent, auditability, contestability, provenance, revocation, and fiduciary-style institutional guardianship.

The technical conclusion is that digital twins must be layered.

The ethical conclusion is that structural signatures are sensitive even when they are not biographical.

The institutional conclusion is that PrivAI, or an equivalent non-extractive guardian, is a plausible response to a governance gap that ordinary privacy compliance does not by itself fully operationalize.

---

## Suggested Entry for `research/index.md`

```markdown
| [From Biometrics and Psychometrics to Structural Signatures — A Cogentia Framework for Consent-Based Sovereign Digital Twins](structural_signatures.md) *(working paper v0.9 — classificatory and architectural framing of non-biographical structural signatures, embodied presence, and fiduciary governance for sovereign digital twins)* | this repo | 2026-05-22 |
```

---

## Continuation

This working paper can be continued in five directions.

### 1. Specialized literature extension

The related-work section is sufficient for this public working-paper release. Future versions may extend it with more specialized literature on:

- behavioral biometrics;
- gait recognition;
- voice recognition;
- stylometry;
- digital twins of persons;
- personality modeling;
- embodied cognition;
- deepfake detection;
- privacy-preserving machine learning;
- fiduciary models of data governance.

### 2. PrivAI specification

Produce a separate working paper:

```text
PrivAI: Institutional Guardianship for Sovereign Digital Twins
```

This should specify governance, legal form, certification, dispute resolution, model revocation, posthumous control, and non-profit anti-capture safeguards.

### 3. Embodied Cogentigram specification

Produce a separate technical note:

```text
Embodied Cogentigram: Modeling Gait, Voice, Gesture, Gaze, and Presence
```

This should develop the embodied presence layer without overloading the present paper.

### 4. Frugal immersive room architecture

Produce a separate applied note connecting:

- Google Beam as high-end signal;
- Mariani Village as prior frugal immersive-room concept;
- student cabin in movable container;
- low-cost projector and camera;
- local-first embodied modeling;
- semantic transmission instead of full video transmission;
- sovereign digital twin governance.

### 5. Individual / collective twin dialectic

The structural-signature framework was developed primarily for the natural-person case. The companion paper [`individual_and_collective_digital_twins.md`](individual_and_collective_digital_twins.md) (v0.1, 2026-05-31) extends the twin family to the legal-person case and formalises the dialectic between the two regimes — usurpation vs irresponsibility, consultative vs imputable, posthumous regime vs dissolution regime. Future versions of the present paper should:

- import the per-subject metadata block (`type: physical_person | legal_person`, `posthumous`, `rights_context`, …) into the structural-signature workflow;
- clarify which structural-signature axes are meaningful for legal persons (institutional rhythm, decisional style, communication pattern) versus reserved to natural persons (gait, voice, embodied gesture);
- align with `cogentigraphic_distillation.md` on the cognitive-operating-rules / biographical-memory split, now extended bilaterally.

---

## References and Anchors

[^google-beam]: Google. *Google Beam: Our AI-first 3D video communication platform*. The Keyword, May 20, 2025. https://blog.google/innovation-and-ai/technology/research/project-starline-google-beam-update/

[^starline-2021]: Lawrence, J., Goldman, D. B., Achar, S., et al. *Project Starline: A high-fidelity telepresence system*. ACM Transactions on Graphics, 40(6), 2021. Google Research publication page: https://research.google/pubs/project-starline-a-high-fidelity-telepresence-system/

[^hp-dimension]: HP. *HP Dimension with Google Beam*. Enterprise 3D collaboration product materials. https://www.hp.com/us-en/solutions/hp-dimension.html

[^verge-hp]: The Verge. *HP reveals $24,999 hardware created just for Google Beam*. June 11, 2025. https://www.theverge.com/news/684859/hp-dimension-google-beam-3d-video-communication

[^gdpr-art4]: Regulation (EU) 2016/679, General Data Protection Regulation, Article 4. Definitions of personal data, processing, profiling, pseudonymisation, biometric data, and related terms. Accessible reference: https://gdpr-info.eu/art-4-gdpr/

[^gdpr-biometric]: Regulation (EU) 2016/679, General Data Protection Regulation, Article 4(14), definition of biometric data: personal data resulting from specific technical processing relating to physical, physiological, or behavioural characteristics allowing or confirming unique identification.

[^ai-act-definitions]: Regulation (EU) 2024/1689, Artificial Intelligence Act, Article 3 definitions of biometric data, biometric identification, biometric verification, emotion recognition, biometric categorisation, and remote biometric identification. Accessible reference: https://artificialintelligenceact.eu/article/3/

[^abuhamad-2020]: Abuhamad, M., Abusnaina, A., Nyang, D., & Mohaisen, D. *Sensor-based Continuous Authentication of Smartphones' Users Using Behavioral Biometrics: A Contemporary Survey*. arXiv:2001.08578, 2020. https://arxiv.org/abs/2001.08578

[^mahfouz-2018]: Mahfouz, A., Mahmoud, T. M., & Sharaf Eldin, A. *A Survey on Behavioral Biometric Authentication on Smartphones*. arXiv:1801.09308, 2018. https://arxiv.org/abs/1801.09308

[^hanisch-2021]: Hanisch, S., Arias-Cabarcos, P., Parra-Arnau, J., & Strufe, T. *Privacy-Protecting Techniques for Behavioral Biometric Data: A Survey*. arXiv:2109.04120, 2021. https://arxiv.org/abs/2109.04120

[^shen-2022]: Shen, C., Yu, S., Wang, J., Huang, G. Q., & Wang, L. *A Comprehensive Survey on Deep Gait Recognition: Algorithms, Datasets and Challenges*. arXiv:2206.13732, 2022. https://arxiv.org/abs/2206.13732

[^horvath-2026]: Horvath, M., Pietrikova, E., & Spinellis, D. *Bridging Behavioral Biometrics and Source Code Stylometry: A Survey of Programmer Attribution*. arXiv:2603.11150, 2026. https://arxiv.org/abs/2603.11150

[^zhang-2026]: Zhang, L., & Zhang, H. *De-Anonymization at Scale via Tournament-Style Attribution*. arXiv:2601.12407, 2026. https://arxiv.org/abs/2601.12407

[^fernandez-2024]: Fernandez, I. A., Neupane, S., Chakraborty, T., Mitra, S., Mittal, S., Pillai, N., Chen, J., & Rahimi, S. *A Survey on Privacy Attacks Against Digital Twin Systems in AI-Robotics*. arXiv:2406.18812, 2024. https://arxiv.org/abs/2406.18812

[^jurcys-2026]: Jurcys, P., Greenwald, A., Fenwick, M., Loikkanen, V., Mann, S. P., & Earp, B. D. *Who Owns My AI Twin? Data Ownership in a New World of Simulated Identities*. arXiv:2601.09877, 2026. https://arxiv.org/abs/2601.09877


[^pan-2025]: Pan, R., Sun, H., Chen, X., Pedrielli, G., & Huang, J. *Human Digital Twin: Data, Models, Applications, and Challenges*. arXiv:2508.13138, 2025. https://arxiv.org/abs/2508.13138

[^mandischer-2025]: Mandischer, N., Atanasyan, A., Dahmen, U., Schluse, M., Rossmann, J., & Mikelsons, L. *Holistic Specification of the Human Digital Twin: Stakeholders, Users, Functionalities, and Applications*. arXiv:2507.14859, 2025. https://arxiv.org/abs/2507.14859

[^coll-2025]: Coll, L. C., Lauer-Schmaltz, M. W., Cash, P., Hansen, J. P., & Maier, A. *Towards the "Digital Me": A vision of authentic Conversational Agents powered by personal Human Digital Twins*. arXiv:2506.23826, 2025. https://arxiv.org/abs/2506.23826

[^verge-synthid-2026]: The Verge. *Google is trying to make deepfake detection more accessible for everyone*. May 19, 2026. https://www.theverge.com/tech/933424/google-synthid-c2pa-content-credentials-expansion

[^verge-labeling-2026]: The Verge. *It’s make or break time for AI labeling systems*. May 20, 2026. https://www.theverge.com/ai-artificial-intelligence/934521/google-synthid-c2pa-content-credentials-ai-labelling-efforts

[^reuters-ai-act-2025]: Reuters. *EU lays out guidelines on misuse of AI by employers, websites and police*. February 4, 2025. https://www.reuters.com/technology/artificial-intelligence/eu-lays-out-guidelines-misuse-ai-by-employers-websites-police-2025-02-04/

[^did-core]: W3C. *Decentralized Identifiers (DIDs) v1.0: Core architecture, data model, and representations*. W3C Recommendation, 2022. https://www.w3.org/TR/did-1.0/

[^solid]: Solid Project. *About Solid*. https://solidproject.org/about

[^dwork-2006]: Dwork, C., McSherry, F., Nissim, K., & Smith, A. *Calibrating Noise to Sensitivity in Private Data Analysis*. Theory of Cryptography Conference, 2006.

[^nissenbaum-2010]: Nissenbaum, H. *Privacy in Context: Technology, Policy, and the Integrity of Social Life*. Stanford University Press, 2010.

[^cogentia-digital-twin]: Robert, J. H. N. *The Sovereign Digital Twin: Cogentia, Cogentigram, Cogentiscope*. Cogentia repository, 2026. https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia-digital-twin.md

[^cogentia-cogentigram]: Robert, J. H. N. *Cogentia and Cogentigrams: A Framework for Structured Representation of Persistent Cognitive Signatures in AI Systems*. Cogentia repository, 2026. https://github.com/JeanHuguesRobert/cogentia/blob/main/research/Cogentia-and-Cogentigram.md

[^cognitive-packets]: Robert, J. H. N. *Cognitive Packets: An Envelope and Payload Format for Human–AI and Multi-Agent Cooperation*. Cogentia repository, 2026. https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cognitive_packets.md


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia and Cogentigrams](Cogentia-and-Cogentigram.md)
- [The Sovereign Digital Twin: Cogentia, Cogentigram, Cogentiscope](cogentia-digital-twin.md)
- [Cogentigraphic Distillation](cogentigraphic_distillation.md)
- [Research Index — Cogentia](index.md)
- [Individual and Collective Digital Twins](individual_and_collective_digital_twins.md)
- [From Biometrics and Psychometrics to Structural Signatures](structural_signatures.md)

<!-- END_AUTO: backlinks -->
