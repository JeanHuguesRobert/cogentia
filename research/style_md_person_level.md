---
title: "STYLE.md — person-level style mandate (convention)"
subtitle: "Parallel to AGENTS.md: how representation agents should sound and reason"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-13"
version: "0.1"
document_role: research
document_kind: convention
visibility: public
lifecycle_state: working
language: en
related_research:
  - JeanHuguesRobert/STYLE.md
  - cogentia/research/agent_john_primary_style.md
  - cogentia/research/agent_john_cross_surface_style_fidelity.md
  - cogentia/research/cogentia-digital-twin.md
update_policy: UP-DEFAULT-REVIEWED
---

# STYLE.md — person-level style mandate (convention)

## Thesis

Every public personal twin repo **may** place a root **`STYLE.md`** next to **`AGENTS.md`**:

| File | Answers |
|------|---------|
| **AGENTS.md** | What may agents *do* here? (tools, authority, workflow) |
| **STYLE.md** | How should representation agents *sound and reason* when speaking for / about this person? |
| **agent_brief** (optional) | What positions and red lines to *say* |

Style is fuzzy as a folk concept. Operationally it is **Buffon made structural**: stable patterns of definition, density, affect performance, method, and voice — not biography, not clinical label.

## Discovery

```text
<person-public-repo>/STYLE.md
  e.g. JeanHuguesRobert/JeanHuguesRobert/STYLE.md
```

If present → inject on answer surfaces (quality-first).  
If absent → fall back to product defaults (e.g. `agent_john_primary_style.md` + brief).

## What agents can formalize well vs poorly

| Strong (models + corpus) | Weak / overclaimed |
|--------------------------|--------------------|
| Surface anti-patterns (generic chatbot, fake warmth) | Inner experience, “true self” |
| Recurrent rhetorical moves in a large public corpus | Clinical or moral diagnosis from style alone |
| Explicit style checklists for inject | Perfect imitation across all registers |
| Contrastive description (this vs generic assistant) | Authorial uniqueness as legal identity |

A strong model can often produce a **finer checklist** of public stylistic regularities than a casual human reader — and can still **overfit**, **caricature**, or **miss** what only the person knows. Hence: person-owned STYLE.md, not silent platform profiling.

## Inject order (quality-first)

```text
channel policy
  → AGENTS.public-readonly (surface)
  → agent_brief
  → person STYLE.md (if present)
  → primary style kernel / KYS capsule
  → structural top-N (optional)
  → corpus excerpts
  → question
```

## Accounting

Style inject increases prompt tokens. **Quality first, budget later** — but **estimated spend must still be recorded** (Guide `cost_estimate`, fidelity eval spend ledger). Spend is not legitimacy.
