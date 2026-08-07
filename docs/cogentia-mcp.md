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

Canonical list lives in `scripts/lib/cogentia-mcp-core.js` (`TOOLS`). Summary:

| Tool | Role | Tier |
|------|------|------|
| `cogentia_views_snapshot` | Session cockpit (prefer first) | P0 |
| `cogentia_health` | Daemon / index health | P0 |
| `cogentia_search` | Citable corpus search | P0 |
| `cogentia_context_pack` / `_batch` | Budgeted context packs | P0 |
| `cogentia_get_lines` | Cite line intervals | P0 |
| `cogentia_explain` | Retrieval signals | P0 |
| `cogentia_guide_resolve` | Concept / Guide resolve | P0 |
| `cogentia_issue_graph` / `cogentia_issues_list` | Issue graph (read) | P0/P1 |
| `cogentia_continuation_list` | Real continuation queue (`GET /api/cli/continuation/list`) | P1 |
| `cogentia_continuation_inspect` | Full/sanitized continuation object | P1 |
| `cogentia_git_verify` | Repo git verify (`GET /api/cli/git/verify`) | P1 |
| `cogentia_emit_static` / `publish_registry` / `nav_benchmark` | Ops projections | P2 |
| `cogentia_continuation_emit` / `_resolve` | Write continuations | **P3 mutate** |
| `cogentia_issues_sync` | Sync GitHub issue packets | **P3 mutate** |

**Mutate tools** appear in `tools/list` only when:

```text
COGENTIA_MCP_VIEW=full
COGENTIA_ADMIN_TOKEN=<set>
COGENTIA_MCP_ALLOW_MUTATE=1
```

Otherwise `tools/call` returns `tier_forbidden`. Public Fracta stays read-only.

Prefer `cogentia_views_snapshot` at session start, `cogentia_context_pack` for a broad corpus question, `cogentia_search` while exploring, and `cogentia_get_lines` before asserting a specific passage. For suspended work use `continuation_list` → `continuation_inspect` and skill `continuation-handling`. Responses preserve `source_id` citations produced by the gateway.

The adapter stays **thin**: no SQLite, no provider keys, no index rebuild. Logic lives in `cogentia.js` / the daemon.

Path design: [cogentia-js-mcp-agent-path.md](cogentia-js-mcp-agent-path.md). Client evidence: [agent-skills-compatibility.md](agent-skills-compatibility.md).

## Protocol and errors

The adapter is **dual-era** (tools-only):

| Era | Versions | Entry |
|-----|----------|--------|
| **Legacy** | `2025-11-25`, `2025-06-18`, `2024-11-05` | `initialize` handshake, then `tools/list` / `tools/call` |
| **Modern** | `2026-07-28` | optional `server/discover`; per-request `_meta` / `MCP-Protocol-Version`; optional `Mcp-Method` / `Mcp-Name` headers on HTTP |

Both eras share the same tool surface. Unsupported versions return JSON-RPC
`-32022` (`UnsupportedProtocolVersionError`) with a `supported` list.
MCP Apps, Tasks, and multi-round-trip elicitation are **not** implemented in
this thin adapter (vertical Apps belong to Serra/Rhuma later).

Stdio implements newline-delimited JSON-RPC. Standard output contains protocol
messages only. Daemon connection failures, HTTP errors, and invalid tool
arguments are returned as MCP tool errors without secrets.

Smoke: `node scripts/test-mcp-dual-era.js`.

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
