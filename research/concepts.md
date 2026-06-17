---
title: "Concept Index — cogentia"
description: "Typed concept registry for humans and AI agents; structure only, not semantic authority."
layout: default
nav_order: 3
last_modified_at: 2026-05-16
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md
last_stamped_at: 2026-06-01
license: CC BY-SA 4.0
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: 2026-05-16
creator: Jean Hugues Noël Robert, baron Mariani
---

# Concept Index — cogentia
<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [Agent Navigation Guide (Context Server)](../docs/agent_context_server.md)
<!-- END_AUTO: trails -->
This file maps concepts used across the corpus.

`cogentia.js` maintains structure, links, scopes, status and graphs. It does not infer semantic truth.

## Status scale

- **Seed** — intuition not yet stabilized.
- **Working** — recurring and usable, but still evolving.
- **Defined** — explicit definition exists.
- **Operational** — connected to implementation, protocol, code, governance or legal use.
- **Canonical** — should be treated as a reference concept unless revised.

---

## Civilizational Stakes

The paired abstract framework that names the civilizational stakes served by the entire corpus and its two operational declinations (Cogentia Commons manual + Fractanet/COP automated). This repo develops the methodological and packet-level implementation side.

---

## Machine à explorer

**Type:** abstract concept / infrastructure protocol  
**Scope:** Global  
**Status:** Seed  

**Short definition:**  
Système (humain, hybride ou automatisé) conçu pour maximiser la capacité rationnelle et collective à explorer des futurs possibles : association d'idées, capture de sérendipité, traçabilité forte (parentEventIds, continuations), boucles theory-practice, mécanismes anti-Ubik (Stabilisateurs procéduraux), et interconnexion coopérative sans centre capturable. Gabarit abstrait dont dérivent des instances (Cogentia Commons manuel, Fractanet/COP automatisé, etc.) formant un écosystème réactif.

**Parent concepts:**
- Possibilism
- Democratic AI Safety

**Child concepts:**
- Cogentia Commons (déclinaison manuelle)
- Fractanet / COP (déclinaison automatisée)
- Stabilisateurs (anti-Ubik)

**Related concepts:**
- Continuation Protocol
- Cognitive Packet
- DHITL (couches 4/5)
- Effet Ubik (opposé)

**Reference documents:**
- `barons-Mariani/research/second_method.md` (Rule 0 + Five Rules)
- `marenostrum/DHITL.md`
- `cogentia/research/pipeline.md`
- `cogentia/research/cogentia_workflows.md`
- `barons-Mariani/research/ubik_reality_dislocation.md`
- `research/PHASE1_LECTURE_ANALYSE.md` + `PHASE1_VALIDATION.md`

**Used in:**
- Gabarit abstrait "Machine à explorer" (sandbox/cop-continuation-bac-a-sable)
- Phase 1 validation doctrinale (mai 2026)
- Agent-Resumable CLI, Cognitive Packets, Continuation Protocol (implémentation concrète des mécanismes)
- Future COP Phase 2 (invariants à dériver du kernel)

---

## Machine à empêcher

**Type:** abstract concept  
**Scope:** Global  
**Status:** Seed  

**Short definition:**  
Cluster de dynamiques (concentration de compute/mémoire/influence, opacité, perte de traçabilité, capture par outer optimizer, effet Ubik de dislocation de la réalité partagée, rigidification procédurale, amnesia institutionnelle) qui réduisent structurellement la capacité d'individus et de collectifs à explorer des futurs possibles. Modèle explicite à neutraliser, pas seulement à déplorer.

**Related concepts:**
- Effet Ubik
- Machine à explorer (opposé symétrique)
- FM-11 (outer optimizer capture)
- Concentration de compute (85% frontier)

**Reference documents:**
- `barons-Mariani/research/ubik_reality_dislocation.md`
- `marenostrum/DHITL.md` (§1.2, FM-11)
- `barons-Mariani/research/second_method.md` (conditions d'échec + Rule 0)
- `research/PHASE1_LECTURE_ANALYSE.md`

**Used in:**
- Phase 1 (modélisation des empêchements à neutraliser)
- Conception des mécanismes anti-capture dans le pipeline et les continuations

---

## Effet Ubik

**Type:** sociological / infrastructural pathology  
**Scope:** Global  
**Status:** Working  

**Short definition:**  
Dislocation opérationnelle de la réalité partagée sous l'effet combiné de complexité, médiation accélérée, incitations plateformes, médias synthétiques et IA. Réalité qui "décroît" (régression d'objets, perte de consistance, demi-vie informationnelle). Pas une disparition de la réalité, mais une destruction des procédures qui permettent de la stabiliser collectivement.

**Parent concepts:**
- Machine à empêcher

**Related concepts:**
- Stabilisateurs (anti-Ubik)
- Pathologie du secret
- Invidia (densité sociale destructrice)

**Reference documents:**
- `barons-Mariani/research/ubik_reality_dislocation.md` (source essay v0.1, 23 mai 2026)
- `cogentia/research/ubik_reality_dislocation_academic.md` et variantes

**Used in:**
- Phase 1 (modélisation du pôle empêcher)
- Conception des Stabilisateurs procéduraux (pipeline, continuations, return-to-corpus)

---

## Stabilisateurs (anti-Ubik / procéduraux)

**Type:** mechanism / anti-capture pattern  
**Scope:** Global  
**Status:** Working  

**Short definition:**  
Ensemble de procédures et d'infrastructures (provenance, versioning git, source corpora publics, traçabilité par continuations, objections qualifiées de premier plan, personas explicites, certification contextuelle, retour-au-corpus, event sourcing immutable, scheduler non-mutant) qui permettent à une réalité partagée de "tenir" dans le temps face à l'effet Ubik. Remplace le fantasme d'un Ubik magique par une infrastructure démocratique procédurale.

**Parent concepts:**
- Machine à explorer

**Related concepts:**
- Effet Ubik
- Continuation Protocol
- Cognitive Packet
- DHITL (Compute Exergy comme unité traçable)

**Reference documents:**
- `barons-Mariani/research/ubik_reality_dislocation.md:27` (citation centrale)
- `cogentia/research/pipeline.md`
- `marenostrum/DHITL.md`

**Used in:**
- Conception Cogentia Commons + Fractanet/COP
- Agent-Resumable CLI, Cognitive Packets, sandbox de validation à blanc (Phase 1)
- Kernel Extractor et workflows

---

## Cogentia


## Cogentigram

**Type:** representation / map
**Scope:** Global
**Status:** Working

**Short definition:**
A cogentigram is a structured, partial, auditable and revisable representation of a Cogentia.

**Parent concepts:**
- Cogentia

**Related concepts:**
- Map vs territory
- Operational memory
- Traceable agency

---

## Continuation Protocol

**Type:** protocol
**Scope:** Global
**Status:** Operational

**Short definition:**
The foundational system allowing AI agents to pause execution, seek human judgment, and safely resume CLI tools without being hard-coded to any single provider. The original research pattern was `cogentia.continuation.v1`; the current `scripts/cogentia.js` CLI serializes the smaller operational `cogentia.continuation.v2` form. In the broader COP context, continuations are first-class Artifacts (`cop/continuation`) that suspend work at the boundary between deterministic protocol mechanics and non-deterministic agentic cognition.

**Parent concepts:**
- Agent-Resumable CLI
- Machine à explorer

**Related concepts:**
- Non-deterministic Cognitive Step
- Human Enacted Decision Artifact
- Causal Trace Replay

**Reference documents:**
- [`research/agent_resumable_cli.md`](agent_resumable_cli.md)
- `inseme/packages/cop-core/Architecture.md` (§1.8, 2.7, 5.5)
- `inseme/packages/cop-core/Invariants.md` (updated Phase 2 analysis)

---

## Non-deterministic Cognitive Step (Agentic Step)

**Type:** process concept **Scope:** Global **Status:** Working

**Short definition:** A step whose output depends on agentic reasoning (human or AI) and is not guaranteed to be reproducible from identical inputs. This non-determinism is frequently a source of useful diversity for exploration and objection. COP and Cognitive Packets capture the actual output as an immutable Artifact rather than requiring deterministic re-computation.

**Parent concepts:**
- Machine à explorer

**Related concepts:**
- Human Enacted Decision Artifact
- Causal Trace Replay
- Continuation Protocol

**Reference documents:**
- `inseme/packages/cop-core/Architecture.md` (§3.5, updated Phase 2)
- `inseme/packages/cop-core/Invariants.md` (§9.1, updated Phase 2)
- `cogentia/research/cognitive_packets.md`

---

## Human Enacted Decision Artifact

**Type:** artifact type / imputability anchor **Scope:** Global **Status:** Working

**Short definition:** Explicit Artifact (especially in COP/HITL profile) representing a decision actively taken or validated by a living human. It functions as the structural anchor for imputability, skin in the game, and defense against harmful capture. Without it, log traceability survives but accountability dissolves.

**Parent concepts:**
- Machine à explorer
- COP/HITL Profile

**Related concepts:**
- Non-deterministic Cognitive Step
- Rule 0 (seconde méthode)
- DHITL Layer 5

**Reference documents:**
- `inseme/packages/cop-core/Architecture.md` (COP/HITL profile, updated Phase 2)
- `barons-Mariani/research/second_method.md`

---

## Causal Trace Replay (Auditable Causal Reconstruction)

**Type:** audit / replay mechanism **Scope:** Global **Status:** Working

**Short definition:** The replay model actually delivered by COP and Cognitive Packets: faithful reconstruction of causal history and recorded Artifacts. It does not claim deterministic re-execution of the internal reasoning of agents. This preserves honest audit while respecting the boundary between protocol mechanics and agentic cognition.

**Parent concepts:**
- COP Invariants
- Machine à explorer

**Related concepts:**
- Continuation Protocol
- Non-deterministic Cognitive Step

**Reference documents:**
- `inseme/packages/cop-core/Architecture.md` (§3.5, updated Phase 2)
- `inseme/packages/cop-core/Invariants.md` (§9.1, updated Phase 2)

---

## Cognitive Packet

**Type:** protocol / envelope+payload format
**Scope:** Global
**Status:** Defined

**Short definition:**
A minimal, transport-neutral, human-readable and machine-readable unit of cognitive work composed of two layers: an **envelope** carrying kind-agnostic metadata that any receiver can route, queue, archive, or acknowledge without interpreting the inner work; and a **payload** carrying kind-specific cognitive content (continuation, objection, hypothesis, decision, failure, routing) that an agent capable of handling the declared kind interprets. A `cogentia.continuation.*` object is the canonical payload of `packet_kind = continuation`: v1 is the fuller research shape, v2 is the compact current CLI shape.

**Parent concepts:**
- Continuation Protocol
- Agent-Resumable CLI

**Child concepts:**
- Envelope (kind-agnostic metadata layer)
- Payload (kind-specific content layer)
- Continuation payload
- Objection payload
- Hypothesis payload
- Decision payload
- Failure payload
- Routing payload

**Related concepts:**
- Cogentia Commons

**Reference documents:**
- [`research/cognitive_packets.md`](cognitive_packets.md) (working paper v0.3 — envelope/payload structure)
- [`prompts/cognitive_packet.md`](../prompts/cognitive_packet.md)

**Used in:**
- Cogentia CLI packet sub-commands (proposed in §22.3 of the working paper)
- copy/paste handoffs between AI agents and humans

---

## Cogentia Commons

**Type:** methodology
**Scope:** Global
**Status:** Canonical

**Short definition:**
The methodology surrounding Cogentia, establishing principles like "Every objection a first-class contribution."

**Reference documents:**
- [`research/Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md)

---

## Cogentia Pipeline

**Type:** methodology / packet-based transformation network
**Scope:** Global
**Status:** Defined

**Short definition:**
The operational method note of the Cogentia corpus: *pipeline on the surface, packet network in depth.* A packet-switched transformation chain — intuitions become cognitive packets, packets become versioned source documents, source documents derive into audience-specific products (papers, blogposts, parliamentary notes, public dashboards), public feedback reintegrates into the corpus. Self-applicative: the method note is itself an artefact of the method it describes. Operational counterpart of the *Discours de la seconde méthode*.

**Parent concepts:**
- Cogentia Commons
- Cognitive Packet

**Child concepts:**
- Source Document
- Derived Product

**Reference documents:**
- [`research/pipeline.md`](pipeline.md) (method note v0.4)
- [`research/derived_products.md`](derived_products.md) (companion paper v0.2)

**Used in:**
- the deployment of [`projet_1755.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/autonomia/projet_1755.md) (source) + [`1755.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/autonomia/1755.md) (derived dashboard) in `barons-Mariani`
- the source ↔ derived treatment of [`christianity_verticalization.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/christianity_verticalization.md) and its blogpost derivative

---

## Derived Product

**Type:** editorial form / publication mode
**Scope:** Global
**Status:** Defined

**Short definition:**
A situated form of a versioned source corpus, adapted to a specific audience, platform, persona and constraint. Academic papers, public essays, social posts, video scripts, parliamentary notes, public dashboards are all derived forms of equal status. Operating rule: *do not popularize from the academic paper; derive from the corpus.*

**Parent concepts:**
- Cogentia Pipeline

**Related concepts:**
- Source Document

**Reference documents:**
- [`research/derived_products.md`](derived_products.md)

---

## Sovereign Digital Twin

**Type:** system model
**Scope:** Global
**Status:** Defined

**Short definition:**
A model utilizing the Cogentiscope and Cogentigram to represent and enact user intent safely in cybernetic space.

**Reference documents:**
- [`research/cogentia-digital-twin.md`](cogentia-digital-twin.md)

---

## Agent-Resumable CLI

**Type:** architecture
**Scope:** Global
**Status:** Operational

**Short definition:**
An operational architecture allowing Command Line Interfaces to be interacted with safely by LLMs by enforcing deterministic boundaries and pause points.

**Reference documents:**
- [`research/agent_resumable_cli.md`](agent_resumable_cli.md)

---

## Kernel Extractor

**Type:** mechanism
**Scope:** repository-specific
**Status:** Working

**Short definition:**
A mechanism for distilling the core actionable kernel from broader deliberations and dialogues.

**Reference documents:**
- [`research/cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md)

---

## KYS (Know Your System) / Psychocognitive Analysis

**Type:** protocol
**Scope:** project-specific
**Status:** Working

**Short definition:**
The operational protocol and prompting framework for mapping the psychocognitive footprint of an AI or human agent.

**Reference documents:**
- [`research/kys-prompt.md`](kys-prompt.md)
- [`research/cogentia_prompt_v1.md`](cogentia_prompt_v1.md)

---

## Cogentia Workflows

**Type:** system model
**Scope:** repository-specific
**Status:** Defined

**Short definition:**
Specific governance structures (private, group, public, federated) enabling systematic peer review and verifiable decision trails.

**Reference documents:**
- [`research/cogentia_workflows.md`](cogentia_workflows.md)
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Schema — v0.1 (Corpus)](../docs/frontmatter-schema.md)
- [Frontmatter Synonym Mapping — v0.1](../docs/frontmatter-synonym-mapping.md)
- [Research Index — Cogentia](index.md)
- [The Knowledge Mesh (Decentralized Wiki)](../docs/knowledge_mesh.md)
- [Trail: From Method to Machine](trails/from_method_to_machine.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
- [MareNostrum — Tableau de bord](https://github.com/JeanHuguesRobert/marenostrum/blob/main/dashboard.md)
<!-- END_AUTO: backlinks -->
