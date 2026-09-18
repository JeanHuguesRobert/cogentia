import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  packDocumentToCapsule,
  verifyCapsule,
  unpackCapsule,
  packContinuationToCapsule,
  unpackContinuationCapsule,
  evaluatePacketClosure,
  materializeContinuation,
} from "./lib/packet-capsule.js";

console.log("Running Packet Capsule test suite...");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "capsule-test-"));
const sampleDoc = path.join(tmpDir, "sample.md");
fs.writeFileSync(sampleDoc, "# Sample Title\n\nThis is a sample document content for packet testing.\n", "utf8");

// Test 1: Pack document
const packed = packDocumentToCapsule(sampleDoc, { sourceRepo: "test-repo", relativePath: "sample.md" });
assert.equal(packed.ok, true);
assert.equal(typeof packed.packet_id, "string");
assert.equal(typeof packed.content_sha256, "string");
assert.equal(packed.source_repo, "test-repo");
console.log("  ✓ Test 1 passed: packDocumentToCapsule");

// Test 2: Verify valid capsule
const verification = verifyCapsule(packed.capsule_text);
assert.equal(verification.ok, true);
assert.equal(verification.valid_checksum, true);
assert.equal(verification.source_path, "sample.md");
console.log("  ✓ Test 2 passed: verifyCapsule with valid capsule");

// Test 3: Verify tampered capsule (corrupted checksum)
const tamperedCapsule = packed.capsule_text.replace("sample document content", "tampered document content");
const tamperedVerification = verifyCapsule(tamperedCapsule);
assert.equal(tamperedVerification.ok, false);
assert.equal(tamperedVerification.error, "checksum_mismatch");
console.log("  ✓ Test 3 passed: verifyCapsule detects tampering");

// Test 4: Unpack capsule
const unpackDir = path.join(tmpDir, "unpacked");
const unpacked = unpackCapsule(packed.capsule_text, unpackDir);
assert.equal(unpacked.ok, true);
assert.equal(unpacked.written, true);
assert.equal(fs.readFileSync(unpacked.target_path, "utf8"), fs.readFileSync(sampleDoc, "utf8"));
console.log("  ✓ Test 4 passed: unpackCapsule restores identical content");

// Test 5: Pack continuation to capsule
const sampleContinuation = {
  protocol: "cogentia.continuation.v2",
  id: "cont-test-1",
  status: "suspended",
  kind: "step_budget_slice",
  question: "How do Kudos affect Cognitive Packet routing?",
  handlerProfile: {
    requiredCapabilities: ["corpus.search"],
    requiredEventHandlers: ["orientation.required"],
  },
  dependencies: {
    files: [],
  },
  causalFrontier: {
    steps: [{ sequence: 1, step: { kind: "capability_call" }, result: { status: "completed" } }],
    observations: [{ type: "capability_result", ok: true }],
  },
  accounting: {
    cumulativeCostUnits: 1,
    cumulativeCapabilityCalls: 1,
    remainingBudget: { maxSteps: 3, maxCostUnits: 9 },
  },
  payload: { input: { text: "How do Kudos affect Cognitive Packet routing?" } },
  closure: { state: "closed", admissibleEnvironment: "cogentia-v3-runtime" },
};

const contPacked = packContinuationToCapsule(sampleContinuation);
assert.equal(contPacked.ok, true);
assert.equal(typeof contPacked.capsule_text, "string");
console.log("  ✓ Test 5 passed: packContinuationToCapsule");

// Test 6: Unpack continuation capsule
const contUnpacked = unpackContinuationCapsule(contPacked.capsule_text);
assert.equal(contUnpacked.ok, true);
assert.equal(contUnpacked.continuation.id, "cont-test-1");
assert.equal(contUnpacked.continuation.causalFrontier.steps.length, 1);
console.log("  ✓ Test 6 passed: unpackContinuationCapsule");

// Test 7: evaluatePacketClosure with compatible handler & environment
const validHandler = {
  id: "handler-valid",
  capabilities: ["corpus.search", "extra.tool"],
  requiredEventHandlers: { "orientation.required": async () => {} },
};
const validEnv = {
  id: "env-valid",
  runtime: "cogentia-v3-runtime",
  supportedProtocols: ["cogentia.continuation.v2"],
};
const closureValid = evaluatePacketClosure(contPacked.capsule_text, validHandler, validEnv);
assert.equal(closureValid.ok, true);
assert.equal(closureValid.closed, true);
assert.equal(closureValid.evaluated_closure.handler_compatible, true);
assert.equal(closureValid.evaluated_closure.environment_satisfied, true);
console.log("  ✓ Test 7 passed: evaluatePacketClosure Closed(p,h,E)=true");

// Test 8: evaluatePacketClosure with incompatible handler (missing capability)
const invalidHandler = {
  id: "handler-invalid",
  capabilities: [], // Missing corpus.search!
  requiredEventHandlers: {},
};
const closureInvalid = evaluatePacketClosure(contPacked.capsule_text, invalidHandler, validEnv);
assert.equal(closureInvalid.ok, false);
assert.equal(closureInvalid.closed, false);
assert.equal(closureInvalid.evaluated_closure.handler_compatible, false);
assert.ok(closureInvalid.missing.capabilities.includes("corpus.search"));
console.log("  ✓ Test 8 passed: evaluatePacketClosure rejects incompatible handler");

// Test 9: materializeContinuation
const materialized = materializeContinuation(contPacked.capsule_text, validHandler, validEnv);
assert.equal(materialized.ok, true);
assert.equal(materialized.initialState.sequence, 1);
assert.equal(materialized.initialState.costUnits, 1);
assert.equal(materialized.initialState.observations.length, 1);
console.log("  ✓ Test 9 passed: materializeContinuation produces ready execution state");

// Clean up
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log("\nAll Packet Capsule tests passed successfully!");
