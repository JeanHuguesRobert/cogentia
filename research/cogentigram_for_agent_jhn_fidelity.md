---
title: "Using a Cogentigram to improve Agent JHN fidelity"
subtitle: "From 73-axis structural profile to answer-surface style and retrieval"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.1"
document_role: source
document_kind: research
visibility: public
lifecycle_state: working
language: en
related_research:
  - cogentia/research/Cogentia-and-Cogentigram.md
  - cogentia/research/cogentia-digital-twin.md
  - cogentia/research/structural_signatures.md
  - cogentia/research/ai_first_fidelity_single_author_phase.md
  - cogentia/research/artificial_representation_and_mandated_voice.md
  - cogentia/research/cogentigram_jhn_v2026-08.json
  - cogentia/research/cogentigram_jhn_thinking_capsule.md
  - JeanHuguesRobert/research/agent_brief.md
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Using a Cogentigram to improve Agent JHN fidelity

## Problem

Agent JHN and the FractaVolta Guide already use:

- public corpus retrieval;
- `agent_brief` (representation mandate and positions);
- `AGENTS.public-readonly` (surface subset + privacy).

They still under-use the **Cogentigram**: the measurable **way of thinking** (73 psychometric/behavioral axes), which is exactly the layer that distinguishes *sounding like a careful twin* from *sounding like a generic helpful bot with citations*.

## Definitions (short)

| Term | Role |
|------|------|
| **Cogentia** | Persistent structural signature of a person as inferred from interaction (not biography) |
| **Cogentigram** | Structured measurement of that signature (axes, percentiles, confidence, evidence) |
| **Cogentiscope** | Measurement process (historically: KYS prompt to the user’s own AI) |
| **agent_brief** | *What* to say / not do under mandate |
| **Cogentigram capsule** | *How* to reason and write under that mandate |

See [Cogentia and Cogentigrams](Cogentia-and-Cogentigram.md), [digital twin](cogentia-digital-twin.md).

## What we have for JHN

| Artifact | Status |
|----------|--------|
| Sample 73-axis profile (2026-03, ChatGPT) | `apps/personal/samples/cogentigram_author.json` |
| Updated profile (2026-08) | [`cogentigram_jhn_v2026-08.json`](cogentigram_jhn_v2026-08.json) |
| Operational thinking capsule | [`cogentigram_jhn_thinking_capsule.md`](cogentigram_jhn_thinking_capsule.md) |

The 2026-08 file **re-anchors** evidence to public corpus and twin/ops practice; scores are largely continuous with the March sample. It is **not** a clinical instrument and needs **human validation**.

## Why this improves fidelity

Fidelity has at least four layers:

```text
1. Facts from public corpus          (retrieval + citations)
2. Positions and red lines           (agent_brief)
3. Surface mandate                   (AGENTS.public-readonly)
4. Style of cognition / expression   (Cogentigram)   ← often missing
```

Without (4), answers can be *correct-ish and citable* but still *wrong-shaped*: too warm, too vague, too marketing, too little definitional rigor, too little process priority.

High axes for this profile (examples): **deductive logic, analytical precision, definitional rigor, systemising, epistemic/cognitive sovereignty, process priority, informational density**.  
Lower / cautious: **affective empathy** — do not fake emotional performance.

## How to use it (implementation path)

### A. Inject a capsule (near-term, quality-first)

1. Load `cogentigram_jhn_thinking_capsule.md` into Agent JHN system messages  
   (after public-readonly AGENTS, with or near `agent_brief`).  
2. Optionally inject a **compressed top-12 axes** JSON into Guide (smaller budget).  
3. Do **not** inject full 73-axis JSON every turn unless evaluating cost is fine.

### B. Retrieval boosts (already started for doctrine/identity)

When questions touch identity, method, values: prefer packs that include  
agent_brief, possibilism, anti-capture, digital twin, **and** Cogentigram/Cogentia papers.

### C. Eval / judge

Extend guide-fidelity and WhatsApp evals with rubric items:

- definitional rigor present?
- process/limits before hype?
- density vs filler?
- no false affective overclaim?
- sovereignty of positions vs generic neutrality?

### D. Longitudinal Cogentiscope

Periodic re-score using `research/kys-prompt.md` / personal app against  
current agent sessions **under human control**; version new dated JSON files.

### E. What not to do

- Do not treat Cogentigram as **secret psychology** for public Guide.  
- Do not use it to **impersonate** (“I feel…” as the person).  
- Do not bypass privacy: profile is **style**, corpus is **facts**.  
- Do not silently widen mandate because a score says “high autonomy.”

## Recommended stack for Agent JHN prompts

```text
channel policy (WhatsApp / Guide)
  → AGENTS.public-readonly (mandate subset + privacy)
  → agent_brief (representation + positions)
  → cogentigram thinking capsule (how to think/write)
  → public corpus excerpts (evidence)
  → user question
```

## Success criteria

| Signal | Target |
|--------|--------|
| Lexical fidelity suite (JHN questions) | Stay high after synthesis works |
| Semantic fidelity (judge) | Higher “sounds like him” without impersonation |
| Failure mode | Prefer explicit gap over warm generic fill |
| Privacy | No private registry / secrets |

## Status

- Profile updated and capsule written (2026-08-13).  
- Injection into live Agent JHN/Guide prompts: **next implementation step** (see capsule § inject).  
- Full automated Cogentiscope re-run: optional later with human validation.
