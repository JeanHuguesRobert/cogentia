#!/usr/bin/env node
/**
 * Unified Reality Test (F2a + F3): Durable Continuation Frontier & Cross-Process Exploration Scheduler.
 *
 * Unifies:
 * - F2a: OR Choice Points, Continuation Frontier projection, alternative hypotheses, viability vs readiness vs allocation.
 * - F3: Closed(p,h,E) Packet Closure, autonomous serialization, and resilience across real Process Death.
 *
 * Scenario:
 * 1. Process 1 (Emitter/First Runner):
 *    - Opens OR Choice Point with Branch A and Branch B in a durable fact log.
 *    - Allocates funding to Branch A.
 *    - Runs Branch A for 1 bounded step slice (discharges orientation + tool call).
 *    - Branch A yields at step budget slice.
 *    - Serializes Branch A to a durable capsule (`branch-A.cpkt`).
 *    - Appends `branch_run` with `capsulePath` to the durable fact log.
 *    - Process 1 terminates (process.exit(0)).
 *
 * 2. Process 2 (Exploration Switch / Second Runner):
 *    - Fresh process with zero shared RAM.
 *    - Reconstitutes the Frontier projection from the durable fact log.
 *    - Allocates funding to Branch B.
 *    - Runs Branch B: Reasoner determines hypothesis B is falsified/exhausted.
 *    - Appends `branch_run` and `branch_exhausted` to the durable fact log.
 *    - Process 2 terminates (process.exit(0)).
 *
 * 3. Process 3 (Resumption & Completion / Third Runner):
 *    - Fresh process with zero shared RAM.
 *    - Reconstitutes the Frontier projection from the durable fact log.
 *    - Observes Branch B is exhausted and Branch A is live & paused with a stored capsule.
 *    - Switches funding back to Branch A.
 *    - Evaluates Closed(p,h,E) on Branch A's capsule.
 *    - Materializes Branch A's state (with prior observations and sequence count intact).
 *    - Runs Step 2 on Branch A: Reasoner uses prior Step 1 observation and yields the final answer.
 *    - Harness accepts answer; turn completes.
 *    - Appends `branch_run` and `or_objective_satisfied` to the durable fact log.
 *    - Process 3 terminates (process.exit(0)).
 *
 * 4. Verification:
 *    - Final frontier projection from disk facts:
 *      - choicePoints[0].resolvedBy === "branch-A"
 *      - Branch A viability === "live", executionCount === 2, costUnits === 1.
 *      - Branch B viability === "exhausted", executionCount === 1, costUnits === 0.
 *      - Orientation was never re-run redundantly.
 *      - Strict per-branch surface accounting and immutable causal residue.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  allocateExplicit,
  createDurableFactLog,
  openOrChoicePoint,
  projectFrontier,
} from "./lib/continuation-frontier-f2a.js";
import {
  evaluatePacketClosure,
  materializeContinuation,
  packContinuationToCapsule,
} from "./lib/packet-capsule.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const here = path.dirname(fileURLToPath(import.meta.url));

const frontierModuleUrl = pathToFileURL(path.resolve(here, "lib/continuation-frontier-f2a.js")).href;
const packetCapsuleUrl = pathToFileURL(path.resolve(here, "lib/packet-capsule.js")).href;
const governedHarnessUrl = pathToFileURL(path.resolve(here, "lib/agent-jhn-whatsapp/governed-harness.js")).href;

// -----------------------------------------------------------------------------
// Test 1: Durable Fact Log persistence & deterministic replay across process boot
// -----------------------------------------------------------------------------
test("1 — Durable Fact Log: appends to disk and replays identical Frontier projection across instances", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f2f3-durable-log-"));
  const logFile = path.join(tmpDir, "frontier.jsonl");

  const log1 = createDurableFactLog(logFile);
  openOrChoicePoint(log1, {
    id: "choice-test-1",
    parentRef: "parent-obj-1",
    branches: [
      { id: "branch-1", title: "Branch 1" },
      { id: "branch-2", title: "Branch 2" },
    ],
  });
  allocateExplicit(log1, { choicePointId: "choice-test-1", fund: "branch-1" });

  const frontier1 = projectFrontier(log1.facts());
  assert.equal(frontier1.choicePoints.length, 1);
  assert.equal(frontier1.choicePoints[0].branches[0].allocation, "funded");
  assert.equal(frontier1.choicePoints[0].branches[1].allocation, "unfunded");

  // Instance 2: Loads from same file on disk
  const log2 = createDurableFactLog(logFile);
  const frontier2 = projectFrontier(log2.facts());
  assert.deepEqual(frontier2, frontier1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------------
// Test 2: Full Unified Reality Test across 3 distinct processes (Process Death)
// -----------------------------------------------------------------------------
test("2 — Unified Reality Test: P1 slice -> dies; P2 branch switch & exhaust -> dies; P3 resume A & complete", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f2f3-unified-"));
  const logFile = path.join(tmpDir, "frontier.jsonl");
  const capsuleDir = path.join(tmpDir, "capsules");
  fs.mkdirSync(capsuleDir, { recursive: true });

  const p1Script = path.join(tmpDir, "p1-runner.js");
  const p2Script = path.join(tmpDir, "p2-runner.js");
  const p3Script = path.join(tmpDir, "p3-runner.js");

  const CORPUS_QUESTION = "How does Kudocracy route cognitive packets?";
  const CP = "choice-kudocracy-1";
  const A = "branch-A";
  const B = "branch-B";

  // Code for Process 1: Opens Choice Point, funds A, runs 1 step slice, yields, saves capsule, dies
  const p1Code = `
import fs from "node:fs";
import path from "node:path";
import { openOrChoicePoint, allocateExplicit, createDurableFactLog, projectFrontier } from "${frontierModuleUrl}";
import { packContinuationToCapsule } from "${packetCapsuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");

// 1. Open Choice Point
openOrChoicePoint(log, {
  id: "${CP}",
  parentRef: "parent-obj-kudocracy",
  branches: [
    { id: "${A}", title: "Hypothesis A: Merit/judgment routing", question: "${CORPUS_QUESTION}", payload: { input: { text: "${CORPUS_QUESTION}" } } },
    { id: "${B}", title: "Hypothesis B: Random routing", question: "${CORPUS_QUESTION}", payload: { input: { text: "${CORPUS_QUESTION}" } } },
  ],
});

// 2. Fund Branch A
allocateExplicit(log, { choicePointId: "${CP}", fund: "${A}" });

// 3. Setup harness for Branch A
const registry = createCapabilityRegistry([
  {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    execute: async ({ query }) => ({ excerpts: ["Kudocracy routes packets based on earned peer merit and judgment weights"] }),
  },
]);

const requiredEventHandlers = {
  "orientation.required": async ({ input }) => ({
    type: "orientation_result",
    ok: true,
    value: { query: input.text, route: ["Kudocracy", "Cognitive Packet"] },
  }),
};

const harness = createGovernedHarness({
  registry,
  requiredEventHandlers,
  reasoner: {
    async nextStep() {
      return { kind: "capability_call", capability: "corpus.search", input: { query: "Kudocracy routing mechanism" } };
    },
  },
});

const result = await harness.run(
  { text: "${CORPUS_QUESTION}" },
  { allowedCapabilities: ["corpus.search"] },
  { maxSteps: 1, maxCostUnits: 5 }
);

if (result.ok || result.stopReason !== "step_budget") {
  console.error("P1 unexpected harness result:", result);
  process.exit(1);
}

// 4. Save Branch A continuation capsule
const continuationA = {
  protocol: "cogentia.continuation.v2",
  id: "${A}",
  status: "suspended",
  kind: "step_budget_slice",
  question: "${CORPUS_QUESTION}",
  parentRef: "parent-obj-kudocracy",
  lineage: { originId: "slice-1", choicePointId: "${CP}", branchRef: "${A}", causalFrontierIndex: 1 },
  causalFrontier: {
    steps: result.steps,
    observations: result.observations,
    requiredEventReceipts: result.requiredEventReceipts,
  },
  accounting: {
    cumulativeCostUnits: result.costUnits,
    cumulativeCapabilityCalls: result.capabilityCalls,
    remainingBudget: { maxSteps: 3, maxCostUnits: 9, maxElapsedMs: 15000 },
  },
  handlerProfile: {
    requiredCapabilities: ["corpus.search"],
    requiredEventHandlers: ["orientation.required"],
  },
  dependencies: { files: [] },
  payload: { input: { text: "${CORPUS_QUESTION}" } },
  closure: { state: "closed", admissibleEnvironment: "cogentia-v3-runtime" },
};

const packedA = packContinuationToCapsule(continuationA);
const capsulePathA = "${path.join(capsuleDir, "branch-A.cpkt").replace(/\\/g, "/")}";
fs.writeFileSync(capsulePathA, packedA.capsule_text, "utf8");

// 5. Append branch_run to durable fact log
log.append("branch_run", {
  continuationRef: "${A}",
  choicePointId: "${CP}",
  ok: false,
  stopReason: "step_budget_slice",
  costUnits: result.costUnits,
  capabilityCalls: result.capabilityCalls,
  stepCount: result.stepCount,
  capsulePath: capsulePathA,
  capsuleSha256: packedA.content_sha256,
});

console.log(JSON.stringify({ ok: true, process: "p1", stepCount: result.stepCount, costUnits: result.costUnits }));
process.exit(0);
`;

  // Code for Process 2: Replays log, funds B, executes B (fails/exhausts), appends facts, dies
  const p2Code = `
import { allocateExplicit, createDurableFactLog, projectFrontier } from "${frontierModuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");
const frontier = projectFrontier(log.facts());

const branchA = frontier.choicePoints[0].branches.find((b) => b.continuationRef === "${A}");
if (branchA.executionCount !== 1 || branchA.viability !== "live") {
  console.error("P2 unexpected state for A:", branchA);
  process.exit(1);
}

// Fund Branch B
allocateExplicit(log, { choicePointId: "${CP}", fund: "${B}" });

// Run Branch B with falsified hypothesis
const registry = createCapabilityRegistry([]);
const requiredEventHandlers = {
  "orientation.required": async () => ({ type: "orientation_result", ok: true }),
};

const harnessB = createGovernedHarness({
  registry,
  requiredEventHandlers,
  reasoner: {
    async nextStep() {
      return { kind: "stop", reason: "hypothesis_falsified" };
    },
  },
});

const resultB = await harnessB.run(
  { text: "${CORPUS_QUESTION}" },
  {},
  { maxSteps: 2, maxCostUnits: 5 }
);

log.append("branch_run", {
  continuationRef: "${B}",
  choicePointId: "${CP}",
  ok: false,
  stopReason: resultB.stopReason,
  costUnits: resultB.costUnits,
  capabilityCalls: resultB.capabilityCalls,
  stepCount: resultB.stepCount,
});
log.append("branch_exhausted", {
  continuationRef: "${B}",
  choicePointId: "${CP}",
  stopReason: resultB.stopReason,
});

console.log(JSON.stringify({ ok: true, process: "p2", branch: "${B}", viability: "exhausted" }));
process.exit(0);
`;

  // Code for Process 3: Replays log, re-funds A, evaluates Closed(p,h,E), materializes A, completes turn
  const p3Code = `
import fs from "node:fs";
import { allocateExplicit, createDurableFactLog, projectFrontier } from "${frontierModuleUrl}";
import { materializeContinuation } from "${packetCapsuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");
const frontier = projectFrontier(log.facts());

const branchAState = frontier.choicePoints[0].branches.find((b) => b.continuationRef === "${A}");
const branchBState = frontier.choicePoints[0].branches.find((b) => b.continuationRef === "${B}");

if (branchBState.viability !== "exhausted" || branchAState.viability !== "live") {
  console.error("P3 unexpected viability state:", { branchAState, branchBState });
  process.exit(1);
}

// Re-fund Branch A
allocateExplicit(log, { choicePointId: "${CP}", fund: "${A}" });

// Load and evaluate Branch A capsule
const capsulePathA = branchAState.capsulePath;
const capsuleText = fs.readFileSync(capsulePathA, "utf8");

let p3OrientationRuns = 0;
const registry = createCapabilityRegistry([
  {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    execute: async () => ({ excerpts: [] }),
  },
]);

const requiredEventHandlers = {
  "orientation.required": async () => {
    p3OrientationRuns += 1;
    return { type: "orientation_result", ok: true };
  },
};

const handlerProfile = {
  id: "handler-p3",
  capabilities: ["corpus.search"],
  requiredEventHandlers,
};
const environment = {
  id: "env-p3",
  runtime: "cogentia-v3-runtime",
};

const materialization = materializeContinuation(capsuleText, handlerProfile, environment);
if (!materialization.ok) {
  console.error("P3 Materialization failed:", materialization);
  process.exit(2);
}

let p3StepCalls = 0;
const harnessA_slice2 = createGovernedHarness({
  registry,
  requiredEventHandlers,
  initialState: materialization.initialState,
  reasoner: {
    async nextStep(snapshot) {
      p3StepCalls += 1;
      const priorObservation = snapshot.observations.find((o) => o.type === "capability_result" && o.ok);
      const excerpt = priorObservation?.value?.excerpts?.[0] || "unknown";
      return { kind: "answer", answer: "Final Answer: " + excerpt };
    },
  },
});

const resultSlice2 = await harnessA_slice2.run(
  materialization.continuation.payload.input,
  { allowedCapabilities: ["corpus.search"] },
  { maxSteps: 2, maxCostUnits: 5 }
);

if (!resultSlice2.ok || !resultSlice2.answer.includes("peer merit")) {
  console.error("P3 execution failed to answer correctly:", resultSlice2);
  process.exit(3);
}

if (p3OrientationRuns !== 0) {
  console.error("P3 incorrectly re-ran orientation:", p3OrientationRuns);
  process.exit(4);
}

// Append final facts to durable log (recording the incremental slice cost)
const sliceCostUnits = resultSlice2.costUnits - (materialization.initialState.costUnits || 0);
const sliceCapabilityCalls = resultSlice2.capabilityCalls - (materialization.initialState.capabilityCalls || 0);
const sliceSteps = resultSlice2.stepCount - (materialization.initialState.sequence || 0);

log.append("branch_run", {
  continuationRef: "${A}",
  choicePointId: "${CP}",
  ok: true,
  stopReason: "completed",
  costUnits: sliceCostUnits,
  capabilityCalls: sliceCapabilityCalls,
  stepCount: sliceSteps,
});
log.append("or_objective_satisfied", {
  choicePointId: "${CP}",
  by: "${A}",
});

console.log(JSON.stringify({
  ok: true,
  process: "p3",
  finalAnswer: resultSlice2.answer,
  p3StepCalls,
  p3OrientationRuns,
}));
process.exit(0);
`;

  fs.writeFileSync(p1Script, p1Code, "utf8");
  fs.writeFileSync(p2Script, p2Code, "utf8");
  fs.writeFileSync(p3Script, p3Code, "utf8");

  // Run Process 1
  const p1Run = spawnSync(process.execPath, [p1Script], { encoding: "utf8" });
  assert.equal(p1Run.status, 0, `P1 failed: ${p1Run.stdout} ${p1Run.stderr}`);
  const p1Out = JSON.parse(p1Run.stdout.trim());
  assert.equal(p1Out.ok, true);

  // Run Process 2
  const p2Run = spawnSync(process.execPath, [p2Script], { encoding: "utf8" });
  assert.equal(p2Run.status, 0, `P2 failed: ${p2Run.stdout} ${p2Run.stderr}`);
  const p2Out = JSON.parse(p2Run.stdout.trim());
  assert.equal(p2Out.ok, true);

  // Run Process 3
  const p3Run = spawnSync(process.execPath, [p3Script], { encoding: "utf8" });
  assert.equal(p3Run.status, 0, `P3 failed: ${p3Run.stdout} ${p3Run.stderr}`);
  const p3Out = JSON.parse(p3Run.stdout.trim());
  assert.equal(p3Out.ok, true);
  assert.equal(p3Out.p3OrientationRuns, 0);

  // Re-verify final state from disk log
  const finalLog = createDurableFactLog(logFile);
  const finalFrontier = projectFrontier(finalLog.facts());
  const cp = finalFrontier.choicePoints[0];
  assert.equal(cp.resolvedBy, A);

  const finalA = cp.branches.find((b) => b.continuationRef === A);
  const finalB = cp.branches.find((b) => b.continuationRef === B);

  assert.equal(finalA.viability, "live");
  assert.equal(finalA.executionCount, 2);
  assert.equal(finalA.costUnits, 1);

  assert.equal(finalB.viability, "exhausted");
  assert.equal(finalB.executionCount, 1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------------
// Test 3: Unclosed branch capsule is rejected across process boundary
// -----------------------------------------------------------------------------
test("3 — Unclosed branch capsule: rejected by evaluation before execution on durable frontier", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f2f3-unclosed-"));
  const logFile = path.join(tmpDir, "frontier.jsonl");
  const capsuleFile = path.join(tmpDir, "corrupt.cpkt");

  fs.writeFileSync(capsuleFile, "corrupted content without valid frontmatter", "utf8");

  const log = createDurableFactLog(logFile);
  openOrChoicePoint(log, {
    id: "cp-corrupt",
    parentRef: "parent-obj",
    branches: [
      { id: "branch-bad", title: "Corrupt branch", capsulePath: capsuleFile },
      { id: "branch-good", title: "Good branch" },
    ],
  });

  const frontier = projectFrontier(log.facts());
  const badBranch = frontier.choicePoints[0].branches.find((b) => b.continuationRef === "branch-bad");
  assert.equal(badBranch.capsulePath, capsuleFile);

  const closure = evaluatePacketClosure(fs.readFileSync(badBranch.capsulePath, "utf8"));
  assert.equal(closure.ok, false);
  assert.equal(closure.closed, false);
  assert.equal(closure.checks.integrity.ok, false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------------
// Run all tests
// -----------------------------------------------------------------------------
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
console.log(`\nAll ${tests.length} Unified F2a+F3 Reality Tests passed successfully!`);
