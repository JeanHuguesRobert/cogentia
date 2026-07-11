# Edge trap-directed polling (SNMP pattern)

FractaNet edge appliances (e.g. `rpi3-view`) use the same pattern SNMP managers and agents settled on decades ago:

1. **Trap** — the edge sends a lightweight async signal: “something happened here.”
2. **Directed poll** — the manager (fracta) reacts by polling **only that node** for detail, instead of blind fleet polling.
3. **Store-and-forward** — if the manager is unreachable, traps and payloads queue locally until connectivity returns.

## Why on Pi 3

Pi 3 is an **edge appliance** (ESP32-class role): domotics, display, local cache. It depends on FractaNet when online but must run the house in **degraded mode** when WAN or tailnet is down. Trap-directed polling keeps upstream work proportional to real events.

## Roles

| SNMP | FractaNet |
|------|-----------|
| Agent | `rpi3-view` edge scripts |
| Trap | `POST /ops/edge/trap` (or outbox when down) |
| Manager | fracta `mcp-cogentia` (`cogentia-mcp-http.js`) |
| Directed poll | SSH `poll-handoff.js` on the edge (drain outbox + return stats) |
| Blind poll (fallback) | `edge-site-heartbeat.timer` every 3 min (TTL safety net) |

## Trap types (v1)

| `trap_type` | When |
|-------------|------|
| `connectivity.up` | FractaNet path restored (forwarder detects transition) |
| `domotics.sensor` | Sensor threshold / state change |
| `domotics.actuator` | Local actuation (scene, relay, manual) |
| `site.manual` | Operator override on edge panel |
| `site.edge.ttl` | Heartbeat timer safety net (optional) |

## Files

| Path | Role |
|------|------|
| `scripts/lib/edge-trap-protocol.js` | Trap + directed-poll envelope builders |
| `scripts/lib/edge-trap-store.js` | Manager trap log (NDJSON on fracta) |
| `scripts/lib/edge-directed-poll.js` | Manager SSH directed poll |
| `scripts/lib/edge-trap-ops.js` | HTTP handlers for `/ops/edge/*` |
| `scripts/ops/edge/lib/trap.js` | Edge trap emit + store-on-failure |
| `scripts/ops/edge/emit-trap.js` | CLI for domotics / manual traps |
| `scripts/ops/edge/poll-handoff.js` | Edge response to directed poll |
| `scripts/ops/edge/lib/drain.js` | Shared outbox drain loop |

## Env (edge)

- `COGENTIA_BLACKBOARD_URL` — fracta MCP base (trap target)
- `COGENTIA_BLACKBOARD_UPSERT_TOKEN` — bearer for trap POST
- `EDGE_TRAP_URL` — override, default `{BLACKBOARD_URL}/ops/edge/trap`
- `EDGE_STORE_ON_FAILURE=1` — queue trap if manager down

## Env (manager / fracta)

- `EDGE_TRAP_STORE` — default `/var/lib/cogentia/.ops/edge-traps.ndjson`
- `EDGE_POLL_SSH_TARGET` — default `rpi3-view` (SSH config `Host` alias — **not** MagicDNS FQDN)
- `EDGE_POLL_SSH_IDENTITY` — default `~/.ssh/fractanet-mesh` when present
- `EDGE_DIRECTED_POLL=1` — run SSH poll after each trap (default on)

## Reference

SNMP trap-directed polling: agent sends trap → manager polls that agent for details. Avoids polling the entire fleet on a fixed schedule when events drive the work.