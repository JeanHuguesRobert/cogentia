---
title: "KYS Profiles — person-controlled disclosure via specialized views"
subtitle: "PrivAI: the person defines what is shared and what may be done with it"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.2"
document_role: source
document_kind: doctrine
visibility: public
lifecycle_state: working
language: en
related_research:
  - cogentia/research/kys_specialized_profiles_catalog.md
  - cogentia/research/Cogentia-and-Cogentigram.md
  - cogentia/research/cogentia-digital-twin.md
  - cogentia/research/cogentigram_for_agent_jhn_fidelity.md
  - cogentia/research/cogentigram_jhn_thinking_capsule.md
  - cogentia/research/kys-prompt.md
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# KYS Profiles — person-controlled disclosure via specialized views

## Compact rule (PrivAI direction)

```text
The PERSON decides:
  (1) what is shared
  (2) what may be done with what is shared

Mechanism: specialized KYS Profiles (purpose-scoped grants)
Not: silent platform capture of a full life file
```

**Default for most people:** full structural Cogentigram stays **private** until they grant specialized views.  
**Exception by deliberate choice:** a person may publish a **broad or full structural** Cogentigram for open dogfood (e.g. Agent JHN principal) — still **non-episodic**, still **not court evidence**, still bound by **use profiles**.

**Design in the open · eat our own dog food.** Early specialized profiles and method docs are public prototypes, not the final PrivAI product.

## What a KYS Cogentigram is / is not

| Is | Is not |
|----|--------|
| Structural signature (stable cognition, style, decision tendencies) | Episodic memory (events, chat logs, “what I did last week”) |
| Self-knowledge / twin / mediation instrument under contract | **Evidence in court** (must not be treated as judicial proof of fact, intent, or guilt) |
| Scorable axes with confidence and revision | Clinical diagnosis or medical certificate by default |
| Controlled by the person via specialized profiles | Free-for-all public dump without purpose bounds |

## Specialized KYS Profiles

Specialized profiles answer two questions for each grant:

1. **Share what?** (which axes / resolution / cloaks)  
2. **Use for what?** (allowed purposes, forbidden secondary uses)

Examples (non-exhaustive; see [catalog](kys_specialized_profiles_catalog.md)):

| Specialized profile | Typical purpose | Not for |
|---------------------|-----------------|---------|
| **Public answer style** | Twin/Guide writing fidelity | Employer HR, court |
| **Research partner** | Co-authorship method | Health marketing |
| **Coding pair** | Agent coding style | Civic campaign medical claims |
| **Health** | Care under health ethics/law | Employer screening |
| **Employer** | Workplace only if person grants | Health detail, intimate axes |

**Health vs employer** is the pedagogical pair: a doctor’s need is not an employer’s need; specialized profiles encode that separation.

## PrivAI role

PrivAI is the intended governance home for:

- KYS license / graded disclosure;
- certification of specialized profiles (when mature);
- dispute and fiduciary non-extractive rules.

Until PrivAI is formal, public specialized profiles and open structural dogfood remain **experimental**.

## Agent JHN dogfood (this principal)

This principal deliberately chooses **high openness** about structural self-model for twin research:

| Artifact | Class | Public? |
|----------|--------|---------|
| Full structural Cogentigram (73 axes) | Person-open structural KYS dogfood | **Yes** (declared open; non-episodic; non-judicial) |
| Answer-style specialized profile | `kys.public_answer_style` prototype | **Yes** — inject on Agent JHN |
| Episodic private traces | Mail, WhatsApp raw, private registry | **No** |
| Secrets / credentials | Ops | **No** |

Use stack:

```text
AGENTS.public-readonly  (mandate subset)
  + agent_brief           (representation / positions)
  + kys.public_answer_style capsule
  + person-open structural Cogentigram (optional denser context)
  + public corpus facts
```

## Anti-patterns

- Platform publishes full KYS without person grant  
- Specialized Health profile reused for Employer  
- Treating Cogentigram scores as **court evidence** or clinical diagnosis  
- Stuffing **episodic** logs into the Cogentigram object  
- Confusing “design in the open” with “no privacy for others”

## Status

v0.2 — person-control + specialized profiles + non-episodic/non-judicial clarified; JHN open structural dogfood allowed by deliberate choice. Catalog of profile kinds remains incomplete by design (ideas, not ISO).
