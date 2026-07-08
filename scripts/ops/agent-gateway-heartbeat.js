#!/usr/bin/env node
/**
 * Publish cop/attractor.advertised for agent-cli-gateway after probing local /health.
 * Watchdog: restart gateway once when health fails, then re-probe; advertise degraded if still down.
 *
 * Env:
 *   COGENTIA_BLACKBOARD_URL
 *   COGENTIA_BLACKBOARD_UPSERT_TOKEN
 *   AGENT_GATEWAY_HEARTBEAT_URL     default http://127.0.0.1:8793/health
 *   AGENT_GATEWAY_TOKEN             local gateway bearer (for /health when required)
 *   AGENT_GATEWAY_ATTRACTOR_ID      default attractor:<hostname>:agent-cli-gateway
 *   AGENT_GATEWAY_ATTRACTOR_NODE_ID  default resource://<hostname>
 *   AGENT_GATEWAY_ATTRACTOR_ENDPOINT default http://<hostname>:8793
 *   AGENT_GATEWAY_ATTRACTOR_TTL_SECONDS default 300
 *   AGENT_GATEWAY_WATCHDOG          default 1 — restart gateway when health fails
 *   AGENT_GATEWAY_WATCHDOG_RESTART_SCRIPT optional override
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { restartAgentGateway, watchdogEnabled } from "../lib/agent-gateway-watchdog.js";
import { buildAgentCliGatewayAttractor } from "../lib/packet-attractor-blackboard.js";

loadOptionalEnvFiles([
  process.env.AGENT_GATEWAY_ATTRACTOR_ENV_FILE,
  process.env.AGENT_GATEWAY_ENV_FILE,
  process.env.COGENTIA_ATTRACTOR_ENV_FILE,
  process.env.COGENTIA_ENV_FILE,
  path.join(os.homedir(), "srv", "cogentia", "secrets", "agent-gateway.env"),
  path.join(os.homedir(), "srv", "cogentia", "secrets", "agent-gateway-blackboard.env"),
  path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway.env"),
  path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway-blackboard.env"),
]);

const blackboardUrl = String(process.env.COGENTIA_BLACKBOARD_URL || "").trim().replace(/\/$/, "");
const upsertToken = String(process.env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || process.env.COGENTIA_ADMIN_TOKEN || "").trim();
const withdraw = parseBoolean(process.env.AGENT_GATEWAY_ATTRACTOR_WITHDRAW, false);
const hostname = os.hostname().toLowerCase();
const defaultResourceId = `resource://${hostname}`;
const healthUrl = String(process.env.AGENT_GATEWAY_HEARTBEAT_URL || `http://127.0.0.1:${process.env.AGENT_GATEWAY_PORT || 8793}/health`).trim();
const gatewayToken = String(process.env.AGENT_GATEWAY_TOKEN || "").trim();

if (!blackboardUrl) {
  console.error(JSON.stringify({ ok: false, error: "missing_blackboard_url" }));
  process.exit(2);
}
if (!upsertToken) {
  console.error(JSON.stringify({ ok: false, error: "missing_blackboard_upsert_token" }));
  process.exit(2);
}

let health = null;
let watchdog = null;

if (!withdraw) {
  ({ health, watchdog } = await ensureGatewayHealth(healthUrl, gatewayToken));
}

const degraded = !withdraw && !health?.ok;
const models = degraded ? [] : listModelsFromHealth(health);
const toolCategories = degraded ? [] : listToolCategoriesFromHealth(health);
const attractor = buildAgentCliGatewayAttractor({
  id: process.env.AGENT_GATEWAY_ATTRACTOR_ID || `attractor:${hostname}:agent-cli-gateway`,
  resourceId: process.env.AGENT_GATEWAY_ATTRACTOR_NODE_ID || defaultResourceId,
  endpointRef: process.env.AGENT_GATEWAY_ATTRACTOR_ENDPOINT
    || `http://${hostname}:${process.env.AGENT_GATEWAY_PORT || 8793}`,
  ttlSeconds: Number(process.env.AGENT_GATEWAY_ATTRACTOR_TTL_SECONDS || 300),
  models: degraded ? [] : (models.length ? models : undefined),
  toolCategories: degraded ? [] : (toolCategories.length ? toolCategories : undefined),
  minimal: degraded,
  status: health?.ok ? "online" : "degraded",
  trustPerimeter: process.env.AGENT_GATEWAY_ATTRACTOR_TRUST_PERIMETER,
});

const payload = withdraw
  ? {
    event: "cop/attractor.withdrawn",
    attractor_id: attractor.id,
    reason: String(process.env.AGENT_GATEWAY_ATTRACTOR_WITHDRAW_REASON || "host_shutdown").trim(),
  }
  : {
    event: "cop/attractor.advertised",
    advertised_by: attractor.node.resource_id,
    attractor,
  };

const response = await fetch(`${blackboardUrl}/ops/blackboard/upsert`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${upsertToken}`,
    "X-Cogentia-Node": attractor.node.resource_id,
  },
  body: JSON.stringify(payload),
});

let body;
try {
  body = await response.json();
} catch {
  body = { ok: false, error: "non_json_response", status: response.status };
}

if (!response.ok || body.ok === false) {
  console.error(JSON.stringify({
    ok: false,
    status: response.status,
    body,
    blackboard_url: blackboardUrl,
    attractor_id: attractor.id,
    withdraw,
  }, null, 2));
  process.exit(1);
}

const result = {
  ok: true,
  event: payload.event,
  attractor_id: attractor.id,
  endpoint_ref: attractor.transport.endpoint_ref,
  availability_status: attractor.availability.status,
  capabilities: attractor.matches.capabilities,
  models,
  tool_categories: toolCategories,
  ttl_seconds: attractor.availability.ttl_seconds,
  snapshot_at: body.snapshot_at,
  watchdog,
};

console.log(JSON.stringify(result, null, 2));
if (degraded) process.exit(1);

async function ensureGatewayHealth(url, token) {
  let health = await probeGatewayHealth(url, token);
  if (health?.ok) {
    return { health, watchdog: { attempted: false, ok: true } };
  }

  let watchdog = { attempted: false, ok: false, detail: "health_failed" };
  if (watchdogEnabled()) {
    watchdog = await restartAgentGateway();
    const settleMs = Number(process.env.AGENT_GATEWAY_WATCHDOG_SETTLE_MS || 3000);
    if (settleMs > 0) await sleep(settleMs);
    health = await probeGatewayHealth(url, token);
    watchdog.health_ok_after_restart = health?.ok === true;
  }

  return { health, watchdog };
}

async function probeGatewayHealth(url, token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const timeoutMs = Number(process.env.AGENT_GATEWAY_HEARTBEAT_TIMEOUT_MS || 45_000);
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json();
    return { ok: response.ok && body.ok === true, ...body };
  } catch (error) {
    return { ok: false, error: error.message || "fetch_failed" };
  }
}

function listModelsFromHealth(health) {
  if (!health || typeof health !== "object") return [];
  const adapters = health.adapters && typeof health.adapters === "object" ? health.adapters : {};
  const models = [];
  if (adapters.grok?.ok) models.push("grok-build");
  if (adapters.claude?.ok) models.push("claude-code");
  if (adapters.codex?.ok) models.push("codex");
  for (const tool of listHealthyTools(health)) {
    if (Array.isArray(tool.models)) models.push(...tool.models);
  }
  return [...new Set(models.map(value => String(value || "").trim()).filter(Boolean))];
}

function listToolCategoriesFromHealth(health) {
  const categories = new Set();
  for (const tool of listHealthyTools(health)) {
    const category = String(tool.tool_category || "").trim();
    if (category) categories.add(category);
  }
  return [...categories];
}

function listHealthyTools(health) {
  if (!health || !Array.isArray(health.tools)) return [];
  return health.tools.filter(tool => tool?.probe?.ok === true);
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}