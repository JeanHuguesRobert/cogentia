#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { buildAgentCliGatewayAttractor } from "./lib/packet-attractor-blackboard.js";
import { resolveAgentGatewayAttractor } from "./lib/agent-gateway-resolve.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-offline-blackboard-"));
const cachePath = path.join(tmpDir, "blackboard-cache.json");

const gateway = http.createServer((req, res) => {
  if (req.url?.startsWith("/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "fixture-agent-gateway" }));
    return;
  }
  res.writeHead(404);
  res.end();
});
await listen(gateway);
const gatewayPort = gateway.address().port;

const attractor = buildAgentCliGatewayAttractor({
  id: "attractor:fixture:agent-cli-gateway",
  resourceId: "resource://fixture",
  endpointRef: `http://127.0.0.1:${gatewayPort}`,
  models: ["fixture-model"],
  status: "online",
  ttlSeconds: 300,
});

const blackboard = http.createServer((req, res) => {
  if (req.url?.startsWith("/ops/blackboard")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      snapshot_at: new Date().toISOString(),
      count: 1,
      attractors: [attractor],
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});
await listen(blackboard);
const blackboardPort = blackboard.address().port;
const blackboardUrl = `http://127.0.0.1:${blackboardPort}`;

try {
  const online = await resolveAgentGatewayAttractor({
    blackboardUrl,
    capability: "agent.cli.gateway",
    cachePath,
    timeoutMs: 1000,
  });
  assert.equal(online.ok, true);
  assert.equal(online.routed_via, "blackboard");
  assert.equal(fs.existsSync(cachePath), true, "successful resolution should persist a local snapshot");

  await close(blackboard);

  const offline = await resolveAgentGatewayAttractor({
    blackboardUrl,
    capability: "agent.cli.gateway",
    cachePath,
    timeoutMs: 200,
  });
  assert.equal(offline.ok, true);
  assert.equal(offline.routed_via, "offline_cache_fallback");
  assert.equal(offline.endpoint, `http://127.0.0.1:${gatewayPort}`);

  console.log(JSON.stringify({
    ok: true,
    tests: [
      "blackboard_snapshot_cached",
      "blackboard_unreachable_uses_local_cache",
      "cached_endpoint_health_probed",
    ],
  }, null, 2));
} finally {
  await closeQuietly(blackboard);
  await closeQuietly(gateway);
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

async function closeQuietly(server) {
  if (!server.listening) return;
  await close(server);
}
