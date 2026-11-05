---
title: "Corpus embeddings and retrieval — architecture and decision history"
author: "Cogentia contributors"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-05"
last_modified_at: "2026-11-05"
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/embedding-retrieval-history.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "2026-11-05-conversation-pertitellu-embeddings"
  origin_date: "2026-11-05"
  derived_from:
    - docs/cogentia-index-layer.md
    - docs/cogentia-context-gateway.md
    - docs/retrieval-roadmap.md
    - docs/retrieval-resilience-and-loop-v2.md
review:
  status: unreviewed
  reviewed_by: []
---

# Embeddings and retrieval — architecture and history

This is a **map of existing specifications and decisions**, not a replacement for the operational references. Historical figures below do not establish current runtime state.

## Responsibilities and invariants

1. **Canonical sources:** Git-managed Markdown, YAML and authorized corpus artifacts. Neither vector storage nor hosted search is a source of truth.
2. **Rebuildable local index:** SQLite/FTS5 chunks, source hashes, heading positions, provenance and visibility metadata. Embeddings are derived; optional `sqlite-vec` accelerates nearest-neighbor retrieval, with a JavaScript fallback.
3. **Embedding production:** documented stable profile `text-embedding-3-small` at 1536 dimensions; estimate-first, role-aware selection and continuations. Provider fallback via OpenRouter is documented; profile compatibility must be checked, not assumed.
4. **Serving:** the Guide serving backend documented on 2026-10-27 is Supabase/PostgreSQL `pgvector` (`retrieval_chunks` and `match_retrieval_chunks`). Local SQLite remains a reconstructible cache. Inox is a separately advertised retrieval-attractor, not the Guide backend.
5. **Access and answers:** the Context Gateway applies admissibility, public/private boundaries, ranking and source citations. Retrieval authority never implies authority to disclose or act.

**Source of truth != index != embeddings != serving cache != generated answer.** Rebuildability, provenance, visibility and model/version compatibility matter more than any one search vendor.

## Historical decision trail

- **2025:** the Pertitellu municipal initiative in Corte explored AI/document tooling; Google recorded an application called `Consultation Pertitellu` in October.
- **2025-11-20:** a Google Cloud project `gen-lang-client-0344343925`, named *Pertitellu*, was created with an API key named *File Search Pertitellu*. This demonstrates setup, not actual corpus ingestion.
- **2026-06-17:** Google reported an unrestricted Gemini API key associated with a `pertitellu` project; it is not proven to be the key visible in the November project.
- **2026-W40:** resilience documentation reports embedding provider fallback, reconstruction of 14,332 chunks in one historical pass, synchronization and incidents involving embedding routes, index-hash drift and admissibility.
- **2026-10-27:** Guide was reported live on Supabase serving; the Inox route remained distinct.
- **2026-10-29:** Google emailed a suspension allegation about activity consistent with hijacked resources. A **2026-11-05** read-only `gcloud` check returned project lifecycle `ACTIVE`, one enabled Gemini service, one Gemini-restricted API key, no listed service accounts and billing disabled. `ACTIVE` does not rule out service-level suspension. Cloud Logging was disabled; the allegation's technical cause was not verified.

## Decision of 2026-11-05

Preserve the sovereign embedding-based architecture. Gemini File Search is **not** selected as canonical Corpus indexing or durable memory. It may be compared later as a replaceable auxiliary for multimodal search and citations, using an explicitly public sample and measured accuracy, latency, cost and provenance. No new Google project, migration, appeal or reactivation is authorized by this historical record. Keep Pertitellu as an archival trace; do not publish tokens, credentials or private correspondence.

## Existing canonical documents

- [Cogentia Index Layer](cogentia-index-layer.md) — chunking, indexing policy, FTS5, embeddings and `sqlite-vec` lifecycle.
- [Context Gateway](cogentia-context-gateway.md) — governed retrieval, hybrid/semantic modes, source references, access restrictions.
- [Retrieval roadmap](retrieval-roadmap.md) — Supabase serving, topology, live backend receipts and distinction from Inox.
- [Retrieval resilience](retrieval-resilience-and-loop-v2.md) — provider failover, embedding reconstruction, synchronization and past incidents.
- [Corpus Navigator contract](cogentia-corpus-navigator-contract.md) — user/agent navigation contract.

## Unverified / optional next checks

Current corpus/vector counts and runtime health require fresh receipts; earlier reported quantities must not be presented as current. Gemini project suspension mechanics remain unverified. Neither investigation is necessary to preserve the historical choice.
