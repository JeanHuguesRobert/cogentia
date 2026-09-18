#!/usr/bin/env node
/**
 * F1.2 Reality Test: governed capability path + RequiredEvent != ReasoningStep.
 * F1.2 DOES NOT TEST CONTINUATION CLOSURE / Closed(p,h,E).
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

function registry(extra = []) {
  return createCapabilityRegistry([
    {
      name: "corpus.search",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      execute: async ({ query }) => ({ excerpts: [`evidence:${query}`] }),
    },
    ...extra,
  ]);
}

function stubOrientation(calls) {
  return {
    "orientation.required": async ({ input }) => {
      calls.orientation += 1;
      return {
        type: "orientation_result",
        ok: true,
        value: { query: input.text, conceptual_route: ["Kudos", "Cognitive Packet"] },
      };
    },
    "living_evidence.required": async () => {
      calls.living += 1;
      return { type: "living_evidence_result", ok: true, value: { note: "seam only; no web search" } };
    },
  };
}

test("classifier requires orientation for a corpus question and not for phatic thanks", () => {
  assert.deepEqual(
    requiredEventsForTurn({ text: "How do Kudos affect Cognitive Packet routing?" }),
    ["orientation.required"]
  );
  assert.deepEqual(requiredEventsForTurn({ text: "ok thanks" }), []);
});

test("greedy reasoner cannot answer before the orientation handler has run and produced a receipt", async () => {
  const calls = { orientation: 0, living: 0 };
  let nextStepCalls = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: stubOrientation(calls),
    reasoner: reasoner(async () => {
      nextStepCalls += 1;
      return { kind: "answer", answer: "skipped orientation" };
    }),
  });
  const result = await harness.run(
    { text: "How do Kudos affect Cognitive Packet routing?" },
    {},
    { maxSteps: 1 }
  );
  assert.equal(calls.orientation, 1);
  assert.equal(nextStepCalls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.requiredEventCount, 1);
  assert.equal(result.stepCount, 1);
  assert.equal(result.requiredEventReceipts[0].observation.type, "orientation_result");
  assert.equal(result.requiredEventReceipts[0].handlerType, "structural");
  assert.equal(result.requiredEventReceipts[0].observation.discharged, true);
  assert.equal(result.requiredEventReceipts[0].observation.policy, REQUIRED_EVENT_POLICY);
  assert.equal(result.steps[0].step.kind, "answer");
  assert.notEqual(result.steps[0].step.kind, "reason");
  assert.equal(result.observations[0].type, "orientation_result");
  assert.deepEqual(result.observations[0].value.conceptual_route, ["Kudos", "Cognitive Packet"]);
});

test("required orientation without a handler is not marked discharged", async () => {
  let nextStepCalls = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async () => {
      nextStepCalls += 1;
      return { kind: "answer", answer: "should not run" };
    }),
  });
  const result = await harness.run({ text: "How do Kudos affect Cognitive Packet routing?" });
  assert.equal(result.stopReason, "required_event_handler_missing");
  assert.equal(result.ok, false);
  assert.equal(nextStepCalls, 0);
  assert.equal(result.requiredEventCount, 0);
  assert.equal(result.steps.length, 0);
  assert.equal(result.requiredEventReceipts[0].observation.type, "required_event_handler_missing");
  assert.equal(result.requiredEventReceipts[0].observation.discharged, undefined);
});

test("maxSteps counts reasoning steps only; required orientation does not steal the budget", async () => {
  const calls = { orientation: 0, living: 0 };
  const harness = createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: stubOrientation(calls),
    reasoner: reasoner(async () => ({ kind: "answer", answer: "after orientation" })),
  });
  const result = await harness.run(
    { text: "How do Kudos affect Cognitive Packet routing?" },
    {},
    { maxSteps: 1 }
  );
  assert.equal(calls.orientation, 1);
  assert.equal(result.ok, true);
  assert.equal(result.answer, "after orientation");
  assert.equal(result.stepCount, 1);
  assert.equal(result.requiredEventCount, 1);
});

test("leave-the-corpus questions run living_evidence handler before nextStep", async () => {
  const calls = { orientation: 0, living: 0 };
  const harness = createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: stubOrientation(calls),
    reasoner: reasoner(async () => ({ kind: "answer", answer: "later" })),
  });
  const result = await harness.run(
    { text: "When should a Cogentia Agent leave the Corpus and perform external research?" },
    {},
    { maxSteps: 1 }
  );
  assert.equal(calls.orientation, 1);
  assert.equal(calls.living, 1);
  assert.equal(result.requiredEventCount, 2);
  assert.equal(result.steps[0].step.kind, "answer");
  assert.equal(result.requiredEventReceipts[0].observation.type, "orientation_result");
  assert.equal(result.requiredEventReceipts[1].observation.type, "living_evidence_result");
});

test("phatic utterance does not inject orientation", async () => {
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
  assert.equal(result.requiredEventCount, 0);
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

test("registered corpus.orient may execute orientation when authorized; registration is not authority", async () => {
  let orientCalls = 0;
  const harness = createGovernedHarness({
    registry: registry([
      {
        name: "corpus.orient",
        kind: "tool",
        risk: "read_only",
        resultVisibility: "reasoner",
        costUnits: 1,
        execute: async ({ query }) => {
          orientCalls += 1;
          return { schema: "cogentia.orientation.v1", query, conceptual_route: ["Kudos"] };
        },
      },
    ]),
    reasoner: reasoner(async () => ({ kind: "answer", answer: "done" })),
  });
  const denied = await harness.run({ text: "How do Kudos affect Cognitive Packet routing?" }, { allowedCapabilities: [] });
  assert.equal(denied.stopReason, "required_event_failed");
  assert.equal(orientCalls, 0);

  const allowed = await harness.run(
    { text: "How do Kudos affect Cognitive Packet routing?" },
    { allowedCapabilities: ["corpus.orient"] },
    { maxSteps: 1 }
  );
  assert.equal(orientCalls, 1);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.capabilityCalls, 1);
  assert.equal(allowed.costUnits, 1);
  assert.equal(allowed.observations[0].type, "orientation_result");
  assert.equal(allowed.requiredEventReceipts[0].handlerType, "capability");
});

test("kernel corpus.orient uses the same capability budgets as reasoner calls", async () => {
  let orientCalls = 0;
  const cap = {
    name: "corpus.orient",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    execute: async () => {
      orientCalls += 1;
      return { conceptual_route: ["Kudos"] };
    },
  };
  const greedy = reasoner(async () => ({ kind: "answer", answer: "done" }));
  const text = "How do Kudos affect Cognitive Packet routing?";

  const noCalls = await createGovernedHarness({
    registry: registry([cap]),
    reasoner: greedy,
  }).run({ text }, { allowedCapabilities: ["corpus.orient"] }, { maxSteps: 1, maxCapabilityCalls: 0 });
  assert.equal(noCalls.stopReason, "capability_call_budget");
  assert.equal(orientCalls, 0);

  const noCost = await createGovernedHarness({
    registry: registry([cap]),
    reasoner: greedy,
  }).run({ text }, { allowedCapabilities: ["corpus.orient"] }, { maxSteps: 1, maxCostUnits: 0 });
  assert.equal(noCost.stopReason, "cost_budget");
  assert.equal(orientCalls, 0);
});

test("capability-backed required-event descriptor still goes through governance", async () => {
  let orientCalls = 0;
  const harness = createGovernedHarness({
    registry: registry([
      {
        name: "corpus.orient",
        kind: "tool",
        risk: "read_only",
        resultVisibility: "reasoner",
        costUnits: 1,
        execute: async () => {
          orientCalls += 1;
          return { conceptual_route: ["Kudos"] };
        },
      },
    ]),
    requiredEventHandlers: {
      "orientation.required": { type: "capability", capability: "corpus.orient" },
    },
    reasoner: reasoner(async () => ({ kind: "answer", answer: "done" })),
  });
  const denied = await harness.run(
    { text: "How do Kudos affect Cognitive Packet routing?" },
    { allowedCapabilities: [] }
  );
  assert.equal(denied.stopReason, "required_event_failed");
  assert.equal(orientCalls, 0);
});

test("no_progress heuristic remains opt-in and is not final liveness doctrine", async () => {
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
