---
title: "KYS / Cogentigram privacy — full profile private; specialized public prototypes"
subtitle: "PrivAI-oriented disclosure rule for structural cognitive profiles"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.1"
document_role: source
document_kind: doctrine
visibility: public
lifecycle_state: working
language: en
related_research:
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

# KYS / Cogentigram privacy — full profile private; specialized public prototypes

## Compact rule

```text
Full Cogentigram / full KYS Profile  →  PRIVATE by default
PrivAI-certified specialized KYS profiles → may be PUBLIC (prototypes, dogfood)
```

**Design in the open** for the *framework*, *licenses*, *specialized public slices*, and *answer-surface style rules*.  
**Do not** publish the **full** personal Cogentigram (all axes, percentiles, confidence, deep evidence) as public corpus material.

This aligns with: public-by-default does not cancel privacy; answer surfaces are public-read-only; registre-mariani / private custody hold private living data.

## What is a full KYS Profile / full Cogentigram

A **full** profile is the complete structural measurement (classically **73+ indicators** with scores, confidence, relationship assessment, blind spots, etc.). It is intimate structural self-knowledge — closer to a **private KYS dossier** than to a public bio.

| Property | Full KYS / full Cogentigram |
|----------|------------------------------|
| Visibility | **private** (or confidential under mandate) |
| Custody | Private vault / private registry / non-public path — **not** public GitHub research |
| Use | Owner twin, certified processors, future PrivAI workflows under KYS license |
| Not for | Public Guide dump, public research indexes, anonymous web scrapers |

## What may go public

**PrivAI-oriented specialized KYS profiles** (early prototypes):

- **Purpose-scoped** slices (e.g. “public answer style”, “coding-pair style”, “research-writing style”)
- **Operational rules** for a surface (how to write/reason), not a full psychometric radar
- **Framework and method** papers (Cogentia and Cogentigrams, KYS prompt contracts)
- **Anonymized or synthetic samples** clearly labelled as samples / fixtures
- Explicit **prototype** status: design in the open, dogfood on Agent JHN / Guide

Example of a public specialized prototype for dogfood:

- [`cogentigram_jhn_thinking_capsule.md`](cogentigram_jhn_thinking_capsule.md) — **answer-style** rules for Agent JHN (not the full 73-axis score table)

## PrivAI certification (direction)

Long-term, specialized public profiles should be:

1. **Scoped** (purpose, surface, resolution);
2. **Graded** under KYS license / cloaks where needed;
3. **Certified** (or pre-certified as experimental) under **PrivAI** governance once the institution exists;
4. **Revocable** and versioned.

Until PrivAI is a formal institution, public specialized profiles remain **experimental dogfood** — honest about incompleteness, never marketed as “full certified KYS of a living person for sale.”

## Dogfood stack (Agent JHN)

```text
public specialized style profile (capsule)  →  OK to inject on public/experimental answer surfaces
full private Cogentigram / KYS               →  NOT injected; NOT in public repo research/
agent_brief + AGENTS.public-readonly         →  public operational layers (mandate + representation)
public corpus facts                          →  retrieval
```

## Anti-patterns

- Committing a full scored Cogentigram JSON under `visibility: public` “for convenience”
- Confusing **style dogfood** with **full KYS disclosure**
- Using private axes (affective intimacy, health, private life) on public Guide
- Treating sample fixtures as certified production profiles

## Correction note (2026-08-13)

A full updated JHN Cogentigram JSON was briefly committed under public `research/`. That violates this rule. The full profile is **withdrawn from the public corpus**; specialized public capsule and method docs remain for open design and dogfood. Full profile custody is private (owner-side), not public research.

## Status

Prototype doctrine. Implementation should keep:

- public method + specialized dogfood profiles in public repos;
- full KYS / full Cogentigram off public indexes and off public Git history going forward.
