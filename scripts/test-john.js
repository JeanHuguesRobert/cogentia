#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildCognitivePacketFromJohnRequest,
  isTerminalEvent,
  reconstructJohnOdyssey,
  runJohnRequest,
  validateJohnRequest,
} from "./lib/john-run.js";

const request = {
  version: "john.request.v1",
  request_id: "john-test-001",
  principal: { id: "principal:test" },
  mandate: { id: "mandate:test", version: "1" },
  budget: { id: "budget:test" },
  execution_budget: {
    max_steps: 1,
    max_tool_calls: 0,
    max_subagents: 0,
    max_elapsed_ms: 5000,
    max_external_effects: 0,
  },
  exposure: "none",
  capability: "john.converse",
  input: { prompt: "hello" },
  handler: { id: "mock.echo", kind: "mock" },
};

assert.deepEqual(validateJohnRequest(request), []);

// Test Cognitive Packet builder
const packet = buildCognitivePacketFromJohnRequest(request);
assert.equal(packet.packetKind, "cognitive_packet");
assert.equal(packet.envelope.protocol, "cognitive_packet.v0");
assert.equal(packet.envelope.id, "urn:cop:packet:john:john-test-001");
assert.equal(packet.envelope.status, "dispatched");
assert.equal(packet.envelope.ithaca.return_target, "principal:test");
assert.equal(packet.envelope.hops.length, 1);
assert.equal(packet.envelope.hops[0].route_reason, "stimulus-admitted-to-cop");

// Test execution events (mock handler)
const events = await runJohnRequest(request);
assert.equal(events.length, 7);
assert.equal(events[0].type, "john.run.started");
assert.equal(events[0].data.ithaca.return_target, "principal:test");
assert.equal(events[1].type, "john.packet.admitted");
assert.equal(events[1].data.admission_mode, "cop_admitted");
assert.equal(events.at(-1).type, "john.run.completed");
assert.equal(events.filter(isTerminalEvent).length, 1);

const settled = events.find(x => x.type === "john.accounting.settled");
assert.equal(settled.data.provider_cost, 0);
assert.equal(settled.data.observed_steps, 1);
assert.equal(settled.data.hops_count, 3);
assert.equal(settled.data.ithaca_returned, true);

const completed = events.find(x => x.type === "john.run.completed");
assert.equal(completed.data.result.status, "returned");
assert.equal(completed.data.result.yield.semantic_yield, "Mock handler received: hello");
assert.equal(completed.data.result.odyssey.lifecycle.isReturned, true);
assert.equal(completed.data.result.odyssey.journey.hopsCount, 3);

// Test custom Ithaca target
const customIthacaRequest = {
  ...request,
  request_id: "john-test-custom-ithaca",
  ithaca: {
    description: "Custom Incident Room (Ithaca)",
    return_target: "room:incident-42",
    response_channel: "incident-bus",
    return_conditions: ["run.completed"],
  },
};
assert.deepEqual(validateJohnRequest(customIthacaRequest), []);
const customEvents = await runJohnRequest(customIthacaRequest);
assert.equal(customEvents[0].data.ithaca.return_target, "room:incident-42");
assert.equal(customEvents.at(-1).data.result.odyssey.ithaca.return_target, "room:incident-42");

// Test Governed Step Reasoner with capability mobilization
const governedRequest = {
  version: "john.request.v1",
  request_id: "john-test-governed-001",
  principal: { id: "principal:operator" },
  mandate: { id: "mandate:research", version: "1" },
  budget: { id: "budget:ops" },
  execution_budget: {
    max_steps: 4,
    max_tool_calls: 2,
    max_subagents: 0,
    max_elapsed_ms: 10000,
    max_external_effects: 0,
  },
  exposure: "bounded",
  capability: "john.research",
  input: { prompt: "Explain FractaVolta architecture" },
  handler: {
    id: "governed.step_reasoner",
    kind: "governed_reasoner",
    allowed_capabilities: ["corpus.search"],
  },
};

assert.deepEqual(validateJohnRequest(governedRequest), []);

let searchCalled = 0;
const capabilities = [
  {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 2,
    execute: async ({ query }) => {
      searchCalled += 1;
      return { excerpts: [`evidence found for: ${query}`] };
    },
  },
];

const mockReasoner = {
  nextStep: async (state) => {
    if (!state.observations.length) {
      return {
        kind: "capability_call",
        capability: "corpus.search",
        input: { query: "FractaVolta" },
      };
    }
    const evidence = state.observations[0].value.excerpts[0];
    return {
      kind: "answer",
      answer: `Synthesis based on ${evidence}`,
    };
  },
};

const governedEvents = await runJohnRequest(governedRequest, {
  capabilities,
  reasoner: mockReasoner,
});

assert.equal(searchCalled, 1);
assert.equal(governedEvents.length, 9);
assert.equal(governedEvents[0].type, "john.run.started");
assert.equal(governedEvents[1].type, "john.packet.admitted");
assert.equal(governedEvents[2].type, "john.capability.resolved");
assert.equal(governedEvents[3].type, "john.handler.started");

const toolReq = governedEvents.find(x => x.type === "john.tool.requested");
assert.ok(toolReq, "john.tool.requested should be emitted");
assert.equal(toolReq.data.capability, "corpus.search");

const toolReceipt = governedEvents.find(x => x.type === "john.tool.receipt");
assert.ok(toolReceipt, "john.tool.receipt should be emitted");
assert.equal(toolReceipt.data.status, "completed");

const delta = governedEvents.find(x => x.type === "john.assistant.delta");
assert.ok(delta, "john.assistant.delta should be emitted");
assert.equal(delta.data.delta, "Synthesis based on evidence found for: FractaVolta");

const governedSettled = governedEvents.find(x => x.type === "john.accounting.settled");
assert.equal(governedSettled.data.observed_steps, 2);
assert.equal(governedSettled.data.tool_calls_count, 1);
assert.equal(governedSettled.data.provider_cost, 2); // 2 cost units from corpus.search

const governedCompleted = governedEvents.find(x => x.type === "john.run.completed");
assert.equal(governedCompleted.data.result.status, "returned");
assert.equal(governedCompleted.data.result.yield.semantic_yield, "Synthesis based on evidence found for: FractaVolta");
assert.equal(governedCompleted.data.result.odyssey.lifecycle.isReturned, true);
assert.equal(governedCompleted.data.result.odyssey.journey.hopsCount, 3);

// Test Invalid Request
const invalid = await runJohnRequest({ version: "wrong" });
assert.equal(invalid.length, 1);
assert.equal(invalid[0].type, "john.run.failed");
assert.equal(isTerminalEvent(invalid[0]), true);

// Test CLI Execution with temporary file
const dir = mkdtempSync(path.join(os.tmpdir(), "john-test-"));
try {
  const file = path.join(dir, "request.json");
  writeFileSync(file, JSON.stringify(customIthacaRequest), "utf8");
  const run = spawnSync(process.execPath, ["scripts/john.js", "run", "--request", file, "--format", "ndjson"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.trim().split("\n").map(JSON.parse);
  assert.equal(lines.length, 7);
  assert.equal(lines.at(-1).type, "john.run.completed");
  assert.equal(lines.filter(isTerminalEvent).length, 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(JSON.stringify({ ok: true, test: "john", governed_reasoner_tested: true }, null, 2));


