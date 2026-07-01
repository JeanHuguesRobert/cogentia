# Cogentia Context Gateway

Status: Phase 1, Markdown RAG public gateway.

The Context Gateway exposes a governed, read-only retrieval interface over the
Cogentia corpus. Git and Markdown remain canonical. SQLite/FTS5 is a local,
reconstructible cache: it can be deleted and rebuilt and must never be queried
directly by agents.

The governing distinction is:

> Total cognitive access is not total public exposure and is not total power to act.

## Architecture

```text
Git / Markdown / YAML (canonical)
          |
          v
SQLite / FTS5 (local reconstructible cache)
          |
          v
cogentia.js daemon (visibility, limits, scoring, citations)
          |
          v
HTTP clients and cogentia-mcp
```

Phase 1 indexes Markdown headings and text. Keyword search uses FTS5. Hybrid
mode first tries semantic retrieval when compatible stored embeddings and an AI
router embedding endpoint are available, then falls back to keyword search with
small deterministic boosts for role, title, heading, and an explicit repository
filter. Semantic mode uses the same stored corpus embedding profile and fails
closed when a compatible query embedding cannot be produced.

## Running the gateway

```bash
node scripts/cogentia.js index rebuild --json
node scripts/cogentia.js daemon --host 127.0.0.1 --port 8790
```

On a Fracta node:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
COGENTIA_DAEMON_VIEW=public \
node scripts/cogentia.js daemon --host 127.0.0.1 --port 8790
```

Keep the daemon on loopback behind Nginx. Nginx should set
`X-Cogentia-Entry: public`. Do not publish a daemon configured with
`COGENTIA_DAEMON_VIEW=full`.

## Public routes

The public view is the HTTP default and uses an explicit allowlist:

- `GET /api/status`
- `GET /api/index/status`
- `GET /api/index/search`
- `GET /api/context/health`
- `GET /api/context/search`
- `GET /api/context/pack`
- `GET /api/context/doc`
- `GET /api/context/lines`
- `GET /api/context/explain`

All public POST requests and every other `/api/*` route return HTTP 403. Public
responses exclude local paths, registry paths, private repositories, ignored
documents, confidential content, process details, environment variables, SQL,
and stack traces.

Examples:

```bash
curl "http://127.0.0.1:8790/api/context/health"
curl "http://127.0.0.1:8790/api/context/search?q=autonomie%20de%20capacit%C3%A9&limit=10"
curl "http://127.0.0.1:8790/api/context/pack?q=autonomie%20de%20capacit%C3%A9&budget=8000"
curl "http://127.0.0.1:8790/api/context/doc?ref=cogentia:docs/cogentia-index-layer.md"
curl "http://127.0.0.1:8790/api/context/lines?ref=cogentia:docs/cogentia-index-layer.md&start=1&end=30"
```

`context/search` accepts `q`, `repo`, `limit` (maximum 50), `mode` (`keyword`,
`hybrid`, or `semantic`), and `include_text`. `context/pack` also accepts
`budget`, `limit`, and `format=json|markdown`. A line request is limited to 200
lines.

## Admin boundary

Full view is accepted only when one of these conditions is true:

- the caller explicitly requests `view=full` over a loopback connection;
- the request supplies a valid `COGENTIA_ADMIN_TOKEN` as a Bearer token;
- the daemon was explicitly configured with `COGENTIA_DAEMON_VIEW=full`.

`X-Cogentia-Entry: public` always forces public view, including for requests
arriving from a local reverse proxy. Rebuild, update, Git, CLI inspection,
filesystem, command, and continuation routes remain outside the public facade.
Use SSH, localhost, a VPN, or a strict token for administration.

## Internet controls

The in-memory rate limit defaults to 60 requests per IP per 60 seconds:

```bash
COGENTIA_RATE_LIMIT_WINDOW_MS=60000
COGENTIA_RATE_LIMIT_MAX=60
```

For a loopback request marked `X-Cogentia-Entry: public`, the limiter uses the
first valid `X-Forwarded-For` address supplied by Nginx. It ignores that header
from non-loopback clients.

CORS sends no wildcard and no allow-origin header by default. Configure one or
more exact comma-separated origins when browser access is required:

```bash
COGENTIA_CORS_ORIGIN=https://acorsica.org
```

For a public deployment, Nginx should also provide TLS, request-size limits,
access logs, and an additional rate limit.

## Determinism and citations

A context pack records `query_hash`, `index_hash`, `pack_hash`, and
`retrieval_policy_version`. The logical pack hash excludes timestamps. Given
the same index hash, normalized query, policy, budget, repository filter, mode,
and view, retrieval produces the same logical pack.

Every source uses the form `repo:path#Lstart-Lend`. Agents should cite these
`source_id` values and use `/api/context/lines` to verify a focused passage.
Approximate token accounting uses four characters per token; a final source may
be deterministically truncated to remain within the requested budget.

## Indexing policy

Phase 1 enables Markdown only. The classifier already distinguishes Markdown,
plain text, code, data, binary, secret, and ignored files. Future text support
is disabled by default and is bounded by 250,000 bytes. Excluded material
includes `.env`, keys, certificates, databases, images, archives, `.git`,
`node_modules`, build output, caches, and coverage output.

The progression is deliberately separate:

1. inventory a file;
2. decide whether it may be indexed;
3. decide whether an indexed item may be exposed;
4. justify each exposed result with metadata and citations.

Adding non-Markdown parsers or changing embedding production requires an
explicit policy version. Embeddings should be cached by content hash, provider,
model, dimensions, and embedding policy version. `cogentia.js embeddings index`
emits a continuation with the embedding profile and credential-location hints
only; the external resolver loads any `.env` file, calls the provider, and
returns embeddings through `embeddings store`.

For retrieval, `hybrid` and `semantic` first look for a cached query embedding
with the same provider, model, dimensions, and policy as the stored corpus
chunks. Query embeddings are written by continuation replay, for example with
`embeddings cache-query <result.json>` or `embeddings search-with <result.json>
--cache-query`. If no compatible query vector is cached, the public daemon does
not call the AI router directly: `hybrid` falls back to keyword search and
`semantic` returns `semantic_continuation_required`.

When `search-with --cache-query` runs after continuation fulfillment, Cogentia
also stores the ranked semantic result IDs for the current `index_hash`. Later
requests for the same query/profile/view/repo can rehydrate current chunk rows
directly from the index, including text for context packs, without rescanning
all vectors. If the index hash changes, that ranked-result cache is ignored and
the query vector cache remains available for a fresh semantic scan.

For uncached semantic queries with an already cached query vector, Cogentia can
use the optional `sqlite-vec` acceleration cache instead of scanning embedding
JSON in JavaScript. This cache is derived from the `embeddings` table and is not
canonical data. Rebuild it after corpus embedding changes:

```bash
node scripts/cogentia.js embeddings vec-rebuild --dimensions 1536
node scripts/cogentia.js embeddings vec-status --json
```

If `sqlite-vec` is missing or the cache is stale, semantic retrieval falls back
to the existing JavaScript vector scan. It does not call the AI router or any
external provider.

Use `embeddings benchmark --query <cached query>` to compare ranked-result
cache, sqlite-vec, and exact JavaScript vector scan latency without creating a
new query embedding.

## Verification

```bash
node scripts/cogentia.js index status --json
node scripts/cogentia.js index search "autonomie de capacité" --json
node scripts/cogentia.js agent health --json
node scripts/cogentia.js agent health --check-query --json
node scripts/test-context-gateway.js
```

The integration test verifies health, search, deterministic packs, citations,
public path filtering, blocked write/admin routes, and the MCP adapter.
