---
title: "Cogentia Index Layer v0.3"
document_role: "operational"
document_kind: "guide"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "guide"
classification_confidence: "strong"
---

# Cogentia Index Layer v0.3

Generated automatically by `cogentia.js`.

## Version 0.3 Boundary

Version 0.3 marks the move from a Markdown-only local FTS cache toward an
agent-oriented indexing substrate:

- estimate-first indexing before spending embedding quota;
- broad executable-corpus measurement across Markdown, code, config and text;
- `.cogentia-index.yaml` retrieval policy files;
- explicit non-semantic treatment for logs, secrets, generated outputs,
  binaries, archives and oversized artifacts;
- stable-versus-workspace channel estimates for agent use.

The database schema is still intentionally conservative. Git and Markdown remain
canonical; SQLite remains a local, reconstructible cache.

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

For node deployments, set `COGENTIA_DATA_DIR` to keep the cache outside the Git checkout:

```bash
COGENTIA_DATA_DIR=/var/lib/cogentia node scripts/cogentia.js index status
```

With that environment, the database resolves to:

```text
/var/lib/cogentia/.cogentia/index/corpus.sqlite
```

## What Is Indexed

The index stores document metadata and full-text chunks for locally available,
indexable corpus documents. Each chunk carries a `searchable_public` decision;
the daemon and CLI apply that boundary before returning public results.

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

Private, confidential, or secret documents are never exposed by default search.
Since Context Gateway Phase 1, their chunks may exist in the local cache so an
authorized local/full view can retrieve them. They remain excluded from public
queries by `searchable_public`. The cache must therefore stay local and inherit
the filesystem protections of the corpus it indexes.

## CLI

Inspect the index:

```bash
node scripts/cogentia.js index status --json
```

Estimate indexable material before spending embedding quota:

```bash
node scripts/cogentia.js index estimate --profile workspace --dimensions 512,1536 --json
```

Use a broad registry:

```bash
COGENTIA_REGISTRY=/path/to/JeanHuguesRobert/.cogentia.json \
node scripts/cogentia.js index estimate --profile workspace --json
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

In v0.3, `update` still performs the same deterministic refresh as `rebuild`.
This keeps the first durable cache simple and correct. Later versions may add
incremental stable, branch, and workspace channels.

## Index Policy

Cogentia uses an optional `.cogentia-index.yaml` file to decide what is worth
retrieval indexing. This is not a `.gitignore` replacement:

- `.gitignore` controls Git tracking;
- `.cogentiaignore` controls corpus navigation/publication inventory;
- `.cogentia-index.yaml` controls retrieval/index treatment.

The estimator loads policy files in this order:

1. beside the active registry file;
2. inside each repository root;
3. the explicit `--index-policy <path>` override.

Supported YAML-style sections are intentionally small:

```yaml
exclude:
  - node_modules/**
  - .cogentia/**
  - "*.pdf"

archive:
  - "*v1-history*"
  - "**/legacy/**"
  - "*.bak"

tool_only:
  - "*.log"
  - logs/**

fts_only:
  - "*.csv"
  - "*.jsonl"

semantic:
  - README.md
  - docs/**/*.md
  - research/**/*.md
  - scripts/**/*.js

metadata_only:
  frontmatter_fields:
    - last_modified_at
    - generated_at
```

`exclude` means no retrieval index by default. `archive` means historical or
legacy material that remains useful for archaeology but is not part of the
default active semantic corpus. `tool_only` means the material should be queried
by a specialized tool rather than embedded. `fts_only` means plain text search
may be useful, but semantic embedding is not the first choice. `semantic` marks
text-like material as worth embedding when the active profile allows it.

Use `index estimate --include-archive` to measure archive material explicitly.

Secret-looking files remain excluded even if a policy tries to mark them
semantic. The policy is for tuning useful retrieval, not for widening security
boundaries.

## Embedding Cache Cleanup

Embedding cache rows are reconstructible. When an experimental embedding profile
is retired, inspect matching rows first:

```bash
node scripts/cogentia.js embeddings prune --dimensions 1024
```

Then delete only after reviewing the dry-run:

```bash
node scripts/cogentia.js embeddings prune --dimensions 1024 --apply
```

For the native OpenAI `text-embedding-3-small` stable profile, the current
target is 1536 dimensions. Use `--not-dimensions 1536` to inspect rows that do
not match the current stable dimensionality.

## Daemon Routes

Start the daemon:

```bash
node scripts/cogentia.js daemon --port 8790
```

For a node such as `fracta`, keep the daemon local and place the cache under `/var/lib/cogentia`:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node scripts/cogentia.js daemon --host 127.0.0.1 --port 8790
```

Routes:

```text
GET  /api/index/status
POST /api/index/rebuild
POST /api/index/update
GET  /api/index/search?q=autonomie%20de%20capacité&repo=all&limit=25
```

Public HTTP view sanitizes status output and blocks state-changing index routes. Use `view=full` only for local/admin calls behind a trusted boundary.

The daemon returns compact JSON. It does not expose raw SQL.

## Continuations

The indexer is deterministic. It does not call an AI provider and does not make hidden semantic judgments.

If an explicit metadata or governance boundary prevents deterministic indexing,
the tool emits a Cogentia continuation instead of guessing. The current durable
indexing boundary is intentionally narrow: a public-searchable document with
unknown or weak document role is blocked and a continuation is emitted.

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
