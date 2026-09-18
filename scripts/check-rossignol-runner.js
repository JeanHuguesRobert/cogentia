#!/usr/bin/env node
/**
 * Test Suite: Rossignol 24h Intelligence Watch Runner Invariants (GitHub Issue #141 / #140).
 *
 * Verifies:
 * 1. Source Ingestion, Provenance & SHA-256 Deduplication
 * 2. Cognitive Packet Capsule conformance (PACKET_CAPSULE_SCHEMA)
 * 3. Epistemic Diversity & Branch Independence (mutual_exposure: none)
 * 4. Convergence Checkpoint Non-Forced Consensus (Issue #123)
 * 5. Bounded Sleep Cycle Consolidation & Contradiction Detection (Issue #124)
 * 6. Workload Measurement Accounting Schema Conformance (Issue #140)
 * 7. Corsica Senate Campaign Thematic Coverage (27 Sept 2026)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_WATCH_FEEDS,
  computeSha256,
  triageAndDeduplicate,
  encapsulateEventToPacket,
  exploreEventIndependentBranches,
  buildConvergenceCheckpoint,
  runRossignolSleepCycle,
  createWorkloadMeasurementLog,
  project90DayEnvelopes
} from "./lib/rossignol-watch.js";

import { runRossignolPipeline } from "./rossignol-runner.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testOutputDir = path.join(root, ".cogentia", "rossignol-test");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log("==========================================================================");
  console.log(" 🧪 ROSSIGNOL RUNNER INVARIANT TEST SUITE (Issue #141 / #140 / #123)");
  console.log("==========================================================================\n");

  // Invariant 1: Ingestion & Deduplication
  await test("Invariant 1: SHA-256 deduplication and provenance integrity", () => {
    const rawItems = DEFAULT_WATCH_FEEDS.corsica;
    const duplicatedItems = [...rawItems, rawItems[0]]; // Add intentional duplicate
    
    const { candidates, duplicatesCount } = triageAndDeduplicate(duplicatedItems);
    
    assert.equal(candidates.length, rawItems.length, "Candidate count should equal unique item count");
    assert.equal(duplicatesCount, 1, "Exactly 1 duplicate should be filtered");
    for (const c of candidates) {
      assert.ok(c.content_sha256, "Each candidate must have a content_sha256 hash");
      assert.ok(c.provenance, "Each candidate must have provenance recorded");
    }
  });

  // Invariant 2: Cognitive Packet Capsule Conformance
  await test("Invariant 2: Cognitive Packet Capsule schema compliance", () => {
    const item = DEFAULT_WATCH_FEEDS.corsica[0];
    const itemWithHash = { ...item, content_sha256: computeSha256(item.content), relevance_score: 0.9 };
    const packet = encapsulateEventToPacket(itemWithHash);

    assert.equal(packet.schema, "cogentia.packet_capsule/v1");
    assert.ok(packet.packet_id.startsWith("CPKT-ROSSIGNOL-"));
    assert.equal(packet.closure.state, "closed");
    assert.ok(packet.campaign_metadata.axis);
    assert.ok(packet.campaign_metadata.target_electorate);
  });

  // Invariant 3: Epistemic Diversity & Branch Independence
  await test("Invariant 3: Branch independence and absence of mutual exposure (#123)", () => {
    const item = DEFAULT_WATCH_FEEDS.corsica[1];
    const itemWithHash = { ...item, content_sha256: computeSha256(item.content), relevance_score: 0.85 };
    const packet = encapsulateEventToPacket(itemWithHash);
    
    const exploration = exploreEventIndependentBranches(packet);

    assert.equal(exploration.branches_count, 3, "Must have exactly 3 independent perspectives");
    assert.equal(exploration.mutual_exposure, "none", "Mutual exposure must be strictly none");
    assert.equal(exploration.independent_source_lineages, true, "Lineages must be independent");
    assert.ok(exploration.branches[0].perspective.includes("Institutionnelle"));
    assert.ok(exploration.branches[1].perspective.includes("Grands Électeurs"));
    assert.ok(exploration.branches[2].perspective.includes("Souveraineté Cognitive"));
  });

  // Invariant 4: Convergence without Artificial Consensus
  await test("Invariant 4: Convergence checkpoint preserves unresolved discriminants (#123)", () => {
    const item = DEFAULT_WATCH_FEEDS.corsica[0];
    const packet = encapsulateEventToPacket({ ...item, content_sha256: computeSha256(item.content), relevance_score: 0.9 });
    const exploration = exploreEventIndependentBranches(packet);
    const convergence = buildConvergenceCheckpoint(exploration);

    assert.ok(convergence.agreements.length > 0, "Must record points of agreement");
    assert.ok(convergence.conflicts.length > 0, "Must preserve tension points");
    assert.ok(convergence.unresolved_discriminants.length > 0, "Must retain unresolved discriminants for human judgment");
    assert.ok(convergence.new_continuations.length > 0, "Must produce actionable continuations");
    assert.ok(convergence.reality_tests.length > 0, "Must produce bounded reality tests");
  });

  // Invariant 5: Bounded Sleep Cycle Consolidation
  await test("Invariant 5: Sleep cycle executes bounded consolidation and queues reviews (#124)", () => {
    const item = DEFAULT_WATCH_FEEDS.corsica[2];
    const packet = encapsulateEventToPacket({ ...item, content_sha256: computeSha256(item.content), relevance_score: 0.9 });
    const exploration = exploreEventIndependentBranches(packet);
    const convergence = buildConvergenceCheckpoint(exploration);

    const sleepResult = runRossignolSleepCycle([packet], [convergence]);

    assert.equal(sleepResult.status, "completed_bounded");
    assert.equal(sleepResult.consolidated_convergences_count, 1);
    assert.ok(sleepResult.detected_contradictions_count >= 1);
    assert.equal(sleepResult.detected_contradictions[0].mandated_human, "Jean Hugues Robert");
    assert.equal(sleepResult.queued_review_items.length, 1);
  });

  // Invariant 6: Workload Measurement Accounting Schema Conformance
  await test("Invariant 6: Workload log strictly adheres to Issue #140 schema", () => {
    const log = createWorkloadMeasurementLog("corsica", {
      input_items: 5,
      candidate_items: 5,
      packets_count: 5,
      branches_count: 15,
      source_count: 5,
      wall_time_seconds: 2.5,
      continuations_created: 5,
      reality_tests_count: 10
    }, { modelClass: "strong", modelName: "claude-3-7-sonnet" });

    const m = log.work_measurement;
    assert.equal(m.watch, "corsica");
    assert.equal(m.model_class, "strong");
    assert.equal(m.model, "claude-3-7-sonnet");
    assert.equal(m.branches, 15);
    assert.equal(m.independent_source_lineages, true);
    assert.ok(Number(m.wall_time_seconds) > 0);
    assert.ok(Number(m.gpu_seconds) > 0);
    assert.equal(m.continuation_created, true);
    assert.equal(m.reality_test_created, true);
  });

  // Invariant 7: Full End-to-End Pipeline Smoke Test
  await test("Invariant 7: Full Rossignol pipeline smoke test execution", async () => {
    const result = await runRossignolPipeline({
      smoke: true,
      watch: "all",
      modelClass: "medium",
      outputDir: testOutputDir
    });

    assert.equal(result.status, "ok");
    assert.ok(result.packets_count >= 7, "Must process both Corsica and AI feeds");
    assert.ok(result.convergences_count >= 7);
    assert.ok(fs.existsSync(result.files.workload_log));
    assert.ok(fs.existsSync(result.files.convergence));
    assert.ok(fs.existsSync(result.files.sleep_cycle));
  });

  console.log("\n==========================================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("==========================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Test runner encountered critical failure:", err);
  process.exit(1);
});
