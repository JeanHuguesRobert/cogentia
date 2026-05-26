---
title: "Concept Index — cogentia"
description: "Typed concept registry for humans and AI agents; structure only, not semantic authority."
layout: default
nav_order: 3
last_modified_at: 2026-05-16
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md
last_stamped_at: 2026-05-26
---

# Concept Index — cogentia

This file maps concepts used across the corpus.

`cogentia.js` maintains structure, links, scopes, status and graphs. It does not infer semantic truth.

## Status scale

- **Seed** — intuition not yet stabilized.
- **Working** — recurring and usable, but still evolving.
- **Defined** — explicit definition exists.
- **Operational** — connected to implementation, protocol, code, governance or legal use.
- **Canonical** — should be treated as a reference concept unless revised.

---

## Cogentia

**Type:** abstract concept / agentivity class
**Scope:** Global
**Status:** Working

**Short definition:**
Cogentia designates the actual situated agentivity of an entity — physical person, legal person, or AI agent — combining memory, mandate, capabilities, procedures, acts and traces.

**Parent concepts:**
- Traceable agency

**Child concepts:**
- Cogentigram
- Operational memory

**Reference documents:**
- `research/concepts.md`

**Used in:**
- digital twin work
- AI agent governance

---

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
The foundational system allowing AI agents to pause execution, seek human judgment, and safely resume CLI tools without being hard-coded to any single provider. Known as `cogentia.continuation.v1`.

**Parent concepts:**
- Agent-Resumable CLI

**Reference documents:**
- `research/agent_resumable_cli.md`

---

## Cognitive Packet

**Type:** protocol / envelope+payload format
**Scope:** Global
**Status:** Defined

**Short definition:**
A minimal, transport-neutral, human-readable and machine-readable unit of cognitive work composed of two layers: an **envelope** carrying kind-agnostic metadata that any receiver can route, queue, archive, or acknowledge without interpreting the inner work; and a **payload** carrying kind-specific cognitive content (continuation, objection, hypothesis, decision, failure, routing) that an agent capable of handling the declared kind interprets. The `cogentia.continuation.v1` object is the canonical payload of `packet_kind = continuation`.

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
- `research/cognitive_packets.md` (working paper v0.3 — envelope/payload structure)
- `prompts/cognitive_packet.md`

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
- `research/Cogentia_Commons_Working_Paper.md`

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
- `research/pipeline.md` (method note v0.4)
- `research/derived_products.md` (companion paper v0.2)

**Used in:**
- the deployment of `projet_1755.md` (source) + `1755.md` (derived dashboard) in `barons-Mariani`
- the source ↔ derived treatment of `christianity_verticalization.md` and its blogpost derivative

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
- `research/derived_products.md`

---

## Sovereign Digital Twin

**Type:** system model
**Scope:** Global
**Status:** Defined

**Short definition:**
A model utilizing the Cogentiscope and Cogentigram to represent and enact user intent safely in cybernetic space.

**Reference documents:**
- `research/cogentia-digital-twin.md`

---

## Agent-Resumable CLI

**Type:** architecture
**Scope:** Global
**Status:** Operational

**Short definition:**
An operational architecture allowing Command Line Interfaces to be interacted with safely by LLMs by enforcing deterministic boundaries and pause points.

**Reference documents:**
- `research/agent_resumable_cli.md`

---

## Kernel Extractor

**Type:** mechanism
**Scope:** repository-specific
**Status:** Working

**Short definition:**
A mechanism for distilling the core actionable kernel from broader deliberations and dialogues.

**Reference documents:**
- `research/cogentia_commons_kernel_extractor.md`

---

## KYS (Know Your System) / Psychocognitive Analysis

**Type:** protocol
**Scope:** project-specific
**Status:** Working

**Short definition:**
The operational protocol and prompting framework for mapping the psychocognitive footprint of an AI or human agent.

**Reference documents:**
- `research/kys-prompt.md`
- `research/cogentia_prompt_v1.md`

---

## Cogentia Workflows

**Type:** system model
**Scope:** repository-specific
**Status:** Defined

**Short definition:**
Specific governance structures (private, group, public, federated) enabling systematic peer review and verifiable decision trails.

**Reference documents:**
- `research/cogentia_workflows.md`


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
