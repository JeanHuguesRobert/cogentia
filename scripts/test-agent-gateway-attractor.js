#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildAgentCliGatewayAttractor,
  validateAttractor,
  isAttractorFresh,
} from "./lib/packet-attractor-blackboard.js";

const sample = buildAgentCliGatewayAttractor({
  id: "attractor:poco-jhr:agent-cli-gateway",
  resourceId: "resource://poco-jhr",
  endpointRef: "http://poco-jhr:8793",
  models: ["grok-build", "claude-code", "codex"],
  ttlSeconds: 300,
});

const validated = validateAttractor(sample);
assert.equal(validated.ok, true, JSON.stringify(validated.errors));
assert.equal(isAttractorFresh(sample), true);
assert.ok(sample.matches.capabilities.includes("agent.cli.gateway"));
assert.ok(sample.matches.capabilities.includes("model.grok-build"));
assert.equal(sample.transport.profile, "agent-gateway.v1");
assert.equal(sample.transport.endpoint_ref, "http://poco-jhr:8793");

console.log(JSON.stringify({
  ok: true,
  id: sample.id,
  capabilities: sample.matches.capabilities.length,
  profile: sample.transport.profile,
}, null, 2));