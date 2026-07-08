#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildAgentCliGatewayAttractor,
  createBlackboardStore,
} from "./lib/packet-attractor-blackboard.js";
import {
  actionRouteToken,
  gatewayInvokeToken,
  hasActionRouteAuth,
  parseActionRouteBody,
  resolveAgentGatewayFromSnapshot,
  routeActionThroughGateway,
  summarizeActionLayer,
} from "./lib/agent-gateway-route.js";

assert.deepEqual(parseActionRouteBody({ model: "shell-repl" }), { ok: false, error: "missing_prompt" });
assert.deepEqual(parseActionRouteBody({ prompt: "echo OK" }), { ok: false, error: "missing_model" });

const parsed = parseActionRouteBody({
  capability: "dev.tools.shell",
  model: "shell-repl",
  prompt: "echo ROUTED_OK",
  repl: true,
  expect: "ROUTED_OK",
  session_id: "sess-1",
});
assert.equal(parsed.ok, true);
assert.equal(parsed.model, "shell-repl");
assert.equal(parsed.sessionId, "sess-1");
assert.equal(parsed.repl, true);

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-route-test-"));
const store = createBlackboardStore({ storePath: path.join(storeDir, "blackboard.json") });
const attractor = buildAgentCliGatewayAttractor({
  id: "attractor:i7-thinkpad-jhr:agent-cli-gateway",
  endpointRef: "http://i7-thinkpad-jhr:8793",
  models: ["shell-repl"],
  toolCategories: ["shell"],
});
store.upsertAdvertised(attractor, { advertised_by: "test" });

const resolved = resolveAgentGatewayFromSnapshot(store, {
  capability: "dev.tools.shell",
  model: "shell-repl",
});
assert.equal(resolved.ok, true);
assert.equal(resolved.endpoint, "http://i7-thinkpad-jhr:8793");
assert.equal(resolved.attractor_id, attractor.id);

const missing = resolveAgentGatewayFromSnapshot(store, {
  capability: "dev.tools.python",
});
assert.equal(missing.ok, false);
assert.equal(missing.error, "attractor_not_found");

const actionLayer = summarizeActionLayer(store.snapshot({ fresh: false }));
assert.equal(actionLayer.phase2_wired, true);
assert.equal(actionLayer.attractor_count, 1);
assert.equal(actionLayer.tool_hosts[0].models.includes("shell-repl"), true);

const prevRouteToken = process.env.COGENTIA_ACTION_ROUTE_TOKEN;
process.env.COGENTIA_ACTION_ROUTE_TOKEN = "route-test-token";
assert.equal(actionRouteToken(), "route-test-token");
assert.equal(hasActionRouteAuth({ headers: { authorization: "Bearer route-test-token" } }), true);
assert.equal(hasActionRouteAuth({ headers: { authorization: "Bearer wrong" } }), false);
process.env.COGENTIA_ACTION_ROUTE_TOKEN = prevRouteToken;

const notFound = await routeActionThroughGateway(store, {
  model: "shell-repl",
  prompt: "echo OK",
  capability: "dev.tools.python",
});
assert.equal(notFound.ok, false);
assert.equal(notFound.error, "attractor_not_found");

const prevGatewayToken = process.env.AGENT_GATEWAY_INVOKE_TOKEN;
process.env.AGENT_GATEWAY_INVOKE_TOKEN = "gateway-token";
assert.equal(gatewayInvokeToken(), "gateway-token");
process.env.AGENT_GATEWAY_INVOKE_TOKEN = prevGatewayToken;

console.log(JSON.stringify({ ok: true, route: true }, null, 2));