---
title: "Research Index — Cogentia"
description: "A map of what is, what is in progress, and what could be."
layout: default
nav_order: 1
last_modified_at: 2026-05-22
license: CC BY-SA 4.0
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: 2026-05-22
creator: Jean Hugues Noël Robert, baron Mariani
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/index.md
---
<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Autonomia to DHITL**
> ⬅️ Previous: [Corpus Status — cogentia](corpus-status.md)

> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [Corpus Status — cogentia](corpus-status.md)

<!-- END_AUTO: trails -->

# Research Index — Cogentia

## Foundation

This repository instantiates the **cognitive infrastructure layer** of the [DHITL](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) AI Safety anti-capture proposal — at both the individual scale (*Personal Cogentia*) and the collective scale (*Cogentia Commons*). The architectural axiom lives in [`marenostrum/DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md). The method by which the proposal develops lives in [`barons-Mariani/research/second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md).

---

*A map of what is, what is in progress, and what could be.*
*See sibling indexes in [MareNostrum](https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/index.md), [FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/index.md), [barons-Mariani](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/index.md), [Inseme](https://github.com/JeanHuguesRobert/inseme/blob/main/research/index.md), [Inox](https://github.com/JeanHuguesRobert/Inox/blob/master/research/index.md).*

---

## Published

| Title | Location | Date |
|---|---|---|
| [**Cogentia — the framework, in five distinctive moves**](../COGENTIA.md) *(identity document; entry point)* | this repo | 2026-05-13 |
| [Agent-Resumable CLI — Externalized Judgment, Continuations, and Provider-Neutral Resumption for AI-Compatible CLI Tools](agent_resumable_cli.md) *(defines `cogentia.continuation.v1`, implemented by `scripts/cogentia.js continuation`)* | this repo | 2026-05-14 |
| [Cognitive Packets — An Envelope and Payload Format for Human–AI and Multi-Agent Cooperation](cognitive_packets.md) *(working paper v0.3 — envelope/payload split ; paired operational prompt in [`prompts/cognitive_packet.md`](../prompts/cognitive_packet.md))* | this repo | 2026-05-21 |
| [Pipeline — From cognitive packets to source documents and derived products](pipeline.md) *(method note v0.4 — packet-switched, self-applicative; canonical operational method of the corpus)* | this repo | 2026-05-25 |
| [Derived Products — Versioned Source Corpora, Situated Forms, and Publication Agents](derived_products.md) *(working paper v0.2 — source ↔ derived split; companion to [`pipeline.md`](pipeline.md))* | this repo | 2026-05-23 |
| [cogentia.js — Tutorial and Near-Specification](cogentia_js_tutorial.md) *(auto-generated tutorial v0.1 — core ideas, storage model, 14 workflows, command reference for v0.10.0; sufficient for a faithful re-implementation in another language)* | this repo | 2026-05-27 |
| [Self-Contained Documents in an Interconnected Corpus](self_contained_documents.md) *(method note v0.3 — formalises the auto-portance principle: a document may cite/extend/transform other texts, but its main claims remain assessable without prior external reading; emerged from work on `traceabilite_des_actes`)* | this repo | 2026-05-27 |
| [Cogentia Workflows](cogentia_workflows.md) *(private/group/public/federated workflow architecture, draft v0.2)* | this repo | 2026-05-11 |
| [Cogentia Commons Working Paper](Cogentia_Commons_Working_Paper.md) | this repo | 2026 |
| [Cogentia and Cogentigram](Cogentia-and-Cogentigram.md) | this repo | 2026 |
| [The Sovereign Digital Twin — Cogentia, Cogentigram, Cogentiscope](cogentia-digital-twin.md) | this repo | 2026-04 |
| [Democratic AI Safety — alias](democratic_ai_safety.md) *(canonical in barons-Mariani; this file is now a stub)* | this repo | 2026-05-18 |
| [KYS — Psychocognitive Analysis Protocol v1.0](kys-prompt.md) | this repo | 2026 |
| [COGENTIA v1.0 — Prompt d'analyse psychocognitive (FR)](cogentia_prompt_v1.md) | this repo | 2026 |
| [Corpus Status](corpus-status.md) *(living view — auto-refreshed by `cogentia.js corpus-status`)* | this repo | refreshable |
| [Concept Index](concepts.md) *(typed concept registry — mapped by `cogentia.js concepts`)* | this repo | refreshable |
| [Agent Navigation Guide (Context Server)](../docs/agent_context_server.md) *(meta-prompt for AI agents — bundle, query, continuation)* | this repo | 2026-05-16 |
| [The Knowledge Mesh (Decentralized Wiki)](../docs/knowledge_mesh.md) *(backlinks, trails, Jekyll — human navigation guide)* | this repo | 2026-05-16 |
| [Trail — From Method to Machine](trails/from_method_to_machine.md) *(curated reading path for newcomers — technical / cognitive infrastructure entry)* | this repo | 2026-05 |
| [Trail — From Autonomia to DHITL](trails/from_autonomia_to_dhitl.md) *(curated reading path for the political / territorial entry into the Democratic AI Safety thesis)* | this repo | 2026-05-18 |

---

## Referenced

*Hosted elsewhere, intellectually connected here.*

| Title | Location |
|---|---|
| [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) *(founding doctrine — names cogentia.js as canonical tooling)* | barons-Mariani |
| [Democratic AI Safety — Why AI Safety Must Protect Human Sovereignty Against AI-Augmented Legal Persons](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/democratic_ai_safety.md) *(canonical paper, draft v0.5)* | barons-Mariani |
| [DHITL — Democratic Humans in the Loop](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) *(Cogentia = Layer 4)* | marenostrum |
| [CXU Specification](https://github.com/JeanHuguesRobert/marenostrum/blob/main/CXU_SPEC.md) | marenostrum |
| [Constellia](https://github.com/JeanHuguesRobert/marenostrum/blob/main/constellia.md) *(ICOME'26, avec Guillermo Valdes)* | marenostrum |
| [Packetized Gravity Networks](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/PGN.md) | FractaVolta |
| [Inseme — deployable platform + COP runtime](https://github.com/JeanHuguesRobert/inseme/blob/main/research/index.md) *(targets brique-cogentia-commons in v1)* | inseme |
| [Inox — language and runtime substrate](https://github.com/JeanHuguesRobert/Inox/blob/master/research/inox-spec.md) *(concatenative stack VM; long-term Fractanet node runtime; cognitive-infrastructure tooling may eventually compile/run on Inox)* | Inox |

---

## In Progress

- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md) *(draft v0.10.2, 2026-05-13)*
- [Cogentia Commons — COMMUNITY.md Sub-Specification](cogentia_commons_community_manifest.md) *(draft v0.2, 2026-05-13)*
- [Cogentia Commons — `kernel_extractor` Plugin Sub-Specification](cogentia_commons_kernel_extractor.md) *(draft v0.1, 2026-05-12)*
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md) *(draft v0.1, 2026-05-12)* — `citation_validator`, `consistency_scanner`, `objection_summariser`
- [Cogentia Commons — Substantive Plugin Sub-Specifications](cogentia_commons_substantive_plugins.md) *(draft v0.1, 2026-05-12)* — `falsifiability_conversion`, `revision_proposer`
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md) *(draft v0.1, 2026-05-13)* — 11 end-to-end user journeys, prioritised for v1 velocity
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md) *(snapshot 2026-05-13)* — handoff document; entry point for the next session
- Multi-Agent Critique Loop — formal specification
- Cogentia × Corsica: student registration as democratic infrastructure

---

## Open Possibilities

*Ideas that trotte — no commitment, no deadline.*

- Cogentia Commons as methodology for any distributed peer-review process
- Cogentigram as visual language for knowledge graph navigation
- PrivAI governance model — from non-profit to cooperative structure

---

*Priority established by first public commit. License: CC BY-SA 4.0 (research) / MIT (code, via PrivAI).*
*Fork to explore alternatives. Challenge via issues.*

<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia](../COGENTIA.md)
- [Agent Navigation Guide (Context Server)](../docs/agent_context_server.md)
- [Frontmatter Schema — v0.1 (Corpus)](../docs/frontmatter-schema.md)
- [Frontmatter Synonym Mapping — v0.1](../docs/frontmatter-synonym-mapping.md)
- [Agent-Resumable CLI](agent_resumable_cli.md)
- [Cogentia Commons — COMMUNITY.md Sub-Specification](cogentia_commons_community_manifest.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — `kernel_extractor` Plugin Sub-Specification](cogentia_commons_kernel_extractor.md)
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md)
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md)
- [Cogentia Commons — Substantive Plugin Sub-Specifications](cogentia_commons_substantive_plugins.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Cogentia Commons: A Platform Architecture for Collaborative Possibility Exploration Under Scientific Constraint](Cogentia_Commons_Working_Paper.md)
- [cogentia.js — Tutorial and Near-Specification](cogentia_js_tutorial.md)
- [COGENTIA v1.0 — Prompt d'analyse psychocognitive](cogentia_prompt_v1.md)
- [Cogentia Workflows](cogentia_workflows.md)
- [Cogentia and Cogentigrams](Cogentia-and-Cogentigram.md)
- [The Sovereign Digital Twin: Cogentia, Cogentigram, Cogentiscope](cogentia-digital-twin.md)
- [Cognitive Packets](cognitive_packets.md)
- [Concept Index — cogentia](concepts.md)
- [Corpus Status — cogentia](corpus-status.md)
- [Democratic AI Safety — alias cogentia](democratic_ai_safety.md)
- [Derived Products](derived_products.md)
- [kys-prompt.md](kys-prompt.md)
- [Pipeline](pipeline.md)
- [Self-Contained Documents in an Interconnected Corpus](self_contained_documents.md)
- [From Biometrics and Psychometrics to Structural Signatures](structural_signatures.md)
- [Trail: From Autonomia to DHITL](trails/from_autonomia_to_dhitl.md)
- [Trail: From Method to Machine](trails/from_method_to_machine.md)

<!-- END_AUTO: backlinks -->
