---
title: "Specialized KYS profiles and Agent JHN fidelity"
subtitle: "Person-controlled disclosure; JHN open dogfood; non-episodic; non-judicial"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.3"
document_role: source
document_kind: research
visibility: public
lifecycle_state: working
language: en
related_research:
  - cogentia/research/kys_profile_privacy_and_public_specialized_profiles.md
  - cogentia/research/kys_specialized_profiles_catalog.md
  - cogentia/research/cogentigram_jhn_thinking_capsule.md
  - cogentia/research/cogentigram_jhn_public_open.json
  - cogentia/research/cogentigram_jhn_march_vs_open_2026-08.md
  - JeanHuguesRobert/research/agent_brief.md
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
status: working-paper — active documentation
license: CC BY-SA 4.0
last_modified_at: '2026-11-22'
provenance:
  origin_type: unknown
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
affiliation: Institut Mariani / C.O.R.S.I.C.A.
---

# Specialized KYS profiles and Agent JHN fidelity

## PrivAI thesis (applied)

The **person** defines **what is shared** and **what may be done** with it.  
That is implemented through **specialized KYS Profiles** (purpose-scoped grants), not platform capture of a life file.

A KYS **Cogentigram** is **structural** (stable patterns). It:

- does **not** include **episodic** information (no event diary);
- **must not** be treated as **evidence in court**.

## Agent JHN (this principal)

This principal is deliberately **open** about structural self-model for research dogfood:

| Layer | Artifact | Role |
|-------|----------|------|
| Mandate subset | `AGENTS.public-readonly` | What the surface may do |
| Representation | `agent_brief` | What to say / red lines |
| Specialized KYS | `kys.public_answer_style` → thinking capsule | How to write/reason |
| Open structural radar | `cogentigram_jhn_public_open.json` | Open **80 first-class dimensions** structural profile, person-open (not a closed 73-axis map) |
| March baseline | `apps/personal/samples/cogentigram_author.json` | 2026-03 ChatGPT sample (compare note below) |
| Facts | Public corpus retrieval | Evidence |

March vs August delta: [`cogentigram_jhn_march_vs_open_2026-08.md`](cogentigram_jhn_march_vs_open_2026-08.md) — **66/73** scores unchanged, **7** one-point bumps, **13** evidence rewrites; radar shape stable.

**Active migration, 22 November 2026:** [the canonical registry](cogentigram_dimensions.json) now specifies at least 80 equal-level first-class dimensions. In the JHN profile, REP-001/002/003, ENG-001/002/003 and OPS-001 are peers of the preceding entries, with qualitative measures where no validated number exists. The March→August 73-axis comparison above remains a **historical comparison only**, not the active modelling contract. Selection for Agent John covers relevant categories and contextual evidence, including unscored traits, rather than simply choosing the highest historical numbers. Work owner: [#200](https://github.com/JeanHuguesRobert/cogentia/issues/200).

Episodic private traces (raw WhatsApp, private registry dumps) stay **out**.

## Stack

```text
channel policy
  → AGENTS.public-readonly
  → agent_brief
  → kys.public_answer_style (capsule)
  → context/coverage-selected dimension sample from person-open Cogentigram (default N=12)
  → public corpus excerpts
  → user question
```

WhatsApp inject + grant diagnostics: `scripts/lib/agent-jhn-whatsapp/representation-brief.js` (`compressCogentigramTopN`, `describeKysInjection`).

## Specialized profiles around JHN (ideas in use)

| Profile id | Status |
|------------|--------|
| `kys.public_answer_style` | Dogfood inject (capsule) |
| `kys.research_partner` | Idea — denser method axes for co-writing |
| `kys.coding_pair` | Idea — coding-agent style |
| `kys.civic_communication` | Idea — public political drafting under human dispatch |
| `kys.health` / `kys.employer` | Catalog only — **not** for public Guide |

Catalog: [`kys_specialized_profiles_catalog.md`](kys_specialized_profiles_catalog.md).

## Success criteria

- Higher style fidelity without impersonation  
- No episodic fabrication  
- No “use this in court / HR” framing  
- Person can re-scope specialized grants later under PrivAI  

## Status

v0.3 — person-open full structural JSON restored as deliberate dogfood; specialized answer-style profile remains the primary inject; privacy doctrine person-controlled rather than “full always private for everyone.”
