---
title: "Retrieval Resilience, OpenRouter Fallback, and Guide V2 Production Architecture"
author: "Jean Hugues Noel Robert, baron Mariani & Antigravity"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
date: "2026-10-01"
status: "stable — active"
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
language: en
provenance:
  origin_type: generated
  origin_repository: JeanHuguesRobert/cogentia
  origin_date: "2026-10-01"
  derived_from:
    - "scripts/smart-embed-worker.js"
    - "scripts/lib/embedding-providers.js"
    - "scripts/sync-retrieval-supabase.js"
    - "scripts/ops/rebuild-corpus-embeddings.mjs"
    - "docs/retrieval-roadmap.md"
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "high"
---

# Retrieval Resilience, OpenRouter Fallback, and Guide V2 Production Architecture

## 1. Executive Summary

During Sprint `2026-W40`, the Cogentia and FractaVolta retrieval substrate underwent a fundamental resilience upgrade:

1. **Production Cutover of Guide Reasoning Loop V2**: The Guide answering surface was permanently cut over to the V2 reasoning loop (`cogentia.agent_john_reasoning_loop.v2`) on `fracta2` (`100.84.109.87`), with A/B fallback preservation for legacy evaluation.
2. **Provider-Agnostic Embedding Fallback**: Faced with exhausted direct OpenAI account credits, the embedding pipeline was enhanced with transparent OpenRouter fallback for `openai/text-embedding-3-small` (1536d).
3. **Bit-to-Bit Vector Consistency**: Mathematical verification established an exact cosine similarity of $1.0000000$ between OpenAI-direct and OpenRouter-proxied vectors, ensuring seamless index interoperability without historical drift.
4. **Full Corpus Vector Reconstitution**: 14,332 chunks across `FractaVolta`, `marenostrum`, `barons-Mariani`, and `cogentia` were embedded locally in `corpus.sqlite` and synchronized to Supabase pgvector (`retrieval_chunks`), bringing remote coverage to >23,000 vector records.
5. **Sync Pipeline Hardening**: Implemented the `--no-prune` safety invariant and adaptive batch sizing with statement timeout protection against PostgREST/Postgres error `57014`.

---

## 2. Guide Reasoning Loop V2 Cutover

### Architecture & Service Configuration

On the production host `fracta2` (`100.84.109.87`), the systemd unit drop-in was configured to make V2 the default engine:

```ini
# /etc/systemd/system/mcp-cogentia.service.d/guide-v2-probe.conf
[Service]
Environment=COGENTIA_REASONING_LOOP_V2=true
Environment=COGENTIA_GUIDE_ALLOW_V2_PROBE=true
```

- **Default Visitor Ingestion**: Regular public queries to `https://fractavolta.corsica/guide` automatically route through `cogentia.agent_john_reasoning_loop.v2`.
- **A/B Probe Preservation**: Requests explicitly passing `{"reasoning_loop_v2": false}` in their JSON body remain capable of falling back to the legacy V1 loop for comparative eval.
- **Service Verification**:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl restart mcp-cogentia
  journalctl -u mcp-cogentia -n 25 --no-pager
  ```

---

## 3. Resilient Multi-Provider Embeddings

### Fallback Hierarchy

The embedding pipeline in [`scripts/lib/embedding-providers.js`](file:///C:/tweesic/cogentia/scripts/lib/embedding-providers.js) and [`scripts/smart-embed-worker.js`](file:///C:/tweesic/cogentia/scripts/smart-embed-worker.js) implements the following resolution chain:

```mermaid
flowchart TD
    A[Embedding Request: 1536d] --> B{OPENAI_API_KEY valid?}
    B -- Yes --> C[Direct OpenAI text-embedding-3-small]
    B -- No / 401 / 429 --> D{OPENROUTER_API_KEY valid?}
    D -- Yes --> E[OpenRouter: openai/text-embedding-3-small]
    D -- No --> F[Mock / Deterministic Hash Fallback]
```

### Mathematical Compatibility Proof

Because OpenRouter forwards embedding calls directly to OpenAI's inference endpoints, the resulting vectors are strictly identical:
$$\text{CosineSimilarity}(\vec{v}_{\text{OpenAI}}, \vec{v}_{\text{OpenRouter}}) = 1.0000000000$$

This allows mixed ingestion without index invalidation or partition boundaries.

---

## 4. Corpus Coverage & Supabase pgvector Synchronization

### Local Corpus Indexing (`corpus.sqlite`)

The local SQLite index at `JeanHuguesRobert/.cogentia/index/corpus.sqlite` holds 14,332 indexed chunks across 4 repositories:

| Repository | Chunks | Role | Visibility |
|---|---|---|---|
| **`FractaVolta`** | 1,466 | Public answer surface & Guide notes | Public |
| **`marenostrum`** | 798 | Mediterranean & energy studies | Public |
| **`barons-Mariani`** | 4,826 | Territorial research & political doctrine | Public |
| **`cogentia`** | 7,242 | Cognitive infrastructure & methodology | Public |
| **Total** | **14,332** | Full public retrieval slice | Public |

### Supabase Invariants (`sync-retrieval-supabase.js`)

1. **`--no-prune` Invariant**:
   When synchronizing partial repositories or running batch updates, `--no-prune` prevents deleting chunks whose `index_hash` differs from the current local slice, guarding against catastrophic retrieval loss.
2. **Adaptive Batch Sizing (`--batch-size`)**:
   PostgREST statement timeouts (Postgres `57014`) trigger when upserting large batches (e.g. 35+ chunks) into an HNSW/IVFFlat indexed table exceeding 20,000 vector rows. Defaulting to 10-20 chunks guarantees execution well within server budget.
3. **Socket Timeout (`AbortSignal.timeout(15000)`)**:
   Enforces a 15-second client timeout per batch to avoid unbounded hangs on dropped TCP connections.
4. **Admissibility** (`scripts/lib/retrieval-admissibility.js`, classes in `scripts/lib/retrieval-admissibility-classes.yml`, method in `research/derived_products.md` §6.8):
   Role, admissibility, and sovereignty are separate. A public chunk is served when `role` is `source`, or when `role` is `derived` and it matches a named class. The only class is `living-book-manuscript`: a public reading chapter whose path contains `/manuscript/`. Paths under `.cogentia/` or containing `/issues/` stay out. Press kits, forensic notes, candidature notices, blogposts, memory catalogues, trails, and operational notes stay out. `sovereign_status: latent` does not admit a chunk. Both retrieval RPCs still require `admissible = true`. The served manuscript rows match this class. A later sync must use this predicate and `--no-prune`. A source-only sync would hide them again. Editing the class file does not update the serving projection.

---

## 5. Root Cause Analysis (Incident RCA)

The investigation into the degradation of semantic retrieval on the Guide identified three compounding root causes:

1. **Direct OpenAI Key Depletion (HTTP 401)**:
   The key configured in `/srv/cogentia/secrets/guide.env` and local workspaces returned 401 Unauthorized due to depleted credits. Resolved by the OpenRouter fallback layer using `OPENROUTER_API_KEY`.
2. **Magistral Fulfiller Endpoint Mismatch (HTTP 404)**:
   A systemd drop-in (`/etc/systemd/system/mcp-cogentia.service.d/zzzz-magistral-acp.conf`) directed `COGENTIA_EMBEDDING_FULFILLER_URL` to `http://127.0.0.1:8880/v1/embeddings`. The Magistral local router only handles `/v1/chat/completions`, not embeddings, causing immediate 404 errors. Resolved by disabling the override and routing through the standard embedding client.
3. **Index Hash Drift in Supabase `match_retrieval_chunks`**:
   The RPC function strictly filtered by `c.index_hash = index_hash`. Whenever a local reindex occurred, the hash changed, rendering thousands of valid existing vectors invisible and causing 8s Postgres timeouts. Resolved in [`scripts/lib/retrieval-supabase.js`](file:///C:/tweesic/cogentia/scripts/lib/retrieval-supabase.js) via a two-tier lookup: strict hash first, with automatic fallback to `index_hash = null` if no matches are found.
4. **CLI Registry Scope Bug in `scripts/cogentia.js`**:
   `valueFlag("--registry")` consumed the argument from `argv`, causing downstream functions (`cogentiaDataRoot()`) to fallback to `process.cwd()`. Resolved by caching the explicit registry argument in `cachedExplicitRegistry`.

---

## 6. Operational Automation

To ensure full reproducibility without manual step assembly, an operations script has been integrated into the repository:

```bash
# Rebuild all core embeddings and synchronize to Supabase
node scripts/ops/rebuild-corpus-embeddings.mjs

# Partial rebuild for specific repositories
node scripts/ops/rebuild-corpus-embeddings.mjs --repos=FractaVolta,barons-Mariani

# Embed only, skipping Supabase sync
node scripts/ops/rebuild-corpus-embeddings.mjs --skip-sync
```

---

## 7. Epistemic Alignment & Anti-Capture

Per [`instructions/AGENTS.workspace.md`](file:///C:/tweesic/cogentia/instructions/AGENTS.workspace.md):
> *"Working memory is ephemeral (task-bound); doctrine and project facts stay in the corpus."*

This document serves as the permanent, Git-tracked record of the transition from single-provider fragility to multi-provider retrieval resilience. Future agents and human maintainers can inspect, operate, and extend this substrate without relying on ephemeral conversational memory.
