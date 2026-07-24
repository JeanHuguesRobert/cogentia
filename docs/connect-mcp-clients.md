---
title: Connect MCP clients to Cogentia
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
  origin_ref: b7cdf97
  origin_date: '2026-06-30'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Connect MCP clients to Cogentia

Cogentia exposes the corpus through a read-only MCP surface. The MCP surface is
an adapter over the Cogentia Context Gateway daemon; it does not read SQLite
directly, open corpus files, rebuild indexes, or call provider APIs.

The SQLite index is a reconstructible cache. Git, the registry, and the
continuation policies remain the source of truth.

## What is available now

| Target | Status | Endpoint shape |
| --- | --- | --- |
| Local Codex or another local stdio MCP client | Ready | Starts `scripts/cogentia-mcp.js` as a local process |
| Local HTTP callers | Ready through the daemon | `http://127.0.0.1:8790/api/context/*` |
| Local HTTP MCP clients | Ready | Starts `scripts/cogentia-mcp-http.js`, uses `POST /mcp` |
| Fracta public MCP HTTP facade | Running | `https://cogentia.fractavolta.com/mcp` |
| ChatGPT developer connector | Ready for connector smoke test | Use `https://cogentia.fractavolta.com/mcp` |

The Fracta service is intentionally public read-only. It exposes the public
corpus view, not private repositories, provider keys, admin routes, raw
filesystem operations, or cache rebuild actions.

## Tools exposed

The MCP adapter is a **thin façade** over the daemon / `cogentia.js`. Tools:

| Tool | Role |
|------|------|
| `cogentia_views_snapshot` | **Start here** — cockpit: corpus health, alive continuations, issues, view URLs |
| `cogentia_guide_resolve` | **3-Layer S7 Navigation** — 1-hop canonical concept alias resolution |
| `cogentia_git_verify` | Corpus git state (ahead/behind/dirty) across all 10 repositories |
| `cogentia_emit_static` | Generate/verify S1 `llms.txt` static projection artifact |
| `cogentia_publish_registry` | Generate/verify S2 `registry.json` authoritative artifact |
| `cogentia_nav_benchmark` | Execute S6 1-hop navigation benchmark suite |
| `cogentia_continuation_list` | List active or alive continuation decision packets |
| `cogentia_issues_list` | List GitHub issues for tracked repositories |
| `cogentia_search` | Exploratory search with citable results |
| `cogentia_context_pack` | Bounded context pack for broad questions |
| `cogentia_get_lines` | Focused retrieval for a cited line interval |
| `cogentia_explain` | Retrieval signal explanation for a result |
| `cogentia_health` | Daemon and index health |
| `cogentia_issue_graph` | Read-only issue graph |

CLI equivalent of the snapshot (no MCP required):

```bash
COGENTIA_REGISTRY=/c/tweesic/JeanHuguesRobert \
  node cogentia/scripts/cogentia.js --json views snapshot
```

Use `cogentia_views_snapshot` at session start, `cogentia_context_pack` for broad
questions, `cogentia_search` while exploring, and `cogentia_get_lines` before
asserting a specific passage.

## Local daemon

Start or verify the local daemon first:

```powershell
cd C:\tweesic\cogentia
$env:COGENTIA_REGISTRY = 'C:\tweesic\JeanHuguesRobert\.cogentia.json'
$env:COGENTIA_DATA_DIR = 'C:\tweesic\JeanHuguesRobert'
node scripts\cogentia.js daemon --host 127.0.0.1 --port 8790
```

In another terminal:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8790/api/context/health'
```

Expected properties:

- `index_available: true`
- `semantic_available: true` when the semantic cache is present
- `write_routes_public: false`

Semantic query embeddings still follow the continuation boundary. Public
hybrid search uses a cached query vector when one has been replayed into the
daemon cache; otherwise it can report `semantic_continuation_required` and fall
back to keyword search. Replay fulfilled semantic continuations with
`embeddings search-with <result.json> --cache-query` or
`embeddings cache-query <result.json>`.

## Local Codex configuration

For Codex or another stdio MCP client, configure the MCP server as a local
process. In Codex, add this to `~/.codex/config.toml` or to a project-scoped
`.codex/config.toml`:

```toml
[mcp_servers.cogentia]
command = "node"
args = ["C:\\tweesic\\cogentia\\scripts\\cogentia-mcp.js"]
startup_timeout_sec = 20
tool_timeout_sec = 60
default_tools_approval_mode = "prompt"

[mcp_servers.cogentia.env]
COGENTIA_DAEMON_URL = "http://127.0.0.1:8790"
COGENTIA_MCP_VIEW = "public"
```

Then restart the MCP client or open a new session and ask it to list MCP
servers/tools. In Codex, `/mcp` should show `cogentia`.

Keep `COGENTIA_MCP_VIEW = "public"` for model-facing use. `full` view requires
`COGENTIA_ADMIN_TOKEN` and is for local or administrative use only.

First useful prompt after connect:

> Call `cogentia_views_snapshot`, read `load.level` and `load.mode_recommendation`,
> then summarize where I am: total load (Σ load×weight), alive continuations, open
> issues, and corpus warn signals. Only recommend sleep/consolidation batches if
> mode is `sleep_ok` or `sleep_cautious`. Give 3 next actions.

**Load** (`cogentia.load.v0`, English; French *charge*) is demand vs capacity:
`demand = Σ (load_i × weight_i)`. Measure **before** dispatching off-peak sleep
work. Sleep jobs are non-realtime and may later use preemptible capacity;
crisis/wake_only defers them. Snapshot still mirrors the object as `charge` for
one compatibility version — prefer `load`.

## Claude Code / Claude Desktop

**Claude Code** — project or user MCP config (JSON). Example
`~/.claude.json` or project `.mcp.json` (paths vary by Claude Code version):

```json
{
  "mcpServers": {
    "cogentia": {
      "command": "node",
      "args": ["C:\\tweesic\\cogentia\\scripts\\cogentia-mcp.js"],
      "env": {
        "COGENTIA_DAEMON_URL": "http://127.0.0.1:8790",
        "COGENTIA_MCP_VIEW": "public"
      }
    }
  }
}
```

**Claude Desktop** — same shape under Settings → Developer → MCP, or
`claude_desktop_config.json`.

Require the **local daemon** running first (see above). For remote-only use
without a local daemon, prefer the Fracta HTTP endpoint if your client supports
HTTP MCP:

```text
https://cogentia.fractavolta.com/mcp
```

## Cursor

Cursor Settings → MCP → Add server (stdio):

- Command: `node`
- Args: `C:\tweesic\cogentia\scripts\cogentia-mcp.js`
- Env: `COGENTIA_DAEMON_URL=http://127.0.0.1:8790`, `COGENTIA_MCP_VIEW=public`

Or in `.cursor/mcp.json` / user MCP config (Cursor’s current file name may
vary — check Cursor MCP docs if the UI moves):

```json
{
  "mcpServers": {
    "cogentia": {
      "command": "node",
      "args": ["C:\\tweesic\\cogentia\\scripts\\cogentia-mcp.js"],
      "env": {
        "COGENTIA_DAEMON_URL": "http://127.0.0.1:8790",
        "COGENTIA_MCP_VIEW": "public"
      }
    }
  }
}
```

## Grok / Gemini / cmdc / other coding agents

Many local agents (Grok Build, Gemini CLI wrappers, cmdc-launched tools) either:

1. **Speak MCP stdio** — reuse the same `node …/cogentia-mcp.js` stanza as Codex/Claude, or  
2. **Do not speak MCP** — call the CLI or HTTP directly:

```powershell
$env:COGENTIA_REGISTRY = 'C:\tweesic\JeanHuguesRobert'
node C:\tweesic\cogentia\scripts\cogentia.js views snapshot --json
# or against a running daemon:
Invoke-RestMethod 'http://127.0.0.1:8790/api/views/snapshot'
# public store (no daemon):
Invoke-RestMethod 'https://cogentia.fractavolta.com/api/views?tag=kind:corpus-state'
```

Operium documents **workstation launchers and secrets** in
[`operium/docs/coding-infrastructure.md`](../../operium/docs/coding-infrastructure.md)
and semantic stack in
[`operium/docs/cogentia-semantic-stack.md`](../../operium/docs/cogentia-semantic-stack.md).
MCP connection recipes for Cogentia live primarily in **this file** and
[`cogentia-mcp.md`](cogentia-mcp.md); Operium should **point** here rather than
duplicate long-lived protocol detail.

## Fracta public checks

The Fracta VPS currently runs:

- Cogentia daemon on loopback: `http://127.0.0.1:8790`
- MCP HTTP adapter on loopback/public proxy: port `8791`
- Caddy public routing for `cogentia.fractavolta.com`

From a workstation:

```bash
curl https://cogentia.fractavolta.com/health
curl https://cogentia.fractavolta.com/tools
```

The canonical public MCP endpoint is:

```text
https://cogentia.fractavolta.com/mcp
```

From the VPS:

```bash
ssh fracta 'curl -fsS http://127.0.0.1:8791/health'
ssh fracta 'curl -fsS http://127.0.0.1:8791/tools'
```

The health response should show:

- `ok: true`
- daemon `index_available: true`
- daemon `semantic_available: true`
- daemon `write_routes_public: false`

## Fracta tool call smoke test

Call the public HTTP facade directly:

```bash
curl -fsS \
  -H 'Content-Type: application/json' \
  -d '{"query":"Fracta VPS Caddy Cogentia MCP","limit":3,"mode":"hybrid"}' \
  https://cogentia.fractavolta.com/tools/cogentia_search
```

This tests the public retrieval boundary. It is not a substitute for a full MCP
protocol compatibility test.

For the MCP endpoint itself:

```bash
curl -fsS \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  https://cogentia.fractavolta.com/mcp
```

## ChatGPT connector path

OpenAI's ChatGPT connector flow expects an MCP server that is reachable over
HTTPS and asks for the public `/mcp` endpoint of the server, for example
`https://example.com/mcp`.

Therefore the intended ChatGPT setup is:

```text
ChatGPT connector
  -> https://cogentia.fractavolta.com/mcp
  -> Fracta Caddy
  -> Cogentia MCP HTTP adapter
  -> Cogentia daemon on 127.0.0.1:8790
  -> SQLite cache and corpus index
```

Observed Fracta state on 2026-06-30:

- The Cogentia repo now includes `scripts/cogentia-mcp-http.js`, which exposes
  `POST /mcp` for JSON-RPC MCP requests.
- Fracta runs that repo-owned script as `mcp-cogentia.service`.
- Caddy serves `https://cogentia.fractavolta.com`.
- Public `POST /mcp` returns the five Cogentia tools.
- Public `tools/call` works for `cogentia_search`.
- Public hybrid search may still fall back to keyword with
  `semantic_continuation_required`, because direct query embeddings remain
  disabled by design.

The ChatGPT developer-mode connector flow is:

1. Enable developer mode in ChatGPT if the account or organization allows it.
2. Go to Settings, Connectors, Create.
3. Set the connector name to `Cogentia`.
4. Describe it as public read-only search and context retrieval over the
   Cogentia corpus.
5. Use `https://cogentia.fractavolta.com/mcp` as the connector URL.
6. Create or refresh the connector and verify that ChatGPT sees the five
   Cogentia tools.

## Other MCP clients

For clients that support local stdio MCP, use the local configuration above.

For clients that support streamable HTTP MCP, configure the remote URL only
after the client and the Cogentia adapter agree on the transport path. The
first-class Cogentia HTTP MCP endpoint is `/mcp`.

For clients that support generic HTTP tools but not MCP, use `/tools` and
`/tools/{name}` directly as an interim integration layer.

## Security boundary

The security boundary is governed by the digital twin trust model: the goal is
a trustable digital twin of the owner, with capability growing as maturity,
trace, validation, and owner mandate grow. See
`research/digital_twin_trust_model.md` and
`docs/digital-twin-agile-roadmap.md`.

Public model-facing clients must use the public view:

```text
COGENTIA_MCP_VIEW=public
```

Do not expose:

- `COGENTIA_ADMIN_TOKEN`
- private corpus view
- rebuild/index mutation routes
- provider API keys
- Magistral administration
- raw SQLite, filesystem, or shell access

The MCP adapter should remain a narrow read-only facade over the daemon.

## References

- Cogentia MCP adapter: `docs/cogentia-mcp.md`
- Cogentia Context Gateway: `docs/cogentia-context-gateway.md`
- Digital Twin Trust Model: `research/digital_twin_trust_model.md`
- Trustable Digital Twin Agile Roadmap: `docs/digital-twin-agile-roadmap.md`
- Fracta node operations: `docs/fracta-node.md`
- OpenAI ChatGPT connector docs: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- OpenAI Codex MCP configuration docs: https://developers.openai.com/codex/mcp
