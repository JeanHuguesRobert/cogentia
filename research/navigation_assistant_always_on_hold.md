---
title: "Navigation assistant always-on hold"
date: 2026-09-10
status: active
---

# Navigation assistant always-on hold

The Chrome/Brave MV3 extension **cannot listen**. It dials out. If the
assistant process is the only WebSocket server, the extension must reconnect
(exponential backoff that looks like polling) every time the TUI restarts.

The intended shape is a **hold**: a small relay accepts the extension
immediately and later attaches the assistant, so join is instant.

| Side | Process | Listen | Extension path | Assistant path |
|------|---------|--------|----------------|----------------|
| Hosted (fracta2) | systemd `navigation-assistant-gateway` | loopback + Tailscale `:8776` | `/extension` | `/assistant` |
| Workstation | Operium Node Agent (already running) | loopback `:8765` | `/ws` or `/extension` | `/assistant` |

ONA does not reimplement the relay. It imports Cogentia
`scripts/ops/navigation-assistant-gateway.js` from the sibling checkout
(`resolveCogentiaRoot`). Occupied `:8765` (TUI still in server mode) is
retried, not fatal.

The TUI defaults `NAV_ASSIST_GATEWAY` to `ws://fracta2:8776/assistant` and
`NAV_ASSIST_LOCAL_GATEWAY` to `ws://127.0.0.1:8765/assistant`. It only binds
`:8765` itself when the local hold is not already up.
