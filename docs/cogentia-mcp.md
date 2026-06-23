# Cogentia MCP adapter

`scripts/cogentia-mcp.js` is a small MCP stdio server for the Cogentia Context
Gateway. It calls the daemon over HTTP. It never opens SQLite, reads corpus
files, rebuilds the index, executes commands, or changes the corpus.

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

SQLite remains a reconstructible cache behind the daemon and is not part of the
MCP trust boundary.
