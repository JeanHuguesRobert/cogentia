#!/usr/bin/env node
// Regression for Cogentia #124: replay, intercycle coverage, durable bound, continuation.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdaptivePairSampler, discoverCorpusDocuments } from "./lib/corpus-sleep-cycle/pair-sampler.js";
import { runMonteCarloAudit } from "./lib/corpus-sleep-cycle/sleep-cycle-engine.js";
import { evaluateDocumentPair, checkMissingLink } from "./lib/corpus-sleep-cycle/audit-evaluator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = discoverCorpusDocuments({ root, view: "public" });
assert.ok(docs.length >= 2, "Corpus must have at least two public documents");

const firstSampler = new AdaptivePairSampler(docs, { seed: 42 });
const firstPairs = Array.from({ length: 50 }, () => firstSampler.sampleNextPair().pairKey);
const secondSampler = new AdaptivePairSampler(docs, { seed: 42 });
assert.deepEqual(firstPairs, Array.from({ length: 50 }, () => secondSampler.sampleNextPair().pairKey));

const resumed = new AdaptivePairSampler(docs, { seed: 42, checkpoint: firstSampler.exportCheckpoint() });
const rest = Array.from({ length: 50 }, () => resumed.sampleNextPair().pairKey);
const unbroken = new AdaptivePairSampler(docs, { seed: 42 });
assert.deepEqual([...firstPairs, ...rest], Array.from({ length: 100 }, () => unbroken.sampleNextPair().pairKey));

const queueRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sleepcycle-124-"));
try {
  const run = (options = {}) => runMonteCarloAudit({
    root, queueRoot, force: true, maxWallTimeMs: 30000, maxPairs: 50, ...options
  });
  const cycle1 = await run();
  const cycle2 = await run();
  assert.equal(cycle1.status, "completed");
  assert.equal(cycle2.status, "completed");
  const seen1 = new Set(cycle1.checkpoint.visitedPairs);
  const seen2 = new Set(cycle2.checkpoint.visitedPairs);
  const overlap = [...seen2].filter(key => seen1.has(key)).length;
  assert.equal(seen1.size, 50);
  assert.equal(seen2.size, 50);
  assert.equal(overlap, 0, "Fresh scheduled cycles should not repeat explored pairs");
  assert.equal(cycle1.metrics.coverage.intercycle.novel_pairs_this_cycle, 50);
  assert.equal(cycle2.metrics.coverage.intercycle.novel_pairs_this_cycle, 50);
  assert.equal(cycle2.metrics.coverage.intercycle.revisited_recent_pairs_this_cycle, 0);
  assert.equal(cycle2.metrics.coverage.intercycle.recent_pairs_before, 50);
  assert.ok(cycle1.metrics.coverage.pair_coverage_ratio > 0);

  const historyFile = path.join(queueRoot, ".cogentia", "sleep_cycle_pair_history_public.json");
  assert.equal(JSON.parse(fs.readFileSync(historyFile)).pairs.length, 100);

  const replay1 = await run({ seed: 42, maxPairs: 10 });
  const replay2 = await run({ seed: 42, maxPairs: 10 });
  assert.deepEqual(replay1.checkpoint.visitedPairs, replay2.checkpoint.visitedPairs);
  assert.equal(JSON.parse(fs.readFileSync(historyFile)).pairs.length, 100,
    "Explicit replay must not change scheduled history");
  const continued = await run({ seed: 42, checkpoint: replay1.checkpoint, maxPairs: 10 });
  assert.equal(continued.checkpoint.visitedPairs.length, 20);

  // Opt-in dual sampler preserves both routes, bounded novelty and exact replay.
  const mixedOptions = { seed: 20261123, focusedFraction: 0.25, maxPairs: 100 };
  const mixed1 = await run(mixedOptions);
  const mixed2 = await run(mixedOptions);
  assert.equal(mixed1.status, "completed");
  assert.equal(mixed1.metrics.selection.strategy, "mixed");
  assert.ok(mixed1.metrics.selection.eligible_thematic_pairs > 0);
  assert.ok(mixed1.metrics.selection.channels.thematic.evaluated_pairs > 0);
  assert.ok(mixed1.metrics.selection.channels.random.evaluated_pairs > 0);
  assert.equal(mixed1.metrics.selection.channels.random.evaluated_pairs +
    mixed1.metrics.selection.channels.thematic.evaluated_pairs, 100);
  assert.deepEqual(mixed1.checkpoint.visitedPairs, mixed2.checkpoint.visitedPairs);
  assert.equal(mixed1.metrics.selection.channels.thematic.candidate_signals,
    mixed2.metrics.selection.channels.thematic.candidate_signals);
  assert.equal(mixed1.metrics.selection.validated_cognitive_gain, null,
    "Candidate yield is not evidence of human-validated cognitive gain");
  assert.equal(mixed1.metrics.selection.new_review_queue_signals, mixed1.new_signals_this_run);
  const mixedQueue = fs.readFileSync(path.join(queueRoot, ".cogentia",
    "sleep_cycle_review_queue.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.ok(mixedQueue.some(signal => signal.provenance?.selection_channel === "thematic"),
    "Review queue must preserve the sampling channel for later accepted-yield analysis");
  const mixResumed = await run({ ...mixedOptions, maxPairs: 20, checkpoint: mixed1.checkpoint });
  const mixLong = await run({ ...mixedOptions, maxPairs: 120 });
  assert.deepEqual(mixResumed.checkpoint.visitedPairs, mixLong.checkpoint.visitedPairs,
    "Mixed mode must resume its exact PRNG/selection trajectory");
  assert.equal(JSON.parse(fs.readFileSync(historyFile)).pairs.length, 100,
    "Seeded experimental run must not change scheduled intercycle coverage");
  await assert.rejects(run({ ...mixedOptions, focusedFraction: 0, maxPairs: 5,
    checkpoint: mixed1.checkpoint }), /different focusedFraction/);

  // A shared tag set does not imply a missing link when canonical frontmatter
  // or inline Markdown already declares the document relationship.
  const linkDocA = {
    id: "fixture/a.md", relPath: "fixture/a.md",
    relatedDocs: [], tags: ["alpha", "beta", "gamma"]
  };
  const linkDocB = {
    id: "fixture/b.md", relPath: "fixture/b.md",
    relatedDocs: [], tags: ["alpha", "beta", "gamma"]
  };
  assert.equal(checkMissingLink(linkDocA, linkDocB).length, 1);
  assert.equal(checkMissingLink(linkDocA, linkDocB, "See [B](b.md)").length, 0);
  assert.equal(checkMissingLink({ ...linkDocA,
    relatedDocs: ["fixture/b.md"] }, linkDocB).length, 0);
  const realA = docs.find(doc =>
    doc.id === "cogentia/research/agent_configuration_layer.md");
  const realB = docs.find(doc =>
    doc.id === "cogentia/research/blocked_tool_rule.md");
  assert.ok(realA && realB);
  assert.ok(realA.relatedDocs.some(ref => ref.endsWith("blocked_tool_rule.md")),
    "Discovery must recognize related_research as an existing relationship");
  assert.equal(checkMissingLink(realA, realB,
    fs.readFileSync(realA.fullPath, "utf8"),
    fs.readFileSync(realB.fullPath, "utf8")).length, 0);
  const older = docs.find(doc => doc.id ===
    "barons-Mariani/research/patrimoine/bleu_chine_denim_nimes_corse_v0.1.md");
  const newer = docs.find(doc => doc.id ===
    "barons-Mariani/research/patrimoine/bleu_chine_denim_nimes_corse_v0.2.md");
  assert.ok(older && newer);
  assert.ok(newer.relatedDocs.some(ref =>
    ref.endsWith("bleu_chine_denim_nimes_corse_v0.1.md")),
    "Previous version is an explicit relationship, not a missing link");
  assert.equal(checkMissingLink(older, newer).length, 0);

  // Two distinct matching paragraphs yield the same similarity/finding but
  // must not collapse into one durable review candidate.
  const blocks = [
    "Alpha mountain forest river garden ocean meadow valley sunrise silver planet amber quartz memory pencil compass.",
    "Delta station bridge harbor orchard railway tunnel engine lantern copper horizon marble signal anchor."
  ];
  const fixtureDir = path.join(queueRoot, "synthetic-evidence");
  fs.mkdirSync(fixtureDir);
  const paths = ["a.md", "b.md"].map(name => path.join(fixtureDir, name));
  for (const filename of paths) fs.writeFileSync(filename, blocks.join("\n\n"));
  const mkDoc = (id, fullPath) => ({
    id, repo: "fixture", relPath: path.basename(fullPath),
    title: id, tags: [], relatedDocs: [], status: "working", fullPath
  });
  const docA = mkDoc("fixture/a.md", paths[0]);
  const docB = mkDoc("fixture/b.md", paths[1]);
  const evidence1 = evaluateDocumentPair(docA, docB, { runId: "fixture" })
    .filter(s => s.signal_kind === "duplication");
  const evidence2 = evaluateDocumentPair(docA, docB, { runId: "fixture" })
    .filter(s => s.signal_kind === "duplication");
  assert.equal(evidence1.length, 2);
  assert.equal(new Set(evidence1.map(s => s.id)).size, 2,
    "Distinct paragraph evidence must yield distinct review IDs");
  assert.deepEqual(evidence1.map(s => s.id), evidence2.map(s => s.id),
    "Signal IDs must remain reproducible for queue idempotency");
  for (const filename of paths) fs.writeFileSync(filename,
    [blocks[0], blocks[1], blocks[0]].join("\n\n"));
  const repeatedEvidence = evaluateDocumentPair(docA, docB, { runId: "fixture" })
    .filter(s => s.signal_kind === "duplication");
  assert.equal(repeatedEvidence.length, 2,
    "Identical repeated evidence must count only once");

  fs.writeFileSync(historyFile, JSON.stringify({
    version: 1, pairs: Array.from({ length: 5100 }, (_, i) => "obsolete_" + i)
  }));
  await run({ maxPairs: 5 });
  assert.equal(JSON.parse(fs.readFileSync(historyFile)).pairs.length, 5000);

  console.log(JSON.stringify({
    status: "PASS", docs: docs.length, unique_cycle1: seen1.size,
    unique_cycle2: seen2.size, overlap, history_bound: 5000,
    replay: true, checkpoint: true,
    precise_ratio: cycle1.metrics.coverage.pair_coverage_ratio
  }));
} finally {
  fs.rmSync(queueRoot, { recursive: true, force: true });
}
