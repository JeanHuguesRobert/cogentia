---
title: "Cogentia Index Layer v0.1"
document_role: "operational"
document_kind: "guide"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "guide"
classification_confidence: "strong"
---

# Cogentia Index Layer v0.1

Generated automatically by `cogentia.js`.

## Purpose

The Cogentia Index Layer is a local search cache for the Git corpus.

It exists to help humans and agents quickly find relevant Markdown documents and sections without scanning every repository on every query. It does not replace Git, Markdown, `research/index.md`, backlinks, trails, or `research/documents.md`.

Git and Markdown remain canonical. The SQLite database is only a local, reconstructible cache.

## Storage

The default database path is:

```text
.cogentia/index/corpus.sqlite
```

In the current Cogentia checkout this resolves to:

```text
C:\tweesic\cogentia\.cogentia\index\corpus.sqlite
```

The `.cogentia/` directory is ignored by Git. The database is safe to delete. Rebuild it from canonical sources when needed.

## What Is Indexed

The index stores document metadata for the configured corpus and full-text chunks for public searchable documents.

Document metadata includes:

- repository;
- branch;
- path;
- title;
- role;
- visibility;
- public presence;
- trace level;
- GitHub URL;
- content hash;
- indexed timestamp.

Chunks are built from Markdown headings and include:

- repository;
- path;
- title;
- heading path;
- start line;
- end line;
- text;
- word estimate;
- content hash.

Private, confidential, or secret documents are not exposed by default search. In v0.1, non-public documents are not inserted into the FTS table.

## CLI

Inspect the index:

```bash
node scripts/cogentia.js index status --json
```

Rebuild the index from Git and Markdown:

```bash
node scripts/cogentia.js index rebuild --json
```

Refresh the index:

```bash
node scripts/cogentia.js index update --json
```

Search:

```bash
node scripts/cogentia.js index search "autonomie de capacité" --json
```

Limit search to one repository:

```bash
node scripts/cogentia.js index search "autonomie de capacité" --repo barons-Mariani --limit 10 --json
```

In v0.1, `update` performs the same deterministic refresh as `rebuild`. This keeps the first layer simple and correct. A later version may add incremental update logic.

## Daemon Routes

Start the daemon:

```bash
node scripts/cogentia.js daemon --port 8790
```

Routes:

```text
GET  /api/index/status
POST /api/index/rebuild
POST /api/index/update
GET  /api/index/search?q=autonomie%20de%20capacité&repo=all&limit=25
```

The daemon returns compact JSON. It does not expose raw SQL.

## Continuations

The indexer is deterministic. It does not call an AI provider and does not make hidden semantic judgments.

If an explicit metadata or governance boundary prevents deterministic indexing, the tool emits a Cogentia continuation instead of guessing. The current v0.1 boundary is intentionally narrow: a public-searchable document with unknown or weak document role is blocked and a continuation is emitted.

Continuation kinds reserved for index work include:

- `index.document_role_judgment`
- `index.visibility_judgment`
- `index.public_exposure_review`
- `index.chunking_policy_judgment`
- `index.source_or_derived_judgment`

Use the existing continuation commands:

```bash
node scripts/cogentia.js continuation list --json
node scripts/cogentia.js continuation inspect <id> --json
node scripts/cogentia.js continuation resolve <id> result.json
```

## Agent Invocation

Agents should use the CLI first:

```bash
node scripts/cogentia.js agent start --json
node scripts/cogentia.js index status --json
node scripts/cogentia.js index update --json
node scripts/cogentia.js index search "query" --json
```

Agents may use the daemon second:

```text
GET /api/index/status
GET /api/index/search?q=query
```

Agents must not query the SQLite database directly. The database schema is an implementation detail of a cache, not a public authority layer.

## Failure Modes

If SQLite or FTS5 is unavailable, the CLI returns a JSON error such as:

```json
{
  "ok": false,
  "code": "sqlite_unavailable",
  "error": "..."
}
```

Delete the cache and rebuild whenever in doubt:

```bash
node scripts/cogentia.js index rebuild --json
```
