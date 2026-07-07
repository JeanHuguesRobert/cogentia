---
title: "Cogentia Corpus Navigator Contract"
created: 2026-07-07
last_modified_at: 2026-07-07
role: operational
visibility: public
public_presence: full
trace_level: standard
---

# Cogentia Corpus Navigator Contract

## Purpose

The Corpus Navigator is the read-only, model-facing access contract for the Cogentia corpus.

Short form:

```text
GitHub remains the Git authority.
Cogentia becomes the corpus navigation authority.
```

The navigator must make Cogentia a viable alternative to GitHub MCP for corpus reading while making Cogentia better than GitHub for corpus-specific navigation: visibility, source status, concepts, citations, context packs, freshness, and graph relations.

## Shared surfaces

The same read-only contract should be available through four surfaces:

```text
CLI <-> HTTP <-> MCP <-> OpenAI-compatible/SSE
```

A fifth surface, the public FractaVolta Guide, may use this contract internally, but production Guide behavior must remain stable unless a dedicated Guide migration changes it explicitly.

All surfaces must preserve the same identifiers, citations, hashes, visibility rules, and error semantics.

## Canonical source model

Canonical sources remain:

- Git repositories;
- tracked Markdown documents;
- tracked YAML/JSON metadata when explicitly included;
- Git history, issues, and pull requests when later indexed as read-only corpus-live material.

SQLite, FTS, embedding stores, Supabase mirrors, and local caches are derived and reconstructible.

The navigator must never make SQLite or Supabase the canonical source of corpus truth.

## Storage boundary

Clients must not read SQLite tables, local files, or provider caches directly.

Model-facing access must go through:

- documented CLI commands;
- documented HTTP routes;
- MCP tools;
- OpenAI-compatible/SSE routes.

Public clients must not receive:

- local filesystem paths;
- registry file paths;
- secret names with values;
- environment values;
- private repository names unless explicitly public;
- stack traces;
- admin-only route details;
- private corpus content.

## Visibility model

The navigator recognizes at least these views:

- `public` — safe public corpus view;
- `full` — owner/admin local view, requiring explicit authorization;
- future narrower private/internal views when needed.

Public mode is the default for MCP and HTTP deployment.

Public mode must enforce:

```text
no mutation
no private view
no admin route
no local path leak
no filesystem browsing
no provider-key exposure
```

If a document, chunk, issue, or concept is not public, public mode must either omit it or return a safe visibility error.

## Identifiers

### Document reference

A document reference should use:

```text
repo:path/to/document.md
```

Example:

```text
cogentia:docs/cogentia-context-gateway.md
```

### Line citation

A citable source interval should use:

```text
repo:path/to/document.md#Lstart-Lend
```

Example:

```text
cogentia:docs/cogentia-context-gateway.md#L12-L24
```

### Source id

`source_id` should be stable for a specific citable source interval within a given index state.

A `source_id` must be resolvable to:

- repository;
- path;
- start line;
- end line;
- document metadata when permitted;
- GitHub URL when available;
- content hash or index hash when available.

## Hashes

The navigator should use the following hashes consistently.

### `content_hash`

Hash of normalized source content or chunk content. Used to detect content equality and embedding cache eligibility.

### `index_hash`

Hash of the effective index state used to serve the result. Used for reproducibility and freshness diagnostics.

### `pack_hash`

Hash of a deterministic context pack, including selected sources, ordering, policy version, and budget-relevant context.

Context packs generated from the same index state and same options should produce the same `pack_hash`.

## Pagination and limits

List and search routes should support:

```text
limit
cursor
sort
order
```

Public routes should enforce bounded limits.

Cursor values are opaque. Clients must not infer storage internals from cursors.

## Error format

Errors should be structured and safe:

```json
{
  "ok": false,
  "error": "machine_readable_code",
  "message": "safe public message",
  "warnings": []
}
```

Public errors must not include stack traces, local paths, secrets, SQL fragments, or raw provider errors.

## Current MCP tools

The current MCP surface exposes these public read-only tools:

- `cogentia_search`
- `cogentia_context_pack`
- `cogentia_context_pack_batch`
- `cogentia_get_lines`
- `cogentia_explain`
- `cogentia_health`

`cogentia_context_pack_batch` is part of the navigator contract because the Guide retrieval path already relies on batch context pack behavior when daemon batch mode is selected.

## Planned navigator tools

The next read-only tools should be added incrementally.

### Document discovery

- `cogentia_list_repos`
- `cogentia_list_docs`
- `cogentia_get_doc`
- `cogentia_get_doc_metadata`
- `cogentia_index_freshness`

### Graph navigation

- `cogentia_related_docs`
- `cogentia_backlinks`
- `cogentia_forward_links`

### Concept navigation

- `cogentia_list_concepts`
- `cogentia_get_concept`
- `cogentia_search_concepts`
- `cogentia_concept_neighborhood`

### Corpus-live navigation

Later, the navigator may expose read-only GitHub-derived live corpus material:

- `cogentia_list_issues`
- `cogentia_get_issue`
- `cogentia_search_issues`
- `cogentia_issue_packet`
- `cogentia_list_prs`
- `cogentia_get_pr`
- `cogentia_get_pr_diff`
- `cogentia_list_recent_commits`
- `cogentia_get_commit`
- `cogentia_compare_refs`

These tools must remain read-only. They must not create branches, issues, comments, pull requests, commits, labels, or reviews.

## Search contract

`cogentia_search` should support:

```text
query
repo
path_prefix
document_role
document_kind
visibility
lifecycle_state
source_or_derived
has_embeddings
human_validation_required
date_from
date_to
limit
cursor
mode: keyword | semantic | hybrid
```

Each result should include, when available:

```text
source_id
repo
path
title
heading_path
start_line
end_line
github_url
retrieval_mode
score
score_details
index_hash
content_hash
semantic_cache_hit
keyword_fallback
warnings
```

## Context pack contract

`cogentia_context_pack` and `cogentia_context_pack_batch` should return deterministic, bounded, citable packs.

A pack should include:

```text
query
strategy
policy_version
index_hash
pack_hash
sources
context
warnings
```

Batch packs should preserve the input query order and return a result per query, including safe per-query errors.

## OpenAI-compatible/SSE contract

The OpenAI-compatible surface should support a corpus-facing model such as:

```text
model: cogentia-corpus
```

Responses should be retrieval-first and include machine-readable metadata:

```text
cogentia_context
sources
source_ids
index_hash
pack_hash
retrieval_mode
warnings
```

Streaming responses should preserve source metadata either before the final answer, after the final answer, or in a final structured event.

If synthesis fails, the service should degrade to an extractive answer with sources rather than inventing unsupported claims.

## FractaVolta Guide production compatibility

The FractaVolta Guide is a public, low-maturity, read-only surface over the public corpus.

Navigator work must preserve the existing Guide behavior unless a dedicated Guide migration PR says otherwise.

Specifically, early navigator PRs must not change:

- `/guide/chat` request/response semantics;
- `/guide/health` public semantics;
- CORS behavior for `https://fractavolta.com`;
- `X-Cogentia-Entry: public` on daemon calls;
- Guide mandate restrictions;
- `guideRetrievalRun()` behavior;
- `fetchGuideRetrievalPacks()` backend selection;
- Inox retrieval behavior;
- Supabase retrieval behavior;
- extractive fallback behavior.

The first safe production-compatible change is exposing already implemented batch context-pack functionality through MCP tool discovery and updating tests from five to six tools.

## Equivalence expectations

For the same view, query, index state, and options:

- CLI, HTTP, MCP, and OpenAI-compatible/SSE should produce compatible `source_id` values;
- `get_lines` should resolve citations emitted by search and context packs;
- public mode should filter the same content across all surfaces;
- hashes should be consistent across surfaces;
- errors should be semantically equivalent across surfaces.

## Non-goals

This contract does not authorize:

- write tools;
- branch creation;
- pull request creation;
- issue creation;
- comments;
- label mutation;
- index rebuild through public MCP;
- direct SQLite access by clients;
- exposure of private corpus content;
- exposure of provider keys or local env values.

## Initial acceptance criteria

A model-facing client can, without GitHub MCP:

1. discover the available public corpus surface;
2. search public corpus content;
3. build single and batch context packs;
4. retrieve exact cited lines;
5. check health and index availability;
6. receive stable source ids and line citations;
7. avoid private leaks in public mode;
8. preserve current FractaVolta Guide production behavior.
