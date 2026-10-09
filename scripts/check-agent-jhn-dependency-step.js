#!/usr/bin/env node
import assert from "node:assert/strict";
import { createCapabilityRegistry, createGovernedHarness } from "./lib/agent-jhn-whatsapp/governed-harness.js";
import { createDependencyExplorationCapability } from "./lib/agent-jhn-whatsapp/dependency-step-capability.js";

const descriptors = new Map([
  ["registry:x", [{ id: "registry:x", facets: { visibility: "public" } }]],
  ["registry:a", [{ id: "registry:a", facets: { visibility: "public" } }]],
  ["registry:b", [{ id: "registry:b", facets: { visibility: "public" } }]],
  ["registry:secret", [{ id: "registry:secret", facets: { visibility: "private" } }]],
]);
const graph = { byId: descriptors, errors: [], relations: [
  { subject: "registry:a", object: "registry:x", predicate: "depends_on" },
  { subject: "registry:b", object: "registry:a", predicate: "depends_on" },
  { subject: "registry:secret", object: "registry:x", predicate: "depends_on" },
]};
const cap = createDependencyExplorationCapability({ graphProvider: () => graph });
assert.equal(cap.risk, "read_only");
const direct = await cap.execute({ direction: "downstream", id: "registry:x" });
assert.deepEqual(direct.entries.map(e => e.id), ["registry:a", "registry:b"]);
assert.ok(!JSON.stringify(direct).includes("registry:secret"));
assert.equal((await cap.execute({ direction: "upstream", id: "registry:secret" })).status, "not_accessible");

let reasoningCalls = 0;
const harness = createGovernedHarness({
  registry: createCapabilityRegistry([cap]),
  reasoner: { async nextStep() {
    reasoningCalls++;
    if (reasoningCalls === 1) return { kind: "capability_call", capability: cap.name,
      input: { direction: "impact", id: "registry:x", change: "challenged" } };
    return { kind: "answer", answer: "Two public downstream review candidates." };
  } },
});
const run = await harness.run(
  { text: "What depends on registry:x?" },
  { allowedCapabilities: [cap.name] },
  { maxSteps: 3, maxCapabilityCalls: 1, maxCostUnits: 3 }
);
assert.equal(run.ok, true);
assert.equal(run.capabilityCalls, 1);
assert.equal(run.answer, "Two public downstream review candidates.");
assert.ok(!JSON.stringify(run).includes("registry:secret"));
const forbidden = createGovernedHarness({
  registry: createCapabilityRegistry([cap]),
  reasoner: { async nextStep() { return { kind: "capability_call", capability: cap.name,
    input: { direction: "upstream", id: "registry:a" } }; } },
});
const denied = await forbidden.run({ text: "Unauthorized dependency query" }, { allowedCapabilities: [] },
  { maxSteps: 1, maxCapabilityCalls: 1, maxCostUnits: 2 });
assert.equal(denied.capabilityCalls, 0);
console.log("ok - Agent JHN capability: governed integration, public-only, no unauthorized invocation");
