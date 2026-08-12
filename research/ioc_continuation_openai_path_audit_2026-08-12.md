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

Also in corpus (Promise / packet / join):

| Source | Contribution |
|--------|----------------|
| `research/agent_resumable_cli.md` §3.2 | Continuations **like Promises**, but cross-process, schema-bearing, judgment-bearing |
| `research/cogentia_continuation_packet_routing.md` | Continuations as **packets**; routing `split` / `merge` of child packets; Fractanet packet-switch analogy |
| `research/pipeline.md` | Method as packet-switched cognitive network |

### Cascade rule (second-order endpoints) — explicit 2026-08-12

The IoC rule **cascades**, but **“never call a provider” is too strong**.
What is required is **honest control of judgment**, negotiated with the caller’s
protocol literacy.

```text
Caller A needs judgment
  → emits or accepts continuation C1  (if A understands continuations)
Fulfiller / second-order surface B
  (e.g. local "OpenAI-compatible" facade, MCP tool, nested router)
  → if B needs further judgment:
       prefer emit C2 / continuation_required upward
       only call a provider directly when the *negotiation* says the caller
       cannot handle continuations and inline fulfillment is an explicit mode
  → join children (batch) when several C2…Cn are needed
  → resume parent with step_result (or OpenAI-shaped final answer)
```

Join semantics (Promise-like, packet-native):

| Join | Promise analogy | Routing vocabulary (corpus) |
|------|-----------------|------------------------------|
| Wait for all children | `Promise.all` | `split` then `merge` when all children complete |
| Wait for first success | `Promise.race` / `any` | merge policy “first ok” (not fully standardized in CLI) |
| All settled | `Promise.allSettled` | merge partials + failures into parent continuation |

**Continuations ≈ Promises/Futures that leave the process:** serialized, stored, routed, answered by another machine or human — like **packets** on a packet-switched network — not only in-memory `await`.

### Capability negotiation (MCP vs OpenAI-compatible callers)

Different surfaces have different ability to **explain and use** the
continuation protocol. The cascade must depend on what was negotiated.

| Caller class | Default assumption | Preferred when judgment is needed | Fallback if caller is continuation-blind |
|--------------|-------------------|-------------------------------------|------------------------------------------|
| **Cogentia CLI / internal daemon client** | Knows continuations | Emit / return structured continuation | N/A |
| **MCP client** | Can learn tools + schemas | Prefer tools that return `continuation_required` + inspect/resolve tools; skills teach the loop | Document in tool description; optional “fulfill mode” only if declared |
| **OpenAI-compatible agent** (generic Chat Completions client) | **Does not** know continuations | Prefer negotiated extension if present | Complete the OpenAI response shape; **may** inline fulfill *as the product*, or return a **teaching** payload inside the OpenAI envelope |

#### Negotiation (not a single global “never”)

```text
1. Discover / declare protocol support
   - MCP: tools/list + tool descriptions + optional skill (continuation-handling)
   - OpenAI-compat: models list extras, response headers, or first-turn “capabilities”
     (e.g. supports_continuations=true) if the client can send them

2. Default when unknown (especially OpenAI-compat):
   caller_is_continuation_blind = true

3. If blind:
   - Do not fail the whole world with a raw ctn_* JSON the client will ignore
   - Either:
     (a) fulfill nested judgment internally *as an explicit product mode*
         (trace it: “fulfilled for blind caller”), or
     (b) return an OpenAI-shaped message that *teaches* the protocol
         (how to resume, where to POST step_result, link to docs)
   - Prefer (b) when teaching is safe; (a) when the product must just answer
     (Guide/WhatsApp-class experiences)

4. If capable (MCP or negotiated):
   - Emit continuation / continuation_required
   - Never hide nested provider calls without trace
```

#### “Teaching” the caller

An OpenAI-compatible response can carry a **protocol lesson** without breaking
the envelope, for example:

- assistant text that explains a suspended judgment and the resume steps;
- structured `tool_calls` / function payloads if the client supports tools;
- custom fields in `system_fingerprint` / provider-specific metadata only when
  the client is known to strip unknowns safely.

Teaching is **progressive disclosure**, not a guarantee the caller will learn.
Default remains: **assume blind** unless capability was negotiated.

#### MCP-specific note

MCP is a good home for full IoC: the server can list tools such as
`continuation_list` / `inspect` / `resolve` (mandate-gated) and a skill can
explain the loop. There, **prefer pure continuation** when judgment is needed.
Direct nested provider calls are the exception, and only as a declared
“auto-fulfill” tool mode with audit trail—not silent embedding inside
`cogentia_search`.

**Corpus clarity:** Promise + packet + split/merge are **explicit**.
Cascade was **implied**. **Caller negotiation / continuation-blind default /
teaching via response** is a **2026-08-12 clarification** (this note); it was
not previously stated as a compact table.

### Scope of the rule

Applies when a **structural tool** (CLI, daemon retrieval that needs model judgment, MCP mutate/prepare) hits a **judgment boundary**.

Does **not** mean “nothing in the monorepo may call OpenAI ever.” Distinct roles:

| Role | May call OpenAI-compatible endpoints? |
|------|----------------------------------------|
| Structural CLI / index / classification tool | **No** for judgment — emit continuation |
| Continuation **fulfiller** (embed worker, human agent, step_result) | **Yes** — that *is* the external judge |
| Product chat surface (Guide web, Agent Gateway, WhatsApp twin answering a user) | **Yes as the product** — the twin *is* the conversational agent, not a suspended CLI tool |
| Offline **eval harness** (explicit score scripts) | Acceptable as lab tooling; must not be on the live tool path |
| OpenAI-compatible **proxy** that still needs judgment | **No** direct second-order provider call — emit nested/batched continuations (cascade) |

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

## Critical consistency gap — **fixed 2026-08-12 (FBF)**

```text
CLI path:
  embeddings search → emitContinuation(semantic-search)     ✅ IoC

Gateway path (after fix):
  /api/context/search?mode=semantic|hybrid
    → contextSemanticSearch
    → cache hit OK                                          ✅
    → cache miss → emitSemanticSearchContinuation
                 → semantic_continuation_required (202/409) ✅ IoC
    hybrid → keyword fallback on that miss                  ✅
```

Supabase pack semantic path: no inline OpenAI unless
`COGENTIA_ALLOW_INLINE_EMBED_FULFILL=1` (explicit fulfiller).
Inox `openai.embeddings` step: same opt-in gate.

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
