---
title: "Using specialized KYS style profiles to improve Agent JHN fidelity"
subtitle: "Full Cogentigram stays private; public dogfood uses specialized prototypes"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.2"
document_role: source
document_kind: research
visibility: public
lifecycle_state: working
language: en
related_research:
  - cogentia/research/kys_profile_privacy_and_public_specialized_profiles.md
  - cogentia/research/Cogentia-and-Cogentigram.md
  - cogentia/research/cogentia-digital-twin.md
  - cogentia/research/structural_signatures.md
  - cogentia/research/ai_first_fidelity_single_author_phase.md
  - cogentia/research/artificial_representation_and_mandated_voice.md
  - cogentia/research/cogentigram_jhn_thinking_capsule.md
  - JeanHuguesRobert/research/agent_brief.md
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Using specialized KYS style profiles to improve Agent JHN fidelity

## Privacy first

| Object | Visibility |
|--------|------------|
| **Full Cogentigram / full KYS Profile** (73+ scored axes, deep evidence) | **Private** — owner custody; not public corpus research |
| **Specialized KYS profiles** (purpose-scoped, e.g. public answer style) | **May be public** as **early prototypes**; future **PrivAI-certified** under KYS |
| Method papers, licenses, cloaks | Public (design in the open) |

See [`kys_profile_privacy_and_public_specialized_profiles.md`](kys_profile_privacy_and_public_specialized_profiles.md).

**Design in the open · eat our own dog food** applies to specialized public prototypes and the framework — **not** to dumping the full private profile on GitHub.

## Problem

Agent JHN and the Guide use facts (retrieval), positions (`agent_brief`), and mandate (`AGENTS.public-readonly`). They still need a **public, scoped** layer for *way of thinking / writing* without exposing a full private KYS.

## Definitions (short)

| Term | Role |
|------|------|
| **Full Cogentigram / full KYS** | Complete structural measurement — **private** |
| **Specialized KYS profile** | Purpose-scoped slice (e.g. answer-style) — may be public prototype |
| **PrivAI** | Intended governance for certification / graded disclosure (institution still forming) |
| **agent_brief** | *What* to say / not do under mandate |
| **Answer-style specialized profile** | *How* to reason and write on public surfaces |

## Dogfood artifacts (public)

| Artifact | Class |
|----------|--------|
| [`cogentigram_jhn_thinking_capsule.md`](cogentigram_jhn_thinking_capsule.md) | Specialized public answer-style KYS **prototype** |
| `apps/personal/samples/cogentigram_author.json` | **Fixture / sample** for tooling — not a certified public full KYS of a living person for open disclosure |
| Method: Cogentia-and-Cogentigram, kys-prompt | Public framework |

Full private profile: **not** in public `research/`; private custody only.

## Why specialized public profiles help fidelity

```text
1. Facts from public corpus          (retrieval + citations)
2. Positions and red lines           (agent_brief)
3. Surface mandate                   (AGENTS.public-readonly)
4. Public answer style (specialized KYS prototype)
5. Full private Cogentigram          (owner twin only — not Guide/chat)
```

Without (4), answers can be citable but wrong-shaped. Without keeping (5) private, we violate privacy and confuse dogfood with full disclosure.

## Implementation path

### A. Inject specialized public profile (done / ongoing)

- WhatsApp: inject answer-style capsule (default on).  
- Guide: short subset optional.  
- Never inject full private KYS scores.

### B. Retrieval

Identity/method questions → agent_brief, twin papers, **specialized** style docs — not private profile files.

### C. Eval

Judge style against specialized profile rules + corpus grounding + non-impersonation.

### D. PrivAI path (future)

Specialized profiles gain **certification** and graded disclosure; full KYS remains under private license/custody.

### E. What not to do

- Publish full scored Cogentigram as `visibility: public` research  
- Treat sample fixtures as certified production KYS  
- Use private affective axes on public Guide  
- Confuse “design in the open” with “disclose everything”

## Recommended public stack for Agent JHN

```text
channel policy
  → AGENTS.public-readonly
  → agent_brief
  → specialized public answer-style KYS prototype (capsule)
  → public corpus excerpts
  → user question
```

## Status

Privacy rule corrected 2026-08-13 after a mistaken public full-profile commit (withdrawn). Specialized prototype capsule remains for open dogfood.
