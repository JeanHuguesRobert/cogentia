/** #285 - Pure decision gate for intermediate agent stopping points.
 * The caller must execute an authorized next step; this module does not schedule work.
 */
export function decideMandateContinuation({
  objective_met = false,
  next_step_clear = false,
  next_step_allowed = false,
  judgment_required = false,
  hard_blocker = false,
  budget_exhausted = false,
} = {}) {
  if (objective_met) return { action: "complete", reason: "verified_objective_met" };
  if (judgment_required) return { action: "escalate", reason: "human_judgment_required" };
  if (hard_blocker) return { action: "handoff", reason: "hard_blocker" };
  if (budget_exhausted) return { action: "handoff", reason: "budget_exhausted" };
  if (next_step_clear && next_step_allowed) return { action: "continue", reason: "in_mandate_next_step" };
  return { action: "escalate", reason: "mandate_or_next_step_unclear" };
}

/**
 * Run authorized steps until a real boundary instead of stopping after every
 * intermediate result. The caller owns state inspection and effects.
 * No background execution is implied.
 */
export async function runMandateToBoundary({
  inspect,
  execute,
  max_steps = 16,
  on_step = null,
} = {}) {
  if (typeof inspect !== "function" || typeof execute !== "function") {
    throw new TypeError("inspect and execute callbacks are required");
  }
  const limit = Number.isSafeInteger(max_steps) ? Math.max(1, Math.min(max_steps, 256)) : 16;
  const events = [];
  for (let i = 0; i < limit; i += 1) {
    const state = await inspect({ step: i, events: events.slice() });
    const boundary = decideMandateContinuation(state);
    if (boundary.action !== "continue") {
      return { ...boundary, steps_completed: i, events };
    }
    const result = await execute({ step: i, state });
    const outcome = { step: i, ok: result?.ok !== false, code: result?.code || null };
    events.push(outcome);
    if (typeof on_step === "function") await on_step(outcome);
    if (!outcome.ok) {
      return { action: "handoff", reason: "step_failed", steps_completed: i, events };
    }
  }
  return { action: "handoff", reason: "step_limit", steps_completed: limit, events };
}
