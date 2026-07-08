#!/usr/bin/env node
/**
 * Cross-node acceptance: blackboard → resolve ThinkPad tool host → /v1/tools → shell-repl reuse.
 *
 * Usage:
 *   node scripts/ops/accept-agent-gateway-fractanet.js
 *
 * Environment:
 *   COGENTIA_BLACKBOARD_URL
 *   AGENT_GATEWAY_ACCEPT_ATTRACTOR_ID   default attractor:i7-thinkpad-jhr:agent-cli-gateway
 *   AGENT_GATEWAY_ACCEPT_CAPABILITY      default dev.tools.shell
 *   AGENT_GATEWAY_ACCEPT_HOST            default i7-thinkpad-jhr (hostname filter)
 *   AGENT_GATEWAY_ACCEPT_TOKEN           bearer for remote gateway (falls back to AGENT_GATEWAY_TOKEN)
 *   AGENT_GATEWAY_ACCEPT_SKIP_REPL=1     skip two-turn shell-repl test
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveAgentGatewayAttractor } from "../lib/agent-gateway-resolve.js";

loadOptionalEnvFiles([
  process.env.COGENTIA_ATTRACTOR_ENV_FILE,
  process.env.AGENT_GATEWAY_ATTRACTOR_ENV_FILE,
  process.env.AGENT_GATEWAY_ENV_FILE,
  path.join(os.homedir(), ".cogentia", "secrets", "attractor-i7-thinkpad-jhr.env"),
  path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway-blackboard.env"),
  path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway.env"),
]);

const blackboardUrl = String(process.env.COGENTIA_BLACKBOARD_URL || "").trim();
const attractorId = String(process.env.AGENT_GATEWAY_ACCEPT_ATTRACTOR_ID || "attractor:i7-thinkpad-jhr:agent-cli-gateway").trim();
const capability = String(process.env.AGENT_GATEWAY_ACCEPT_CAPABILITY || "dev.tools.shell").trim();
const hostname = String(process.env.AGENT_GATEWAY_ACCEPT_HOST || "i7-thinkpad-jhr").trim();
const token = String(process.env.AGENT_GATEWAY_ACCEPT_TOKEN || process.env.AGENT_GATEWAY_TOKEN || "").trim();
const skipRepl = parseBoolean(process.env.AGENT_GATEWAY_ACCEPT_SKIP_REPL, false);

const report = {
  ok: false,
  blackboard_url: blackboardUrl || null,
  attractor_id: attractorId,
  capability,
  hostname,
};

if (!blackboardUrl) {
  fail(report, "missing_blackboard_url");
}

const resolved = await resolveAgentGatewayAttractor({
  blackboardUrl,
  attractorId,
  capability,
  hostname,
});

report.blackboard = {
  ok: resolved.ok,
  snapshot_at: resolved.snapshot_at,
  endpoint: resolved.endpoint || null,
  fresh: resolved.fresh ?? null,
  status: resolved.status || null,
};

if (!resolved.ok || !resolved.endpoint) {
  fail(report, resolved.error || "attractor_not_found");
}

if (resolved.status === "degraded") {
  fail(report, "attractor_degraded");
}

const base = resolved.endpoint.replace(/\/$/, "");
const headers = { Accept: "application/json" };
if (token) headers.Authorization = `Bearer ${token}`;

const health = await gatewayJson(`${base}/health`, { headers });
report.health = { ok: health.ok === true, repl_sessions: health.repl_sessions ?? null };

const tools = await gatewayJson(`${base}/v1/tools`, { headers });
const toolList = Array.isArray(tools.data) ? tools.data : [];
report.tools = {
  ok: toolList.length > 0,
  count: toolList.length,
  ids: toolList.map(item => item.id),
};

const shellTool = toolList.find(item => Array.isArray(item.models) && item.models.includes("shell-repl"));
if (!shellTool?.probe?.ok) {
  fail(report, "shell_repl_unavailable");
}

if (!skipRepl) {
  if (!token) fail(report, "missing_gateway_token_for_repl");

  const postHeaders = {
    ...headers,
    "Content-Type": "application/json",
  };
  const turnOne = await gatewayJson(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: postHeaders,
    body: JSON.stringify({
      model: "shell-repl",
      stream: false,
      messages: [{ role: "user", content: "echo FRACTANET_TURN1" }],
      metadata: { adapter_mode: "repl", expect: "FRACTANET_TURN1" },
    }),
  });
  const sessionId = turnOne.metadata?.session_id;
  report.repl = {
    turn1: {
      ok: Boolean(sessionId),
      session_id: sessionId || null,
      content: turnOne.choices?.[0]?.message?.content?.slice(0, 80) || null,
    },
  };
  if (!sessionId) fail(report, "repl_turn1_no_session");

  const turnTwo = await gatewayJson(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: postHeaders,
    body: JSON.stringify({
      model: "shell-repl",
      stream: false,
      messages: [{ role: "user", content: "echo FRACTANET_TURN2" }],
      metadata: {
        adapter_mode: "repl",
        expect: "FRACTANET_TURN2",
        session_id: sessionId,
      },
    }),
  });
  report.repl.turn2 = {
    ok: turnTwo.metadata?.session_id === sessionId,
    session_id: turnTwo.metadata?.session_id || null,
    session_reused: turnTwo.metadata?.timing?.session_reused ?? null,
    content: turnTwo.choices?.[0]?.message?.content?.slice(0, 80) || null,
  };
  if (!report.repl.turn2.ok) fail(report, "repl_session_not_reused");
}

report.ok = true;
console.log(JSON.stringify(report, null, 2));

async function gatewayJson(url, options = {}) {
  const timeoutMs = Number(process.env.AGENT_GATEWAY_ACCEPT_TIMEOUT_MS || 60_000);
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json();
  if (!response.ok || body.ok === false && body.error) {
    throw Object.assign(new Error(body.error?.message || body.error || "gateway_request_failed"), {
      code: body.error?.code || "gateway_request_failed",
      status: response.status,
      body,
    });
  }
  return body;
}

function fail(report, error) {
  report.ok = false;
  report.error = error;
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

function loadOptionalEnvFiles(files) {
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(String(file));
    if (!fs.existsSync(resolved)) continue;
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] != null) continue;
      process.env[key] = unquoteEnvValue(match[2]);
    }
  }
}

function unquoteEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return fallback;
}