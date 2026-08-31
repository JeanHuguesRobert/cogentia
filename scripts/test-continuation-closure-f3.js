#!/usr/bin/env node
/**
 * F3 Reality Test: Closed(p,h,E) and durable cross-process continuation.
 *
 * The emitter is a separate Node process.  It executes one bounded slice,
 * emits only a checksummed continuation capsule, then terminates.  The parent
 * process constructs a new harness and resumes exclusively from that capsule.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  evaluatePacketClosure,
  materializeContinuation,
  packContinuationToCapsule,
} from "./lib/packet-capsule.js";
import {
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const QUESTION = "Does the F3 capsule resume without the emitter's RAM?";
const FIXTURE_DEPENDENCY = "scripts/lib/packet-capsule.js";

function registry() {
  return createCapabilityRegistry([{
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    execute: async ({ query }) => ({ excerpts: [`durable-evidence:${query}`] }),
  }]);
}

function orientationHandler() {
  return {
    "orientation.required": async ({ input }) => ({
      type: "orientation_result",
      ok: true,
      value: { question: input.text, route: ["F3", "closure"] },
    }),
  };
}

function handlerProfile() {
  return {
    id: "f3-clean-handler",
    capabilities: ["corpus.search"],
    supportedEvents: ["orientation.required"],
  };
}

function environment() {
  return {
    id: "f3-clean-environment",
    baseDir: process.cwd(),
    supportedProtocols: ["cogentia.continuation.v2"],
  };
}

async function emitCapsule(targetPath) {
  const emitter = createGovernedHarness({
    registry: registry(),
    requiredEvents: ["orientation.required"],
    requiredEventHandlers: orientationHandler(),
    reasoner: {
      async nextStep() {
        return { kind: "capability_call", capability: "corpus.search", input: { query: QUESTION } };
      },
    },
  });
  const result = await emitter.run(
    { text: QUESTION },
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 1, maxCapabilityCalls: 1, maxCostUnits: 2 },
  );
  assert.equal(result.stopReason, "step_budget");

  const continuation = {
    protocol: "cogentia.continuation.v2",
    id: "f3-cross-process-continuation",
    payload: { input: { text: QUESTION } },
    closure: { state: "declared_closed", admissibleEnvironment: "f3-clean-environment", mode: "capsule" },
    handlerProfile: { requiredCapabilities: ["corpus.search"], requiredEventHandlers: ["orientation.required"] },
    dependencies: { files: [FIXTURE_DEPENDENCY] },
    causalFrontier: {
      observations: result.observations,
      steps: result.steps,
      requiredEventReceipts: result.requiredEventReceipts,
    },
    accounting: {
      cumulativeCostUnits: result.costUnits,
      cumulativeCapabilityCalls: result.capabilityCalls,
      cumulativeElapsedMs: result.latencyMs,
      remainingBudget: { maxSteps: 1, maxCostUnits: 1, maxElapsedMs: 15000, maxCapabilityCalls: 1 },
    },
  };
  const packed = packContinuationToCapsule(continuation, { packetId: continuation.id });
  fs.writeFileSync(targetPath, packed.capsule_text, "utf8");
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "f3-closure-"));
  const capsulePath = path.join(tmpDir, "continuation.capsule.md");
  try {
    const child = spawnSync(process.execPath, [process.argv[1], "--emit", capsulePath], {
      cwd: process.cwd(), encoding: "utf8",
    });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const capsule = fs.readFileSync(capsulePath, "utf8");

    // The only cross-process transport is the serialized capsule on disk.
    const closure = evaluatePacketClosure(capsule, handlerProfile(), environment());
    assert.equal(closure.closed, true);
    assert.equal(closure.evaluated_closure.integrity_valid, true);
    assert.equal(closure.evaluated_closure.handler_compatible, true);
    assert.equal(closure.evaluated_closure.environment_satisfied, true);
    assert.equal(closure.evaluated_closure.accounting_viable, true);

    const materialized = materializeContinuation(capsule, handlerProfile(), environment());
    assert.equal(materialized.ok, true);
    assert.equal(materialized.initialState.steps.length, 1);
    assert.equal(materialized.initialState.requiredEventReceipts.length, 1);

    let orientationRuns = 0;
    const resumed = createGovernedHarness({
      registry: registry(),
      initialState: materialized.initialState,
      requiredEventHandlers: {
        "orientation.required": async () => {
          orientationRuns += 1;
          return { ok: true };
        },
      },
      reasoner: {
        async nextStep(snapshot) {
          assert.equal(snapshot.observations.length, 2, "observations must come from the capsule");
          return { kind: "answer", answer: "resumed-from-durable-capsule" };
        },
      },
    });
    const resumedResult = await resumed.run(
      { text: "ignored: materialized input wins" },
      { allowedCapabilities: ["corpus.search"] },
      { maxSteps: 2, maxCapabilityCalls: 2, maxCostUnits: 2 },
    );
    assert.equal(resumedResult.ok, true);
    assert.equal(resumedResult.answer, "resumed-from-durable-capsule");
    assert.equal(orientationRuns, 0, "a discharged required event must not be re-run");
    assert.equal(resumedResult.stepCount, 2);
    assert.equal(resumedResult.costUnits, 1);

    const incompatibleHandler = evaluatePacketClosure(capsule, { id: "missing-capability", capabilities: [], supportedEvents: [] }, environment());
    assert.equal(incompatibleHandler.closed, false);
    assert.deepEqual(incompatibleHandler.missing.capabilities, ["corpus.search"]);

    const missingDependency = evaluatePacketClosure(capsule, handlerProfile(), { ...environment(), baseDir: tmpDir });
    assert.equal(missingDependency.closed, false);
    assert.deepEqual(missingDependency.missing.dependencies, [FIXTURE_DEPENDENCY]);

    const wrongEnvironment = evaluatePacketClosure(capsule, handlerProfile(), {
      ...environment(), id: "f3-incompatible-environment",
    });
    assert.equal(wrongEnvironment.closed, false);
    assert.equal(wrongEnvironment.evaluated_closure.declared_environment_compatible, false);

    const tampered = capsule.replace("durable-evidence", "forged-evidence");
    const corrupted = evaluatePacketClosure(tampered, handlerProfile(), environment());
    assert.equal(corrupted.closed, false);
    assert.equal(corrupted.checks.integrity.ok, false);

    console.log("ok - F3 Closed(p,h,E): capsule survives emitter process death and resumes in a clean handler");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (process.argv[2] === "--emit") {
  await emitCapsule(process.argv[3]);
} else {
  await main();
}
