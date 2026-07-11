#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  createBlackboardStore,
} from "./lib/packet-attractor-blackboard.js";
import {
  decodeNodeId,
  handleOpsNodeProxyRequest,
  hasOpsReadAuth,
  parseOpsNodePath,
  proxyOnaRequest,
  resolveOnaAttractorForNode,
} from "./lib/ona-proxy.js";

assert.equal(decodeNodeId("resource%3A%2F%2Ffracta"), "resource://fracta");

const parsed = parseOpsNodePath("/ops/node/resource%3A%2F%2Fi7-thinkpad-jhr/status");
assert.equal(parsed.ok, true);
assert.equal(parsed.node_id, "resource://i7-thinkpad-jhr");
assert.equal(parsed.ona_path, "/node/status");

assert.equal(parseOpsNodePath("/ops/node/bad/path").ok, false);

const env = {
  COGENTIA_OPS_READ_TOKEN: "ops-read-token",
  ONA_READ_TOKEN: "ona-read-token",
};
assert.equal(hasOpsReadAuth({ headers: { authorization: "Bearer ops-read-token" } }, env), true);
assert.equal(hasOpsReadAuth({ headers: { authorization: "Bearer wrong" } }, env), false);

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-ona-proxy-"));
const store = createBlackboardStore({ storePath: path.join(storeDir, "blackboard.json") });

const onaServer = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/node/status") {
    const auth = String(req.headers.authorization || "");
    if (!auth.includes("ona-read-token")) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      schema: "operium.node.status.v1",
      ok: true,
      node_id: "resource://fracta",
      hostname: "fracta",
      health_score: 4,
    }));
    return;
  }
  if (req.method === "GET" && req.url === "/node/drift") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      schema: "operium.node.drift.v1",
      ok: true,
      node_id: "resource://fracta",
      drift: [],
      next_actions: [],
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const onaPort = await listen(onaServer);
env.ONA_PORT = String(onaPort);

const attractor = {
  artifactType: "cop/packet-attractor",
  id: "attractor:fracta:operium-node",
  node: {
    resource_id: "resource://fracta",
    hostname: "fracta",
    trust_perimeter: "owner-operated",
  },
  matches: {
    packetKind: ["mandate", "cognitive-packet"],
    capabilities: ["operium.node.v1"],
    verbs: ["node.status@v1", "node.cop@v1"],
  },
  availability: {
    status: "online",
    last_seen: new Date().toISOString(),
    ttl_seconds: 300,
  },
  transport: {
    profile: "operium.node.v1",
    endpoint_ref: `http://127.0.0.1:${onaPort}`,
  },
  metadata: { health_score: 4, ona_version: "0.1.0" },
};
const upsert = store.upsertAdvertised(attractor, { advertised_by: "resource://fracta" });
assert.equal(upsert.ok, true);

const resolved = resolveOnaAttractorForNode(store, "resource://fracta", { env });
assert.equal(resolved.ok, true);
assert.equal(resolved.endpoint, `http://127.0.0.1:${onaPort}`);

const proxied = await proxyOnaRequest(resolved, "/node/status", { env, timeoutMs: 5000 });
assert.equal(proxied.ok, true);
assert.equal(proxied.body.schema, "operium.node.status.v1");
assert.equal(proxied.proxy.routed_via, "ona_proxy");

const unauthorized = await handleOpsNodeProxyRequest(
  { url: "/ops/node/resource%3A%2F%2Ffracta/status", headers: {} },
  store,
  { env },
);
assert.equal(unauthorized.status, 401);
assert.equal(unauthorized.body.error, "unauthorized_ops_read");

const missing = await handleOpsNodeProxyRequest(
  {
    url: "/ops/node/resource%3A%2F%2Fmissing/status",
    headers: { authorization: "Bearer ops-read-token" },
  },
  store,
  { env },
);
assert.equal(missing.status, 404);
assert.equal(missing.body.error, "ona_attractor_not_found");

const okStatus = await handleOpsNodeProxyRequest(
  {
    url: "/ops/node/resource%3A%2F%2Ffracta/status",
    headers: { authorization: "Bearer ops-read-token" },
  },
  store,
  { env, timeoutMs: 5000 },
);
assert.equal(okStatus.status, 200);
assert.equal(okStatus.body.schema, "operium.node.status.v1");
assert.equal(okStatus.body.proxy.node_id, "resource://fracta");

const okDrift = await handleOpsNodeProxyRequest(
  {
    url: "/ops/node/resource%3A%2F%2Ffracta/drift",
    headers: { authorization: "Bearer ops-read-token" },
  },
  store,
  { env, timeoutMs: 5000 },
);
assert.equal(okDrift.status, 200);
assert.equal(okDrift.body.schema, "operium.node.drift.v1");

await new Promise((resolve) => onaServer.close(resolve));
fs.rmSync(storeDir, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  tests: [
    "parseOpsNodePath",
    "hasOpsReadAuth",
    "resolveOnaAttractorForNode",
    "proxyOnaRequest",
    "handleOpsNodeProxyRequest",
  ],
}, null, 2));

function listen(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("invalid_listen_address"));
        return;
      }
      resolve(address.port);
    });
    server.on("error", reject);
  });
}