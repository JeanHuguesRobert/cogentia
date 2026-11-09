---
title: "Cogentia Private MCP catalogue drift after Vault capability publication"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: source
document_kind: incident-report
visibility: public
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related:
  - ../../docs/vault-capabilities.md
  - ../../docs/connectors/cogentia-private-host-process-publish.md
  - ../../docs/cogentia-mcp.md
---

# FBF: source ↔ server ↔ connector catalog drift

## Facts measured after owner restart and ChatGPT refresh

- Source commit `1a4e932` introduced `cogentia_vault_list` and
  `cogentia_vault_describe`; Inseme `5d85891` introduced the metadata-only
  Vault resolver. Both commits reached main and the live checkout.
- Principal ran SSH `sudo systemctl restart cogentia.service
  mcp-cogentia.service` and both returned `active`.
- Server processes started 2026-11-09 08:57:30 UTC.
- Authenticated `POST http://127.0.0.1:8791/mcp` with real `tools/list`,
  using the private tunnel's existing file-backed bearer **without printing
  its contents**, returned **92** tools including both new Vault tools.
- Legacy `GET /tools` returned **62**, without private tools, even with same
  bearer headers. `scripts/cogentia-mcp-http.js` deliberately returns
  `core.tools` here: the static/public list. **This is not evidence that the
  authenticated `/mcp` interface is faulty** and should not be "repaired"
  by making private tools anonymously visible.
- ChatGPT tool snapshot, after user explicitly refreshed both connected
  plugins in the existing conversation, reports public Cogentia **68** and
  Cogentia Private **90**, with neither Vault tool exposed to the agent.
  The old private tools remain usable (e.g. the JHN hygiene audit).
- Private tunnel `cogentia-private-tunnel.service` remained running since
  2026-10-29 13:01:21 UTC. `tunnel-client doctor --profile cogentia-private
  --explain` passes and targets the correct `127.0.0.1:8791/mcp`.
- Tunnel journal shows `openai-mcp-discover` dispatched **twice at
  09:00:16 and 09:00:17 UTC** (after MCP restart), so a refresh request did
  reach the tunnel. Logs do not expose the response tool roster nor show
  whether ChatGPT accepted/published the new definitions.

## Prior similar incidents

- 2026-10-28/29: tools visible in the authenticated MCP server but not the
  anonymous ChatGPT connector (10 private-read + 10 mutate tools filtered).
  Solution was a separately authenticated Cogentia Private tunnel.
- 2026-11-07: connected host-process tool schema stale (no `super` field,
  4,096/15s vs canonical 32,768/120s). ChatGPT Plugin Refresh updated tool
  declarations. See `docs/connectors/cogentia-private-host-process-publish.md`.
- 2026-11-08: `cogentia_code_search` present in the server's tool catalog but
  absent in the conversation tool inventory. Demonstrates that endpoint
  success and connected-tool availability are different properties.

## Differential diagnosis

1. **Not a missing implementation**: local and authenticated live server
   report the new tools, and direct JHN Vault metadata query succeeds.
2. **Not a missing private tunnel**: the tunnel is active, wired to this MCP
   server, and has a file-backed credential and actor label.
3. **Not solely a server restart issue**: it was restarted and the authenticated
   server still returns the correct names.
4. **Remaining boundary**: tunnel discovery response, ChatGPT app refresh
   ingestion, tool snapshot persistence, or conversation-specific tool cache.
   The long-lived tunnel process may cache capability discovery but this is
   **unproven**; repeated server restarts alone are not a remedy.

## Smallest next checks

- Open a genuinely **new ChatGPT conversation** after Plugin Refresh and
  inspect connected tool names, rather than relying on the existing chat's
  tool snapshot. This requires no server effect.
- If the new conversation still lacks both names, restart **only** the
  private tunnel service through the Principal's normal SSH/sudo owner
  administration channel (not the generic MCP bootstrap/super bypass).
  Verify tunnel doctor, authenticated `/mcp tools/list`, then refresh only
  Cogentia Private and check a new conversation. This is an isolation test,
  not a proven fix; repeat no restart if tool inventory remains frozen.
- If still absent, inspect the OpenAI connected app's tool publication
  metadata and refresh response rather than weakening private-read policy.
  Preserve observed and server schema counts and the `openai-mcp-discover`
  dispatch timestamps for a precise provider issue.

No production secret values were displayed, no service was restarted in this
investigation, no tunnel credentials changed, and no `GET /tools` privacy
weakening was made.
