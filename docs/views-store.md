---
title: "Views Store"
document_role: source
document_kind: reference
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
generated_by: human+agent
last_modified_at: 2026-07-23
---

# Views Store

Public HTTP surface for **generated Cogentia views** (issues, continuations, indexes, concepts, env samples, package manifests, …).

| | |
|--|--|
| **UI** | https://cogentia.fractavolta.com/ |
| **API** | https://cogentia.fractavolta.com/api/views |
| **Docs (live)** | https://cogentia.fractavolta.com/docs |
| **Health** | https://cogentia.fractavolta.com/api/health |
| **Host** | `fracta` · systemd `views-store` · port `3423` behind Caddy |
| **Storage** | Flat directory `/srv/views` (not a Git tree of views) |
| **Server code** | `cogentia/deploy/views-server/` → `/srv/views-server/views-server.js` |
| **Publisher** | `cogentia.js publish list` / `publish push` |
| **Cross-refs** | Each view links **View** ↔ **GitHub source** ↔ optional **site** (`cross_refs` in API + frontmatter) |

Design in the open: files are **public unless** frontmatter sets `visibility: private|confidential|secret` or `public: false` / `published: false`.

---

## UX model (not a folder tree)

The browser is **Gmail-style tags**, not hierarchical directories.

| Concept | Behaviour |
|---------|-----------|
| **Tags** | Multi-label: `kind:…`, `repo:…`, `type:…`. **OR within** a dimension, **AND across** dimensions (empty = any). |
| **Soft hierarchy** | Many names are `repo-kind.ext` (e.g. `cogentia-index.md`). Sorting by **name** clusters by repo prefix. |
| **Default order** | **Attention**: importance (kind) then urgency (recent modified). |
| **Other sorts** | `modified` (urgency only), `produced`, `name` (A→Z hierarchy), `kind`, `ext`/`type`, `size`. |
| **List ordering** | Sidebar: kinds by importance, repos alphabetical, types md/json/txt… Document tables: click to sort; initial A→Z. Importance ≠ urgency. |
| **Flat store** | Disk remains one directory; tags are **derived**, not paths. |

### Tag derivation from filenames

| Pattern | Kind tag | Repo tag |
|---------|----------|----------|
| `{repo}-index.md` | `kind:index` | `repo:{repo}` |
| `{repo}-concepts.md` | `kind:concepts` | `repo:{repo}` |
| `{repo}-package.json` | `kind:package` | `repo:{repo}` |
| `{repo}-env.txt` | `kind:env` | `repo:{repo}` |
| `{repo}-cogentia.json` | `kind:cogentia` | `repo:{repo}` |
| `current-issues*.md` | `kind:issues` | _(none — global)_ |
| `continuations*.md` | `kind:continuations` | _(none — global)_ |

Every file also gets `type:{ext}` (e.g. `type:md`).

### Date fields

| Field | Source | Role |
|-------|--------|------|
| `modified` | filesystem `mtime` | When the published file last landed on the store |
| `produced` | frontmatter `generated_at`, `last_modified_at`, `produced_at`, `updated_at`, or `date`; else falls back to `modified` | Content / generation time |

---

## HTTP API

Base URL (public): `https://cogentia.fractavolta.com`

All JSON responses use `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store`.

### `GET /api/health`

```json
{ "ok": true, "views_dir": "/srv/views" }
```

### `GET /api/docs`

Machine-readable copy of this contract (same shape the server embeds). Also human HTML at `GET /docs`.

### `GET /api/views`

List public views, with the **same filters and sort as the UI**.

#### Query parameters

| Param | Default | Description |
|-------|---------|-------------|
| `tag` or `tags` | _(empty)_ | Comma-separated tag ids. **OR within** kind/repo/type, **AND across** dimensions. Examples: `type:md,type:json`; `kind:index,repo:cogentia` |
| `q` | _(empty)_ | Case-insensitive search over name, title, repo, kind, tag labels/ids |
| `sort` | `attention` | `attention` (importance then urgency), `modified`, `produced`, `name`, `kind`, `ext`/`type`, `size` |
| `dir` | `desc` | `asc` or `desc`. Default pairs with `attention` / recency axes |

#### Response

```json
{
  "views": [ /* ViewObject[] — filtered and sorted */ ],
  "count": 1,
  "total": 41,
  "tags": {
    "kind": { "index": 18, "concepts": 7 },
    "repo": { "cogentia": 3, "inseme": 4 },
    "type": { "md": 29, "json": 8, "txt": 4 }
  },
  "query": {
    "q": "",
    "tag": ["kind:index", "repo:cogentia"],
    "sort": "produced",
    "dir": "desc"
  }
}
```

`tags` catalogues counts over the **full public inventory** (not only the filtered page), so clients can build a Gmail-style sidebar.

#### ViewObject

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Basename in `/srv/views` |
| `title` | string | Frontmatter `title` when present, else `name` |
| `size` | number | Bytes |
| `modified` | string (ISO-8601) | File mtime |
| `produced` | string (ISO-8601) | Content/generation time (see above) |
| `ext` | string | Extension without dot (`md`, `json`, `txt`, …) |
| `repo` | string \| null | Soft repo prefix, or null for global views |
| `kind` | string | Derived kind id |
| `kind_label` | string | Display label for kind |
| `tags` | `{ type, id, label }[]` | Full tag objects |
| `tag_ids` | string[] | e.g. `["kind:index","repo:cogentia","type:md"]` |
| `url` | string | Path to open the view, e.g. `/views/cogentia-index.md` |
| `cross_refs` | object | See below — View / GitHub / site join |
| `visible` | boolean | Always `true` in this list (non-public files are omitted) |
| `visibility_reason` | string | Why it is considered public |

#### `cross_refs`

Same cognitive object across surfaces (different heat / binding):

| Field | Description |
|-------|-------------|
| `view_id` | Stable id (usually filename stem or publish id) |
| `view_url` | Absolute Views Store URL |
| `relation` | `derived_mirror` \| `operational_export` \| `config_sample` |
| `kind` | Tag kind (`index`, `continuations`, …) |
| `repo` | Soft repo name, or null for global views |
| `github` | `{ full_name, path, url }` for tracked source when applicable |
| `site` | `{ url, label }` for FractaVolta / GH Pages / product site when known |

Filled at **publish** time into markdown frontmatter; the server also **derives** fallbacks from the filename so non-md views still get links.

#### Examples

```bash
# Default: all public views, newest modified first
curl -sS 'https://cogentia.fractavolta.com/api/views'

# Continuations only
curl -sS 'https://cogentia.fractavolta.com/api/views?tag=kind:continuations'

# Corpus state (SQLite + embeddings + optional Supabase inventory — metadata only)
curl -sS 'https://cogentia.fractavolta.com/api/views?tag=kind:corpus-state'
curl -sS 'https://cogentia.fractavolta.com/views/corpus-state.json?raw'

# Cogentia index, by production date
curl -sS 'https://cogentia.fractavolta.com/api/views?tag=kind:index,repo:cogentia&sort=produced'

# Soft hierarchy: name ascending
curl -sS 'https://cogentia.fractavolta.com/api/views?sort=name&dir=asc'

# Search
curl -sS 'https://cogentia.fractavolta.com/api/views?q=env'
```

#### Kind tags (non-exhaustive)

`issues` · `continuations` · `corpus-state` · `index` · `concepts` · `env` · `package` · `config` · `other`

#### `corpus-state.json` (machine summary)

Published next to the markdown report. Shape is a **state document**, not a dump:

| Top-level field | Meaning |
|-----------------|--------|
| `local_sqlite` | Index built?, counts, index_hash, FTS/sqlite-vec, chunks_by_repo |
| `local_embeddings` | Row counts, model/dims, coverage_pct, embeddings_by_repo |
| `remote_supabase` | configured?, row counts, hash sample (if credentials on exporter host) |
| `signals` | `{ level, code, message }[]` health lines |
| `cross_refs` | Where bulk data actually lives |

No embedding vectors and no chunk text bodies are included.

### `GET /views/{filename}`

Serve one published file.

| Mode | How | Result |
|------|-----|--------|
| **HTML** (default) | no query | Rendered markdown, pretty JSON, or monospace text + tag links |
| **Raw** | `?raw` | Original bytes with type-appropriate `Content-Type` |
| **Download** | `?download` | Attachment disposition |

Path traversal is rejected (basename only). Non-public frontmatter → **403**. Missing file → **404**.

Supported extensions in the inventory: `.md`, `.json`, `.txt`, `.yaml`, `.yml`, `.csv`.

### `GET /` · `GET /views`

HTML tag browser (same query params as `/api/views` for shareable UI state: `q`, `sort`, `dir`, `tag`).

### `GET /docs`

Human-readable HTML documentation (this contract, summarized).

---

## Publishing views

From a workstation with the corpus registry:

```bash
export COGENTIA_REGISTRY=/c/tweesic/JeanHuguesRobert   # or equivalent

# List publishable views
node cogentia/scripts/cogentia.js publish list

# Push one or all to fracta:/srv/views
node cogentia/scripts/cogentia.js publish push continuations-list
node cogentia/scripts/cogentia.js publish push all
```

Related generators:

- `issues export` → `current-issues-list.md` / `current-issues.md` (open issues focus)
- `continuation export` → `continuations-list.md` / `continuations.md` (**alive** focus by default)
- `corpus-state export` → `corpus-state.md` / `corpus-state.json` (**metadata only**: local SQLite index + embeddings coverage + optional Supabase inventory — no vectors/bodies)
- Per-repo index / concepts / package / env views as configured in `publish list`

### Corpus state views (caches without dumps)

Local `.cogentia/index/corpus.sqlite` and Supabase `retrieval_chunks` are **large caches / serving layers**. The Views Store does **not** host their full contents. Instead `corpus-state` publishes:

- index built?, document/chunk/edge counts, index hash, FTS/sqlite-vec health
- local embedding row counts, models, per-repo breakdown, coverage % of chunks
- optional Supabase row counts / hash alignment when credentials exist
- explicit **health signals** for ops and agents

Regenerate: `node scripts/cogentia.js corpus-state export` then `publish push corpus-state`.

Transfer uses `scp` + remote move (Windows-friendly). Target host alias: `fracta`.

---

## Operations (fracta)

```bash
systemctl status views-store
systemctl restart views-store
# Unit: WorkingDirectory=/srv/views-server
# ExecStart=/usr/bin/node /srv/views-server/views-server.js
# Environment: PORT=3423 VIEWS_DIR=/srv/views
```

Deploy server code from the repo:

```bash
scp cogentia/deploy/views-server/views-server.js fracta:/tmp/
ssh fracta 'sudo cp /tmp/views-server.js /srv/views-server/ && sudo systemctl restart views-store'
```

See also:

- [operium/decisions/views-store-caddy-service.md](../../operium/decisions/views-store-caddy-service.md) — infrastructure decision
- [operium/decisions/views-store-env-consumption.md](../../operium/decisions/views-store-env-consumption.md) — redacted env views for Operium
- [cogentia/deploy/views-server/README.md](../deploy/views-server/README.md) — runbook next to the code
