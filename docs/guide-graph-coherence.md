---
title: Guide and Corpus graph coherence
author: unknown
date: '2026-07-17'
document_role: source
document_kind: integration-contract
visibility: public
lifecycle_state: working
update_policy: UP-DECISION-REVIEW
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: pending
  origin_date: '2026-07-17'
  derived_from:
    - docs/corpus-graph-contract.md
review:
  status: unreviewed
  reviewed_by: []
---

# Guide and Corpus graph coherence

The Guide's retrieval result and the Living Corpus graph are complementary
views over the same canonical sources. Retrieval may be cached or semantic, but
each returned source must remain navigable in the graph when a corresponding
artifact is known.

## Source identity contract

Guide source records should expose, when available:

- repository identity and normalized path;
- source commit and content hash;
- graph node identifier;
- visibility mandate and retrieval mode;
- metadata/provenance status;
- related continuation or adapted-product identifiers.

An embedding or retrieval row without a stable source hash is incomplete and
must not be presented as a fully traceable source.

## Coherence checks

Read-only diagnostics should detect:

- retrieval sources missing from the graph;
- graph artifacts absent from the document index;
- hash or commit drift between retrieval and graph caches;
- visibility mismatches;
- broken provenance edges;
- continuations that affect a returned source.

These are diagnostics, not automatic content decisions.

## Cache boundary

SQLite document/graph indexes and Supabase embeddings are reconstructible caches.
Git, frontmatter, registry configuration, and explicit continuation records are
the authority. Cache refreshes must be idempotent and keyed by content hash.

## User-facing behavior

The FractaVolta Guide may show source status, provenance links, and a concise
warning when a source is stale, unresolved, or affected by an open continuation.
It must not expose private artifacts or imply that semantic ranking establishes
canonicality.
