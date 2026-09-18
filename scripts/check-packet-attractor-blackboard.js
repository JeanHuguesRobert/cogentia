#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRetrievalInlineAttractor,
  createBlackboardStore,
  isAttractorFresh,
  validateAttractor,
} from "./lib/packet-attractor-blackboard.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-blackboard-"));
const storePath = path.join(storeDir, "blackboard.json");
const token = "test-blackboard-upsert-token";
const daemonPort = await freePort();
const mcpPort = await freePort();
const daemonBase = `http://127.0.0.1:${daemonPort}`;
const mcpBase = `http://127.0.0.1:${mcpPort}`;

const daemon = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", daemonBase);
  if (req.method === "GET" && url.pathname === "/api/context/health") {
    return sendJson(res, 200, { ok: true, service: "mock-context-gateway" });
  }
  return sendJson(res, 404, { ok: false, error: "not_found" });
});
await listen(daemon, daemonPort);

const store = createBlackboardStore({
  storePath,
  env: { COGENTIA_BLACKBOARD_UPSERT_TOKEN: token },
});

const sample = buildRetrievalInlineAttractor({
  id: "attractor:test-node:retrieval-inline",
  resourceId: "resource://test-node",
  endpointRef: "secret://inox-serve-test-node",
  ttlSeconds: 120,
});

assert.equal(validateAttractor(sample).ok, true);
assert.equal(isAttractorFresh(sample), true);

const child = spawn(process.execPath, ["scripts/cogentia-mcp-http.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(mcpPort),
    COGENTIA_DAEMON_URL: daemonBase,
    COGENTIA_BLACKBOARD_STORE: storePath,
    COGENTIA_BLACKBOARD_UPSERT_TOKEN: token,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", chunk => { stderr += chunk; });

try {
  await waitForMcp();

  const unauthorized = await fetch(`${mcpBase}/ops/blackboard/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "cop/attractor.advertised", attractor: sample }),
  });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).error, "unauthorized_blackboard_upsert");

  const advertised = await postJson(`${mcpBase}/ops/blackboard/upsert`, {
    event: "cop/attractor.advertised",
    attractor: sample,
  }, token);
  assert.equal(advertised.ok, true);
  assert.equal(advertised.event, "cop/attractor.advertised");
  assert.equal(advertised.attractor_id, sample.id);

  const snapshot = await getJson(`${mcpBase}/ops/blackboard?capability=retrieval.inline`);
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.count, 1);
  assert.equal(snapshot.attractors[0].id, sample.id);
  assert.deepEqual(snapshot.attractors[0].matches.capabilities, sample.matches.capabilities);
  assert.equal(snapshot.attractors[0].transport.endpoint_ref, "secret://inox-serve-test-node");

  const health = await getJson(`${mcpBase}/guide/health`);
  assert.equal(health.context.blackboard.fresh_attractor_count, 1);
  assert.equal(health.context.blackboard.attractor_count, 1);

  const onaAttractor = {
    artifactType: "cop/packet-attractor",
    id: "attractor:test-node:operium-node",
    node: { resource_id: "resource://test-node", hostname: "test-node" },
    matches: { capabilities: ["operium.node.v1"] },
    availability: {
      status: "online",
      last_seen: new Date().toISOString(),
      ttl_seconds: 300,
    },
    transport: {
      profile: "operium.node.v1",
      endpoint_ref: "http://127.0.0.1:8794",
    },
    metadata: { health_score: 4, ona_version: "0.1.0" },
  };
  store.upsertAdvertised(onaAttractor);

  const stale = buildRetrievalInlineAttractor({
    id: "attractor:test-node:stale",
    resourceId: "resource://test-node",
    endpointRef: "secret://inox-serve-test-node",
    ttlSeconds: 30,
    now: new Date(Date.now() - 120_000),
  });
  store.upsertAdvertised(stale);

  const freshOnly = await getJson(`${mcpBase}/ops/blackboard?fresh=1`);
  assert.equal(freshOnly.count, 2);
  const includeExpired = await getJson(`${mcpBase}/ops/blackboard?fresh=0`);
  assert.equal(includeExpired.count, 3);

  const withdrawn = await postJson(`${mcpBase}/ops/blackboard/upsert`, {
    event: "cop/attractor.withdrawn",
    attractor_id: sample.id,
    reason: "test_shutdown",
  }, token);
  assert.equal(withdrawn.ok, true);
  assert.equal(withdrawn.event, "cop/attractor.withdrawn");

  const afterWithdraw = await getJson(`${mcpBase}/ops/blackboard?fresh=0`);
  assert.equal(afterWithdraw.count, 2);
  assert.equal(afterWithdraw.attractors.some(item => item.id === stale.id), true);
  assert.equal(afterWithdraw.attractors.some(item => item.id === onaAttractor.id), true);

  const opsStatus = await getJson(`${mcpBase}/ops/status`);
  assert.equal(opsStatus.ok, true);
  assert.equal(opsStatus.schema, "operium.up.v1");
  assert.equal(opsStatus.role, "runtime-aggregator");
  assert.equal(opsStatus.service, "fractanet-ops");
  assert.equal(opsStatus.layers.blackboard.attractor_count >= 1, true);
  assert.equal(opsStatus.layers.retrieval.phase2_wired, false);
  assert.equal(opsStatus.layers.node_agents.capability, "operium.node.v1");
  assert.equal(opsStatus.layers.node_agents.fresh_count >= 1, true);
  assert.equal(
    opsStatus.layers.node_agents.attractors.some(item => item.id === onaAttractor.id),
    true,
  );

  const dashboard = await fetch(`${mcpBase}/ops/dashboard`);
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Fractanet Ops/);

  const invalid = await fetch(`${mcpBase}/ops/blackboard/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      event: "cop/attractor.advertised",
      attractor: { id: "bad" },
    }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "invalid_attractor");

  console.log(JSON.stringify({
    ok: true,
    blackboard_upsert: true,
    blackboard_get: true,
    withdraw: true,
    guide_health_blackboard: true,
  }, null, 2));
} finally {
  child.kill();
  daemon.close();
  fs.rmSync(storeDir, { recursive: true, force: true });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}

async function postJson(url, body, bearer) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });
  const parsed = await response.json();
  assert.equal(response.ok, true, JSON.stringify(parsed));
  return parsed;
}

async function getJson(url) {
  const response = await fetch(url);
  const parsed = await response.json();
  assert.equal(response.ok, true, JSON.stringify(parsed));
  return parsed;
}

async function waitForMcp() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${mcpBase}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`MCP HTTP server did not start: ${stderr}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}