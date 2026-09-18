#!/usr/bin/env node
/**
 * test-intent-assurance.js — Tests for Issue #106 (Generic Intent Assurance)
 */

import assert from "node:assert/strict";
import { verifyDeclaredIntents } from "./lib/intent-assurance.js";

// 1. Test live repository stabilized intents
const liveReport = await verifyDeclaredIntents();
assert.ok(liveReport.ok);
assert.equal(liveReport.verdict, "INTENT_PRESERVED");
assert.equal(liveReport.failures_count, 0);
assert.ok(liveReport.active_intents >= 5);

// 2. Test detection of simulated intent failure
const failingManifest = [
  {
    id: "intent:phantom-unrealized-capability",
    title: "A phantom capability that was lost in refactor",
    status: "active",
    expected_surface: {
      file: "scripts/lib/non_existent_phantom_module.js",
      type: "module_export",
    },
  },
];
const failureReport = await verifyDeclaredIntents(failingManifest);
assert.equal(failureReport.ok, false);
assert.equal(failureReport.verdict, "UNEXPLAINED INTENT PRESERVATION FAILURE");
assert.equal(failureReport.failures[0].error_class, "UNEXPLAINED_INTENT_PRESERVATION_FAILURE");

// 3. Test intentional deprecation
const deprecatedManifest = [
  {
    id: "intent:old-v1-experimental-feature",
    title: "An old experimental feature intentionally removed",
    status: "deprecated",
    replacement_reason: "Replaced by generic continuation protocol v2 in #79",
    expected_surface: {
      file: "scripts/lib/old_file.js",
      type: "module_export",
    },
  },
];
const deprecatedReport = await verifyDeclaredIntents(deprecatedManifest);
assert.equal(deprecatedReport.ok, true);
assert.equal(deprecatedReport.verdict, "INTENT_PRESERVED");

console.log(JSON.stringify({
  ok: true,
  test: "intent_assurance_issue_106",
  live_intents_verified: liveReport.passed,
  failure_detected: true,
  deprecation_tolerated: true,
  completed: true,
}, null, 2));
