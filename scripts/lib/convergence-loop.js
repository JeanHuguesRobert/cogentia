/**
 * Pure fixed-point convergence iteration (cogentia#121, cogentia#179).
 *
 * Extracted out of cmdCorpusConverge so it can be exercised by a
 * deterministic test fixture without a real corpus (no loadContext(),
 * no buildPlan(), no filesystem writes) — computePlan()/writeFile() are
 * injected by the caller.
 *
 * Core rule this exists to enforce:
 *   "cycle/stage executed successfully" != "corpus actually converged to
 *   a fixed point" (cogentia#121). A caller must never report convergence
 *   just because this function returned without throwing — check
 *   reachedFixedPoint / terminationReason explicitly.
 */

import { checkSemanticMutation, MUTATION_STATUS } from "./semantic-mutation-checker.js";

export function runConvergenceLoop({ computePlan, maxIterations, dryRun, writeFile }) {
  let iterations = 0;
  const allApplied = [];
  let reachedFixedPoint = false;
  // Dry run cannot iterate on its own writes (there are none), so it only
  // ever evaluates a single pass: the plan that would be applied first.
  const effectiveMax = dryRun ? 1 : maxIterations;

  while (iterations < effectiveMax) {
    iterations++;
    const writes = computePlan(iterations);
    for (const write of writes) {
      if (!write.allowed) continue;
      const mutation = checkSemanticMutation(write.before || "", write.after || "", {
        filePath: `${write.repo}/${write.path}`,
      });
      if (mutation.status === MUTATION_STATUS.BLOCK) {
        write.allowed = false;
        write.mutation_blocked = mutation.blocks;
      }
    }
    const allowed = writes.filter(w => w.allowed);
    if (allowed.length === 0) {
      reachedFixedPoint = true;
      break;
    }
    for (const write of allowed) {
      if (!dryRun) writeFile(write);
      allApplied.push({
        iteration: iterations,
        repo: write.repo,
        path: write.path,
        type: write.type || "update",
      });
    }
  }

  return {
    iterations,
    reachedFixedPoint,
    terminationReason: reachedFixedPoint ? "fixed_point" : "max_iterations",
    allApplied,
  };
}
