#!/usr/bin/env node
/**
 * Test Suite: Shared Sibling Evidence & Causal Fact Exchange (F2c).
 *
 * Validates:
 * 1. Publishing immutable evidence facts (`evidence_published`) on a Choice Point.
 * 2. Projection of `choicePoint.sharedEvidence` across all branches.
 * 3. Shared Orientation Deduplication: Branch B skips orientation handler execution when Branch A's verified receipt is present in sharedEvidence.
 * 4. Shared Tool Excerpts & Cost Separation: Branch B consumes facts discovered by Branch A with 0 additional cost units / capability calls.
 * 5. Durable Cross-Process Shared Evidence: P1 discovers heavy facts, writes durable log, dies; P2 reloads log and completes without re-executing tools/orientation.
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
  openOrChoicePoint,
  projectFrontier,
  publishEvidence,
} from "./lib/continuation-frontier-f2a.js";
import {
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const here = path.dirname(fileURLToPath(import.meta.url));

const frontierModuleUrl = pathToFileURL(path.resolve(here, "lib/continuation-frontier-f2a.js")).href;
const governedHarnessUrl = pathToFileURL(path.resolve(here, "lib/agent-jhn-whatsapp/governed-harness.js")).href;

// -----------------------------------------------------------------------------
// Test 1: Publishing Evidence & Projection
// -----------------------------------------------------------------------------
test("1 — Evidence Publication: records immutable facts with source lineage on Choice Point", () => {
  const log = createFactLog();
  openOrChoicePoint(log, {
    id: "cp-evidence-1",
    parentRef: "parent-obj-1",
    branches: [
      { id: "branch-A", title: "Branch A" },
      { id: "branch-B", title: "Branch B" },
    ],
  });

  publishEvidence(log, {
    choicePointId: "cp-evidence-1",
    continuationRef: "branch-A",
    kind: "corpus_excerpt",
    key: "kudocracy_definition",
    value: "Kudocracy assigns routing weight by peer-reviewed merit",
  });

  const frontier = projectFrontier(log.facts());
  const cp = frontier.choicePoints[0];

  assert.equal(cp.sharedEvidence.length, 1);
  const ev = cp.sharedEvidence[0];
  assert.equal(ev.sourceContinuationRef, "branch-A");
  assert.equal(ev.kind, "corpus_excerpt");
  assert.equal(ev.key, "kudocracy_definition");
  assert.equal(ev.value, "Kudocracy assigns routing weight by peer-reviewed merit");
});

// -----------------------------------------------------------------------------
// Test 2: Shared Orientation Deduplication
// -----------------------------------------------------------------------------
test("2 — Orientation Deduplication: Branch B skips orientation execution when Branch A's receipt is shared", async () => {
  const log = createFactLog();
  openOrChoicePoint(log, {
    id: "cp-orient-dedup",
    parentRef: "parent-obj",
    branches: [
      { id: "branch-A", title: "Branch A" },
      { id: "branch-B", title: "Branch B" },
    ],
  });

  let aOrientationRuns = 0;
  let bOrientationRuns = 0;

  const orientationHandlerA = {
    "orientation.required": async ({ input }) => {
      aOrientationRuns += 1;
      return { type: "orientation_result", ok: true, value: { route: ["Kudocracy", "Routing"] } };
    },
  };

  const orientationHandlerB = {
    "orientation.required": async () => {
      bOrientationRuns += 1;
      return { type: "orientation_result", ok: true, value: { route: ["Fallback"] } };
    },
  };

  const QUESTION = "What is the Cogentia packet routing doctrine?";

  // 1. Run Branch A
  allocateExplicit(log, { choicePointId: "cp-orient-dedup", fund: "branch-A" });
  const harnessA = createGovernedHarness({
    registry: createCapabilityRegistry([]),
    requiredEventHandlers: orientationHandlerA,
    reasoner: {
      async nextStep() {
        return { kind: "stop", reason: "hypothesis_falsified" };
      },
    },
  });

  const resultA = await harnessA.run({ text: QUESTION });
  assert.equal(aOrientationRuns, 1);

  // Publish orientation receipt to Choice Point
  const orientReceipt = resultA.requiredEventReceipts.find((r) => r.kind === "orientation.required");
  publishEvidence(log, {
    choicePointId: "cp-orient-dedup",
    continuationRef: "branch-A",
    kind: "orientation.required",
    value: orientReceipt.observation,
  });

  log.append("branch_run", {
    continuationRef: "branch-A",
    choicePointId: "cp-orient-dedup",
    ok: false,
    stopReason: "hypothesis_falsified",
  });
  log.append("branch_exhausted", {
    continuationRef: "branch-A",
    choicePointId: "cp-orient-dedup",
    stopReason: "hypothesis_falsified",
  });

  // 2. Switch to Branch B with shared evidence from Choice Point
  allocateExplicit(log, { choicePointId: "cp-orient-dedup", fund: "branch-B" });
  const frontier = projectFrontier(log.facts());
  const cp = frontier.choicePoints[0];

  const harnessB = createGovernedHarness({
    registry: createCapabilityRegistry([]),
    requiredEventHandlers: orientationHandlerB,
    sharedEvidence: cp.sharedEvidence,
    reasoner: {
      async nextStep(snapshot) {
        // Reasoner sees the shared orientation observation
        const sharedOrient = snapshot.observations.find((o) => o.kind === "orientation.required");
        assert.ok(sharedOrient, "Shared orientation observation must be present in snapshot");
        return { kind: "answer", answer: "Branch B answered using shared orientation" };
      },
    },
  });

  const resultB = await harnessB.run({ text: QUESTION });

  assert.equal(resultB.ok, true);
  assert.equal(resultB.answer, "Branch B answered using shared orientation");
  assert.equal(bOrientationRuns, 0, "Branch B must NOT re-run orientation handler!");
});

// -----------------------------------------------------------------------------
// Test 3: Shared Tool / Corpus Excerpts with Cost Separation
// -----------------------------------------------------------------------------
test("3 — Cost Separation: Branch B consumes tool excerpts discovered by Branch A with 0 cost units", async () => {
  const log = createFactLog();
  openOrChoicePoint(log, {
    id: "cp-cost-sep",
    parentRef: "parent-obj",
    branches: [
      { id: "branch-A", title: "Branch A" },
      { id: "branch-B", title: "Branch B" },
    ],
  });

  // Branch A runs search tool (billed 1 unit)
  allocateExplicit(log, { choicePointId: "cp-cost-sep", fund: "branch-A" });
  const registryA = createCapabilityRegistry([
    {
      name: "corpus.search",
      kind: "tool",
      risk: "read_only",
      costUnits: 1,
      execute: async () => ({ excerpts: ["Kudocracy packet weight = merit score * trust index"] }),
    },
  ]);

  const harnessA = createGovernedHarness({
    registry: registryA,
    reasoner: {
      async nextStep(snapshot) {
        if (snapshot.steps.length === 0) {
          return { kind: "capability_call", capability: "corpus.search", input: { query: "Kudocracy weights" } };
        }
        return { kind: "stop", reason: "hypothesis_a_unviable" };
      },
    },
  });

  const resA = await harnessA.run({ text: "How are weights computed?" }, { allowedCapabilities: ["corpus.search"] });
  assert.equal(resA.costUnits, 1);
  assert.equal(resA.capabilityCalls, 1);

  // Publish discovered excerpt to Choice Point
  const searchObs = resA.observations.find((o) => o.capability === "corpus.search");
  publishEvidence(log, {
    choicePointId: "cp-cost-sep",
    continuationRef: "branch-A",
    kind: "corpus_excerpt",
    key: "weight_formula",
    value: searchObs.value.excerpts[0],
  });

  log.append("branch_run", {
    continuationRef: "branch-A",
    choicePointId: "cp-cost-sep",
    costUnits: resA.costUnits,
    capabilityCalls: resA.capabilityCalls,
  });

  // Branch B runs with shared evidence
  allocateExplicit(log, { choicePointId: "cp-cost-sep", fund: "branch-B" });
  const frontier = projectFrontier(log.facts());
  const cp = frontier.choicePoints[0];

  let bToolCalls = 0;
  const registryB = createCapabilityRegistry([
    {
      name: "corpus.search",
      kind: "tool",
      risk: "read_only",
      costUnits: 1,
      execute: async () => {
        bToolCalls += 1;
        return { excerpts: [] };
      },
    },
  ]);

  const harnessB = createGovernedHarness({
    registry: registryB,
    sharedEvidence: cp.sharedEvidence,
    reasoner: {
      async nextStep(snapshot) {
        const shared = snapshot.sharedEvidence.find((e) => e.key === "weight_formula");
        assert.ok(shared, "Branch B must have access to shared weight formula");
        return { kind: "answer", answer: "Computed via: " + shared.value };
      },
    },
  });

  const resB = await harnessB.run({ text: "How are weights computed?" }, { allowedCapabilities: ["corpus.search"] });

  assert.equal(resB.ok, true);
  assert.equal(resB.answer, "Computed via: Kudocracy packet weight = merit score * trust index");
  assert.equal(bToolCalls, 0, "Branch B should not have executed tool call!");
  assert.equal(resB.costUnits, 0, "Branch B cost units must be 0!");
  assert.equal(resB.capabilityCalls, 0, "Branch B capability calls must be 0!");

  log.append("branch_run", {
    continuationRef: "branch-B",
    choicePointId: "cp-cost-sep",
    costUnits: resB.costUnits,
    capabilityCalls: resB.capabilityCalls,
    ok: true,
  });
  log.append("or_objective_satisfied", {
    choicePointId: "cp-cost-sep",
    by: "branch-B",
  });

  const finalFrontier = projectFrontier(log.facts());
  const finalCp = finalFrontier.choicePoints[0];

  assert.equal(finalCp.branches[0].costUnits, 1);
  assert.equal(finalCp.branches[1].costUnits, 0);
});

// -----------------------------------------------------------------------------
// Test 4: Durable Cross-Process Shared Evidence (Reality Test)
// -----------------------------------------------------------------------------
test("4 — Durable Cross-Process Shared Evidence: P1 discovers evidence -> dies; P2 resolves using shared evidence", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f2c-shared-evidence-"));
  const logFile = path.join(tmpDir, "frontier.jsonl");

  const p1Script = path.join(tmpDir, "p1-explorer.js");
  const p2Script = path.join(tmpDir, "p2-resolver.js");

  const CP = "cp-cross-process-evidence";
  const A = "branch-A";
  const B = "branch-B";

  // Process 1: Runs tool, publishes evidence to durable log, dies
  const p1Code = `
import { openOrChoicePoint, allocateExplicit, createDurableFactLog, publishEvidence } from "${frontierModuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");

openOrChoicePoint(log, {
  id: "${CP}",
  parentRef: "obj-cross-evidence",
  branches: [
    { id: "${A}", title: "Branch A" },
    { id: "${B}", title: "Branch B" },
  ],
});

allocateExplicit(log, { choicePointId: "${CP}", fund: "${A}" });

const registry = createCapabilityRegistry([
  {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    costUnits: 1,
    execute: async () => ({ excerpts: ["Mesh transport verifies SHA-256 capsule before acceptance"] }),
  },
]);

const harness = createGovernedHarness({
  registry,
  reasoner: {
    async nextStep(snapshot) {
      if (snapshot.steps.length === 0) {
        return { kind: "capability_call", capability: "corpus.search", input: { query: "Mesh verification" } };
      }
      return { kind: "stop", reason: "hypothesis_a_unviable" };
    },
  },
});

const res = await harness.run({ text: "Verify mesh protocol" }, { allowedCapabilities: ["corpus.search"] });

publishEvidence(log, {
  choicePointId: "${CP}",
  continuationRef: "${A}",
  kind: "corpus_excerpt",
  key: "mesh_verification_rule",
  value: res.observations[0].value.excerpts[0],
});

log.append("branch_run", {
  continuationRef: "${A}",
  choicePointId: "${CP}",
  costUnits: res.costUnits,
  capabilityCalls: res.capabilityCalls,
  ok: false,
});
log.append("branch_exhausted", {
  continuationRef: "${A}",
  choicePointId: "${CP}",
  stopReason: "hypothesis_a_unviable",
});

console.log(JSON.stringify({ ok: true, process: "p1" }));
process.exit(0);
`;

  // Process 2: Starts in fresh process, reads durable log, uses shared evidence, answers with 0 cost
  const p2Code = `
import { allocateExplicit, createDurableFactLog, projectFrontier } from "${frontierModuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

const log = createDurableFactLog("${logFile.replace(/\\/g, "/")}");
const frontier = projectFrontier(log.facts());
const cp = frontier.choicePoints[0];

allocateExplicit(log, { choicePointId: "${CP}", fund: "${B}" });

const harness = createGovernedHarness({
  registry: createCapabilityRegistry([]),
  sharedEvidence: cp.sharedEvidence,
  reasoner: {
    async nextStep(snapshot) {
      const evidence = snapshot.sharedEvidence.find((e) => e.key === "mesh_verification_rule");
      if (!evidence) throw new Error("Missing shared evidence in P2");
      return { kind: "answer", answer: "Resolved by P2: " + evidence.value };
    },
  },
});

const res = await harness.run({ text: "Verify mesh protocol" });

if (!res.ok || !res.answer.includes("SHA-256 capsule")) {
  console.error("P2 unexpected response:", res);
  process.exit(1);
}

log.append("branch_run", {
  continuationRef: "${B}",
  choicePointId: "${CP}",
  costUnits: res.costUnits,
  capabilityCalls: res.capabilityCalls,
  ok: true,
});
log.append("or_objective_satisfied", {
  choicePointId: "${CP}",
  by: "${B}",
});

console.log(JSON.stringify({ ok: true, process: "p2", answer: res.answer, costUnits: res.costUnits }));
process.exit(0);
`;

  fs.writeFileSync(p1Script, p1Code, "utf8");
  fs.writeFileSync(p2Script, p2Code, "utf8");

  // Run P1
  const p1Run = spawnSync(process.execPath, [p1Script], { encoding: "utf8" });
  assert.equal(p1Run.status, 0, `P1 failed: ${p1Run.stdout} ${p1Run.stderr}`);

  // Run P2
  const p2Run = spawnSync(process.execPath, [p2Script], { encoding: "utf8" });
  assert.equal(p2Run.status, 0, `P2 failed: ${p2Run.stdout} ${p2Run.stderr}`);
  const p2Out = JSON.parse(p2Run.stdout.trim());
  assert.equal(p2Out.ok, true);
  assert.equal(p2Out.costUnits, 0);
  assert.equal(p2Out.answer, "Resolved by P2: Mesh transport verifies SHA-256 capsule before acceptance");

  // Re-verify from disk fact log
  const finalLog = createDurableFactLog(logFile);
  const finalFrontier = projectFrontier(finalLog.facts());
  const finalCp = finalFrontier.choicePoints[0];

  assert.equal(finalCp.resolvedBy, B);
  assert.equal(finalCp.sharedEvidence.length, 1);
  assert.equal(finalCp.sharedEvidence[0].sourceContinuationRef, A);
  assert.equal(finalCp.branches[0].costUnits, 1);
  assert.equal(finalCp.branches[1].costUnits, 0);

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
console.log(`\nAll ${tests.length} Shared Sibling Evidence tests passed successfully!`);
