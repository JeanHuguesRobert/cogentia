#!/usr/bin/env node
// Regression for Cogentia #124: replay, intercycle coverage, durable bound, continuation.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdaptivePairSampler, discoverCorpusDocuments } from "./lib/corpus-sleep-cycle/pair-sampler.js";
import { runMonteCarloAudit } from "./lib/corpus-sleep-cycle/sleep-cycle-engine.js";

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
