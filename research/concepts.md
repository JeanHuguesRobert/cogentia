---
title: "Concept Index — cogentia"
description: "Typed concept registry for humans and AI agents; structure only, not semantic authority."
layout: default
nav_order: 3
last_modified_at: 2026-05-16
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/concepts.md
last_stamped_at: 2026-05-16
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

## Cogentia Commons

**Type:** methodology
**Scope:** Global
**Status:** Canonical

**Short definition:**
The methodology surrounding Cogentia, establishing principles like "Every objection a first-class contribution."

**Reference documents:**
- `research/Cogentia_Commons_Working_Paper.md`

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
