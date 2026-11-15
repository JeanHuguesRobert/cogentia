/**
 * Structural (not conversational) projection of a parent's mandate progress.
 * The explicit judgment of an admitted, mandated agent is accepted under
 * Optimistic Locking when the caller sets trustAgentJudgment. This is a
 * completion DECISION, not a new permission or an external effect receipt.
 * A finished conversation turn alone never implies mission completion.
 */
export function projectMandateProgress({
  acceptance = [], evidence = [], nextActions = [], blocker = null,
  agentClaim = null, agentNextAction = null, trustAgentJudgment = false,
} = {}) {
  const verified = new Set((Array.isArray(evidence) ? evidence : [])
    .filter(x => x?.verified === true && typeof x?.criterion === "string" &&
      typeof x?.receipt_ref === "string" && x.receipt_ref.length > 0)
    .map(x => x.criterion));
  const requirements = Array.isArray(acceptance) ? acceptance
    .filter(x => typeof x === "string" && x.length > 0) : [];
  const missing = requirements.filter(x => !verified.has(x));
  // Only a designated, authenticated result handler should opt into trust.
  // No second model, signature ceremony or independent review is required.
  if (trustAgentJudgment === true && agentClaim === "completed") {
    return {status:"completed", missing:[], reason:"mandated_agent_completion_accepted",
      acceptance_basis:"agent_judgment"};
  }
  if (trustAgentJudgment === true && agentClaim === "blocked") {
    return {status:"blocked", missing, reason:"mandated_agent_reported_blocker",
      acceptance_basis:"agent_judgment"};
  }
  if (trustAgentJudgment === true && typeof agentNextAction === "string" &&
      /^[a-zA-Z0-9_.:-]{1,96}$/.test(agentNextAction)) {
    return {status:"continue", missing, next_action:agentNextAction,
      reason:"mandated_agent_next_action",acceptance_basis:"agent_judgment"};
  }
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
