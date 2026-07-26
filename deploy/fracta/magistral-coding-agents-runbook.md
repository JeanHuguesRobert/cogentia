# Magistral → coding-agent routing (Fracta Guide synthesis)

Stateless OpenAI Chat Completions router: **Magistral** delegates to **Agent CLI Gateway**
on capable hosts (coding agents you already use daily). The **Guide client** owns conversation
history; servers stay request-scoped.

## Target path

```text
Browser (fractavolta.com/guide)
  → POST https://cogentia.fractavolta.com/guide/chat
      model: fractavolta-guide   (Guide facade alias)
  → Cogentia MCP HTTP :8791  (public pack + S7; history from client)
  → POST http://127.0.0.1:8790/v1/chat/completions
      model remapped: fractavolta-guide → magistral
  → Magistral :8880  (router-only, OpenAI-compatible + SSE)
  → POST http://100.122.121.68:8793/v1/chat/completions
      model: grok | claude | codex   (Agent CLI Gateway on ThinkPad)
  → local coding-agent CLI (auth already on the machine)
```

Do **not** set `COGENTIA_GUIDE_AGENT_GATEWAY=1` for this design — that bypasses Magistral.
Keep the drop-in at `0` so Magistral remains the single router.

## Model / tier aliases

| Client-facing model | Where | Becomes |
|---------------------|--------|---------|
| `fractavolta-guide` | Guide MCP (`COGENTIA_GUIDE_MODEL`) | visible name on public facade |
| `fractavolta-guide` → `magistral` | Cogentia daemon `daemonChatCompletions` | when `COGENTIA_CHAT_MODEL=magistral` or alias map |
| `magistral` | Magistral `routeMagistral` | tier **`fast`** |
| node `model` field | Agent Gateway | adapter id: `grok`, `claude`, `codex`, … |

Guide env (already on Fracta for CORS/web-search):

```bash
# recommended explicit aliases (optional if daemon default already remaps)
COGENTIA_GUIDE_MODEL=fractavolta-guide
# daemon:
COGENTIA_CHAT_MODEL=magistral
# keep direct bypass off:
COGENTIA_GUIDE_AGENT_GATEWAY=0
```

Magistral unit already has:

```text
MAGISTRAL_ROUTER_ONLY=true
MAGISTRAL_MAP_PATH=/etc/cogentia/magistral-openai-map.json
PORT=8880
```

## Map file

Install the coding-agent map (repo copy):

`deploy/fracta/magistral-map.coding-agents.json`

Primary nodes (Tailscale ThinkPad, advertised attractor
`attractor:i7-thinkpad-jhr:agent-cli-gateway`):

| id | url | model | tier | weight |
|----|-----|-------|------|--------|
| coding-grok-fast | `http://100.122.121.68:8793/v1/chat/completions` | `grok` | fast | 100 |
| coding-claude-fast | same host | `claude` | fast | 80 |
| coding-codex-strong | same host | `codex` | strong | 50 |
| openai-fast / openai-strong | api.openai.com | gpt-* | **fallback** | low |

Hostname alias (same host): `http://i7-thinkpad-jhr:8793/v1/chat/completions`  
(resolves to `100.122.121.68` on Fractanet).

Each coding node sets `"apiKeyEnv": "AGENT_GATEWAY_TOKEN"` so Magistral sends
`Authorization: Bearer …` from `/etc/cogentia/magistral.env` (or the process env).

Agent Gateway model ids (adapters):

- `grok`, `grok-build`
- `claude`, `claude-code`
- `codex`
- `antigravity`, `agy`
- REPL tools: `shell-repl`, `python-repl`, … (not for public Guide)

## Apply on Fracta (operator)

```bash
# 1) Map
sudo cp /srv/cogentia/repos/cogentia/deploy/fracta/magistral-map.coding-agents.json \
  /etc/cogentia/magistral-openai-map.json
sudo chown root:ubuntu /etc/cogentia/magistral-openai-map.json
sudo chmod 640 /etc/cogentia/magistral-openai-map.json

# 2) Token for Agent Gateway (must match ThinkPad AGENT_GATEWAY_TOKEN)
# Append if missing — do not commit secrets:
#   AGENT_GATEWAY_TOKEN=...same as thinkpad...
sudo nano /etc/cogentia/magistral.env
# Ensure MAGISTRAL reads it (EnvironmentFile already points here).

# 3) Restart Magistral then Guide stack
sudo systemctl restart magistral.service
sudo /srv/cogentia/repos/cogentia/scripts/ops/fracta-guide-stack.sh restart
```

## Smoke tests

From Fracta:

```bash
# Agent gateway reachable + authorized
curl -fsS -m 10 \
  -H "Authorization: Bearer $AGENT_GATEWAY_TOKEN" \
  http://100.122.121.68:8793/v1/models | head

# Magistral routes model=magistral → tier fast → coding-grok-fast
curl -fsS -m 120 -X POST http://127.0.0.1:8880/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"magistral","messages":[{"role":"user","content":"Say hello in one short sentence."}],"max_tokens":64}'

# Full public Guide path
curl -fsS -m 120 -X POST https://cogentia.fractavolta.com/guide/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is Potentics?","locale":"en"}'
# Expect: mode=conversational (not extractive_fallback), s7.ok=true for Potentics
```

## Trust notes

- Agent Gateway stays on **Tailscale only** (not public Internet).
- Public Guide still only talks to `cogentia.fractavolta.com/guide/*`.
- Coding agents run under **owner machine auth**; no new vendor keys on Fracta.
- Prefer **headless** adapters for Guide (stateless turns + client history).
- `web-guide` is listed on the attractor’s `mandate_surfaces` — legitimate for synthesis.

## If synthesis still fails

1. Blackboard: attractor `agent-cli-gateway` must be **online** (heartbeat).
2. Token mismatch → Magistral log `HTTP 401` on coding-* nodes.
3. ThinkPad asleep / gateway down → try next map node / fallback.
4. OpenAI fallbacks still 401 until key fixed — leave as `tier: fallback` only.
