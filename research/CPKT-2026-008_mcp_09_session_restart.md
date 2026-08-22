---
packet_id: CPKT-2026-008
packet_kind: cognitive-packet/v0.1
packet_version: 1
created: "2026-08-22"
title: "Session restart — dogfood Cogentia MCP 0.9.0 from Grok"
home_of_record: "the human author"
subscribing_homes:
  - "JeanHuguesRobert/cogentia (MCP 0.9.0 catalog)"
  - "JeanHuguesRobert/inseme (hub wraps Cogentia catalog)"
  - "JeanHuguesRobert/operium (desired Fracta surface)"
carrier: "the human author (opens the next Grok session in C:\\tweesic)"
status: "open — awaiting Hop 1 (this Grok session cannot swap its live MCP process)"
visibility: public
document_role: operational
document_kind: cognitive-packet-handoff
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "docs/cogentia-mcp.md"
  - "docs/connect-mcp-clients.md"
  - "docs/continuations_and_cognitive_packets_for_agents.md"
  - "https://github.com/JeanHuguesRobert/operium/blob/main/docs/mcp-capability-surface.md"
---

# CPKT-2026-008 — Restart to dogfood MCP 0.9.0

**You are a cognitive processor receiving a cognitive packet.** This file plus commits already on `main` are the working state. No prior chat transcript is required.

This Grok session **cannot** replace its MCP stdio child. Hop 1 is a **new** Grok session after the local daemon is up (or using Fracta HTTP).

## Closed (do not redo)

| SHA | What |
| --- | --- |
| `cogentia` `a55b8e1` | MCP 0.9.0: resources, prompts, completions, SEP-2640 skills, patterns, live catalog |
| `inseme` `2bc4575` | `inseme-mcp` wraps Cogentia core; no parallel tool table |
| `operium` `093cba4` | Desired-state `docs/mcp-capability-surface.md` |
| Fracta | Public `https://cogentia.fractavolta.com/mcp` is **0.9.0** (smoked: 57 public tools, mutate absent, 7 skills, 30 resources) |

The outgoing Grok session was the **only** known MCP client and still used a **pre-0.9.0** local stdio adapter against a **down** `:8790` daemon.

## Envelope

- **Goal.** Next Grok session uses MCP 0.9.0 (`server/discover` has `resources` + `io.modelcontextprotocol/skills`; `cogentia_pattern_list` and `cogentia_cli_catalog` exist). Then dogfood one real corpus question through catalog + skills + patterns. Do not add more MCP tools until that Reality test.
- **Mandate.** Read-only corpus work unless the human explicitly authorizes mutate. Skills/patterns do not grant authority.
- **Absolute constraints.** Do not re-implement the catalog. Do not add a third Cogentia tool table. Fracta ops stay in Operium.

## Restart procedure (human)

1. Confirm local daemon: `GET http://127.0.0.1:8790/api/context/health?quick=1`
2. Quit this Grok TUI session (`Ctrl+C` / `/exit` as usual).
3. From `C:\tweesic` start a new Grok session. Workspace MCP is `C:\tweesic\.grok\config.toml` → stdio `cogentia/scripts/cogentia-mcp.js` → `:8790`.
4. Fallback if daemon is down: Fracta `https://cogentia.fractavolta.com/mcp` (already 0.9.0, public read-only). Cogentia repo config also registers `cogentia_public`.

## Hop 1 — first tools

```text
cogentia_agent_start or cogentia_views_snapshot
cogentia_cli_catalog          → maximum set
resources/list or skills/list → SEP-2640 / skill://
cogentia_pattern_list         → #110
cogentia_context_pack         → one real question; cite source_id
```

Pass if `serverInfo.version` is `0.9.0` (or local core advertises resources + skills extension) and a corpus answer cites `source_id`.

## Hop log

### Hop 0 — 2026-08-22 — Grok 4.6 (this session)

Prepared restart: local daemon start attempted; this packet written. Production already 0.9.0. Did not dogfood 0.9.0 in-process (MCP child not replaceable).
