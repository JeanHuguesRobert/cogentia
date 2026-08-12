---
title: IoC continuations vs OpenAI-compatible calls — path audit
author: Grok
date: "2026-08-12"
language: en
document_role: source
document_kind: research
visibility: private
lifecycle_state: working
related:
  - "agent_resumable_cli.md"
  - "../trace/docs/inversion_of_control.md"
  - "../docs/agent_context_server.md"
  - "../docs/cogentia-context-gateway.md"
  - "cogentia_continuation_packet_routing.md"
---

# IoC continuations vs OpenAI-compatible calls — path audit (2026-08-12)

## Doctrine (from corpus)

Canonical statements:

| Source | Rule |
|--------|------|
| `research/agent_resumable_cli.md` | Tool does **not** call the model; it emits a **continuation**. Caller supplies `step_result`. |
| `trace/docs/inversion_of_control.md` | compute → judgment boundary → suspend → **emit continuation** → external answer → resume |
| `docs/agent_context_server.md` §5 | CLI is structural; interpretive decisions → continuation; provider-neutral |
| `docs/cogentia-context-gateway.md` | `embeddings index` emits continuation; external resolver calls provider; `embeddings store` |

```text
Embedded-AI tool (forbidden for judgment):
  tool → OpenAI/compatible API → internal decision → continues

Agent-Resumable tool (required):
  tool → continuation → external judgment (human/agent/worker) → step_result → resumes
```

### Scope of the rule

Applies when a **structural tool** (CLI, daemon retrieval that needs model judgment, MCP mutate/prepare) hits a **judgment boundary**.

Does **not** mean “nothing in the monorepo may call OpenAI ever.” Distinct roles:

| Role | May call OpenAI-compatible endpoints? |
|------|----------------------------------------|
| Structural CLI / index / classification tool | **No** for judgment — emit continuation |
| Continuation **fulfiller** (embed worker, human agent, step_result) | **Yes** — that *is* the external judge |
| Product chat surface (Guide web, Agent Gateway, WhatsApp twin answering a user) | **Yes as the product** — the twin *is* the conversational agent, not a suspended CLI tool |
| Offline **eval harness** (explicit score scripts) | Acceptable as lab tooling; must not be on the live tool path |

---

## Correct IoC paths (compliant)

| Path | Mechanism |
|------|-----------|
| `cogentia.js embeddings index` | `emitContinuation` (`embeddings-index` kind); store via `embeddings store` |
| CLI `embeddings search` → `semanticSearch()` | Emits `semantic-search` continuation; resume with `embeddings search-with` |
| `emitSemanticSearchContinuation` | Typed continuation + expected embedding schema |
| `cogentia-embed-worker.js` / `embedding-step.js` / `semantic-search-worker.js` | **Fulfillers**: read continuation, call Magistral/OpenAI embeddings, write result JSON |
| docs judgments / issues close propose / commit propose | Emit continuation; apply only after resolve |
| MCP public search/pack | Structural over index; no embedded chat completion for judgment |

---

## Paths that call OpenAI-compatible APIs — classification

### A. Compliant fulfillers / product surfaces

| Location | Call | Classification |
|----------|------|----------------|
| `scripts/cogentia-embed-worker.js` | Magistral `/v1/embeddings` | Fulfiller of embedding continuations |
| `scripts/embedding-step.js`, `semantic-search-worker.js`, `smart-embed-worker` | provider embeddings | Fulfillers / workers |
| `scripts/lib/ai-router-client.js` | router `/v1/embeddings`, `/v1/chat/completions` | Client library for **configured AI router** (Magistral etc.) |
| `scripts/cogentia.js` POST `/v1/chat/completions` handler | routes chat via AI router | **Product** Guide-style chat facade on daemon |
| `scripts/lib/agent-gateway/*`, `agent-gateway.js` | chat completions | **Product** coding/chat gateway |
| `scripts/cogentia-mcp-http.js` Guide OpenAI surface | chat completions | **Product** twin/Guide HTTP |
| `scripts/lib/agent-jhn-whatsapp/draft.js` | `api.openai.com/.../chat/completions` | **Product** WhatsApp answer synthesizer (twin is the agent) |

### B. Structural tool paths that **inline** model calls (IoC tension / defects)

| Location | Call | Issue |
|----------|------|--------|
| `cogentia.js` `contextSemanticSearch` → `createQueryEmbedding` | AI router `/v1/embeddings` on **cache miss** | Gateway hybrid/semantic path does **not** emit a continuation; it embeds inline. Conflicts with CLI `semanticSearch()` which **does** emit. Docs describe both behaviors. |
| `cogentia.js` agent health smoke (`createQueryEmbedding` ~1405) | AI router embeddings | Smoke test inside structural health — mild; not judgment, but still tool→provider |
| `scripts/lib/retrieval-supabase.js` `embedQuery` | **Direct** `api.openai.com/v1/embeddings` | Structural retrieval helper embeds inline with OpenAI key — **no continuation** |
| `scripts/lib/retrieval-inox-session.js` `embedQuery` | **Direct** OpenAI embeddings | Same pattern — fulfiller-shaped code callable as session helper |

### C. New corpus-librarian / eval code (session work) — product vs tool

| Location | Call | Classification |
|----------|------|----------------|
| `scripts/lib/corpus-librarian/answer.js` | Direct OpenAI chat completions | **Writer/product** helper; OK if only used as channel synthesizer. **Not OK** if promoted as a MCP “judgment tool” without continuation. |
| `scripts/lib/agent-jhn-whatsapp/semantic-judge.js` | Direct OpenAI chat | **Eval/lab** (and any live use would be judgment without IoC) |
| `scripts/lib/agent-jhn-whatsapp/openai-step-reasoner.js` | Direct OpenAI chat | Step **reasoner inside harness** — judgment without continuation (lab/experimental) |
| `scripts/eval-corpus-librarian-*.js` | OpenAI via above | **Explicit offline eval** — outside structural CLI |

---

## Critical consistency gap

```text
CLI path:
  embeddings search → emitContinuation(semantic-search)     ✅ IoC

Gateway path:
  /api/context/search?mode=semantic|hybrid
    → contextSemanticSearch
    → cache hit OK
    → cache miss → createQueryEmbedding(ai-router) inline   ⚠️ not IoC
```

So IoC is **correctly implemented for CLI embedding index/search emit**, but **not uniformly** for live gateway semantic query embedding. Documented dual mode in `cogentia-context-gateway.md` (direct embed on miss + optional continuation warm path) is a **known fork**, not pure IoC.

---

## What “needs judgment” means for future tools

When designing `cogentia_explore` / better search tools:

| Need | Must |
|------|------|
| Keyword/FTS only | Deterministic — no model, no continuation |
| Semantic query vector missing | **Emit continuation** (or use cache only / fallback keyword) — do not hide OpenAI inside the tool |
| Ranking “is this relevant enough?” | Either deterministic score **or** continuation — not silent LLM |
| Answer synthesis | Belongs to **product** (WhatsApp/Guide) or external agent after packet — not inside structural explore tool |
| Eval / blind judge | Separate eval scripts or continuation kind `semantic-judge` fulfilled externally |

---

## Verdict

| Area | Status |
|------|--------|
| **Doctrine** | Clear and consistent in corpus (Agent-Resumable CLI + Trace IoC) |
| **CLI embeddings index / search emit** | **Correct** |
| **Continuation fulfillers** | **Correct** (workers call providers) |
| **Product chat** (gateway chat, WhatsApp draft, agent-gateway) | **Out of IoC tool rule** by role (they *are* the agent) |
| **Gateway semantic cache-miss embed** | **Not pure IoC** — inline AI-router embeddings |
| **retrieval-supabase / inox-session embedQuery** | **Not pure IoC** — direct OpenAI |
| **corpus-librarian synthesizer / step reasoner / semantic-judge** | Product or lab; **must not** be sold as structural MCP tools that judge silently |

**Overall:** the pattern is **understood and correctly implemented on the main CLI continuation paths**. It is **not** correctly implemented on every path that reaches an OpenAI-compatible endpoint — especially **query embedding on gateway semantic miss** and **direct OpenAI embed helpers**. New librarian/MCP tools must not add further silent provider judgment.

---

## Recommended fixes (priority)

1. **Gateway semantic miss:** on missing query embedding cache, return `semantic_continuation_required` + emit continuation (align with CLI `semanticSearch`), fall back to keyword — do not call `createQueryEmbedding` in the public tool path (or gate it behind an explicit admin/fulfillment mode).  
2. **retrieval-supabase / inox-session:** route query embed through continuation or only through a named fulfiller, not silent `api.openai.com` inside library code used by tools.  
3. **corpus-librarian:** keep synthesis in the **WhatsApp product layer**; if MCP exposes explore, return **packet only**, never chat.completions.  
4. **semantic-judge / step-reasoner:** treat as lab/eval or wrap judgment in continuation kinds if ever used by structural CLI.

## Resume / acceptance test

A structural path is IoC-clean if:

```text
grep / audit: no api.openai.com and no ai-router embeddings/chat
from code reachable by: cogentia.js CLI tool commands, public MCP tools,
public /api/context/* (except explicit product /v1/chat/completions)
unless the function is clearly a fulfiller of an existing continuation.
```
