import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { packDocumentToCapsule, verifyCapsule, unpackCapsule } from "./lib/packet-capsule.js";

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

// Clean up
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log("\nAll Packet Capsule tests passed successfully!");
