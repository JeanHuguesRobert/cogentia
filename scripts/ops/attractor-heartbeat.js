#!/usr/bin/env node
/**
 * Capable-host heartbeat: publish cop/attractor.advertised for retrieval.inline.
 * Intended for cron/Task Scheduler on wake (e.g. every 2–5 min while online).
 *
 * Env (values on capable host / Operium private registry — never in git):
 *   COGENTIA_BLACKBOARD_URL       fracta MCP base, e.g. https://cogentia.fractavolta.com
 *   COGENTIA_BLACKBOARD_UPSERT_TOKEN
 *   COGENTIA_ATTRACTOR_ID         default attractor:jhr-laptop:retrieval-inline
 *   COGENTIA_ATTRACTOR_NODE_ID     default resource://jhr-laptop
 *   COGENTIA_ATTRACTOR_ENDPOINT_REF default secret://inox-serve-jhr-laptop
 *   COGENTIA_ATTRACTOR_TTL_SECONDS  default 300
 */

import fs from "node:fs";
import path from "node:path";
import { buildRetrievalInlineAttractor } from "../lib/packet-attractor-blackboard.js";

loadOptionalEnvFiles([
  process.env.COGENTIA_ATTRACTOR_ENV_FILE,
  process.env.COGENTIA_GUIDE_ENV_FILE,
  process.env.COGENTIA_ENV_FILE,
]);

const blackboardUrl = String(process.env.COGENTIA_BLACKBOARD_URL || "").trim().replace(/\/$/, "");
const token = String(process.env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || process.env.COGENTIA_ADMIN_TOKEN || "").trim();
const withdraw = parseBoolean(process.env.COGENTIA_ATTRACTOR_WITHDRAW, false);

if (!blackboardUrl) {
  console.error(JSON.stringify({ ok: false, error: "missing_blackboard_url" }));
  process.exit(2);
}
if (!token) {
  console.error(JSON.stringify({ ok: false, error: "missing_blackboard_upsert_token" }));
  process.exit(2);
}

const attractor = buildRetrievalInlineAttractor({
  id: process.env.COGENTIA_ATTRACTOR_ID,
  resourceId: process.env.COGENTIA_ATTRACTOR_NODE_ID,
  endpointRef: process.env.COGENTIA_ATTRACTOR_ENDPOINT_REF,
  ttlSeconds: Number(process.env.COGENTIA_ATTRACTOR_TTL_SECONDS || 300),
  corpusKey: process.env.COGENTIA_RETRIEVAL_CORPUS_KEY,
  mode: process.env.COGENTIA_ATTRACTOR_MODE,
  trustPerimeter: process.env.COGENTIA_ATTRACTOR_TRUST_PERIMETER,
});

const payload = withdraw
  ? {
    event: "cop/attractor.withdrawn",
    attractor_id: attractor.id,
    reason: String(process.env.COGENTIA_ATTRACTOR_WITHDRAW_REASON || "host_shutdown").trim(),
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

console.log(JSON.stringify({
  ok: true,
  event: payload.event,
  attractor_id: attractor.id,
  capabilities: attractor.matches.capabilities,
  ttl_seconds: attractor.availability.ttl_seconds,
  snapshot_at: body.snapshot_at,
}, null, 2));

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