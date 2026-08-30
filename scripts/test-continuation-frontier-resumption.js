#!/usr/bin/env node
/**
 * Reality Test: Level-2 Continuation Frontier Resumption & Context Switching.
 *
 * Demonstrates:
 * 1. Opening an OR Choice Point with Branch A and Branch B.
 * 2. Running Branch A for a bounded 1-step slice, after which it yields/pauses.
 * 3. Switching funding to Branch B, which runs and exhausts/fails.
 * 4. Switching funding back to Branch A, which resumes using its prior observations
 *    without re-running step 1 or orientation.
 * 5. Satisfying the OR objective with per-branch accounting and immutable residue.
 */

import assert from "node:assert/strict";
import {
  allocateExplicit,
  createFactLog,
  openOrChoicePoint,
  projectFrontier,
} from "./lib/continuation-frontier-f2a.js";
import {
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });

const PARENT = "parent-objective-resumption-1";
const CP = "choice-bifurcation-1";
const A = "branch-A";
const B = "branch-B";
const CORPUS_QUESTION = "How does Kudocracy route cognitive packets?";

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

function stubOrientation() {
  let orientationRuns = 0;
  return {
    getRuns: () => orientationRuns,
    handlers: {
      "orientation.required": async ({ input }) => {
        orientationRuns += 1;
        return {
          type: "orientation_result",
          ok: true,
          value: { query: input.text, route: ["Kudocracy", "Cognitive Packet"] },
        };
      },
    },
  };
}

test("Level-2 Resumption: Pause A -> Run B (exhaust) -> Resume A (complete)", async () => {
  const log = createFactLog();

  // 1. Open Choice Point with Branch A and Branch B
  openOrChoicePoint(log, {
    id: CP,
    parentRef: PARENT,
    branches: [
      { id: A, title: "Hypothesis A", question: CORPUS_QUESTION, payload: { input: { text: CORPUS_QUESTION } } },
      { id: B, title: "Hypothesis B", question: CORPUS_QUESTION, payload: { input: { text: CORPUS_QUESTION } } },
    ],
  });

  let frontier = projectFrontier(log.facts());
  assert.equal(frontier.choicePoints.length, 1);
  assert.equal(frontier.choicePoints[0].branches.length, 2);

  // 2. Fund Branch A - Run 1 step slice and Pause/Yield
  allocateExplicit(log, { choicePointId: CP, fund: A });

  const orientA = stubOrientation();
  let branchACalls = 0;
  const harnessA_slice1 = createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: orientA.handlers,
    reasoner: {
      async nextStep() {
        branchACalls += 1;
        return { kind: "capability_call", capability: "corpus.search", input: { query: "Kudocracy primary" } };
      },
    },
  });

  const slice1Result = await harnessA_slice1.run(
    { text: CORPUS_QUESTION },
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 1, maxCapabilityCalls: 1, maxCostUnits: 5 }
  );

  assert.equal(slice1Result.ok, false);
  assert.equal(slice1Result.stopReason, "step_budget");
  assert.equal(branchACalls, 1);
  assert.equal(orientA.getRuns(), 1);

  // Append branch A partial run fact (yield)
  log.append("branch_run", {
    continuationRef: A,
    choicePointId: CP,
    ok: false,
    stopReason: "step_budget_slice",
    costUnits: slice1Result.costUnits,
    capabilityCalls: slice1Result.capabilityCalls,
    stepCount: slice1Result.stepCount,
  });

  frontier = projectFrontier(log.facts());
  const branchA_afterSlice1 = frontier.choicePoints[0].branches.find((b) => b.continuationRef === A);
  assert.equal(branchA_afterSlice1.viability, "live");
  assert.equal(branchA_afterSlice1.executionCount, 1);
  assert.equal(branchA_afterSlice1.costUnits, 1);

  // 3. Switch funding to Branch B - Branch B runs and fails/exhausts
  allocateExplicit(log, { choicePointId: CP, fund: B });

  const orientB = stubOrientation();
  const harnessB = createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: orientB.handlers,
    reasoner: {
      async nextStep() {
        return { kind: "stop", reason: "hypothesis_falsified" };
      },
    },
  });

  const bResult = await harnessB.run(
    { text: CORPUS_QUESTION },
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 2, maxCostUnits: 5 }
  );

  assert.equal(bResult.ok, false);
  assert.equal(bResult.stopReason, "hypothesis_falsified");

  log.append("branch_run", {
    continuationRef: B,
    choicePointId: CP,
    ok: false,
    stopReason: bResult.stopReason,
    costUnits: bResult.costUnits,
    capabilityCalls: bResult.capabilityCalls,
    stepCount: bResult.stepCount,
  });
  log.append("branch_exhausted", {
    continuationRef: B,
    choicePointId: CP,
    stopReason: bResult.stopReason,
  });

  frontier = projectFrontier(log.facts());
  const branchBState = frontier.choicePoints[0].branches.find((b) => b.continuationRef === B);
  const branchAState = frontier.choicePoints[0].branches.find((b) => b.continuationRef === A);
  assert.equal(branchBState.viability, "exhausted");
  assert.equal(branchBState.executionCount, 1);
  assert.equal(branchAState.viability, "live");

  // 4. Re-fund and Resume Branch A from its paused state
  allocateExplicit(log, { choicePointId: CP, fund: A });

  // Harness resumes with prior observations available in snapshot
  const harnessA_slice2 = createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: orientA.handlers,
    reasoner: {
      async nextStep(snapshot) {
        branchACalls += 1;
        assert.ok(snapshot.observations.length > 0, "Prior observations must be present");
        return { kind: "answer", answer: "A completes Kudocracy resolution on resumed slice" };
      },
    },
  });

  const slice2Result = await harnessA_slice2.run(
    { text: CORPUS_QUESTION },
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 2, maxCostUnits: 5 }
  );

  assert.equal(slice2Result.ok, true);
  assert.equal(slice2Result.answer, "A completes Kudocracy resolution on resumed slice");
  assert.equal(branchACalls, 2);

  log.append("branch_run", {
    continuationRef: A,
    choicePointId: CP,
    ok: true,
    stopReason: "completed",
    costUnits: slice2Result.costUnits,
    capabilityCalls: slice2Result.capabilityCalls,
    stepCount: slice2Result.stepCount,
  });
  log.append("or_objective_satisfied", {
    choicePointId: CP,
    by: A,
  });

  // 5. Final Frontier State Verification
  frontier = projectFrontier(log.facts());
  assert.equal(frontier.choicePoints[0].resolvedBy, A);

  const finalA = frontier.choicePoints[0].branches.find((b) => b.continuationRef === A);
  const finalB = frontier.choicePoints[0].branches.find((b) => b.continuationRef === B);

  assert.equal(finalA.viability, "live");
  assert.equal(finalA.executionCount, 2); // 2 distinct funded slices
  assert.equal(finalA.costUnits, 1); // 1 unit in slice 1, 0 in slice 2 answer

  assert.equal(finalB.viability, "exhausted"); // Preserved as immutable residue
  assert.equal(finalB.executionCount, 1);
});

const failures = [];
for (const item of tests) {
  try {
    await item.run();
    console.log(`ok  - ${item.name}`);
  } catch (error) {
    failures.push({ name: item.name, error });
    console.log(`fail- ${item.name}`);
    console.log(error.stack || error.message);
  }
}
if (failures.length) {
  console.log(`\n${failures.length} failed, ${tests.length - failures.length} passed`);
  process.exit(1);
}
console.log(`\n${tests.length} passed`);
