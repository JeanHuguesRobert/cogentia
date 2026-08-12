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

## Channel framing (correction)

**Guide** was built first for **FractaVolta’s website** (public conversational retrieval on the web). Reusing it as the WhatsApp chatbot’s retrieval backend was a **logical reuse**, not a requirement that WhatsApp must forever mirror Guide.

| Surface | Primary job |
|---------|-------------|
| **Guide** | Website visitor Q&A over the public corpus |
| **Agent JHN WhatsApp** | Self-chat / experimental twin channel; may share corpus indexes and answer contracts without depending on the web Guide stack |
| **Corpus librarian** | Channel-neutral: tools over Context Gateway indexes → packet → writer |

So: beating Guide is a **useful cross-channel check**, not the sole activation criterion for WhatsApp. WhatsApp can own a **first-class librarian path** scored on its own gates (grounding, language, length, latency, cost).

Further rate cycles against only a weak single-focus gateway baseline add little; optional Guide compare remains informative when Guide is up, not blocking.

## What this is / is not

| Is | Is not |
|----|--------|
| Librarian: tools over **indexes**, packet, then writer | Free agent that owns the final truth |
| Better than single-focus gateway search + same writer | Automatically identical to website Guide UX |
| Measured policy for corpus-grounded answers (any channel) | Obligatory fallback-only “when Guide is down” |
| Candidate for WhatsApp draft path (still deliberate activation) | Silent replacement of the FractaVolta website Guide |

## Product integration rule (when wired)

1. **Website:** keep **Guide** as the product path for FractaVolta web unless a separate web decision says otherwise.  
2. **WhatsApp / Agent JHN:** may use **librarian** as a first-class retrieval policy (packet + synthesizer), without requiring Guide parity first.  
3. Optional: call Guide when convenient for shadow/compare or shared caching — reuse, not hierarchy.  
4. Never enable free answerer step loops or reasoner-before-search on a live path without a new scorecard.  
5. Keep `context/lines` open/expand optional; on this host it hangs — search `include_text` is the measured body source.

## Scorecard close

| Gate vs single-focus baseline | Status |
|-------------------------------|--------|
| Quality (semantic) | **Pass** (7/11, 0 critical) |
| Grounding (citations) | **Pass** (mean cites ↑) |
| Speed | **Tradeoff** (~1.5× slower) — acceptable for quality gain offline |
| Cost | **Tradeoff** (~3.5 tool calls) — acceptable for now |
| vs website Guide | **Optional check** — not a WhatsApp hard gate; Guide unreachable this session |

## Explicit non-goals (for now)

- Treating website Guide as WhatsApp’s permanent boss path  
- Hybrid/semantic search polish (embed router was unavailable)  
- Multi-cap free `nextStep` reasoner  
- Semantic reject retry loops  
- Blind WhatsApp `active` without a deliberate product flip  

## Product wire (2026-08-13)

WhatsApp cognitive drafts accept a reversible env flip (default remains Guide):

| `AGENT_JHN_WHATSAPP_RETRIEVAL` | Live outbound answer | Side path |
|--------------------------------|----------------------|-----------|
| `guide` (default) | Guide `/guide/chat` + OpenAI | — |
| `librarian` | corpus librarian packet path | — |
| `shadow` | Guide (unchanged) | librarian compare on draft.shadow |

Code: `scripts/lib/agent-jhn-whatsapp/draft.js` (`resolveRetrievalMode`).  
Do **not** set production WhatsApp to `librarian` until a deliberate live smoke; prefer `shadow` first.

## Resume condition

Resume the **rate** loop when **at least one** holds:

1. Live **shadow** or **librarian** WhatsApp smoke needs a new scorecard cut, or  
2. Website/Guide team wants a **cross-check** against Guide `/guide/chat` when reachable, or  
3. Index/`lines` changes force a tool re-rate (Cycle B-style).

## Commands

```bash
npm run test:corpus-librarian
# gateway on :8790
npm run eval:corpus-librarian-b
# + OPENAI_API_KEY
npm run eval:corpus-librarian-c
npm run eval:corpus-librarian-semantic -- --run .cogentia/evals/corpus-librarian/<cycle-c>.json
```
