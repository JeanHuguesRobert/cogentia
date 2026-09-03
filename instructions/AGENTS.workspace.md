---
title: "Workspace Root Guidance (C:/tweesic)"
subtitle: "Operational guidance for coding agents operating across the multi-repository tweesic workspace"
author: "Jean Hugues Noël Robert"
date: "2026-09-03"
version: "1.0"
status: active
document_role: operational
document_kind: agent-instructions
visibility: public
lifecycle_state: active
language: en
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.workspace.md
shared_instructions: https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# AGENTS.workspace.md — Workspace Root Guidance (`C:\tweesic`)

This document provides operational instructions for AI coding agents (Antigravity/AGY, Claude Code, Grok, Gemini, cmdc, etc.) operating in the `C:\tweesic` multi-repository workspace.

## 1. What this workspace is

`C:\tweesic` is **not a single monolithic project** — it is a Windows workspace containing roughly 25 independent projects and repositories side-by-side (sharing a name with one of its sub-projects, `tweesic/`).

- There is no workspace-level build, test, or lint command.
- Do not assume `npm install` at the root sets anything up for a sub-project.
- When tasked with an issue or feature, always identify **which sub-project** applies before executing commands.

## 2. Shared Mandate & Read Order

Read Cogentia's shared operational layer first:
- [`AGENTS.shared.md`](AGENTS.shared.md) (or https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md)

Then apply the local mandate of the target sub-project (e.g. `../cogentia/AGENTS.md`, `../inseme/AGENTS.md`, `../operium/AGENTS.md`). Under **Monotonic Mandate Attenuation**, child instructions may restrict authority and add verification duties, but never enlarge authority.

## 3. Core Invariants for All Agents

### Anti-Capture Doctrine
Never propose, recommend, or implement hidden, machine-local, IDE-specific, or vendor-locked rule/state persistence (e.g. `/learn`, local `.agents/rules` overrides, or proprietary assistant memory silos).
- **Provider-swap test**: Before storing anything locally, ask if a successor agent on another provider would need it to avoid re-litigating a decision. If yes, it belongs in the git-tracked corpus on `main` or as a versioned Cognitive Packet event (`cogentia.agent_skill/v1`, `cop.event/v1`).
- Working memory is ephemeral (task-bound); doctrine and project facts stay in the corpus.

### Cognitive Packets & Continuations
When work hits a judgment boundary, Cogentia uses **continuations** (the operational payload of Cognitive Packets). Agents act as **handlers**, not arbiters of hidden model calls:
- Briefing: [`../docs/continuations_and_cognitive_packets_for_agents.md`](../docs/continuations_and_cognitive_packets_for_agents.md)
- Handler procedure: [`../skills/continuation-handling/SKILL.md`](../skills/continuation-handling/SKILL.md)

### Operational Routing (Stigmergy)
- **`operium/`** owns the operational control plane, deployment evidence, Fracta trust perimeter, and service health (`operium up`). Do not invent ad-hoc ops runbooks under application repos.
- **`cogentia/`** owns corpus navigation, mandate governance, continuations, and provenance.

### Language Invariant
- Conversation language does not determine artifact language.
- Repository-facing implementation artifacts (code, identifiers, tests, commit messages, PRs, technical docs) **MUST be in English**.
- French is reserved for Corsican/territorial/political public products (e.g. `barons-Mariani`, `marianivillage`, `AGENT_JOHN_FR.md`).

### Delivery Policy (Optimistic Locking)
- Default to direct, atomic commits on the current canonical branch (`main`).
- Do not create branches, worktrees, or review gates for routine scoped work unless justified by high Exposure, concurrent conflicting edits, or an explicit human request.

## 4. Sub-Project Discovery

| Repository / Project | Role & Toolchain | Local Mandate |
|---|---|---|
| **`cogentia/`** | Cognitive infrastructure, continuations, registry, audit | [`../cogentia/AGENTS.md`](../cogentia/AGENTS.md) |
| **`inseme/`** | Turbo monorepo (COP runtime, Agent John, web apps) | [`../inseme/AGENTS.md`](../inseme/AGENTS.md) |
| **`operium/`** | Deployment control plane, service health, routing | [`../operium/AGENTS.md`](../operium/AGENTS.md) |
| **`survey/`** | Kudocracy Survey platform (Vite, React, Tailwind, Deno) | [`../survey/AGENTS.md`](../survey/AGENTS.md) |
| **`Inox/`** | Concatenative / postfix programming language | [`../Inox/AGENTS.md`](../Inox/AGENTS.md) |
| **`FractaVolta/`** | Public site & Guide answer surface | [`../FractaVolta/AGENTS.md`](../FractaVolta/AGENTS.md) |
| **`barons-Mariani/`** | Territorial & historical research, political doctrine | [`../barons-Mariani/AGENTS.md`](../barons-Mariani/AGENTS.md) |
| **`JeanHuguesRobert/`** | Personal TwinRoot definition, public profile | [`../JeanHuguesRobert/AGENTS.md`](../JeanHuguesRobert/AGENTS.md) |
| **`registre-mariani/`** | Private twin overlay & living memory (STRICT PRIVACY) | [`../registre-mariani/AGENTS.md`](../registre-mariani/AGENTS.md) |

For agent launchers and CLI shortcuts across models, see [`../../AGENTS_CODING.md`](../../AGENTS_CODING.md).
