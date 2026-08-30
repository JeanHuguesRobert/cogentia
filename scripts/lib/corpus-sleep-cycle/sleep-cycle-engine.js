// File: scripts/lib/corpus-sleep-cycle/sleep-cycle-engine.js
// Description: Governed Preemptible Monte Carlo Engine for Corpus Sleep Cycle.
//
// Core behaviors:
// - Qualifies residual capacity before and during execution
// - Enforces strict wall-time and pair-count budgets
// - Emits continuation packets on preemption or pause
// - Resumes smoothly from previous continuation tokens without loss of progress
// - All signals land in the Review Queue (Zero automatic source file mutation)
// - Calculates dual metrics: Coverage vs Cognitive Gain

import fs from "node:fs";
import path from "node:path";
import { qualifySystemAvailability } from "../idle-qualification.js";
import { PUBLIC_VIEW } from "../privacy-views.js";
import {
  AdaptivePairSampler,
  discoverCorpusDocuments
} from "./pair-sampler.js";
import { evaluateDocumentPair } from "./audit-evaluator.js";
import { SleepCycleReviewQueue } from "./review-queue.js";
import { evaluateAuditMetrics } from "./metrics.js";

function nowMs() {
  return Date.now();
}

/**
 * Main Monte Carlo Audit execution function.
 */
export async function runMonteCarloAudit(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const view = options.view || PUBLIC_VIEW;
  const startedAt = nowMs();
  const runId = options.runId || `sleep_audit_${startedAt}`;

  const maxWallTimeMs = Number.isFinite(options.maxWallTimeMs)
    ? Math.max(10, options.maxWallTimeMs)
    : (options.budgetMs ? Math.max(10, options.budgetMs) : 15000);

  const maxPairs = Number.isFinite(options.maxPairs)
    ? Math.max(1, options.maxPairs)
    : 50;

  const reviewQueue = new SleepCycleReviewQueue({ root });

  // 1. Capacity Qualification Gate
  const availability = qualifySystemAvailability(options);
  if (!availability.is_idle && !options.force) {
    return {
      status: "deferred",
      reason: "system_busy",
      availability,
      metrics: null,
      signals: [],
      queue_stats: reviewQueue.getQueueStats()
    };
  }

  // 2. Discover Documents (respecting privacy view)
  const documents = discoverCorpusDocuments({ root, view });
  if (documents.length < 2) {
    return {
      status: "completed_empty",
      reason: "insufficient_documents",
      documents_found: documents.length,
      metrics: null,
      signals: [],
      queue_stats: reviewQueue.getQueueStats()
    };
  }

  // 3. Load Continuation or Initialize Sampler
  let checkpoint = null;
  let priorSignals = [];

  if (options.resume) {
    const continuationData = typeof options.resume === "string"
      ? loadContinuationFile(root, options.resume)
      : options.resume;

    if (continuationData?.state?.checkpoint) {
      checkpoint = continuationData.state.checkpoint;
      priorSignals = continuationData.state.accumulated_signals || [];
    }
  } else if (options.checkpoint) {
    checkpoint = options.checkpoint;
  }

  const sampler = new AdaptivePairSampler(documents, {
    seed: options.seed ?? 42,
    checkpoint
  });

  const generatedSignals = [...priorSignals];
  const newSignalsThisRun = [];
  let evaluatedPairsThisRun = 0;
  let preemptionReason = null;
  const auditLoopStartedAt = nowMs();

  // 4. Preemptible Monte Carlo Sampling Loop
  while (evaluatedPairsThisRun < maxPairs) {
    // Check wall time budget for the sampling loop
    const elapsed = nowMs() - auditLoopStartedAt;
    if (elapsed >= maxWallTimeMs) {
      preemptionReason = "wall_time_budget_exhausted";
      break;
    }

    // Check system availability periodically (every 5 pairs)
    if (evaluatedPairsThisRun > 0 && evaluatedPairsThisRun % 5 === 0 && !options.force) {
      const currentAvail = qualifySystemAvailability(options);
      if (!currentAvail.is_idle) {
        preemptionReason = "foreground_or_system_demand";
        break;
      }
    }

    // Sample next candidate pair
    const pair = sampler.sampleNextPair();
    if (!pair) {
      break;
    }

    evaluatedPairsThisRun++;

    // Evaluate pair across the 6 consistency angles
    const signals = evaluateDocumentPair(pair.docA, pair.docB, {
      runId,
      node: options.node || "local",
      capacityRef: options.capacityRef || "residual_monte_carlo"
    });

    for (const sig of signals) {
      newSignalsThisRun.push(sig);
      generatedSignals.push(sig);
    }
  }

  // 5. Append New Signals into Review Queue (Zero automated file mutations)
  if (newSignalsThisRun.length > 0) {
    reviewQueue.appendSignals(newSignalsThisRun);
  }

  const elapsedMs = nowMs() - startedAt;

  // 6. Compute Comprehensive Metrics
  const metrics = evaluateAuditMetrics({
    totalDocuments: sampler.totalDocs,
    totalPossiblePairs: sampler.totalPossiblePairs,
    visitedPairs: sampler.visitedPairs,
    docSampleCounts: sampler.docSampleCounts,
    signals: generatedSignals,
    elapsedMs,
    costUnits: options.costUnits || 0
  });

  const finalCheckpoint = sampler.exportCheckpoint();

  // 7. Handle Preemption & Emit Continuation
  if (preemptionReason) {
    const continuationPacket = emitSleepCycleContinuation(root, {
      runId,
      reason: preemptionReason,
      checkpoint: finalCheckpoint,
      accumulatedSignals: generatedSignals,
      metrics,
      options: {
        seed: options.seed,
        view: options.view,
        maxPairs: options.maxPairs,
        maxWallTimeMs: options.maxWallTimeMs
      }
    });

    return {
      status: "preempted",
      reason: preemptionReason,
      runId,
      evaluated_pairs_this_run: evaluatedPairsThisRun,
      new_signals_this_run: newSignalsThisRun.length,
      checkpoint: finalCheckpoint,
      continuation: continuationPacket,
      metrics,
      queue_stats: reviewQueue.getQueueStats()
    };
  }

  return {
    status: "completed",
    runId,
    evaluated_pairs_this_run: evaluatedPairsThisRun,
    new_signals_this_run: newSignalsThisRun.length,
    checkpoint: finalCheckpoint,
    metrics,
    queue_stats: reviewQueue.getQueueStats()
  };
}

function loadContinuationFile(root, continuationRef) {
  let fullPath = continuationRef;
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(root, ".cogentia", "continuations", continuationRef);
  }
  if (!fs.existsSync(fullPath) && !continuationRef.endsWith(".json")) {
    fullPath = path.join(root, ".cogentia", "continuations", `${continuationRef}.json`);
  }

  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

function emitSleepCycleContinuation(root, { runId, reason, checkpoint, accumulatedSignals, metrics, options }) {
  const continuationId = `cont_${runId}_${Date.now()}`;
  const dir = path.join(root, ".cogentia", "continuations");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${continuationId}.json`);

  const packet = {
    schema: "cogentia.continuation.v1",
    id: continuationId,
    kind: "corpus_sleep_cycle_continuation",
    title: `Corpus Sleep Cycle Continuation (${reason})`,
    created_at: new Date().toISOString(),
    status: "active",
    priority: 1,
    reason,
    state: {
      run_id: runId,
      reason,
      checkpoint,
      accumulated_signals_count: accumulatedSignals.length,
      accumulated_signals: accumulatedSignals,
      metrics_summary: metrics?.coverage
    },
    resume: {
      command: `node scripts/run-corpus-sleep-cycle.js --resume ${continuationId}`,
      method: "runMonteCarloAudit",
      options: {
        ...options,
        resume: continuationId
      }
    }
  };

  fs.writeFileSync(filePath, JSON.stringify(packet, null, 2), "utf8");
  return packet;
}
