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
| Fracta public MCP HTTP facade | Deployable | `https://cogentia.fractavolta.com/mcp` after Caddy/TLS deployment |
| ChatGPT developer connector | Target shape implemented in repo | Requires the Fracta HTTPS `/mcp` deployment |

The Fracta service is intentionally public read-only. It exposes the public
corpus view, not private repositories, provider keys, admin routes, raw
filesystem operations, or cache rebuild actions.

## Tools exposed

The MCP adapter exposes five tools:

- `cogentia_search`: exploratory search with citable results.
- `cogentia_context_pack`: bounded context pack for broad questions.
- `cogentia_get_lines`: focused retrieval for a cited line interval.
- `cogentia_explain`: retrieval signal explanation for a result.
- `cogentia_health`: daemon and index health.

Use `cogentia_context_pack` for broad questions, `cogentia_search` while
exploring, and `cogentia_get_lines` before asserting a specific passage.

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
hybrid search can report `semantic_continuation_required` and fall back to
keyword search when no query embedding has been supplied.

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

## Fracta public checks

The Fracta VPS currently runs:

- Cogentia daemon on loopback: `http://127.0.0.1:8790`
- MCP HTTP adapter on loopback/public proxy: port `8791`
- Caddy public routing for `cogentia.fractavolta.com`

From a workstation:

```bash
curl http://cogentia.fractavolta.com/health
curl http://cogentia.fractavolta.com/tools
```

After the ChatGPT-compatible adapter is deployed, the canonical public endpoint
is:

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
  http://cogentia.fractavolta.com/tools/cogentia_search
```

This tests the public retrieval boundary. It is not a substitute for a full MCP
protocol compatibility test.

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

Current Fracta gap:

- The Cogentia repo now includes `scripts/cogentia-mcp-http.js`, which exposes
  `POST /mcp` for JSON-RPC MCP requests.
- Fracta still needs to deploy that script behind Caddy.
- Fracta still needs public HTTPS for `cogentia.fractavolta.com`.

Do not advertise Fracta as ChatGPT-ready until both are fixed:

1. Caddy serves `cogentia.fractavolta.com` over HTTPS.
2. The service behind Caddy is `scripts/cogentia-mcp-http.js`.

After that, the ChatGPT developer-mode connector flow is:

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
