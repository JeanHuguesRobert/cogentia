#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildAgentCliGatewayAttractor,
  isAttractorFresh,
} from "./lib/packet-attractor-blackboard.js";
import {
  listAgentGatewayAttractors,
  pickAgentGatewayAttractor,
} from "./lib/agent-gateway-resolve.js";

const online = buildAgentCliGatewayAttractor({
  id: "attractor:i7-thinkpad-jhr:agent-cli-gateway",
  resourceId: "resource://i7-thinkpad-jhr",
  endpointRef: "http://i7-thinkpad-jhr:8793",
  models: ["shell-repl", "grok-build"],
  toolCategories: ["shell"],
  status: "online",
});

const degraded = buildAgentCliGatewayAttractor({
  id: "attractor:fracta:agent-cli-gateway",
  resourceId: "resource://fracta",
  endpointRef: "http://fracta:8793",
  minimal: true,
  status: "degraded",
});

const retrieval = buildAgentCliGatewayAttractor({
  id: "attractor:i7-thinkpad-jhr:retrieval-inline",
  endpointRef: "secret://inox-serve",
});
retrieval.transport.profile = "inox.session.v1";

assert.equal(listAgentGatewayAttractors([online, degraded, retrieval]).length, 2);

const picked = pickAgentGatewayAttractor([online, degraded], {
  capability: "dev.tools.shell",
  hostname: "i7-thinkpad-jhr",
});
assert.equal(picked.id, online.id);
assert.ok(isAttractorFresh(online));

const degradedPick = pickAgentGatewayAttractor([degraded], {
  attractorId: "attractor:fracta:agent-cli-gateway",
});
assert.equal(degradedPick.availability.status, "degraded");
assert.deepEqual(degradedPick.matches.capabilities, ["agent.cli.gateway"]);

console.log(JSON.stringify({ ok: true, resolve: true, minimal_degraded: true }, null, 2));