#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  clientError,
  createAgentGatewayClient,
  extractCompletionContent,
} from "./lib/agent-gateway-client.js";
import { buildAgentCliGatewayAttractor } from "./lib/packet-attractor-blackboard.js";
import { pickAgentGatewayAttractor } from "./lib/agent-gateway-resolve.js";

assert.equal(
  extractCompletionContent({ choices: [{ message: { content: "ROUTED_OK\n" } }] }),
  "ROUTED_OK\n",
);

const err = clientError("attractor_not_found", "missing", { count: 0 });
assert.equal(err.code, "attractor_not_found");
assert.equal(err.detail.count, 0);

const client = createAgentGatewayClient({
  endpoint: "http://tool-host.example:8793",
  token: "test-token",
});
const route = await client.resolve();
assert.equal(route.endpoint, "http://tool-host.example:8793");
assert.equal(route.routed_via, "direct_endpoint");

const online = buildAgentCliGatewayAttractor({
  id: "attractor:i7-thinkpad-jhr:agent-cli-gateway",
  endpointRef: "http://i7-thinkpad-jhr:8793",
  models: ["shell-repl"],
  toolCategories: ["shell"],
});
const picked = pickAgentGatewayAttractor([online], {
  capability: "dev.tools.shell",
  model: "shell-repl",
});
assert.equal(picked.id, online.id);

let rejected = false;
try {
  const noBoard = createAgentGatewayClient({ capability: "dev.tools.shell" });
  await noBoard.resolve();
} catch (error) {
  rejected = error.code === "missing_blackboard_url";
}
assert.equal(rejected, true);

console.log(JSON.stringify({ ok: true, client: true }, null, 2));