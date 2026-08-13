---
title: "Specialized KYS Profiles — catalog of ideas (prototype)"
subtitle: "Person-controlled sharing: what is shared, and what may be done with it"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.1"
document_role: source
document_kind: research
visibility: public
lifecycle_state: working
language: en
related_research:
  - cogentia/research/kys_profile_privacy_and_public_specialized_profiles.md
  - cogentia/research/Cogentia-and-Cogentigram.md
  - cogentia/research/cogentia-digital-twin.md
  - cogentia/research/kys-prompt.md
  - cogentia/research/kys_mvp_entry.md
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Specialized KYS Profiles — catalog of ideas (prototype)

## Core idea (PrivAI)

**The person** defines:

1. **What** is shared (which structural axes / resolution / specialized view);  
2. **What may be done** with what is shared (use purposes, retention, re-sharing, inference rights).

The vehicle is not a single forced dump of a full life file. It is a set of **specialized KYS Profiles** — purpose-scoped views over a structural Cogentigram (and related governed data), under a KYS-style license, with future **PrivAI** certification.

```text
Person (controller of disclosure)
  → chooses specialized KYS Profile(s)
  → grants purpose-bound use
  → may revoke / re-scope / re-certify
```

**Design in the open · dogfood early prototypes.**  
This catalog is **not definitive**. It is a working map of useful profile *kinds*.

## Hard properties of any KYS Cogentigram

| Property | Meaning |
|----------|---------|
| **Structural, not episodic** | Stable patterns of cognition, style, decision, language — **not** a diary of events, not chat logs, not “what happened Tuesday” |
| **Not judicial evidence** | Must not be used as courtroom proof of facts, intent, or character for legal judgment; it is a **self-knowledge / twin / mediation** instrument under contract |
| **Not clinical diagnosis** | Not a medical certificate or psych diagnosis unless a future specialized profile is designed under health-law rules |
| **Person-controlled** | Default is the person’s grant; institutions do not own the profile by capture |

## Specialized profile kinds (ideas)

Each row is a **possible** specialized KYS profile. Names are provisional.

| Id (provisional) | Audience / purpose | What tends to be in scope | What is typically out of scope | Example uses |
|------------------|--------------------|---------------------------|--------------------------------|--------------|
| **kys.public_answer_style** | Public twin / Guide / chat | Writing & reasoning style, definitional rigor, non-impersonation, process priority | Private affect, health, full intimate radar if person withholds | Agent JHN, FractaVolta Guide dogfood |
| **kys.research_partner** | Co-authors, labs, open research | Method, systemising, critique style, epistemic habits | Employment performance claims, health | Joint papers, corpus collaboration |
| **kys.coding_pair** | Pair programming / agent coding | Algorithmic thinking, density, error vigilance, mandate hygiene | Health, civic voting, family | Coding agents under AGENTS.md |
| **kys.civic_communication** | Public political / civic speech | Positions method (second method), anti-capture, one-human-one-voice | Medical detail, private life | Public statements drafting (human still decides) |
| **kys.health** | Care professionals under care mandate | Health-relevant structural/contextual items the **person** chooses (and future health records under separate law) | Employer screening, marketing, public web dump | Doctor / care team — **not** HR |
| **kys.employer** | Workplace (if ever) | Job-relevant skills/style the person chooses to share | Health KYS, intimate axes, full private radar | Hiring/onboarding only with explicit grant; default **stricter** than health in many jurisdictions |
| **kys.education** | Teachers / mentors (optional) | Learning style, attention, feedback preferences | Health, employer performance | Tutoring agents |
| **kys.caregiver_family** | Family / caregivers under trust | Practical support preferences, communication load | Employer, public web, full clinical | Family support tools |
| **kys.finance_fiduciary** | Fiduciary / accountant (optional) | Risk/time preference structural axes if person grants | Health, political intimacy | Planning assistants under mandate |
| **kys.anonymous_research** | Aggregated science | Cloaked / DP axes | Re-identification, individual targeting | Population studies under cloak |

### Illustrative contrast: Health vs Employer

```text
KYS Health     →  what a doctor may need to know (under care ethics / law)
KYS Employer   →  what a workplace may see (usually much less; different purpose)
```

A person might share **Health** with a clinician and **never** with an employer.  
Specialized profiles encode that **purpose separation**.

## What a specialized profile package contains (sketch)

1. **Controller** — the person (and optional mandates)  
2. **Purpose** — allowed use classes  
3. **Axis set / resolution** — which structural indicators, at what coarseness  
4. **Obligations** — no secondary use, no court-as-evidence marketing, retention limits  
5. **Surface binding** — e.g. Agent JHN WhatsApp may load `kys.public_answer_style` only  
6. **Provenance** — version, measurement instrument, confidence  
7. **Revocation** — how grant ends  

## Agent JHN application (this corpus)

| Layer | Profile / artifact |
|-------|---------------------|
| Answer style dogfood | `kys.public_answer_style` → [`cogentigram_jhn_thinking_capsule.md`](cogentigram_jhn_thinking_capsule.md) |
| Optional open structural radar | Person-open full structural Cogentigram JSON (when the person chooses open) |
| Mandate / positions | `agent_brief` + `AGENTS.public-readonly` |
| Facts | Public corpus retrieval |

For **this principal**, deliberate openness means a **broad public structural Cogentigram** may be published as dogfood **without** episodic data and **without** treating it as court evidence — still under specialized-profile use rules for each surface.

## Non-goals of this catalog

- A closed ISO list of all future profiles  
- Automatic publication of anyone’s full KYS  
- Replacing medical, employment, or judicial law  
- Episodic memory stores (chat archives, mail bodies) inside the Cogentigram object  

## Status

Working catalog of **ideas**. Refine with PrivAI statutes, KYS license text, and real grants. Next dogfood: bind Agent JHN inject to an explicit `kys.public_answer_style` profile id and document person-open full structural profile separately.
