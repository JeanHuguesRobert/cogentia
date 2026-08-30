// File: scripts/run-corpus-sleep-cycle.js
// Description: Preemptible Corpus Sleep Cycle runner with Monte Carlo consistency audit.
// Source doctrine: research/memory_and_corpus_sleep_cycle.md
//
// Progressive implementation rule:
// - never report an unimplemented audit/regression as successful;
// - every semantic phase is either executed with evidence, skipped, planned, or failed;
// - foreground demand, mandate and budget may preempt sleep work at phase boundaries.

import { qualifySystemAvailability } from "./lib/idle-qualification.js";
import { runWeeklyConsolidation } from "./lib/cogentia-core.js";
import { runMonteCarloAudit } from "./lib/corpus-sleep-cycle/index.js";

function nowMs() {
  return Date.now();
}

function makeBudget(options) {
  const maxWallTimeMs = Number.isFinite(options.maxWallTimeMs)
    ? Math.max(0, options.maxWallTimeMs)
    : (options.budgetMs ? Math.max(0, options.budgetMs) : null);

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

  if (!options.json) {
    console.log("==========================================================================");
    console.log("             CORPUS SLEEP CYCLE — PREEMPTIBLE RUNNER                     ");
    console.log("==========================================================================");

    console.log("\n[Phase 1] Qualifying dynamic resource availability...");
  }

  const availability = qualifySystemAvailability(options);
  if (!options.json) {
    console.log(`  CPU Load (15min): ${availability.load_15min}`);
    console.log(`  Free Memory: ${availability.free_mem_mb} MB`);
    console.log(`  Active Requests: ${availability.active_requests}`);
    console.log(`  Qualified: ${availability.is_idle ? "yes" : "no"}`);
  }

  phases.push({
    name: "resource_qualification",
    status: availability.is_idle || options.force ? "completed" : "deferred",
    evidence: availability
  });

  if (!availability.is_idle && !options.force) {
    if (!options.json) {
      console.log("\nDeferring sleep cycle: residual capacity is not qualified.");
    }
    return {
      status: "deferred",
      reason: "system_busy",
      availability,
      budget: budgetStatus(budget),
      phases
    };
  }

  const context = { root, options, availability, budget };

  // Phase 2: Candidate learning & Monte Carlo Consistency Audit
  if (!options.json) {
    console.log("\n[Phase 2] Candidate learning & Monte Carlo consistency audit...");
  }
  let gate = assertCanContinue({ availability, budget, options, phase: "candidate_learning" });
  if (!gate.ok) {
    return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
  }

  let candidateLearning;
  if (typeof options.candidateLearningHook === "function") {
    candidateLearning = await runHookPhase({
      name: "candidate_learning",
      hook: options.candidateLearningHook,
      context
    });
  } else {
    // Default governed Monte Carlo Audit engine
    const auditResult = await runMonteCarloAudit({
      root,
      view: options.view || "public",
      force: options.force,
      maxPairs: options.maxPairs || 30,
      maxWallTimeMs: budget.maxWallTimeMs || 10000,
      resume: options.resume || null,
      seed: options.seed ?? 42
    });

    candidateLearning = {
      name: "candidate_learning",
      status: auditResult.status === "preempted" ? "preempted" : "completed",
      evidence: auditResult
    };
  }

  phases.push(candidateLearning);
  if (!options.json) {
    console.log(`  Status: ${candidateLearning.status}`);
    if (candidateLearning.evidence?.metrics) {
      const { coverage, cognitive_yield } = candidateLearning.evidence.metrics;
      console.log(`  Pairs evaluated: ${coverage.unique_pairs_sampled} / ${coverage.total_possible_pairs} (${(coverage.pair_coverage_ratio * 100).toFixed(1)}% coverage)`);
      console.log(`  Candidate signals: ${cognitive_yield.total_signals} (Cognitive Gain: ${cognitive_yield.cognitive_gain_score})`);
    }
  }

  if (candidateLearning.status === "preempted") {
    return {
      status: "preempted",
      reason: candidateLearning.evidence?.reason || "phase_preempted",
      availability,
      budget: budgetStatus(budget),
      phases,
      continuation: candidateLearning.evidence?.continuation
    };
  }

  // Phase 3: Cognitive regression suite
  if (!options.json) {
    console.log("\n[Phase 3] Cognitive regression suite...");
  }
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
  if (!options.json) console.log(`  ${regression.status}`);

  // Phase 4: Cold-handler / substitution tests
  if (!options.json) {
    console.log("\n[Phase 4] Cold-handler / substitution tests...");
  }
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
  if (!options.json) console.log(`  ${substitution.status}`);

  // Phase 5: Existing weekly consolidation
  let consolidation = null;
  if (!options.skipConsolidation) {
    if (!options.json) {
      console.log("\n[Phase 5] Existing weekly consolidation...");
    }
    gate = assertCanContinue({ availability, budget, options, phase: "weekly_consolidation" });
    if (!gate.ok) {
      return { status: "preempted", reason: gate.reason, availability, budget: gate.budget, phases };
    }

    consolidation = await runWeeklyConsolidation({ root });
    phases.push({
      name: "weekly_consolidation",
      status: "completed",
      evidence: consolidation
    });
  } else {
    phases.push({
      name: "weekly_consolidation",
      status: "skipped",
      evidence: null
    });
  }

  // Phase 6: Candidate assimilation / Review Queue triage
  if (!options.json) {
    console.log("\n[Phase 6] Candidate assimilation & review queue routing...");
  }
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
  if (!options.json) console.log(`  ${assimilation.status}`);

  const plannedCount = phases.filter((phase) => phase.status === "planned").length;
  const finalBudget = budgetStatus(budget);

  if (!options.json) {
    console.log("\n==========================================================================");
    console.log(
      plannedCount === 0
        ? "CORPUS SLEEP CYCLE COMPLETED"
        : `CORPUS SLEEP CYCLE COMPLETED WITH ${plannedCount} PLANNED PHASE(S)`
    );
    console.log("==========================================================================");
  }

  const result = {
    status: plannedCount === 0 ? "completed" : "completed_partial",
    availability,
    budget: finalBudget,
    phases,
    consolidation,
    candidate_signals: candidateLearning.evidence?.metrics?.cognitive_yield?.total_signals || 0,
    metrics: candidateLearning.evidence?.metrics || null
  };

  return result;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes("--force"),
    json: args.includes("--json"),
    skipConsolidation: args.includes("--skip-consolidation"),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-pairs" && args[i + 1]) {
      options.maxPairs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--budget-ms" && args[i + 1]) {
      options.maxWallTimeMs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--resume" && args[i + 1]) {
      options.resume = args[i + 1];
      i++;
    } else if (args[i] === "--seed" && args[i + 1]) {
      options.seed = parseInt(args[i + 1], 10) || args[i + 1];
      i++;
    } else if (args[i] === "--view" && args[i + 1]) {
      options.view = args[i + 1];
      i++;
    }
  }
  return options;
}

if (process.argv[1] && process.argv[1].includes("run-corpus-sleep-cycle.js")) {
  const cliOptions = parseCliArgs();
  runCorpusSleepCycle(cliOptions).then((res) => {
    if (cliOptions.json) {
      console.log(JSON.stringify(res, null, 2));
    }
  }).catch((err) => {
    console.error("SLEEP CYCLE ERROR:", err);
    process.exit(1);
  });
}
