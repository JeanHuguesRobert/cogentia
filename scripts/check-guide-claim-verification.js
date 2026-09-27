#!/usr/bin/env node
import assert from "node:assert/strict";
import { verifyOperationalClaims } from "./lib/guide-claim-verification.js";

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

run("flags a fabricated duration not present in the source", () => {
  const answer = "The proposal recommends six months of measurement before a monthly dashboard review.";
  const context = [{ source_id: "s1", text: "This memo describes a village energy diagram and three legislative measures." }];
  const result = verifyOperationalClaims(answer, context, []);
  assert.ok(result.unsupported_claims.length > 0, "expected at least one flagged claim");
  assert.ok(result.warnings.includes("unverified_operational_detail"));
});

run("does not flag a claim actually present in the source", () => {
  const answer = "The source specifies six months of measurement.";
  const context = [{ source_id: "s1", text: "The plan specifies six months of measurement before review." }];
  const result = verifyOperationalClaims(answer, context, []);
  assert.deepEqual(result.unsupported_claims, []);
  assert.deepEqual(result.warnings, []);
});

run("no source text at all -- nothing to verify against, fails soft", () => {
  const answer = "This will take six months and a dashboard.";
  const result = verifyOperationalClaims(answer, [], []);
  assert.deepEqual(result.unsupported_claims, []);
  assert.deepEqual(result.warnings, []);
});

run("plain answer with no operational markers is never flagged", () => {
  const answer = "The village energy proposal focuses on local generation and storage.";
  const context = [{ source_id: "s1", text: "Unrelated source text." }];
  const result = verifyOperationalClaims(answer, context, []);
  assert.deepEqual(result.unsupported_claims, []);
});

run("checks web source snippets too, not just corpus context", () => {
  const answer = "Public records show a decision gate was passed last quarter.";
  const web = [{ snippet: "Public records show a decision gate was passed last quarter." }];
  const result = verifyOperationalClaims(answer, [], web);
  assert.deepEqual(result.unsupported_claims, []);
});

if (process.exitCode) {
  console.error("\nFAILED");
  process.exit(1);
} else {
  console.log("\nAll guide-claim-verification checks passed.");
}
