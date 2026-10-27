---
title: Retrieval roadmap — Guide, Ophelia, Fractanet
author: unknown
affiliation: unknown
date: '2026-07-03'
last_modified_at: '2026-10-27'
license: unknown
language: en
status: working-paper
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: f310704
  origin_date: '2026-07-03'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Retrieval roadmap — Guide, Ophelia, Fractanet

Operational memory for the embedding **serving** layer (not index fabrication).

The current live setup is intentionally two-level:

- local SQLite stays the reconstructible corpus/index cache;
- Supabase/Postgres acts as the faster serving cache for live Guide queries.

## Principle (locality)

- **Heavy data stays put** (corpus vectors, chunks).
- **Small mandates travel** (queries, scripts, policies).
- **Weak nodes subcontract** (fracta → regional serving).
- **Only what must ascend ascends** (public retrieval slice, not private registry).

Scale: `local` (canon/build) → `regional` (pgvector) → `edge` (user/SSE) → `federated` (future, undecided).

## Phases

### Phase 0 — Done (fracta ops + daemon hardening)

- Shared SQLite read session, mutex, Guide no longer hangs in `D` state.
- Ops healthcheck / supervised restart on fracta.

### Phase 1 — Now (fast public Guide)

| Item | Status |
|------|--------|
| `POST /api/context/pack-batch` (one DB session, N queries) | implemented |
| Guide uses batch instead of N sequential `context_pack` | implemented |
| Optional Supabase `retrieval_chunks` + `match_retrieval_chunks` | migration + sync script |
| `COGENTIA_RETRIEVAL_BACKEND=supabase` on MCP | implemented when configured |
| Deploy sync on fracta after index update | done (8963 chunks, opnotbjrbphwcezaqgim) |
| fracta `COGENTIA_RETRIEVAL_BACKEND=supabase` | live |

**Env (fracta MCP / guide.env):**

```bash
# Default: local batch via daemon (no Supabase required)
COGENTIA_GUIDE_BATCH=1

# Optional regional serving (after sync)
COGENTIA_RETRIEVAL_BACKEND=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
COGENTIA_RETRIEVAL_CORPUS_KEY=cogentia-public
OPENAI_API_KEY=...   # query embeddings for uncached queries
```

**Sync after index rebuild:**

```bash
COGENTIA_REGISTRY=... COGENTIA_DATA_DIR=/var/lib/cogentia \
  node scripts/sync-retrieval-supabase.js --corpus cogentia-public
```

### Phase 2 — Netlify Deno façade (deferred)

- Skipped for now: adds deploy dependency without removing OpenAI/Supabase work.
- Revisit only if a client needs edge HTTP without VPS secrets; choose a backend separately based on evidence and authorization.

### Phase 3 — Ophelia / future survey platform

- Apply shared schema per instance (RLS + `corpus_key`).
- Replace JS `vector_search` (fetch 1000 + cosine) with RPC.
- Ingest pipelines (`ingest_file`, `rag-ingest`) write to `retrieval_chunks`.

### Phase 4 — parked; not the current Guide runtime

The earlier design in [Cogentia issue #42](https://github.com/JeanHuguesRobert/cogentia/issues/42)
proposed using Inox for Guide retrieval. That is not the live Guide setup:
Operium reported `backend=supabase` on 2026-10-27.

Cogentia source still has an optional Inox client
(`scripts/lib/retrieval-inox-session.js`) that would be selected if
`COGENTIA_INOX_RETRIEVAL_URL` or `INOX_RETRIEVAL_URL` is configured. This code
and the ThinkPad's `retrieval.inline` blackboard advertisement are not evidence
that current Guide requests use Inox. The Guide resolves its backend statically;
the current live backend reports Supabase. The `web-guide` advertisement remains
on the blackboard, but no Guide request routed through Inox was established by
this audit.

The ThinkPad `inox-serve` is a separate remote Inox runtime. Its live `/health`
response confirms support for `/run` (remote `.nox` execution), `/session/turn`
(`mandate.run` and continuation/fulfillment turns), `/continuation/fulfill`, and
`/retrieval/batch`. The current blackboard advertisement lists both `owner-cli`
and `web-guide` mandate surfaces, but does not prove either is invoking the
service. Do not point the Guide at Inox or remove its Supabase configuration
based on this parked design; any such change needs a separate, verified decision.

## Cache split rule

- Use SQLite/FTS5 for corpus inventory, indexing, and reconstructible local
  state.
- Use Supabase/Postgres only for serving-layer reuse and faster live retrieval.
- Never treat either cache as canonical corpus truth; Git/Markdown remain the
  source of record.

## Contracts (stable across phases)

### Batch request

```json
{
  "queries": ["string"],
  "mode": "hybrid",
  "repo": "all",
  "limit": 4,
  "budget": 2000,
  "corpus_key": "cogentia-public"
}
```

### Batch response

```json
{
  "ok": true,
  "strategy": "context-pack-batch-v1",
  "packs": [{ "query": "...", "ok": true, "sources": [], "context": [], "warnings": [] }]
}
```

## What stays on fracta

- Git registry, `cogentia index update`, continuations, private view, MCP synthesis (Magistral).

## Success metrics

- Guide retrieval p95 &lt; 15s with Supabase regional backend.
- Guide retrieval p95 &lt; 60s with local batch only (1GB VPS).
- Zero daemon `D` state under Guide load.
