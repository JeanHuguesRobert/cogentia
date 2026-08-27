---
title: "Agent John — cross-surface style fidelity (first approximation)"
subtitle: "Primary style kernel on all answer surfaces; Ubikia personas as explicit exceptions"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.2"
document_role: research
document_kind: operational
visibility: public
lifecycle_state: working
language: en
related_research:
  - cogentia/research/agent_john_primary_style.md
  - cogentia/research/ai_first_fidelity_single_author_phase.md
  - ubikia/docs/persona_multichannel_implementation_plan.md
  - cogentia/research/cogentigram_for_agent_jhn_fidelity.md
  - cogentia/research/operational_stance.md
update_policy: UP-DEFAULT-REVIEWED
---

# Agent John — cross-surface style fidelity (first approximation)

## Goal

Agent John (Agent JHN) should be **faithful to the principal’s style** on every answer surface — Guide, WhatsApp, jhn-public OpenAI — unless he **deliberately** appears under a **non-primary Ubikia persona**.

This is hard to do “correctly” (full Buffon / full Cogentigram / no caricature). v0.1 is an **operational approximation**: shared inject stack + explicit persona switch.

## Difficulty (why approximate)

| Hard part | Why |
|-----------|-----|
| Style ≠ slogans | Critical fidelity forbids catchphrase cloning |
| Style ≠ identity | John must not become the person |
| Token budgets | Full brief + capsule + 73 axes do not fit every surface |
| Form ≠ style | WhatsApp length ≠ Guide length; same *kernel*, different *form* |
| Personas | Ubikia needs alternate appearances without persona capture |
| Operational Stance | Situated search/verification/commitment policy must not be confused with Persona or Style |
| Measurement | Human + lexical evals exist; style-semantic judge is optional |

## v0.2 conceptual layering

The fidelity stack now distinguishes persistent structure, situated policy, social presentation, and expression:

```text
Identity / Values
  enduring entity and invariants

Cogentigram
  relatively persistent structural dispositions

Role
  current function

Operational Stance
  temporary governed policy for approaching the situation

Persona
  social / public appearance and register

Style
  surface expression

Mandate
  authority boundary applying to all of the above
```

The canonical source for the situated-policy distinction is [`operational_stance.md`](operational_stance.md).

Operational Stance may affect search breadth, verification intensity, deliberation, Skill salience, and commitment thresholds. It must not widen Mandate, rewrite evidence, or become a substitute for Persona/Style. Its experimental representation `mode_projection` is **not** yet a stable schema dependency of Agent John; schema/runtime promotion remains frozen until the Agent John A/B Reality Test.

## v0.1 mechanism

| Layer | Artifact | Surfaces |
|-------|----------|----------|
| Identity | `agent_john_identity.md`, naming in prompts | Guide, WA, OpenAI |
| Primary style kernel | `agent_john_primary_style.md` | **All** (default) |
| Representation | `agent_brief.md` | WA full; Guide via retrieval + fidelity doctrine |
| KYS answer style | thinking capsule + top-N open Cogentigram | WA full; Guide compact top-N |
| Operational Stance | conceptual/situated layer; no stable runtime field yet | Future dogfood via A/B Reality Test |
| Mandate subset | AGENTS.public-readonly | Guide + WA when enabled |
| Persona switch | `AGENT_JHN_PERSONA_ID` / `options.personaId` | Non-`agent_john_primary` skips primary kernel |

Code:

- `scripts/lib/agent-jhn-whatsapp/representation-brief.js` — load/inject primary style; `buildCrossSurfaceStyleBlock`
- `scripts/cogentia-mcp-http.js` — Guide system prompt injects cross-surface style block

## Primary vs persona

```text
default: persona_id = agent_john_primary
  → inject primary style kernel + KYS public_answer_style

explicit: persona_id = <ubikia persona>
  → skip primary kernel; keep non-impersonation + source primacy
  → persona governs register/form only (Ubikia §4)
```

Persona switching does not itself select an Operational Stance. Conversely, a Stance change does not imply a Persona change.

## Success criteria (dogfood)

1. Cross-surface answers share **definitional / dense / sober** character.  
2. Who/what Jean Hugues vs John stay correct.  
3. Fidelity eval suite does not regress.  
4. No first-person personhood.  
5. Persona changes remain separable from Operational Stance changes.  
6. Later: persona-tagged Ubikia products do not bleed into primary Guide/WA.

## Next approximations (not v0.2)

- Run the Operational Stance A/B Reality Test before adding stable runtime/schema fields.  
- Shared style eval rubric (semantic judge) across Guide and WA.  
- Persona files as structured data (schema), not only env id.  
- Compress agent_brief to “red lines only” for Guide token budget.  
- PrivAI certification path for style profiles.
