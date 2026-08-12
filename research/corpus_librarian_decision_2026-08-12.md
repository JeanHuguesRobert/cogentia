---
title: Corpus librarian — cycle close decision
author: Grok
date: "2026-08-12"
language: en
document_role: source
document_kind: research
visibility: private
lifecycle_state: working
related:
  - "corpus_librarian_cycle_plan.md"
  - "corpus_librarian_cycle_b_live_summary.json"
  - "corpus_librarian_cycle_c_live_summary.json"
  - "corpus_librarian_cycle_c_semantic_summary.json"
  - "optimistic_mainline_governance.md"
  - "simplicite_action.md"
---

# Corpus librarian — cycle close decision (2026-08-12)

## Decision

**Pause the design → rate loop here.** Do not start another free-form agent cycle.

**Adopt as the measured retrieval policy for this problem:**

```text
progressive keyword explore over Context Gateway
  → evidence_packet/v1
  → synthesizer (answer-core contract; OpenAI or extractive fallback)
```

Code: `scripts/lib/corpus-librarian/`  
Entry: `answerWithLibrarian()`  
Eval: `npm run test:corpus-librarian`, `eval:corpus-librarian-b|c|semantic`

## Why stop now

| Evidence | Result |
|----------|--------|
| Cycle B live packets | 11/11 coverage; progressive focus needed (full NL → 0 FTS hits) |
| Cycle C lexical | Librarian ≥ single-focus baseline (pass, expected, citations) |
| Cycle C semantic (fair excerpts) | **7–4** librarian over baseline; **0** critical librarian regressions |
| Guide L0 | **Unavailable** this session (local 404/refused; public timeout) |
| Free step / reasoner-first / reject loops | Already demoted earlier |

Further cycles without a **Guide** (or equivalent production) baseline would optimize against a weak champion and waste cost. Occam: the container is sufficient until Guide compare is possible.

## What this is / is not

| Is | Is not |
|----|--------|
| Librarian: tools over **indexes**, packet, then writer | Free agent that owns the final truth |
| Better than single-focus gateway search + same writer | Proven better than production Guide |
| Safe offline + live-measured on 11 guide questions | WhatsApp activation |
| Default-off product integration candidate | Replacement for Guide routing |

## Product integration rule (when wired)

1. Prefer existing **Guide** path when Guide is healthy (production champion until proven otherwise).  
2. Use **librarian** when: Guide down, offline gateway-only, or explicit shadow/compare mode.  
3. Never enable free answerer step loops or reasoner-before-search on the live path without a new scorecard beat of Guide.  
4. Keep `context/lines` open/expand as optional; current host hangs — search `include_text` is the measured body source.

## Scorecard close

| Gate vs single-focus baseline | Status |
|-------------------------------|--------|
| Quality (semantic) | **Pass** (7/11, 0 critical) |
| Grounding (citations) | **Pass** (mean cites ↑) |
| Speed | **Tradeoff** (~1.5× slower) — acceptable for quality gain offline |
| Cost | **Tradeoff** (~3.5 tool calls) — acceptable until Guide compare |
| Activation vs Guide | **Blocked** — Guide not measured |

## Explicit non-goals until Guide baseline

- Hybrid/semantic search polish (embed router was unavailable)  
- Multi-cap free `nextStep` reasoner  
- Semantic reject retry loops  
- WhatsApp `active` mode for librarian answers  

## Resume condition

Resume the rate loop only when **at least one** holds:

1. Local or public **Guide `/guide/chat`** is reachable for a fair L0 pair, or  
2. Product asks to **shadow-wire** librarian beside Guide without activation, or  
3. Index/lines bugfix changes tool contracts (re-rate B only).

## Commands

```bash
npm run test:corpus-librarian
# gateway on :8790
npm run eval:corpus-librarian-b
# + OPENAI_API_KEY
npm run eval:corpus-librarian-c
npm run eval:corpus-librarian-semantic -- --run .cogentia/evals/corpus-librarian/<cycle-c>.json
```
