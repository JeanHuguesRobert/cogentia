/**
 * Structural (not conversational) projection of a parent's mandate progress.
 * A model's "done" is a claim, never evidence of achieved acceptance criteria.
 * Unknown or empty acceptance contracts remain open: no manufactured closure.
 * No authorizations or side effects are issued by this function.
 */
export function projectMandateProgress({
  acceptance = [], evidence = [], nextActions = [], blocker = null,
  agentClaim = null,
} = {}) {
  const verified = new Set((Array.isArray(evidence) ? evidence : [])
    .filter(x => x?.verified === true && typeof x?.criterion === "string" &&
      typeof x?.receipt_ref === "string" && x.receipt_ref.length > 0)
    .map(x => x.criterion));
  const requirements = Array.isArray(acceptance) ? acceptance
    .filter(x => typeof x === "string" && x.length > 0) : [];
  const missing = requirements.filter(x => !verified.has(x));
  if (requirements.length > 0 && missing.length === 0) {
    return {status:"completed", missing:[], reason:"all_declared_criteria_verified"};
  }
  const actions = (Array.isArray(nextActions) ? nextActions : [])
    .filter(x => x?.admissible === true && x?.available === true);
  if (actions.length > 0) {
    return {status:"continue", missing, next_action:actions[0].id || null,
      reason:"admissible_action_available"};
  }
  if (blocker?.verified === true && blocker?.prevents_progress === true &&
      typeof blocker?.evidence_ref === "string" && blocker.evidence_ref) {
    return {status:"blocked", missing, blocker_ref:blocker.evidence_ref,
      reason:"verified_blocker"};
  }
  return {status:"open", missing, reason:requirements.length===0
    ? "acceptance_not_declared" : "acceptance_not_verified",
    agent_claim_non_authoritative:agentClaim==="completed"};
}
