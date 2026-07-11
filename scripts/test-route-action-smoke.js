#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  buildAgentCliGatewayAttractor,
  createBlackboardStore,
} from "./lib/packet-attractor-blackboard.js";
import {
  hasActionRouteAuth,
  parseActionRouteBody,
  routeActionThroughGateway,
} from "./lib/agent-gateway-route.js";

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-route-smoke-"));
const store = createBlackboardStore({ storePath: path.join(storeDir, "blackboard.json") });
const attractor = buildAgentCliGatewayAttractor({
  id: "attractor:i7-thinkpad-jhr:agent-cli-gateway",
  endpointRef: "http://127.0.0.1:8793",
  models: ["shell-repl"],
  toolCategories: ["shell"],
});
store.upsertAdvertised(attractor, { advertised_by: "test" });

const gatewayServer = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    const payload = JSON.stringify({
      choices: [{ message: { content: "ROUTED_OK" } }],
      metadata: { session_id: "sess-smoke-1", timing: { total_ms: 12 } },
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(payload);
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "agent-cli-gateway" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const gatewayPort = await listen(gatewayServer);
attractor.transport.endpoint_ref = `http://127.0.0.1:${gatewayPort}`;
store.upsertAdvertised(attractor, { advertised_by: "test" });

const routeServer = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/ops/route/action") {
    res.writeHead(404);
    res.end();
    return;
  }

  if (!hasActionRouteAuth(req, { COGENTIA_ACTION_ROUTE_TOKEN: "route-smoke-token" })) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "unauthorized_action_route" }));
    return;
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
    return;
  }

  const parsed = parseActionRouteBody(body);
  if (!parsed.ok) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: parsed.error }));
    return;
  }

  const result = await routeActionThroughGateway(store, parsed, {
    token: "gateway-smoke-token",
    env: { AGENT_GATEWAY_INVOKE_TOKEN: "gateway-smoke-token" },
    timeoutMs: 5000,
  });

  if (!result.ok) {
    const status = result.error === "attractor_not_found" ? 404 : 502;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
});

const routePort = await listen(routeServer);

const unauthorized = await postJson(`http://127.0.0.1:${routePort}/ops/route/action`, {}, {});
assert.equal(unauthorized.status, 401);
assert.equal(unauthorized.body.error, "unauthorized_action_route");

const ok = await postJson(`http://127.0.0.1:${routePort}/ops/route/action`, {
  capability: "dev.tools.shell",
  model: "shell-repl",
  prompt: "echo ROUTED_OK",
  repl: true,
  expect: "ROUTED_OK",
}, {
  Authorization: "Bearer route-smoke-token",
});
assert.equal(ok.status, 200);
assert.equal(ok.body.ok, true);
assert.equal(ok.body.service, "cogentia-action-route");
assert.equal(ok.body.content, "ROUTED_OK");
assert.equal(ok.body.route?.routed_via, "guide_blackboard");
assert.equal(ok.body.route?.attractor_id, attractor.id);

await new Promise((resolve) => routeServer.close(resolve));
await new Promise((resolve) => gatewayServer.close(resolve));
fs.rmSync(storeDir, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  tests: [
    "route_action_unauthorized",
    "route_action_success",
    "guide_blackboard_response_shape",
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

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      let raw = "";
      res.on("data", chunk => { raw += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw || "{}") });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}