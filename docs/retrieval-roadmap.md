---
title: Retrieval roadmap — Guide, Ophelia, Fractanet
author: unknown
date: '2026-07-03'
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
---

# Retrieval roadmap — Guide, Ophelia, Fractanet

Operational memory for the embedding **serving** layer (not index fabrication).

## Principle (locality)

- **Heavy data stays put** (corpus vectors, chunks).
- **Small mandates travel** (queries, scripts, policies).
- **Weak nodes subcontract** (fracta → regional serving).
- **Only what must ascend ascends** (public retrieval slice, not private registry).

Scale: `local` (canon/build) → `regional` (pgvector) → `edge` (user/SSE) → `federated` (future Inox packets).

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
- Revisit only if a client needs edge HTTP without VPS secrets before Inox is ready.

### Phase 3 — Ophelia / future survey platform

- Apply shared schema per instance (RLS + `corpus_key`).
- Replace JS `vector_search` (fetch 1000 + cosine) with RPC.
- Ingest pipelines (`ingest_file`, `rag-ingest`) write to `retrieval_chunks`.

### Phase 4 — Inox + Fractanet (in progress)

- GitHub issue: https://github.com/JeanHuguesRobert/cogentia/issues/42
- **Proto fulfiller (Inox repo):** `inox-serve` — `POST /session/turn` (`inox.session.v1`) with continuation loop; legacy `POST /retrieval/batch`
- **Guide client (cogentia):** `COGENTIA_INOX_RETRIEVAL_URL` + optional `COGENTIA_INOX_SERVE_TOKEN` → `scripts/lib/retrieval-inox-session.js`
- Next ops: point fracta `guide.env` at capable-host inox-serve; remove Supabase/OpenAI secrets from VPS when inline fulfill works remotely
- Later: mandate packet `.nox` + COP stream instead of HTTP per turn

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