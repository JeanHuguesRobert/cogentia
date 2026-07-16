---
title: Cogentia MCP adapter
author: unknown
date: '2026-06-30'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 6775ef3
  origin_date: '2026-06-30'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Cogentia MCP adapter

`scripts/cogentia-mcp.js` is a small MCP stdio server for the Cogentia Context
Gateway. `scripts/cogentia-mcp-http.js` exposes the same tools over HTTP at
`/mcp`. Both adapters call the daemon over HTTP. They never open SQLite, read
corpus files, rebuild the index, execute commands, or change the corpus.

For client setup recipes, including local Codex and the Fracta public service,
see [connect-mcp-clients.md](connect-mcp-clients.md).

## Configuration

```json
{
  "mcpServers": {
    "cogentia": {
      "command": "node",
      "args": ["/srv/cogentia/repos/cogentia/scripts/cogentia-mcp.js"],
      "env": {
        "COGENTIA_DAEMON_URL": "http://127.0.0.1:8790",
        "COGENTIA_MCP_VIEW": "public"
      }
    }
  }
}
```

Environment variables:

- `COGENTIA_DAEMON_URL` defaults to `http://127.0.0.1:8790`.
- `COGENTIA_MCP_VIEW` defaults to `public`.
- `COGENTIA_ADMIN_TOKEN` is required before the adapter will request `full`.
- `COGENTIA_MCP_TIMEOUT_MS` defaults to 15000.

Use public view for model-facing deployments. Full view is an explicit local or
administrative configuration and remains subject to daemon authorization.

## Tools

- `cogentia_search`: short exploratory search with citable results.
- `cogentia_context_pack`: bounded context for a broad question.
- `cogentia_get_lines`: focused verification of a cited line interval.
- `cogentia_explain`: deterministic retrieval signals and current limits.
- `cogentia_health`: daemon and index availability.

Prefer `cogentia_context_pack` when answering a broad corpus question,
`cogentia_search` while exploring, and `cogentia_get_lines` before asserting a
specific passage. Responses preserve `source_id` citations produced by the
gateway.

## Protocol and errors

The adapter implements MCP over newline-delimited JSON-RPC on stdin/stdout. It
supports initialization, `ping`, `tools/list`, and `tools/call`. Standard output
contains protocol messages only. Daemon connection failures, HTTP errors, and
invalid tool arguments are returned as MCP tool errors without secrets.

Start it directly only when an MCP client will provide messages on stdin:

```bash
node scripts/cogentia-mcp.js
```

Run the HTTP adapter for clients that expect a URL endpoint:

```bash
COGENTIA_DAEMON_URL=http://127.0.0.1:8790 \
COGENTIA_MCP_VIEW=public \
PORT=8791 \
node scripts/cogentia-mcp-http.js
```

The primary HTTP MCP route is:

```text
POST /mcp
```

The HTTP adapter also keeps compatibility routes for operational smoke tests:

```text
GET /health
GET /tools
POST /tools/{name}
```

SQLite remains a reconstructible cache behind the daemon and is not part of the
MCP trust boundary.
