#!/usr/bin/env node
/**
 * F3 Reality Test: Cognitive Packet Closure Closed(p, h, E) & Durable Cross-Process Continuation Transport.
 *
 * Implements verification for Issue #128:
 * 1. Autonomous serialization & unpack of continuation capsules (no hidden RAM state).
 * 2. Real Process Death & cross-process continuation transport (Process A executes slice 1 -> dies,
 *    Process B boots fresh with zero shared memory -> materializes continuation -> executes slice 2 -> completes).
 * 3. Formal evaluation of Closed(p, h, E) relational assertions:
 *    - Valid handler & environment -> closed: true
 *    - Incompatible handler (missing capabilities or event handlers) -> closed: false
 *    - Incompatible environment (unresolved files or unsupported protocol) -> closed: false
 *    - Tampering detection (cryptographic SHA-256 mismatch) -> closed: false
 *    - Declared closure metadata != evaluated closure validation
 *    - Budget viability check -> closed: false when exhausted
 * 4. Causal and surface accounting continuity across process death.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  evaluatePacketClosure,
  materializeContinuation,
  packContinuationToCapsule,
  unpackContinuationCapsule,
  verifyCapsule,
} from "./lib/packet-capsule.js";
import {
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const here = path.dirname(fileURLToPath(import.meta.url));
const packetCapsuleUrl = pathToFileURL(path.resolve(here, "lib/packet-capsule.js")).href;
const governedHarnessUrl = pathToFileURL(path.resolve(here, "lib/agent-jhn-whatsapp/governed-harness.js")).href;

function stubRegistry() {
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
  let runs = 0;
  return {
    getRuns: () => runs,
    handlers: {
      "orientation.required": async ({ input }) => {
        runs += 1;
        return {
          type: "orientation_result",
          ok: true,
          value: { query: input.text, route: ["Kudos", "Cognitive Packet"] },
        };
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Test 1: Autonomous serialization & payload integrity (No hidden RAM state)
// -----------------------------------------------------------------------------
test("1 — Autonomous serialization: continuation packs into self-contained capsule without RAM references", async () => {
  const orient = stubOrientation();
  let stepCalls = 0;
  const harness = createGovernedHarness({
    registry: stubRegistry(),
    requiredEventHandlers: orient.handlers,
    reasoner: {
      async nextStep() {
        stepCalls += 1;
        return {
          kind: "capability_call",
          capability: "corpus.search",
          input: { query: "Kudos routing" },
        };
      },
    },
  });

  const turnResult = await harness.run(
    { text: "How do Kudos route packets?" },
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 1, maxCostUnits: 5 }
  );

  assert.equal(turnResult.ok, false);
  assert.equal(turnResult.stopReason, "step_budget");
  assert.equal(stepCalls, 1);

  // Construct explicit continuation object
  const continuation = {
    protocol: "cogentia.continuation.v2",
    id: "cont-f3-slice1",
    status: "suspended",
    kind: "step_budget_slice",
    question: "How do Kudos route packets?",
    parentRef: "parent-objective-f3-1",
    lineage: {
      originId: "req-f3-0",
      parentRef: "parent-objective-f3-1",
      causalFrontierIndex: 1,
    },
    causalFrontier: {
      steps: turnResult.steps,
      observations: turnResult.observations,
      requiredEventReceipts: turnResult.requiredEventReceipts,
    },
    accounting: {
      cumulativeCostUnits: turnResult.costUnits,
      cumulativeCapabilityCalls: turnResult.capabilityCalls,
      remainingBudget: { maxSteps: 3, maxCostUnits: 9, maxElapsedMs: 10000 },
    },
    handlerProfile: {
      requiredCapabilities: ["corpus.search"],
      requiredEventHandlers: ["orientation.required"],
      role: "reasoner",
    },
    dependencies: {
      files: [],
      schemas: ["cogentia.continuation.v2"],
    },
    payload: { input: { text: "How do Kudos route packets?" } },
    closure: {
      state: "closed",
      admissibleEnvironment: "cogentia-v3-runtime",
      mode: "inline",
    },
  };

  const packed = packContinuationToCapsule(continuation, { sourceRepo: "cogentia" });
  assert.equal(packed.ok, true);
  assert.equal(typeof packed.capsule_text, "string");
  assert.equal(typeof packed.content_sha256, "string");

  const unpacked = unpackContinuationCapsule(packed.capsule_text);
  assert.equal(unpacked.ok, true);
  assert.equal(unpacked.continuation.id, "cont-f3-slice1");
  assert.equal(unpacked.continuation.causalFrontier.steps.length, 1);
  assert.equal(unpacked.continuation.causalFrontier.observations.length, 2);
  assert.equal(unpacked.continuation.accounting.cumulativeCostUnits, 1);
});

// -----------------------------------------------------------------------------
// Test 2: Cryptographic checksum integrity & tampering detection
// -----------------------------------------------------------------------------
test("2 — Integrity: detects corrupted or tampered continuation payload", () => {
  const continuation = {
    protocol: "cogentia.continuation.v2",
    id: "cont-f3-integrity",
    status: "suspended",
    payload: { input: { text: "Original authentic payload" } },
    handlerProfile: { requiredCapabilities: [] },
  };

  const packed = packContinuationToCapsule(continuation);
  assert.equal(verifyCapsule(packed.capsule_text).ok, true);

  // Tamper with payload
  const tampered = packed.capsule_text.replace("Original authentic payload", "Malicious modified payload");
  const tamperedVerification = verifyCapsule(tampered);
  assert.equal(tamperedVerification.ok, false);
  assert.equal(tamperedVerification.error, "checksum_mismatch");

  // Evaluate closure on tampered text
  const closure = evaluatePacketClosure(tampered);
  assert.equal(closure.ok, false);
  assert.equal(closure.closed, false);
  assert.equal(closure.checks.integrity.ok, false);
});

// -----------------------------------------------------------------------------
// Test 3: Relational closure evaluation Closed(p, h, E)
// -----------------------------------------------------------------------------
test("3 — Relational Closure: evaluates Closed(p,h,E) across valid and invalid handlers/environments", () => {
  const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), "f3-dep-test-"));
  const depFile = path.join(tmpTestDir, "policy.md");
  fs.writeFileSync(depFile, "# Policy\nDeclared policy reference.\n", "utf8");

  const continuation = {
    protocol: "cogentia.continuation.v2",
    id: "cont-f3-eval",
    status: "suspended",
    dependencies: {
      files: [depFile],
    },
    handlerProfile: {
      requiredCapabilities: ["corpus.search", "mcp.calendar"],
      requiredEventHandlers: ["orientation.required"],
    },
    accounting: {
      remainingBudget: { maxSteps: 3, maxCostUnits: 5 },
    },
    payload: { input: { text: "Evaluate closure" } },
    closure: { state: "closed", admissibleEnvironment: "cogentia-v3-runtime" },
  };

  const packed = packContinuationToCapsule(continuation);

  // 3.1: Valid handler & Valid environment
  const validHandler = {
    id: "handler-complete-1",
    capabilities: ["corpus.search", "mcp.calendar", "extra.tool"],
    requiredEventHandlers: { "orientation.required": async () => {} },
  };
  const validEnv = {
    id: "env-prod-1",
    runtime: "cogentia-v3-runtime",
    supportedProtocols: ["cogentia.continuation.v2"],
    baseDir: tmpTestDir,
  };

  const evalValid = evaluatePacketClosure(packed.capsule_text, validHandler, validEnv);
  assert.equal(evalValid.ok, true);
  assert.equal(evalValid.closed, true);
  assert.equal(evalValid.evaluated_closure.handler_compatible, true);
  assert.equal(evalValid.evaluated_closure.environment_satisfied, true);
  assert.equal(evalValid.evaluated_closure.accounting_viable, true);

  // 3.2: Declared closure vs Evaluated mismatch (claims closed in frontmatter, but handler lacks mcp.calendar)
  const partialHandler = {
    id: "handler-partial-2",
    capabilities: ["corpus.search"],
    requiredEventHandlers: { "orientation.required": async () => {} },
  };
  const evalPartial = evaluatePacketClosure(packed.capsule_text, partialHandler, validEnv);
  assert.equal(evalPartial.ok, false);
  assert.equal(evalPartial.closed, false);
  assert.equal(evalPartial.declared_closure.state, "closed");
  assert.equal(evalPartial.evaluated_closure.handler_compatible, false);
  assert.ok(evalPartial.missing.capabilities.includes("mcp.calendar"));

  // 3.3: Incompatible handler (missing required event handler)
  const noEventGenHandler = {
    id: "handler-no-events",
    capabilities: ["corpus.search", "mcp.calendar"],
    requiredEventHandlers: {},
  };
  const evalNoEvents = evaluatePacketClosure(packed.capsule_text, noEventGenHandler, validEnv);
  assert.equal(evalNoEvents.ok, false);
  assert.equal(evalNoEvents.closed, false);
  assert.ok(evalNoEvents.missing.eventHandlers.includes("orientation.required"));

  // 3.4: Incompatible environment (missing file dependency)
  const missingDepFile = path.join(tmpTestDir, "non_existent_reference.md");
  const continuationMissingDep = {
    ...continuation,
    id: "cont-f3-missing-dep",
    dependencies: { files: [missingDepFile] },
  };
  const evalMissingDep = evaluatePacketClosure(continuationMissingDep, validHandler, validEnv);
  assert.equal(evalMissingDep.ok, false);
  assert.equal(evalMissingDep.closed, false);
  assert.equal(evalMissingDep.evaluated_closure.environment_satisfied, false);
  assert.ok(evalMissingDep.missing.dependencies.includes(missingDepFile));

  // 3.5: Incompatible environment (unsupported protocol)
  const foreignEnv = {
    id: "env-foreign",
    supportedProtocols: ["legacy.continuation.v1"],
  };
  const evalForeignEnv = evaluatePacketClosure(packed.capsule_text, validHandler, foreignEnv);
  assert.equal(evalForeignEnv.ok, false);
  assert.equal(evalForeignEnv.closed, false);
  assert.equal(evalForeignEnv.evaluated_closure.protocol_compatible, false);

  // 3.6: Exhausted budget
  const exhaustedContinuation = {
    ...continuation,
    id: "cont-f3-exhausted",
    dependencies: { files: [] },
    accounting: { remainingBudget: { maxSteps: 0, maxCostUnits: 0 } },
  };
  const evalExhausted = evaluatePacketClosure(exhaustedContinuation, validHandler, validEnv);
  assert.equal(evalExhausted.ok, false);
  assert.equal(evalExhausted.closed, false);
  assert.equal(evalExhausted.evaluated_closure.accounting_viable, false);

  fs.rmSync(tmpTestDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------------
// Test 4: Real Cross-Process Transport & Process Death Resumption
// -----------------------------------------------------------------------------
test("4 — Process Death Reality Test: Process 1 yields -> dies; Process 2 materializes -> completes turn", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f3-process-death-"));
  const capsuleFile = path.join(tmpDir, "continuation-slice1.cpkt");
  const p1Script = path.join(tmpDir, "process1-emitter.js");
  const p2Script = path.join(tmpDir, "process2-receiver.js");

  const p1Code = `
import fs from "node:fs";
import path from "node:path";
import { packContinuationToCapsule } from "${packetCapsuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

const registry = createCapabilityRegistry([
  {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    execute: async ({ query }) => ({ excerpts: ["Kudos adjust routing priority weight dynamically"] }),
  },
]);

const requiredEventHandlers = {
  "orientation.required": async ({ input }) => ({
    type: "orientation_result",
    ok: true,
    value: { query: input.text, conceptual_route: ["Kudos", "Cognitive Packet"] },
  }),
};

const harness = createGovernedHarness({
  registry,
  requiredEventHandlers,
  reasoner: {
    async nextStep() {
      return { kind: "capability_call", capability: "corpus.search", input: { query: "Kudos effect on routing" } };
    },
  },
});

const result = await harness.run(
  { text: "How do Kudos affect Cognitive Packet routing?" },
  { allowedCapabilities: ["corpus.search"] },
  { maxSteps: 1, maxCostUnits: 5 }
);

if (result.ok || result.stopReason !== "step_budget") {
  console.error("P1 did not stop at step budget slice:", result);
  process.exit(1);
}

const continuation = {
  protocol: "cogentia.continuation.v2",
  id: "cont-p1-turn-1",
  status: "suspended",
  kind: "step_budget_slice",
  question: "How do Kudos affect Cognitive Packet routing?",
  parentRef: "objective-100",
  lineage: { originId: "turn-1", parentRef: "objective-100", causalFrontierIndex: 1 },
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
  payload: { input: { text: "How do Kudos affect Cognitive Packet routing?" } },
  closure: { state: "closed", admissibleEnvironment: "cogentia-v3-runtime" },
};

const packed = packContinuationToCapsule(continuation);
fs.writeFileSync("${capsuleFile.replace(/\\/g, "/")}", packed.capsule_text, "utf8");

console.log(JSON.stringify({ ok: true, process: "p1", costUnits: result.costUnits, stepCount: result.stepCount }));
process.exit(0);
`;

  const p2Code = `
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { materializeContinuation } from "${packetCapsuleUrl}";
import { createCapabilityRegistry, createGovernedHarness } from "${governedHarnessUrl}";

let p2OrientationRuns = 0;
const registry = createCapabilityRegistry([
  {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    execute: async ({ query }) => ({ excerpts: ["p2: fallback query"] }),
  },
]);

const requiredEventHandlers = {
  "orientation.required": async ({ input }) => {
    p2OrientationRuns += 1;
    return { type: "orientation_result", ok: true, value: { query: input.text } };
  },
};

const capsuleText = fs.readFileSync("${capsuleFile.replace(/\\/g, "/")}", "utf8");
const handlerProfile = {
  id: "handler-p2-node-b",
  capabilities: ["corpus.search"],
  requiredEventHandlers,
};
const environment = {
  id: "env-p2-node-b",
  runtime: "cogentia-v3-runtime",
};

const materialization = materializeContinuation(capsuleText, handlerProfile, environment);
if (!materialization.ok) {
  console.error("P2 Materialization failed:", materialization);
  process.exit(2);
}

let p2StepCalls = 0;
const harness = createGovernedHarness({
  registry,
  requiredEventHandlers,
  initialState: materialization.initialState,
  reasoner: {
    async nextStep(snapshot) {
      p2StepCalls += 1;
      const priorObservation = snapshot.observations.find((o) => o.type === "capability_result" && o.ok);
      const excerpt = priorObservation?.value?.excerpts?.[0] || "unknown";
      return { kind: "answer", answer: "Resolved by P2: " + excerpt };
    },
  },
});

const result = await harness.run(
  materialization.continuation.payload.input,
  { allowedCapabilities: ["corpus.search"] },
  { maxSteps: 2, maxCostUnits: 5 }
);

if (!result.ok || result.answer !== "Resolved by P2: Kudos adjust routing priority weight dynamically") {
  console.error("P2 execution failed to complete correctly:", result);
  process.exit(3);
}

if (p2OrientationRuns !== 0) {
  console.error("P2 incorrectly re-ran orientation:", p2OrientationRuns);
  process.exit(4);
}

console.log(JSON.stringify({
  ok: true,
  process: "p2",
  finalAnswer: result.answer,
  totalSteps: result.stepCount,
  totalCostUnits: result.costUnits,
  p2StepCalls,
  p2OrientationRuns,
}));
process.exit(0);
`;

  fs.writeFileSync(p1Script, p1Code, "utf8");
  fs.writeFileSync(p2Script, p2Code, "utf8");

  const p1Run = spawnSync(process.execPath, [p1Script], { encoding: "utf8" });
  assert.equal(p1Run.status, 0, `Process 1 failed: ${p1Run.stdout} ${p1Run.stderr}`);
  const p1Out = JSON.parse(p1Run.stdout.trim());
  assert.equal(p1Out.ok, true);
  assert.equal(p1Out.stepCount, 1);
  assert.equal(p1Out.costUnits, 1);

  assert.ok(fs.existsSync(capsuleFile), "Capsule file must exist on disk");

  const p2Run = spawnSync(process.execPath, [p2Script], { encoding: "utf8" });
  assert.equal(p2Run.status, 0, `Process 2 failed: ${p2Run.stdout} ${p2Run.stderr}`);
  const p2Out = JSON.parse(p2Run.stdout.trim());
  assert.equal(p2Out.ok, true);
  assert.equal(p2Out.totalSteps, 2);
  assert.equal(p2Out.totalCostUnits, 1);
  assert.equal(p2Out.p2StepCalls, 1);
  assert.equal(p2Out.p2OrientationRuns, 0);
  assert.equal(p2Out.finalAnswer, "Resolved by P2: Kudos adjust routing priority weight dynamically");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------------
// Test 5: Rejection of unclosed continuation across process boundary
// -----------------------------------------------------------------------------
test("5 — Inadmissible cross-process handler is rejected before execution", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f3-rejection-test-"));
  const capsuleFile = path.join(tmpDir, "continuation.cpkt");
  const pScript = path.join(tmpDir, "inadmissible-process.js");

  const continuation = {
    protocol: "cogentia.continuation.v2",
    id: "cont-inadmissible-1",
    status: "suspended",
    handlerProfile: {
      requiredCapabilities: ["corpus.search", "secret.capability"],
    },
    accounting: { remainingBudget: { maxSteps: 2, maxCostUnits: 5 } },
    payload: { input: { text: "Protected task" } },
    closure: { state: "closed", admissibleEnvironment: "cogentia-v3-runtime" },
  };

  const packed = packContinuationToCapsule(continuation);
  fs.writeFileSync(capsuleFile, packed.capsule_text, "utf8");

  const pCode = `
import fs from "node:fs";
import { materializeContinuation } from "${packetCapsuleUrl}";

const capsuleText = fs.readFileSync("${capsuleFile.replace(/\\/g, "/")}", "utf8");
const handlerProfile = {
  id: "handler-inadequate",
  capabilities: ["corpus.search"],
};
const env = { id: "env-test" };

const result = materializeContinuation(capsuleText, handlerProfile, env);
if (result.ok === false && result.error === "closure_violation" && result.evaluation.missing.capabilities.includes("secret.capability")) {
  console.log(JSON.stringify({ ok: true, rejected: true }));
  process.exit(0);
}
console.error("Did not reject as expected:", result);
process.exit(1);
`;

  fs.writeFileSync(pScript, pCode, "utf8");

  const pRun = spawnSync(process.execPath, [pScript], { encoding: "utf8" });
  assert.equal(pRun.status, 0, `Inadmissible process check failed: ${pRun.stdout} ${pRun.stderr}`);
  const out = JSON.parse(pRun.stdout.trim());
  assert.equal(out.ok, true);
  assert.equal(out.rejected, true);

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
console.log(`\nAll ${tests.length} F3 Reality Tests passed successfully!`);
