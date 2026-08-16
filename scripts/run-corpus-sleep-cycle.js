// File: scripts/run-corpus-sleep-cycle.js
// Description: Preemptible Corpus Sleep Cycle runner.
// Source doctrine: research/memory_and_corpus_sleep_cycle.md
//
// Progressive implementation rule:
// - never report an unimplemented audit/regression as successful;
// - every semantic phase is either executed with evidence, skipped, planned, or failed;
// - foreground demand, mandate and budget may preempt sleep work at phase boundaries.

import { qualifySystemAvailability } from "./lib/idle-qualification.js";
import { runWeeklyConsolidation } from "./lib/cogentia-core.js";

function nowMs() {
  return Date.now();
}

function makeBudget(options) {
  const maxWallTimeMs = Number.isFinite(options.maxWallTimeMs)
    ? Math.max(0, options.maxWallTimeMs)
    : null;

  return {
    startedAt: nowMs(),
    maxWallTimeMs,
    maxCost: Number.isFinite(options.maxCost) ? Math.max(0, options.maxCost) : null,
    mandateRef: options.mandateRef || null,
    budgetRef: options.budgetRef || null
  };
}

function budgetStatus(budget) {
  const elapsedMs = nowMs() - budget.startedAt;
  const wallTimeExhausted =
    budget.maxWallTimeMs !== null && elapsedMs >= budget.maxWallTimeMs;

  return {
    elapsedMs,
    wallTimeExhausted,
    // Cost accounting is deliberately not invented here. A provider-aware
    // meter must supply evidence before maxCost can be enforced.
    costEnforced: false
  };
}

function assertCanContinue({ availability, budget, options, phase }) {
  const status = budgetStatus(budget);

  if (status.wallTimeExhausted) {
    return {
      ok: false,
      reason: "wall_time_budget_exhausted",
      phase,
      budget: status
    };
  }

  if (!options.force && availability && !availability.is_idle) {
    return {
      ok: false,
      reason: "foreground_or_system_demand",
      phase,
      budget: status
    };
  }

  return { ok: true, budget: status };
}

async function runHookPhase({ name, hook, context, required = false }) {
  if (typeof hook !== "function") {
    return {
      name,
      status: required ? "missing" : "planned",
      evidence: null
    };
  }

  const result = await hook(context);
  return {
    name,
    status: "completed",
    evidence: result ?? null
  };
}

export async function runCorpusSleepCycle(options = {}) {
  const root = options.root || process.cwd();
  const budget = makeBudget(options);
  const phases = [];

  console.log("==========================================================================");
  console.log("             CORPUS SLEEP CYCLE — PREEMPTIBLE RUNNER                     ");
  console.log("==========================================================================");

  console.log("\n[Phase 1] Qualifying dynamic resource availability...");
  const availability = qualifySystemAvailability(options);
  console.log(`  CPU Load (15min): ${availability.load_15min}`);
  console.log(`  Free Memory: ${availability.free_mem_mb} MB`);
  console.log(`  Active Requests: ${availability.active_requests}`);
  console.log(`  Qualified: ${availability.is_idle ? "yes" : "no"}`);

  phases.push({
    name: "resource_qualification",
    status: availability.is_idle || options.force ? "completed" : "deferred",
    evidence: availability
  });

  if (!availability.is_idle && !options.force) {
    console.log("\nDeferring sleep cycle: residual capacity is not qualified.");
    return {
      status: "deferred",
      reason: "system_busy",
      availability,
      budget: budgetStatus(budget),
      phases
    };
  }

  const context = { root, options, availability, budget };

  // Candidate-learning discovery is intentionally a hook until a real,
  // evidence-producing implementation exists.
  console.log("\n[Phase 2] Candidate learning discovery...");
  let gate = assertCanContinue({ availability, budget, options, phase: "candidate_learning" });
  if (!gate.ok) {
    return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
  }
  const candidateLearning = await runHookPhase({
    name: "candidate_learning",
    hook: options.candidateLearningHook,
    context
  });
  phases.push(candidateLearning);
  console.log(`  ${candidateLearning.status}`);

  console.log("\n[Phase 3] Cognitive regression suite...");
  gate = assertCanContinue({ availability, budget, options, phase: "cognitive_regression" });
  if (!gate.ok) {
    return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
  }
  const regression = await runHookPhase({
    name: "cognitive_regression",
    hook: options.regressionHook,
    context: { ...context, candidateLearning }
  });
  phases.push(regression);
  console.log(`  ${regression.status}`);

  console.log("\n[Phase 4] Cold-handler / substitution tests...");
  gate = assertCanContinue({ availability, budget, options, phase: "handler_substitution" });
  if (!gate.ok) {
    return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
  }
  const substitution = await runHookPhase({
    name: "handler_substitution",
    hook: options.handlerSubstitutionHook,
    context: { ...context, candidateLearning, regression }
  });
  phases.push(substitution);
  console.log(`  ${substitution.status}`);

  console.log("\n[Phase 5] Existing weekly consolidation...");
  gate = assertCanContinue({ availability, budget, options, phase: "weekly_consolidation" });
  if (!gate.ok) {
    return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
  }

  const consolidation = await runWeeklyConsolidation({ root });
  phases.push({
    name: "weekly_consolidation",
    status: "completed",
    evidence: consolidation
  });

  console.log("\n[Phase 6] Candidate assimilation...");
  gate = assertCanContinue({ availability, budget, options, phase: "assimilation" });
  if (!gate.ok) {
    return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
  }
  const assimilation = await runHookPhase({
    name: "assimilation",
    hook: options.assimilationHook,
    context: {
      ...context,
      candidateLearning,
      regression,
      substitution,
      consolidation
    }
  });
  phases.push(assimilation);
  console.log(`  ${assimilation.status}`);

  const plannedCount = phases.filter((phase) => phase.status === "planned").length;
  const finalBudget = budgetStatus(budget);

  console.log("\n==========================================================================");
  console.log(
    plannedCount === 0
      ? "CORPUS SLEEP CYCLE COMPLETED"
      : `CORPUS SLEEP CYCLE COMPLETED WITH ${plannedCount} PLANNED PHASE(S)`
  );
  console.log("==========================================================================");

  return {
    status: plannedCount === 0 ? "completed" : "completed_partial",
    availability,
    budget: finalBudget,
    phases,
    consolidation
  };
}

if (process.argv[1] && process.argv[1].includes("run-corpus-sleep-cycle.js")) {
  runCorpusSleepCycle({
    force: process.argv.includes("--force")
  }).catch((err) => {
    console.error("SLEEP CYCLE ERROR:", err);
    process.exit(1);
  });
}
