#!/usr/bin/env node
/**
 * F1 Reality Test: packet_required_events on the existing governed harness.
 * F1 DOES NOT TEST CONTINUATION CLOSURE / Closed(p,h,E).
 */
import assert from "node:assert/strict";
import {
  REQUIRED_EVENT_POLICY,
  createCapabilityRegistry,
  createGovernedHarness,
  requiredEventsForTurn,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const reasoner = (nextStep) => ({ nextStep });

function registry() {
  return createCapabilityRegistry([
    {
      name: "corpus.search",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      execute: async ({ query }) => ({ excerpts: [`evidence:${query}`] }),
    },
  ]);
}

test("classifier requires orientation for a corpus question and not for phatic thanks", () => {
  assert.deepEqual(
    requiredEventsForTurn({ text: "How do Kudos affect Cognitive Packet routing?" }),
    ["orientation.required"]
  );
  assert.deepEqual(requiredEventsForTurn({ text: "ok thanks" }), []);
});

test("greedy reasoner cannot answer before orientation.required on a corpus question", async () => {
  let nextStepCalls = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async () => {
      nextStepCalls += 1;
      return { kind: "answer", answer: "skipped orientation" };
    }),
  });
  const result = await harness.run(
    { text: "How do Kudos affect Cognitive Packet routing?" },
    {},
    { maxSteps: 4 }
  );
  assert.equal(result.ok, true);
  assert.equal(result.steps[0].result.observation.type, "required_event_discharged");
  assert.equal(result.steps[0].result.observation.kind, "orientation.required");
  assert.equal(result.steps[0].result.observation.policy, REQUIRED_EVENT_POLICY);
  assert.equal(result.steps[1].step.kind, "answer");
  assert.equal(nextStepCalls, 1);
  assert.ok(nextStepCalls === 1, "nextStep must not run until orientation is kernel-discharged");
});

test("leave-the-corpus questions discharge living_evidence before unrestricted nextStep", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async () => ({ kind: "answer", answer: "later" })),
  });
  const result = await harness.run(
    { text: "When should a Cogentia Agent leave the Corpus and perform external research?" },
    {},
    { maxSteps: 6 }
  );
  const discharged = result.steps
    .filter((row) => row.result.observation?.type === "required_event_discharged")
    .map((row) => row.result.observation.kind);
  assert.ok(discharged.includes("orientation.required"));
  assert.ok(discharged.includes("living_evidence.required"));
  const firstAnswer = result.steps.findIndex((row) => row.step.kind === "answer");
  const lastRequired = result.steps.map((row, i) => (discharged.includes(row.result.observation?.kind) ? i : -1)).filter((i) => i >= 0).pop();
  assert.ok(firstAnswer > lastRequired);
});

test("phatic utterance does not inject orientation (existing Guide-loop behaviour)", async () => {
  let nextStepCalls = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async () => {
      nextStepCalls += 1;
      return { kind: "answer", answer: "ok" };
    }),
  });
  const result = await harness.run({ text: "ok thanks" });
  assert.equal(result.ok, true);
  assert.equal(nextStepCalls, 1);
  assert.equal(result.stepCount, 1);
  assert.equal(result.steps[0].step.kind, "answer");
});

test("clarify yield is continuation-shaped and does not claim Closed(p,h,E)", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async () => ({ kind: "clarify", question: "Which account?" })),
  });
  const result = await harness.run({});
  assert.equal(result.stopReason, "clarification_required");
  assert.equal(result.continuation.protocol, "cogentia.continuation.v2");
  assert.equal(result.continuation.f1_does_not_test_continuation_closure, true);
  assert.equal(result.continuation.closed, false);
});

test("no_progress heuristic is opt-in and does not claim final liveness doctrine", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    noProgressHeuristic: true,
    reasoner: reasoner(async () => ({ kind: "capability_call", capability: "corpus.search", input: { query: "same" } })),
  });
  const result = await harness.run({}, { allowedCapabilities: ["corpus.search"] }, { maxSteps: 4, maxCapabilityCalls: 4 });
  assert.equal(result.stopReason, "no_progress");
  assert.equal(result.steps[1].result.observation.type, "no_progress_heuristic");
});

let passed = 0;
const failures = [];
for (const item of tests) {
  try {
    await item.run();
    passed += 1;
  } catch (error) {
    failures.push({ name: item.name, error: error.stack || error.message });
  }
}
console.log(JSON.stringify({ ok: failures.length === 0, passed, failed: failures.length, total: tests.length, failures }, null, 2));
if (failures.length) process.exit(1);
