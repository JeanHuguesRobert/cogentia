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
