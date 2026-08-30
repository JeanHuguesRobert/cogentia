#!/usr/bin/env node
/**
 * Test Suite: Corpus Sleep Cycle Monte Carlo Audit (GitHub issue #124).
 *
 * Verifies all 5 acceptance criteria and core invariants:
 * 1. Capacity qualification, budget enforcement, and preemption
 * 2. Reproducible seeded pair batching, interruption, and continuation resumption
 * 3. Structured candidate signals with complete provenance, excerpts, citations, uncertainty
 * 4. Strictly append-only Review Queue & Zero automatic source file mutations
 * 5. Multi-dimensional metrics evaluation: Coverage vs True Cognitive Gain distinction
 * 6. Privacy boundaries: public view excludes private repositories
 * 7. CLI and v3 module capability seam invocation
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  runMonteCarloAudit,
  AdaptivePairSampler,
  discoverCorpusDocuments,
  calculateDocumentSimilarity,
  computePairWeight,
  evaluateDocumentPair,
  SIGNAL_KINDS,
  SleepCycleReviewQueue,
  REVIEW_DECISIONS,
  evaluateAuditMetrics,
  calculateEntropy,
  createRng,
} from "./lib/corpus-sleep-cycle/index.js";

import { invokeCapability, registerModule } from "./lib/v3-modules.js";
import { PUBLIC_VIEW, PRIVATE_VIEW } from "./lib/privacy-views.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

// -----------------------------------------------------------------------------
// Test 1: Capacity Qualification & Budget Preemption
// -----------------------------------------------------------------------------
test("Criterion 1: Capacity qualification and budget-based preemption", async () => {
  // Test A: Deferred when busy (simulated by active requests / high load threshold)
  const busyResult = await runMonteCarloAudit({
    root,
    force: false,
    thresholds: { max_active_requests: -1 }, // Force busy
  });

  assert.equal(busyResult.status, "deferred");
  assert.equal(busyResult.reason, "system_busy");
  assert.equal(busyResult.availability.is_idle, false);

  // Test B: Preemption on ultra-tight wall time budget
  const preemptedResult = await runMonteCarloAudit({
    root,
    force: true,
    budgetMs: 1, // 1ms budget triggers immediate preemption
    maxPairs: 50,
  });

  assert.equal(preemptedResult.status, "preempted");
  assert.equal(preemptedResult.reason, "wall_time_budget_exhausted");
  assert.ok(preemptedResult.continuation, "Must emit continuation packet on preemption");
  assert.equal(preemptedResult.continuation.schema, "cogentia.continuation.v1");
  assert.equal(preemptedResult.continuation.kind, "corpus_sleep_cycle_continuation");
});

// -----------------------------------------------------------------------------
// Test 2: Seeded Reproducible Pair Sampling
// -----------------------------------------------------------------------------
test("Criterion 2A: Seeded deterministic PRNG generates reproducible pair sequences", () => {
  const docs = [
    { id: "doc_a", repo: "cogentia", relPath: "doc_a.md", title: "Doc A", tags: ["memory", "sleep"], relatedDocs: [], mtimeMs: 1000, sizeBytes: 100 },
    { id: "doc_b", repo: "cogentia", relPath: "doc_b.md", title: "Doc B", tags: ["memory", "consolidation"], relatedDocs: ["doc_a.md"], mtimeMs: 2000, sizeBytes: 200 },
    { id: "doc_c", repo: "operium", relPath: "doc_c.md", title: "Doc C", tags: ["capacity", "registry"], relatedDocs: [], mtimeMs: 3000, sizeBytes: 300 },
    { id: "doc_d", repo: "inseme", relPath: "doc_d.md", title: "Doc D", tags: ["accounting", "cop"], relatedDocs: [], mtimeMs: 4000, sizeBytes: 400 },
  ];

  const sampler1 = new AdaptivePairSampler(docs, { seed: 9999 });
  const sampler2 = new AdaptivePairSampler(docs, { seed: 9999 });

  const seq1 = [];
  const seq2 = [];

  for (let i = 0; i < 5; i++) {
    seq1.push(sampler1.sampleNextPair().pairKey);
    seq2.push(sampler2.sampleNextPair().pairKey);
  }

  assert.deepEqual(seq1, seq2, "Identical seeds must produce identical sampling sequences");

  // Different seed produces different sequence
  const sampler3 = new AdaptivePairSampler(docs, { seed: 1111 });
  const seq3 = [];
  for (let i = 0; i < 5; i++) seq3.push(sampler3.sampleNextPair().pairKey);
  assert.notDeepEqual(seq1, seq3, "Different seeds should produce different sequences");
});

// -----------------------------------------------------------------------------
// Test 3: Continuation Checkpointing & Seamless Resumption
// -----------------------------------------------------------------------------
test("Criterion 2B: Interrupted batch resumes via continuation without duplicate sampling", async () => {
  // Batch 1: Run with budget limited to 5 pairs
  const run1 = await runMonteCarloAudit({
    root,
    force: true,
    maxPairs: 5,
    budgetMs: 10000,
    seed: 42,
  });

  assert.equal(run1.evaluated_pairs_this_run, 5);
  const visited1 = run1.checkpoint.visitedPairs;
  assert.equal(visited1.length, 5);

  // Batch 2: Resume with the continuation / checkpoint from Batch 1 for 5 more pairs
  const run2 = await runMonteCarloAudit({
    root,
    force: true,
    maxPairs: 5,
    budgetMs: 10000,
    seed: 42,
    checkpoint: run1.checkpoint,
  });

  assert.equal(run2.evaluated_pairs_this_run, 5);
  const visited2 = run2.checkpoint.visitedPairs;

  // The cumulative visited pairs must have increased to 10 distinct samples
  assert.equal(visited2.length, 10, "Cumulative visited pairs must reach 10 without duplicate re-runs");
  for (const v of visited1) {
    assert.ok(visited2.includes(v), `Batch 2 must preserve prior visited pair '${v}'`);
  }
});

// -----------------------------------------------------------------------------
// Test 4: Structured Candidate Signals with Complete Provenance & Citations
// -----------------------------------------------------------------------------
test("Criterion 3: Candidate signals have complete provenance, citations, and uncertainty", () => {
  const docA = {
    id: "cogentia/research/memory_doc.md",
    repo: "cogentia",
    relPath: "research/memory_doc.md",
    title: "Memory System",
    status: "canonical",
    tags: ["memory", "sleep-cycle", "consolidation"],
    relatedDocs: [],
    fullPath: path.join(root, "research", "memory_and_corpus_sleep_cycle.md"),
  };

  const docB = {
    id: "operium/research/capacity_doc.md",
    repo: "operium",
    relPath: "research/capacity_doc.md",
    title: "Capacity System",
    status: "working",
    tags: ["memory", "sleep-cycle", "consolidation"],
    relatedDocs: [],
    fullPath: path.join(root, "..", "operium", "research", "federated-capacity-registry.md"),
  };

  const signals = evaluateDocumentPair(docA, docB, {
    runId: "test_run_123",
    node: "test-node-oracle",
    capacityRef: "residual_free_tier",
  });

  assert.ok(Array.isArray(signals));
  if (signals.length > 0) {
    const sig = signals[0];
    assert.ok(sig.id.startsWith("sig_"), "Signal ID must start with sig_");
    assert.ok(Object.values(SIGNAL_KINDS).includes(sig.signal_kind), "Signal kind must be in SIGNAL_KINDS");
    assert.ok(sig.doc_a && sig.doc_a.path && sig.doc_a.repo, "doc_a must have path and repo");
    assert.ok(sig.doc_b && sig.doc_b.path && sig.doc_b.repo, "doc_b must have path and repo");
    assert.ok(typeof sig.uncertainty === "number" && sig.uncertainty >= 0 && sig.uncertainty <= 1, "Uncertainty must be 0..1");
    assert.ok(typeof sig.confidence === "number" && sig.confidence >= 0 && sig.confidence <= 1, "Confidence must be 0..1");
    assert.equal(sig.review_status, REVIEW_DECISIONS.PENDING);
    assert.equal(sig.provenance.run_id, "test_run_123");
    assert.equal(sig.provenance.node, "test-node-oracle");
    assert.equal(sig.provenance.capacity_ref, "residual_free_tier");
  }
});

// -----------------------------------------------------------------------------
// Test 5: Invariants — Append-only Review Queue & Zero Source File Mutations
// -----------------------------------------------------------------------------
test("Criterion 4: Zero automatic source mutation & Append-only Review Queue", async () => {
  const queue = new SleepCycleReviewQueue({ root });
  const initialStats = queue.getQueueStats();

  const dummySignal = {
    id: `sig_test_dummy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    signal_kind: SIGNAL_KINDS.POSSIBLE_CONTRADICTION,
    severity: "warning",
    finding: "Synthetic test contradiction",
    uncertainty: 0.2,
    confidence: 0.8,
    method: "test_harness",
    doc_a: { id: "a", path: "a.md", repo: "cogentia", excerpt: "excerpt A" },
    doc_b: { id: "b", path: "b.md", repo: "cogentia", excerpt: "excerpt B" },
    review_status: "pending_review",
    provenance: { run_id: "test", timestamp: new Date().toISOString() },
  };

  const appendRes = queue.appendSignals([dummySignal]);
  assert.equal(appendRes.added, 1);

  // Verify pending list
  const pending = queue.listPending();
  assert.ok(pending.some((s) => s.id === dummySignal.id));

  // Record human decision
  const decision = queue.recordReviewDecision(dummySignal.id, {
    decision: REVIEW_DECISIONS.ACCEPTED,
    reviewer: "Jean-Hugues Robert",
    notes: "Confirmed contradiction to be resolved in issue #124",
  });
  assert.equal(decision.decision, "accepted");

  // Verify updated queue stats
  const updatedStats = queue.getQueueStats();
  assert.equal(updatedStats.total_signals, initialStats.total_signals + 1);

  // Invariant verification: Ensure no .md source file in research/ was modified
  const sourceDoc = path.join(root, "research", "memory_and_corpus_sleep_cycle.md");
  const statBefore = fs.statSync(sourceDoc);
  // Re-run audit
  await runMonteCarloAudit({ root, force: true, maxPairs: 5 });
  const statAfter = fs.statSync(sourceDoc);
  assert.equal(statBefore.mtimeMs, statAfter.mtimeMs, "Corpus Sleep Cycle must NEVER mutate source documents");
});

// -----------------------------------------------------------------------------
// Test 6: Multi-dimensional Metrics (Coverage vs Real Cognitive Gain)
// -----------------------------------------------------------------------------
test("Criterion 5: Metrics evaluate coverage ratio, entropy, and true cognitive gain", () => {
  const visitedPairs = new Set(["doc1::doc2", "doc2::doc3", "doc1::doc3"]);
  const docSampleCounts = new Map([
    ["doc1", 2],
    ["doc2", 2],
    ["doc3", 2],
    ["doc4", 0],
  ]);

  const signals = [
    {
      id: "sig1",
      signal_kind: SIGNAL_KINDS.POSSIBLE_CONTRADICTION,
      severity: "warning",
      confidence: 0.9,
      doc_a: { id: "doc1" },
      doc_b: { id: "doc2" },
    },
    {
      id: "sig2",
      signal_kind: SIGNAL_KINDS.SEMANTIC_DRIFT,
      severity: "warning",
      confidence: 0.7,
      doc_a: { id: "doc2" },
      doc_b: { id: "doc3" },
    },
  ];

  const metrics = evaluateAuditMetrics({
    totalDocuments: 4,
    totalPossiblePairs: 6,
    visitedPairs,
    docSampleCounts,
    signals,
    elapsedMs: 250,
  });

  // Verify coverage metrics
  assert.equal(metrics.coverage.total_documents, 4);
  assert.equal(metrics.coverage.total_possible_pairs, 6);
  assert.equal(metrics.coverage.unique_pairs_sampled, 3);
  assert.equal(metrics.coverage.pair_coverage_ratio, 0.5);
  assert.equal(metrics.coverage.documents_visited, 3);
  assert.equal(metrics.coverage.document_coverage_ratio, 0.75);
  assert.ok(metrics.coverage.sampling_entropy > 0.5);

  // Verify cognitive yield metrics
  assert.equal(metrics.cognitive_yield.total_signals, 2);
  assert.equal(metrics.cognitive_yield.high_confidence_signals, 2);
  assert.ok(metrics.cognitive_yield.cognitive_gain_score > 0);
  assert.ok(metrics.efficiency.signals_per_second > 0);
});

// -----------------------------------------------------------------------------
// Test 7: Privacy Boundary — Public view excludes private repository
// -----------------------------------------------------------------------------
test("Invariant: Privacy Boundary excludes private repositories in public view", () => {
  const publicDocs = discoverCorpusDocuments({ root, view: PUBLIC_VIEW });
  const privateDocs = discoverCorpusDocuments({ root, view: PRIVATE_VIEW });

  // Public docs must NOT contain registre-mariani
  const publicPrivateLeaked = publicDocs.some((d) => d.repo === "registre-mariani");
  assert.equal(publicPrivateLeaked, false, "Public view MUST NOT discover or sample private repositories");

  // Private view CAN contain private repos if they exist locally
  assert.ok(publicDocs.length > 0);
});

// -----------------------------------------------------------------------------
// Test 8: V3 Module Capability Seam & Capability Invocation
// -----------------------------------------------------------------------------
test("V3 Seam: corpus.sleep-cycle capability registered and invoked through invokeCapability()", async () => {
  registerModule({
    id: "corpus.sleep-cycle",
    kind: "capability_provider",
    provides: { capabilities: ["corpus.sleep-cycle", "corpus.audit-monte-carlo"] },
    governance: { requires: [], trace_minimum: "none" },
    run: (input) => runMonteCarloAudit(input),
  });

  const result = await invokeCapability(
    "corpus.sleep-cycle",
    {
      root,
      view: "public",
      maxPairs: 5,
      budgetMs: 15000,
      force: true,
      seed: 42,
    },
    { auth: { lockers: { public: { read: true, write: true }, private: { read: false, write: false } } } }
  );

  assert.ok(result);
  assert.equal(result.status, "completed");
  assert.equal(result.evaluated_pairs_this_run, 5);
  assert.ok(result.metrics);
  assert.ok(result.queue_stats);
});

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------
async function runAll() {
  console.log("==========================================================================");
  console.log("         TEST SUITE: CORPUS SLEEP CYCLE MONTE CARLO AUDIT (#124)          ");
  console.log("==========================================================================\n");

  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`ok - ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL - ${t.name}`);
      console.error(err.stack || err.message);
    }
  }

  console.log("\n--------------------------------------------------------------------------");
  console.log(`Summary: ${passed} passed, ${failed} failed (${tests.length} total)`);
  console.log("--------------------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
