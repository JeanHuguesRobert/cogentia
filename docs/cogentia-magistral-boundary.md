---
title: "Cogentia and Magistral Boundary"
created: 2026-06-28
last_modified_at: 2026-06-28
role: operational
visibility: public
public_presence: full
trace_level: standard
---

# Cogentia and Magistral Boundary

Cogentia and Magistral should cooperate through a small HTTP contract, not by
sharing process internals or SQLite tables.

Short form:

```text
Cogentia owns the corpus.
Magistral owns model routing.
The boundary is an AI Router API.
```

## Responsibilities

Cogentia is responsible for:

- tracked repository registry and visibility policy;
- Markdown corpus inventory;
- SQLite corpus index, FTS and chunk metadata;
- corpus embedding provenance and searchable chunk vectors;
- public context search, context packs, source ids and line citations;
- MCP and conversational corpus-facing tools.

Magistral is responsible for:

- model/provider routing;
- OpenAI-compatible chat completions;
- OpenAI-compatible embeddings;
- provider failover, local fallback and degraded modes;
- provider health, metrics and traffic logs;
- optional local operational cache.

The two services may run on the same machine. They should still keep separate
stores and talk through explicit APIs.

## AI Router Contract

Cogentia expects an AI router to expose this minimum surface:

```text
GET  /health
GET  /v1/models
POST /v1/chat/completions
POST /v1/embeddings
```

The contract is deliberately compatible with OpenAI-style providers. Magistral
is the preferred local implementation because it can route to remote providers,
Ollama, local llama-server and fallback models without Cogentia depending on a
specific provider SDK.

Cogentia configuration:

```text
COGENTIA_AI_ROUTER_URL=http://127.0.0.1:8880
COGENTIA_AI_ROUTER_API_KEY=
COGENTIA_AI_ROUTER_TIMEOUT_MS=15000
COGENTIA_CHAT_MODEL=magistral
COGENTIA_EMBEDDING_MODEL=text-embedding-3-small
```

The default local URL is intentionally loopback. Public deployments should put a
reverse proxy in front of Cogentia, not expose Magistral control endpoints.

The public website Guide uses the same boundary. It is a public, low-maturity,
read-only instance of the owner-rooted digital twin, not the private
owner-facing core. Browser code calls the governed Cogentia HTTP facade, not
Magistral and not a model provider:

```text
POST /guide/chat
```

That facade forces the public Cogentia view, builds a public context pack, then
asks the local AI router for grounded synthesis. If the AI router is not
available, the route degrades to an extractive answer that lists public sources
instead of inventing a conversational response.

## Storage Boundary

Cogentia SQLite stores corpus state:

- documents;
- chunks;
- FTS;
- corpus embedding rows;
- source ids and citation metadata.

Magistral SQLite may store operational AI-router state:

- provider nodes;
- provider health;
- routing metrics;
- traffic logs;
- model capability cache;
- raw embedding request cache.

Cogentia must not read Magistral SQLite directly. Magistral must not read
Cogentia SQLite directly.

## Embedding Policy

Cogentia decides which embedding policy is authoritative for a corpus index:

```text
provider
model_name
dimensions
embedding_policy_version
content_hash
```

The AI router generates vectors. Cogentia stores and searches them.

The cache rule is:

```text
Do not ask the AI router for an embedding when the selected
content_hash + provider + model_name + dimensions + policy is already stored.
```

Chunk-level search still needs chunk ids, paths and line ranges. A future
content-hash vector cache may deduplicate identical text across chunks while
preserving chunk-level citations.

Context retrieval uses the same policy. `semantic` mode searches stored vectors
only when the matching query vector is already cached with the same provider,
model, dimensions, and policy. `hybrid` mode attempts that cached semantic pass
first and falls back to keyword retrieval on a cache miss, so a missing remote
provider degrades search quality rather than breaking corpus access. Fulfilled
semantic continuations can populate the query cache with `embeddings
search-with <result.json> --cache-query` or `embeddings cache-query
<result.json>`.

Use `node scripts/cogentia.js agent health --check-query --json` for the narrow
end-to-end diagnostic. The plain health check should only verify configuration
and advertised capabilities; the `--check-query` form is the explicit operation
that spends one query embedding request and verifies returned dimensions.

## Local Profile

Local developer machine:

```text
Magistral: http://127.0.0.1:8880
Cogentia: http://127.0.0.1:8790
MCP stdio: scripts/cogentia-mcp.js
```

In this profile, full/admin Cogentia views may be available through loopback or
an admin token. The MCP adapter still calls Cogentia HTTP rather than SQLite.

## Fracta Public Profile

Public VPS profile:

```text
Magistral: loopback only
Cogentia: public reverse proxy
Public endpoints: context, MCP, chat, web UI
Admin endpoints: not public
```

The public Internet face should be read-only by default:

- no index rebuild;
- no filesystem browsing;
- no full/private view;
- no provider-key exposure;
- no Magistral map editing;
- no direct Magistral metrics unless explicitly sanitized.
- browser-facing Guide endpoints must keep provider keys server-side and force
  `X-Cogentia-Entry: public` when calling the daemon.

## Conversational Pipeline

The first corpus agent should use a retrieval-first pipeline:

```text
question
-> context search or context pack
-> prompt with citations and source ids
-> AI router chat completion
-> streamed answer
-> cited sources preserved
```

If no capable model is available, Cogentia should degrade to an extractive
answer from context packs. A weak local model is better than a hard failure only
when the answer remains visibly grounded in retrieved sources.

## First Implementation Slice

The first shared base is:

- `scripts/lib/ai-router-client.js`;
- `GET /api/agent/health`;
- `node scripts/cogentia.js agent health`;
- tests with a mock OpenAI-compatible router.

The first conversational slice adds:

- `POST /v1/chat/completions`;
- `node scripts/cogentia.js ask "..."`
- retrieval-first grounding through Cogentia context packs;
- OpenAI-style JSON and SSE streaming responses;
- `cogentia_context` metadata with source ids and pack hashes.

After that, Cogentia can add:

- remote Streamable HTTP MCP;
- a compact public web UI.
