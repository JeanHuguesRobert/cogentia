---
title: "Deploy and verify POST /ops/route/action (Fracta action plane)"
document_role: operational
status: working-paper
visibility: public
---

# Deploy and verify `POST /ops/route/action` (Fracta action plane)

The action route is implemented in `cogentia/scripts/cogentia-mcp-http.js`. It resolves an `agent-gateway.v1` attractor from the **local fracta blackboard** and forwards the invocation server-side. Clients (including `operium invoke tool --via guide`) do **not** resolve gateway endpoints themselves.

## Required environment (fracta host)

| Variable | Role |
|----------|------|
| `COGENTIA_ACTION_ROUTE_TOKEN` | Bearer token for `POST /ops/route/action` ingress |
| `AGENT_GATEWAY_INVOKE_TOKEN` | Bearer token used by fracta when calling peer `:8793` |
| `COGENTIA_BLACKBOARD_URL` | Usually `https://cogentia.fractavolta.com/ops/blackboard` on clients; fracta uses local store |

Fallback: `COGENTIA_ADMIN_TOKEN` is accepted for route auth when `COGENTIA_ACTION_ROUTE_TOKEN` is unset (development only).

## Preconditions

1. `cogentia-mcp-http` running on fracta with `/ops/route/action` wired.
2. At least one **fresh** `agent-gateway.v1` attractor on the blackboard (heartbeat task on capable host).
3. Target gateway reachable from fracta on Tailscale (e.g. `http://i7-thinkpad-jhr:8793`).

## Scripted smoke (local)

```bash
cd cogentia
npm run test:route-action
```

## Manual verification (production fracta)

Set tokens locally (do not commit):

```powershell
$env:COGENTIA_ACTION_ROUTE_TOKEN = "<route-token>"
$env:COGENTIA_ACTION_ROUTE_URL = "https://cogentia.fractavolta.com/ops/route/action"
```

Sample request:

```bash
curl -sS -X POST "$COGENTIA_ACTION_ROUTE_URL" \
  -H "Authorization: Bearer $COGENTIA_ACTION_ROUTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "capability": "dev.tools.shell",
    "model": "shell-repl",
    "prompt": "echo ROUTED_OK",
    "repl": true,
    "expect": "ROUTED_OK"
  }'
```

### Expected `200` response shape

```json
{
  "ok": true,
  "service": "cogentia-action-route",
  "model": "shell-repl",
  "content": "ROUTED_OK",
  "session_id": "...",
  "timing": { },
  "route": {
    "endpoint": "http://i7-thinkpad-jhr:8793",
    "attractor_id": "attractor:i7-thinkpad-jhr:agent-cli-gateway",
    "routed_via": "guide_blackboard",
    "snapshot_at": "...",
    "status": "online",
    "fresh": true
  }
}
```

### Failure codes

| HTTP | `error` | Meaning |
|------|---------|---------|
| 401 | `unauthorized_action_route` | Missing/wrong `COGENTIA_ACTION_ROUTE_TOKEN` |
| 400 | `missing_model` / `missing_prompt` | Invalid body |
| 404 | `attractor_not_found` | No matching gateway attractor on blackboard |
| 503 | `attractor_degraded` | Attractor degraded and `allow_degraded` not set |
| 502 | `route_action_failed` | Gateway call failed |

## Operium CLI (#52)

```bash
export COGENTIA_ACTION_ROUTE_TOKEN="<route-token>"
operium invoke tool --via guide \
  --capability dev.tools.shell \
  --model shell-repl \
  --repl --expect ROUTED_OK \
  -p "echo ROUTED_OK"
```

Optional local audit trail when ONA sqlite is present:

```bash
export OPERIUM_LOG_ACTIONS=1
```

Appends a summary row to `invocation_log` in `node_memory.sqlite` (no secrets).

## Rollback

Disable client use of `--via guide`; the route handler can remain deployed. Revoke `COGENTIA_ACTION_ROUTE_TOKEN` to block ingress immediately.
