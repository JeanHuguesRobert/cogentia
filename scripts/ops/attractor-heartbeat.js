#!/usr/bin/env node
/**
 * Capable-host heartbeat: publish cop/attractor.advertised for retrieval.inline.
 * Intended for cron/Task Scheduler on wake (e.g. every 2–5 min while online).
 *
 * Export runScheduledHeartbeat() for in-process ONA jobs (no child node.exe on Windows).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRetrievalInlineAttractor } from "../lib/packet-attractor-blackboard.js";

export async function runScheduledHeartbeat(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetch || globalThis.fetch;
  const blackboardUrl = String(env.COGENTIA_BLACKBOARD_URL || "").trim().replace(/\/$/, "");
  const token = String(env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || env.COGENTIA_ADMIN_TOKEN || "").trim();
  const withdraw = parseBoolean(env.COGENTIA_ATTRACTOR_WITHDRAW, false);

  if (!blackboardUrl) {
    return { ok: false, exitCode: 2, error: "missing_blackboard_url" };
  }
  if (!token) {
    return { ok: false, exitCode: 2, error: "missing_blackboard_upsert_token" };
  }

  const attractor = buildRetrievalInlineAttractor({
    id: env.COGENTIA_ATTRACTOR_ID,
    resourceId: env.COGENTIA_ATTRACTOR_NODE_ID,
    endpointRef: env.COGENTIA_ATTRACTOR_ENDPOINT_REF,
    ttlSeconds: Number(env.COGENTIA_ATTRACTOR_TTL_SECONDS || 300),
    corpusKey: env.COGENTIA_RETRIEVAL_CORPUS_KEY,
    mode: env.COGENTIA_ATTRACTOR_MODE,
    trustPerimeter: env.COGENTIA_ATTRACTOR_TRUST_PERIMETER,
  });

  const payload = withdraw
    ? {
      event: "cop/attractor.withdrawn",
      attractor_id: attractor.id,
      reason: String(env.COGENTIA_ATTRACTOR_WITHDRAW_REASON || "host_shutdown").trim(),
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
      Authorization: `Bearer ${token}`,
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
    ok: true,
    exitCode: 0,
    event: payload.event,
    attractor_id: attractor.id,
    capabilities: attractor.matches.capabilities,
    ttl_seconds: attractor.availability.ttl_seconds,
    snapshot_at: body.snapshot_at,
  };
}

function loadOptionalEnvFiles(files) {
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(String(file));
    if (!fs.existsSync(resolved)) continue;
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || line.trimStart().startsWith("#")) continue;
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

function isCliInvocation() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

function parseCliEnvFile(argv) {
  const index = argv.indexOf("--env-file");
  if (index === -1) return "";
  return String(argv[index + 1] || "").trim();
}

if (isCliInvocation()) {
  const envFile = parseCliEnvFile(process.argv);
  if (envFile) process.env.COGENTIA_ATTRACTOR_ENV_FILE = envFile;
  loadOptionalEnvFiles([
    process.env.COGENTIA_ATTRACTOR_ENV_FILE,
    process.env.COGENTIA_GUIDE_ENV_FILE,
    process.env.COGENTIA_ENV_FILE,
  ]);

  const result = await runScheduledHeartbeat({ env: process.env });
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(result.exitCode || 1);
  }
  console.log(JSON.stringify({
    ok: true,
    event: result.event,
    attractor_id: result.attractor_id,
    capabilities: result.capabilities,
    ttl_seconds: result.ttl_seconds,
    snapshot_at: result.snapshot_at,
  }, null, 2));
}