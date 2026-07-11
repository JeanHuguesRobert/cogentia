#!/usr/bin/env node
/**
 * Publish cop/attractor.advertised for agent-cli-gateway after probing local /health.
 * Export runScheduledHeartbeat() for in-process ONA jobs (no child node.exe on Windows).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restartAgentGateway, watchdogEnabled } from "../lib/agent-gateway-watchdog.js";
import { buildAgentCliGatewayAttractor } from "../lib/packet-attractor-blackboard.js";

export async function runScheduledHeartbeat(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetch || globalThis.fetch;
  const blackboardUrl = String(env.COGENTIA_BLACKBOARD_URL || "").trim().replace(/\/$/, "");
  const upsertToken = String(env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || env.COGENTIA_ADMIN_TOKEN || "").trim();
  const withdraw = parseBoolean(env.AGENT_GATEWAY_ATTRACTOR_WITHDRAW, false);
  const hostname = String(env.ONA_HOSTNAME || os.hostname()).trim().toLowerCase();
  const defaultResourceId = `resource://${hostname}`;
  const healthUrl = appendQuickHealthParam(String(
    env.AGENT_GATEWAY_HEARTBEAT_URL || `http://127.0.0.1:${env.AGENT_GATEWAY_PORT || 8793}/health`,
  ).trim());
  const gatewayToken = String(env.AGENT_GATEWAY_TOKEN || "").trim();

  if (!blackboardUrl) {
    return { ok: false, exitCode: 2, error: "missing_blackboard_url" };
  }
  if (!upsertToken) {
    return { ok: false, exitCode: 2, error: "missing_blackboard_upsert_token" };
  }

  let health = null;
  let watchdog = null;

  if (!withdraw) {
    ({ health, watchdog } = await ensureGatewayHealth(healthUrl, gatewayToken, env));
  }

  const degraded = !withdraw && !health?.ok;
  const models = degraded ? [] : listModelsFromHealth(health);
  const toolCategories = degraded ? [] : listToolCategoriesFromHealth(health);
  const attractor = buildAgentCliGatewayAttractor({
    id: env.AGENT_GATEWAY_ATTRACTOR_ID || `attractor:${hostname}:agent-cli-gateway`,
    resourceId: env.AGENT_GATEWAY_ATTRACTOR_NODE_ID || defaultResourceId,
    endpointRef: env.AGENT_GATEWAY_ATTRACTOR_ENDPOINT
      || `http://${hostname}:${env.AGENT_GATEWAY_PORT || 8793}`,
    ttlSeconds: Number(env.AGENT_GATEWAY_ATTRACTOR_TTL_SECONDS || 300),
    models: degraded ? [] : (models.length ? models : undefined),
    toolCategories: degraded ? [] : (toolCategories.length ? toolCategories : undefined),
    minimal: degraded,
    status: health?.ok ? "online" : "degraded",
    trustPerimeter: env.AGENT_GATEWAY_ATTRACTOR_TRUST_PERIMETER,
  });

  const payload = withdraw
    ? {
      event: "cop/attractor.withdrawn",
      attractor_id: attractor.id,
      reason: String(env.AGENT_GATEWAY_ATTRACTOR_WITHDRAW_REASON || "host_shutdown").trim(),
    }
    : {
      event: "cop/attractor.advertised",
      advertised_by: attractor.node.resource_id,
      attractor,
    };

  const response = await fetchImpl(`${blackboardUrl}/ops/blackboard/upsert`, {
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
    return {
      ok: false,
      exitCode: 1,
      error: "blackboard_upsert_failed",
      status: response.status,
      body,
      blackboard_url: blackboardUrl,
      attractor_id: attractor.id,
      withdraw,
    };
  }

  return {
    ok: !degraded,
    exitCode: degraded ? 1 : 0,
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
    error: degraded ? "gateway_degraded" : null,
  };
}

async function ensureGatewayHealth(url, token, env) {
  let health = await probeGatewayHealth(url, token);
  if (health?.ok) {
    return { health, watchdog: { attempted: false, ok: true } };
  }

  let watchdog = { attempted: false, ok: false, detail: "health_failed" };
  if (watchdogEnabled(env)) {
    watchdog = await restartAgentGateway({ env });
    const settleMs = Number(env.AGENT_GATEWAY_WATCHDOG_SETTLE_MS || 3000);
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

function appendQuickHealthParam(url) {
  if (!url || url.includes("quick=1")) return url;
  if (!/\/health\/?$/i.test(url.replace(/\?.*$/, ""))) return url;
  return url.includes("?") ? `${url}&quick=1` : `${url}?quick=1`;
}

function isCliInvocation() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

function parseCliEnvFiles(argv) {
  const gateway = argv.includes("--gateway-env-file")
    ? String(argv[argv.indexOf("--gateway-env-file") + 1] || "").trim()
    : "";
  const blackboard = argv.includes("--blackboard-env-file")
    ? String(argv[argv.indexOf("--blackboard-env-file") + 1] || "").trim()
    : "";
  return { gateway, blackboard };
}

if (isCliInvocation()) {
  const cliEnv = parseCliEnvFiles(process.argv);
  if (cliEnv.gateway) process.env.AGENT_GATEWAY_ENV_FILE = cliEnv.gateway;
  if (cliEnv.blackboard) process.env.AGENT_GATEWAY_ATTRACTOR_ENV_FILE = cliEnv.blackboard;
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

  const result = await runScheduledHeartbeat({ env: process.env });
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(result.exitCode || 1);
  }
  console.log(JSON.stringify(result, null, 2));
}