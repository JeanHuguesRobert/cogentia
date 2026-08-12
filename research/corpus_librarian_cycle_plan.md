---
title: Corpus librarian cycle plan
author: Grok
date: "2026-08-12"
language: en
document_role: source
document_kind: research
visibility: private
lifecycle_state: working
related:
  - "../docs/cogentia-context-gateway.md"
  - "optimistic_mainline_governance.md"
  - "simplicite_action.md"
---

# Corpus librarian cycle plan

## Problem

> Provide a **grounded answer** over a corpus of markdown documents, using
> **tools** to explore that corpus (via indexes built in advance).

Not: free-form agent that authors the truth.  
Yes: **librarian** (tools + policy) builds an evidence packet; a **writer**
answers only from that packet.

## Engineering meta-loop

```text
design tool(s) → design tool usage → rate result → redo
until good enough on quality, speed, cost, grounding, stability
```

**Rules (Occam + optimistic mainline):**

1. Work on **main**; no branch unless blocked (conflicts / release).
2. Small reversible diffs; report after each cycle.
3. **One controlled change** per cycle (tools *or* usage *or* synthesizer).
4. Frozen **eval set** + **scorecard** before claiming progress.
5. Indexes are caches; markdown/git remain canonical.
6. Tools are thin over existing Context Gateway — do not invent a second stack.

## Scorecard

| Axis | Measure | Initial gate vs L0 champion |
|------|---------|------------------------------|
| Quality | Blind semantic win/tie; critical regressions | critical = 0; not worse than L0 |
| Grounding | Citations when excerpts exist | gate pass ≥ L0 |
| Speed | p50 / mean end-to-end ms | ≤ 1.3× L0 or agreed budget |
| Cost | tool calls + LLM calls | mean tools bounded; LLM ≤ L0 when no repair |
| Coverage | empty / partial / enough packets | empty rate ≤ L0 |
| Stability | winner flips across re-runs | low |

Cycle results: `research/corpus_librarian_scorecard.jsonl` (one JSON object per line).

## Runtime product loop (target)

```text
question
  → analyze (locale, intent, freshness)
  → explore with tools over indexes   [search → open → expand]
  → evidence_packet
  → synthesize under citation contract
  → deterministic gate (+ optional one repair)
  → answer
```

## Tools (Cycle B surface)

Thin names over Context Gateway (already indexed FTS/embeddings):

| Tool | Gateway | Job |
|------|---------|-----|
| `corpus.search` | `GET /api/context/search` | Ranked chunk hits |
| `corpus.open` | `GET /api/context/lines` (or `doc`) | Exact span text + `source_id` |
| `corpus.expand` | wider `lines` around a hit | Neighboring context |

No new index format. Rebuild remains `cogentia.js index rebuild`.

## Usage policies (cycles)

| Cycle | Usage | Hypothesis |
|-------|--------|------------|
| **A** | L0 / Guide path as champion baseline | Lock yardstick |
| **B** | Deterministic `search → open top-k` (+ expand if span thin) | Better packets without LLM controller |
| **C** | Thin-hit second search / expand policy | Multi-hop without free agent |
| **D** | Fail-closed escalate after L0 gate fail | Agent cost only when needed |
| **E** | Enum controller only if D plateaus | No open ReAct by default |

## Cycle log

| Cycle | Status | Change | Rate summary |
|-------|--------|--------|--------------|
| A | **done** | Freeze scorecard + L0 as champion reference | scorecard.jsonl |
| B | **rated live** | Tools + deterministic explore; progressive keyword focus | offline 9/9; live 11/11 packet ok, 0 none; mean 3.45 tools, 3605 ms |
| C | next | Synthesizer on packet vs L0 prose (quality), and/or hybrid when embed router up | pending |
| D+ | pending | Fail-closed escalate; open/lines when gateway fixed | — |

## Stop conditions

- **Ship usage** when gates pass on frozen set and cost/speed acceptable.
- **Stop adding agent** when deterministic B/C matches L0 quality; invest in index/chunks instead.
- **Do not activate** free answerer loops or reasoner-before-search (already demoted).

## Implementation map

| Piece | Path |
|-------|------|
| Plan (this file) | `research/corpus_librarian_cycle_plan.md` |
| Scorecard log | `research/corpus_librarian_scorecard.jsonl` |
| Tools + usage | `scripts/lib/corpus-librarian/` |
| Offline tests | `scripts/test-corpus-librarian.js` |
| npm | `test:corpus-librarian` |
