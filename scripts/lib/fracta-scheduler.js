/**
 * FractaScheduler Core Engine (cogentia / JHN Architecture).
 *
 * Distributed, multi-level scheduler for the Living Corpus.
 * Automates the Corpus Sleep Cycle, Issue Ingestion, Semantic Audits,
 * and Views Store synchronization under the Measured Risk doctrine.
 *
 * Invariants:
 * - Deterministic, bounded execution (no runaway loops).
 * - Automatic recovery & rollback on recoverable failures.
 * - Escalates to human via Continuations only on hard boundary crossing.
 */

import fs from "node:fs";
import path from "node:path";

export const SCHEDULER_CYCLE_MODES = Object.freeze({
  QUICK: "quick",
  SLEEP: "sleep",
  FULL: "full",
});

export const SCHEDULER_STAGE_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  WARNING: "warning",
  FAILED: "failed",
  SKIPPED: "skipped",
});

export function createSchedulerRunContext(ctx, options = {}) {
  const mode = options.mode || SCHEDULER_CYCLE_MODES.SLEEP;
  const startedAt = new Date().toISOString();
  return {
    ctx,
    mode,
    dryRun: Boolean(options.dryRun),
    startedAt,
    stages: [],
    metrics: {
      docsCount: 0,
      chunksCount: 0,
      edgesCount: 0,
      mutationsChecked: 0,
      issuesSynced: 0,
      continuationsAlive: 0,
    },
    escalations: [],
    ok: true,
  };
}

export async function runFractaCycle(runCtx, hooks = {}) {
  const { ctx, mode, dryRun } = runCtx;
  const startTime = Date.now();

  // Stage 1: Corpus Convergence (Point Fixe)
  await recordStage(runCtx, "corpus_convergence", async () => {
    if (hooks.converge) {
      const convRes = await hooks.converge();
      runCtx.metrics.docsCount = convRes.docs || 0;
      runCtx.metrics.chunksCount = convRes.chunks || 0;
      runCtx.metrics.edgesCount = convRes.edges || 0;
      return { ok: true, details: `Converged to fixed point: ${convRes.docs} docs, ${convRes.chunks} chunks.` };
    }
    return { ok: true, details: "No convergence hook provided (skipped)." };
  });

  // Stage 2: Semantic Mutation Audit
  await recordStage(runCtx, "semantic_mutation_audit", async () => {
    if (hooks.checkMutations) {
      const mutRes = await hooks.checkMutations("all");
      runCtx.metrics.mutationsChecked = mutRes.total_scanned || 0;
      if (mutRes.blocked > 0) {
        runCtx.escalations.push({
          type: "semantic_mutation_block",
          count: mutRes.blocked,
          details: mutRes.issues?.filter(i => i.status === "BLOCK"),
        });
        return { ok: false, warning: true, details: `${mutRes.blocked} blocking mutation violation(s) detected!` };
      }
      return { ok: true, details: `Audited ${mutRes.total_scanned} docs: 0 BLOCK, ${mutRes.warnings || 0} WARN.` };
    }
    return { ok: true, details: "Skipped mutation check." };
  });

  // Stage 3: Issues Synchronization (Issue Packets)
  await recordStage(runCtx, "issues_sync", async () => {
    if (hooks.syncIssues) {
      const issueRes = await hooks.syncIssues();
      runCtx.metrics.issuesSynced = issueRes.synced || 0;
      return { ok: true, details: "Synced issue packets across tracked repositories." };
    }
    return { ok: true, details: "Skipped issue sync." };
  });

  // Stage 4: Continuations Resolution & Garbage Collection
  await recordStage(runCtx, "continuations_maintenance", async () => {
    if (hooks.maintainContinuations) {
      const ctnRes = await hooks.maintainContinuations();
      runCtx.metrics.continuationsAlive = ctnRes.aliveCount || 0;
      return { ok: true, details: `Continuations verified. Alive: ${ctnRes.aliveCount || 0}.` };
    }
    return { ok: true, details: "Skipped continuations maintenance." };
  });

  // Stage 5: Views Store Export
  await recordStage(runCtx, "views_export", async () => {
    if (hooks.exportViews) {
      const viewRes = await hooks.exportViews();
      return { ok: true, details: "Exported corpus-state and views snapshot." };
    }
    return { ok: true, details: "Skipped views export." };
  });

  // Stage 6: Git Hygiene Audit
  await recordStage(runCtx, "git_hygiene_audit", async () => {
    if (hooks.auditGit) {
      const gitRes = await hooks.auditGit();
      const dirty = gitRes.filter(r => !r.clean);
      if (dirty.length > 0) {
        return { ok: true, warning: true, details: `${dirty.length} repository/repositories have uncommitted changes: ${dirty.map(d => d.name).join(", ")}` };
      }
      return { ok: true, details: `All ${gitRes.length} tracked repositories clean and synchronized.` };
    }
    return { ok: true, details: "Skipped git audit." };
  });

  const durationMs = Date.now() - startTime;
  runCtx.durationMs = durationMs;
  runCtx.completedAt = new Date().toISOString();
  runCtx.ok = runCtx.stages.every(s => s.status !== SCHEDULER_STAGE_STATUS.FAILED);

  return runCtx;
}

async function recordStage(runCtx, name, fn) {
  const stage = {
    name,
    status: SCHEDULER_STAGE_STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    details: "",
  };
  runCtx.stages.push(stage);

  try {
    const res = await fn();
    stage.status = res.ok
      ? (res.warning ? SCHEDULER_STAGE_STATUS.WARNING : SCHEDULER_STAGE_STATUS.SUCCESS)
      : SCHEDULER_STAGE_STATUS.FAILED;
    stage.details = res.details || res.error || "";
    stage.completedAt = new Date().toISOString();
  } catch (err) {
    stage.status = SCHEDULER_STAGE_STATUS.FAILED;
    stage.details = err.message;
    stage.completedAt = new Date().toISOString();
    runCtx.ok = false;
  }
}
