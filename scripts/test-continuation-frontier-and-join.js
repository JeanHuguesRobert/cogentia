#!/usr/bin/env node
/**
 * Test Suite: AND Choice Point & Join Convergence (F2b).
 *
 * Validates:
 * 1. Opening AND Choice Points (decomposition of parent objective into sub-branches).
 * 2. Sibling Independence: In an AND Choice Point, success of branch A does NOT obsolete branch B (unlike OR).
 * 3. Partial progress tracking: Choice Point reports status "in_progress" when some branches are satisfied.
 * 4. Failure blocking: If any mandatory sub-branch exhausts, AND choice point becomes "blocked" without erasing completed residue.
 * 5. Full Join Convergence: When all sub-branches complete, Choice Point transitions to "converged", providing jointResults.
 * 6. Durable Cross-Process AND Convergence: Sub-tasks executed across process death (P1, P2), joined and synthesized by P3.
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
  createFactLog,
  executeFundedBranch,
  openAndChoicePoint,
  projectFrontier,
} from "./lib/continuation-frontier-f2a.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const here = path.dirname(fileURLToPath(import.meta.url));

const frontierModuleUrl = pathToFileURL(path.resolve(here, "lib/continuation-frontier-f2a.js")).href;

// -----------------------------------------------------------------------------
// Test 1: Opening an AND Choice Point
// -----------------------------------------------------------------------------
test("1 — Open AND Choice Point: initializes with mode 'AND', status 'open', converged: false", () => {
  const log = createFactLog();
  const frontier = openAndChoicePoint(log, {
    id: "and-cp-1",
    parentRef: "parent-task-1",
    branches: [
      { id: "subtask-1", title: "Subtask 1" },
      { id: "subtask-2", title: "Subtask 2" },
    ],
  });

  assert.equal(frontier.choicePoints.length, 1);
  const cp = frontier.choicePoints[0];
  assert.equal(cp.mode, "AND");
  assert.equal(cp.status, "open");
  assert.equal(cp.converged, false);
  assert.equal(cp.resolvedBy, null);
  assert.equal(cp.branches.length, 2);
  assert.equal(cp.branches[0].viability, "live");
  assert.equal(cp.branches[1].viability, "live");
});

// -----------------------------------------------------------------------------
// Test 2: Sibling Independence: Success of Branch 1 does NOT obsolete Branch 2
// -----------------------------------------------------------------------------
test("2 — Sibling Independence: success of Branch 1 satisfies Branch 1, Branch 2 remains live and runnable", async () => {
  const log = createFactLog();
  openAndChoicePoint(log, {
    id: "and-cp-2",
    parentRef: "parent-task-2",
    branches: [
      { id: "subtask-1", title: "Subtask 1" },
      { id: "subtask-2", title: "Subtask 2" },
    ],
  });

  allocateExplicit(log, { choicePointId: "and-cp-2", fund: "subtask-1" });

  const { frontier: f1 } = await executeFundedBranch(log, {
    continuationRef: "subtask-1",
    execute: async () => ({ ok: true, answer: "Subtask 1 resolved successfully", costUnits: 1 }),
  });

  const cp = f1.choicePoints[0];
  assert.equal(cp.status, "in_progress");
  assert.equal(cp.converged, false);

  const b1 = cp.branches.find((b) => b.continuationRef === "subtask-1");
  const b2 = cp.branches.find((b) => b.continuationRef === "subtask-2");

  assert.equal(b1.viability, "satisfied");
  assert.equal(b1.result, "Subtask 1 resolved successfully");

  // CRITICAL: Unlike OR, b2 must NOT be marked obsolete!
  assert.equal(b2.viability, "live");
  assert.equal(b2.readiness, "runnable");
  assert.equal(b2.allocation, "unfunded");
});

// -----------------------------------------------------------------------------
// Test 3: Full Join Convergence upon all branches satisfied
// -----------------------------------------------------------------------------
test("3 — Full Join Convergence: when both branches complete, choice point converges with joinResults", async () => {
  const log = createFactLog();
  openAndChoicePoint(log, {
    id: "and-cp-3",
    parentRef: "parent-task-3",
    branches: [
      { id: "subtask-1", title: "Subtask 1" },
      { id: "subtask-2", title: "Subtask 2" },
    ],
  });

  // Execute Subtask 1
  allocateExplicit(log, { choicePointId: "and-cp-3", fund: "subtask-1" });
  await executeFundedBranch(log, {
    continuationRef: "subtask-1",
    execute: async () => ({ ok: true, answer: "Evidence Part A", costUnits: 1 }),
  });

  // Execute Subtask 2
  allocateExplicit(log, { choicePointId: "and-cp-3", fund: "subtask-2" });
  const { frontier: fFinal } = await executeFundedBranch(log, {
    continuationRef: "subtask-2",
    execute: async () => ({ ok: true, answer: "Evidence Part B", costUnits: 1 }),
  });

  const cp = fFinal.choicePoints[0];
  assert.equal(cp.status, "converged");
  assert.equal(cp.converged, true);
  assert.deepEqual(cp.resolvedBy, ["subtask-1", "subtask-2"]);
  assert.equal(cp.joinResults["subtask-1"], "Evidence Part A");
  assert.equal(cp.joinResults["subtask-2"], "Evidence Part B");
});

// -----------------------------------------------------------------------------
// Test 4: Blocking upon branch failure in AND topology
// -----------------------------------------------------------------------------
test("4 — Failure Blocking: failure of a sub-branch blocks the AND choice point without destroying residue", async () => {
  const log = createFactLog();
  openAndChoicePoint(log, {
    id: "and-cp-4",
    parentRef: "parent-task-4",
    branches: [
      { id: "subtask-1", title: "Subtask 1" },
      { id: "subtask-2", title: "Subtask 2" },
    ],
  });

  // Subtask 1 succeeds
  allocateExplicit(log, { choicePointId: "and-cp-4", fund: "subtask-1" });
  await executeFundedBranch(log, {
    continuationRef: "subtask-1",
    execute: async () => ({ ok: true, answer: "Part 1 OK" }),
  });

  // Subtask 2 fails
  allocateExplicit(log, { choicePointId: "and-cp-4", fund: "subtask-2" });
  const { frontier: fBlocked } = await executeFundedBranch(log, {
    continuationRef: "subtask-2",
    execute: async () => ({ ok: false, stopReason: "tool_timeout" }),
  });

  const cp = fBlocked.choicePoints[0];
  assert.equal(cp.status, "blocked");
  assert.equal(cp.converged, false);

  const b1 = cp.branches.find((b) => b.continuationRef === "subtask-1");
  const b2 = cp.branches.find((b) => b.continuationRef === "subtask-2");

  assert.equal(b1.viability, "satisfied");
  assert.equal(b2.viability, "exhausted");
});

// -----------------------------------------------------------------------------
// Test 5: Durable Cross-Process AND Convergence (Process Death on P1, P2, join in P3)
// -----------------------------------------------------------------------------
test("5 — Durable Cross-Process AND Convergence: P1 executes Subtask 1 -> dies; P2 executes Subtask 2 -> dies; P3 synthesizes joined evidence", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f2b-and-durable-"));
  const logFile = path.join(tmpDir, "frontier.jsonl");

  const p1Script = path.join(tmpDir, "p1-subtask1.js");
  const p2Script = path.join(tmpDir, "p2-subtask2.js");
  const p3Script = path.join(tmpDir, "p3-synthesizer.js");

  const CP = "and-choice-kudocracy-mesh";
  const S1 = "subtask-kudocracy-weights";
  const S2 = "subtask-mesh-routing";

  // Process 1: Opens AND Choice Point, executes Subtask 1, terminates
  const p1Code = `
import { openAndChoicePoint, allocateExplicit, executeFundedBranch, createDurableFactLog } from "${frontierModuleUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");

openAndChoicePoint(log, {
  id: "${CP}",
  parentRef: "objective-synthesize-routing",
  branches: [
    { id: "${S1}", title: "Subtask 1: Kudocracy Weights" },
    { id: "${S2}", title: "Subtask 2: Mesh Routing Rules" },
  ],
});

allocateExplicit(log, { choicePointId: "${CP}", fund: "${S1}" });

await executeFundedBranch(log, {
  continuationRef: "${S1}",
  execute: async () => ({ ok: true, answer: "Kudocracy weights reflect peer-reviewed merit", costUnits: 1 }),
});

console.log(JSON.stringify({ ok: true, process: "p1" }));
process.exit(0);
`;

  // Process 2: Starts fresh, allocates Subtask 2, executes Subtask 2, terminates
  const p2Code = `
import { allocateExplicit, executeFundedBranch, createDurableFactLog, projectFrontier } from "${frontierModuleUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");
const before = projectFrontier(log.facts());
const cpBefore = before.choicePoints[0];
if (cpBefore.status !== "in_progress") {
  console.error("P2 unexpected initial status:", cpBefore);
  process.exit(1);
}

allocateExplicit(log, { choicePointId: "${CP}", fund: "${S2}" });

await executeFundedBranch(log, {
  continuationRef: "${S2}",
  execute: async () => ({ ok: true, answer: "Mesh routes packets to highest-weight peer", costUnits: 1 }),
});

console.log(JSON.stringify({ ok: true, process: "p2" }));
process.exit(0);
`;

  // Process 3: Starts fresh, verifies convergence, synthesizes joined evidence, appends final fact
  const p3Code = `
import { createDurableFactLog, projectFrontier } from "${frontierModuleUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");
const frontier = projectFrontier(log.facts());
const cp = frontier.choicePoints[0];

if (!cp.converged || cp.status !== "converged") {
  console.error("P3 expected converged status:", cp);
  process.exit(1);
}

const fact1 = cp.joinResults["${S1}"];
const fact2 = cp.joinResults["${S2}"];
const synthesized = fact1 + " AND " + fact2;

log.append("and_synthesis_completed", {
  choicePointId: "${CP}",
  synthesizedAnswer: synthesized,
});

console.log(JSON.stringify({ ok: true, process: "p3", synthesized }));
process.exit(0);
`;

  fs.writeFileSync(p1Script, p1Code, "utf8");
  fs.writeFileSync(p2Script, p2Code, "utf8");
  fs.writeFileSync(p3Script, p3Code, "utf8");

  // Run P1
  const p1Run = spawnSync(process.execPath, [p1Script], { encoding: "utf8" });
  assert.equal(p1Run.status, 0, `P1 failed: ${p1Run.stdout} ${p1Run.stderr}`);

  // Run P2
  const p2Run = spawnSync(process.execPath, [p2Script], { encoding: "utf8" });
  assert.equal(p2Run.status, 0, `P2 failed: ${p2Run.stdout} ${p2Run.stderr}`);

  // Run P3
  const p3Run = spawnSync(process.execPath, [p3Script], { encoding: "utf8" });
  assert.equal(p3Run.status, 0, `P3 failed: ${p3Run.stdout} ${p3Run.stderr}`);
  const p3Out = JSON.parse(p3Run.stdout.trim());
  assert.equal(p3Out.ok, true);
  assert.equal(
    p3Out.synthesized,
    "Kudocracy weights reflect peer-reviewed merit AND Mesh routes packets to highest-weight peer"
  );

  // Re-verify final state from disk log
  const finalLog = createDurableFactLog(logFile);
  const finalFrontier = projectFrontier(finalLog.facts());
  const finalCp = finalFrontier.choicePoints[0];

  assert.equal(finalCp.converged, true);
  assert.equal(finalCp.status, "converged");
  assert.equal(finalCp.branches[0].costUnits, 1);
  assert.equal(finalCp.branches[1].costUnits, 1);

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
console.log(`\nAll ${tests.length} AND Choice Point & Join Convergence tests passed successfully!`);
