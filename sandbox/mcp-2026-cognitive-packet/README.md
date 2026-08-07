# Sandbox — MCP 2026 / Cognitive Packet / Skills / JHN mutate

**Experimental.** Evidence and harness only. Does not redefine production MCP, COP, or Skills as mandatory over-the-wire.

See:

- `research/mcp_2026_cognitive_packet_sandbox_plan.md`
- `docs/cogentia-js-mcp-agent-path.md` (Phase 5)
- cogentia#82 Agent Skills

## What this sandbox proves

| Scenario | Claim |
|----------|--------|
| `skills-discover` | Local Agent Skills are inventory-able and fetchable through the same dual-era MCP core (tools-first; not a universal Skills-over-MCP product claim). |
| `packet-envelope` | Tool results carry `cogentia.mcp_tool_result/v1` envelopes (citations, continuation, skill_hint, correlation). |
| `jhn-mutate-attestation` | Mutate tools stay closed anonymously; Agent JHN (or subagent) with token + actor claim may emit/resolve when `COGENTIA_MCP_JHN_MUTATE=1`. |

## Run

```bash
# from cogentia repo root
node sandbox/mcp-2026-cognitive-packet/index.js list
node sandbox/mcp-2026-cognitive-packet/index.js run skills-discover
node sandbox/mcp-2026-cognitive-packet/index.js run all
node sandbox/mcp-2026-cognitive-packet/test/run-scenarios.js
```

Environment for JHN scenario (local only; never commit real tokens):

```bash
set COGENTIA_MCP_JHN_MUTATE=1
set COGENTIA_MCP_JHN_TOKEN=test-jhn-token-not-for-prod
# optional daemon for live emit (otherwise attestation unit path only)
set COGENTIA_DAEMON_URL=http://127.0.0.1:8790
```

## Production relationship

| Surface | Role |
|---------|------|
| Fracta public MCP | Read-only by default; JHN mutate only if operator sets token + `JHN_MUTATE=1` |
| `skill_list` / `skill_get` | Production tools (Phase 2) — sandbox reuses them |
| This sandbox | Client evidence, scenario traces, non-normative experiments |

## Non-goals

- No claim that MCP Skills discovery is universally supported by all clients.
- No embedding of secrets in the sandbox tree.
- No COP kernel rewrite.
