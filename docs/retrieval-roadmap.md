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

### Phase 2 — Netlify Deno façade (abstraction)

- `POST /api/retrieval/batch` on Netlify edge (same JSON contract as daemon batch).
- fracta `COGENTIA_RETRIEVAL_URL` → Netlify; Supabase stays behind adapter.
- Ophelia / survey reuses the same endpoint with `corpus_key=ophelia-{instance}`.

### Phase 3 — Ophelia / future survey platform

- Apply shared schema per instance (RLS + `corpus_key`).
- Replace JS `vector_search` (fetch 1000 + cosine) with RPC.
- Ingest pipelines (`ingest_file`, `rag-ingest`) write to `retrieval_chunks`.

### Phase 4 — Inox + Fractanet

- Mandate packet carries `.nox` retrieval verb + `corpus_key` + locality.
- COP supervises resumable fulfillment; JS/HTTP adapters become thin faces.

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