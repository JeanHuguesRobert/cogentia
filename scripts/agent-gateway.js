#!/usr/bin/env node

import { createAgentGateway } from "./lib/agent-gateway/server.js";
import { resolveBindHost, requireTokenForExposure } from "./lib/agent-gateway/bind-host.js";

const argv = process.argv.slice(2);

function valueFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  return argv[idx + 1] || null;
}

function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return false;
  argv.splice(idx, 1);
  return true;
}

if (takeFlag("--help") || takeFlag("-h")) {
  console.log(`Agent CLI Gateway — OpenAI-compatible SSE over coding-agent CLIs

Usage:
  node scripts/agent-gateway.js [--host <host>] [--port <port>]

Environment:
  AGENT_GATEWAY_BIND              loopback | tailscale | all | <ip> (default loopback)
  AGENT_GATEWAY_HOST              Alias for bind host (legacy)
  AGENT_GATEWAY_PORT              Bind port (default 8793)
  AGENT_GATEWAY_TOKEN             Optional bearer token
  AGENT_GATEWAY_MAX_CONCURRENT    Max parallel child processes (default 4)
  AGENT_GATEWAY_ALLOW_ANY_CWD=1   Skip repo-root cwd checks (dev only)
  AGENT_GATEWAY_TEST_MOCK=1       Use mock adapter instead of grok
  AGENT_GATEWAY_GROK_COMMAND      Grok binary (default grok)
  AGENT_GATEWAY_GROK_OUTPUT_FORMAT  streaming-json | plain
  AGENT_GATEWAY_CLAUDE_COMMAND    Claude binary (agent-claude on Termux)
  AGENT_GATEWAY_CLAUDE_OUTPUT_FORMAT  stream-json | plain
  AGENT_GATEWAY_CODEX_COMMAND     Codex binary (agent-codex on Termux)

Endpoints:
  GET  /health
  GET  /v1/models
  POST /v1/chat/completions
`);
  process.exit(0);
}

const hostFlag = valueFlag("--host");
const bind = resolveBindHost(hostFlag, process.env);
const port = Number(valueFlag("--port") || process.env.AGENT_GATEWAY_PORT || 8793);
const token = process.env.AGENT_GATEWAY_TOKEN || "";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${port}`);
  process.exit(1);
}

const tokenError = requireTokenForExposure(bind, token);
if (tokenError) {
  console.error(`Error: ${tokenError}`);
  process.exit(1);
}

if (bind.warning) {
  console.error(`Warning: ${bind.warning} — binding 0.0.0.0 instead`);
}

const { server, ctx } = createAgentGateway();
server.listen(port, bind.host, () => {
  const models = ctx.useMock ? "grok-build,claude-code,codex (mock)" : "grok-build,claude-code,codex";
  const tailscaleNote = bind.tailscale_ip ? `, tailscale=${bind.tailscale_ip}` : "";
  console.error(`Agent CLI Gateway listening on http://${bind.host}:${port} (${bind.mode}${tailscaleNote}, ${ctx.platform}, models: ${models})`);
});