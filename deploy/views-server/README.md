# Views Store server

Node HTTP service for the flat `/srv/views` directory: **Gmail-style tag browser** + JSON API.

**Canonical documentation:** [docs/views-store.md](../../docs/views-store.md)  
**Live docs:** https://cogentia.fractavolta.com/docs  
**Live API:** https://cogentia.fractavolta.com/api/views  
**API contract JSON:** https://cogentia.fractavolta.com/api/docs (version field; currently tracks tag browser + cross_refs + corpus-state)  

## UX (summary)

- Tags (`kind` / `repo` / `type`), not folder trees; **OR within** dimension, **AND across**
- Soft hierarchy via `repo-kind.ext` names when sorted by **name**
- Default sort: **modified desc** (recent first)
- Also: produced, name, kind, type, size

## Quick API

```text
GET /api/health
GET /api/docs                 # machine-readable contract
GET /api/views?tag=&q=&sort=&dir=
GET /views/{file}             # HTML
GET /views/{file}?raw
GET /views/{file}?download
GET /                         # HTML browser
GET /docs                     # human docs page
```

| Query | Default | Notes |
|-------|---------|--------|
| `tag` / `tags` | | Comma-separated ids; OR within kind/repo/type, AND across (`type:md,type:json` or `kind:index,repo:cogentia`) |
| `q` | | Search |
| `sort` | `modified` | `modified` \| `produced` \| `name` \| `kind` \| `ext` \| `size` |
| `dir` | `desc` | `asc` \| `desc` |

## Run

```bash
npm install
PORT=3423 VIEWS_DIR=/srv/views node views-server.js
```

ESM-only (`"type": "module"` in package.json) — entry is `views-server.js`, not `.mjs`.

## Deploy (fracta)

```bash
scp views-server.js package.json fracta:/tmp/
ssh fracta 'sudo cp /tmp/views-server.js /srv/views-server/views-server.js && sudo systemctl restart views-store'
```

Service: `views-store.service` · Public: https://cogentia.fractavolta.com/
