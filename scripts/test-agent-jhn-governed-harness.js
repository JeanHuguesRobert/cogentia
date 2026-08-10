#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  AGENT_STEP_PROTOCOL,
  STEP_RESULT_PROTOCOL,
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const reasoner = nextStep => ({ nextStep });

function registry(overrides = {}) {
  return createCapabilityRegistry([
    { name: "corpus.search", kind: "tool", risk: "read_only", costUnits: 1, execute: overrides.search || (async ({ query }) => ({ excerpts: [`evidence:${query}`] })) },
    { name: "github.read", kind: "mcp", risk: "read_only", costUnits: 2, execute: async () => ({ issue: 18 }) },
    { name: "gmail.send", kind: "mcp", risk: "external_write", costUnits: 3, execute: overrides.send || (async () => ({ sent: true })) },
  ]);
}

test("a reasoner can mobilize an authorized capability then answer", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => state.observations.length
      ? { kind: "answer", answer: state.observations[0].value.excerpts[0] }
      : { kind: "capability_call", capability: "corpus.search", input: { query: "FractaVolta" } }),
  });
  const result = await harness.run({ text: "Explain" }, { allowedCapabilities: ["corpus.search"] });
  assert.equal(result.ok, true);
  assert.equal(result.answer, "evidence:FractaVolta");
  assert.equal(result.capabilityCalls, 1);
  assert.equal(result.steps[0].step.protocol, AGENT_STEP_PROTOCOL);
  assert.equal(result.steps[0].result.protocol, STEP_RESULT_PROTOCOL);
});

test("registration does not grant authorization", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "github.read" }),
  });
  const result = await harness.run({}, { allowedCapabilities: [] });
  assert.equal(result.observations[0].reason, "not_in_authorization_envelope");
  assert.equal(result.capabilityCalls, 0);
});

test("unknown capabilities fail closed", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "unknown.tool" }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["unknown.tool"] });
  assert.equal(result.observations[0].reason, "unknown_capability");
});

test("external writes require confirmation", async () => {
  let sends = 0;
  const harness = createGovernedHarness({
    registry: registry({ send: async () => { sends += 1; return { sent: true }; } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "gmail.send" }),
  });
  const denied = await harness.run({}, { allowedCapabilities: ["gmail.send"] });
  assert.equal(denied.observations[0].reason, "confirmation_required");
  assert.equal(sends, 0);
});

test("confirmed external writes can execute", async () => {
  let sends = 0;
  const harness = createGovernedHarness({
    registry: registry({ send: async () => { sends += 1; return { sent: true }; } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "answer", answer: "sent" } : { kind: "capability_call", capability: "gmail.send" }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["gmail.send"], confirmedCapabilities: ["gmail.send"] });
  assert.equal(result.ok, true);
  assert.equal(sends, 1);
});

test("capability-call and cost budgets stop execution", async () => {
  const harness = createGovernedHarness({ registry: registry(), reasoner: reasoner(async () => ({ kind: "capability_call", capability: "github.read" })) });
  const calls = await harness.run({}, { allowedCapabilities: ["github.read"] }, { maxCapabilityCalls: 1, maxSteps: 4 });
  assert.equal(calls.stopReason, "capability_call_budget");
  const cost = await harness.run({}, { allowedCapabilities: ["github.read"] }, { maxCostUnits: 1, maxSteps: 4 });
  assert.equal(cost.stopReason, "cost_budget");
});

test("a rejected answer becomes an observation for the next step", async () => {
  let reviews = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => ({ kind: "answer", answer: state.observations.length ? "grounded answer" : "draft" })),
    reviewer: async ({ answer }) => (++reviews === 1 ? { accepted: false, answer, issues: ["not_grounded"] } : { accepted: true, answer }),
  });
  const result = await harness.run({});
  assert.equal(result.answer, "grounded answer");
  assert.equal(result.stepCount, 2);
});

test("clarification is a terminal step requiring user input", async () => {
  const harness = createGovernedHarness({ registry: registry(), reasoner: reasoner(async () => ({ kind: "clarify", question: "Which account?" })) });
  const result = await harness.run({});
  assert.equal(result.stopReason, "clarification_required");
  assert.equal(result.question, "Which account?");
  assert.equal(result.steps[0].result.status, "requires_input");
});

test("step results never expose arguments, values, or error messages", async () => {
  const secret = "sk-private-secret";
  const harness = createGovernedHarness({
    registry: registry({ search: async () => { throw Object.assign(new Error(secret), { code: "unsafe code" }); } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "corpus.search", input: { secret } }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["corpus.search"] });
  const safeResult = JSON.stringify(result.steps.map(item => item.result));
  assert.equal(safeResult.includes(secret), false);
  assert.equal(safeResult.includes("unsafe code"), false);
  assert.equal(result.steps[0].result.status, "failed");
});

let passed = 0;
const failures = [];
for (const item of tests) {
  try { await item.run(); passed += 1; }
  catch (error) { failures.push({ name: item.name, error: error.stack || error.message }); }
}
console.log(JSON.stringify({ ok: failures.length === 0, passed, failed: failures.length, total: tests.length, real_capability_calls: 0, external_writes: 0, failures }, null, 2));
if (failures.length) process.exit(1);
