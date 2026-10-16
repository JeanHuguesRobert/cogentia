import { auditResumableIssue } from "./resumable-issue-audit.js";
import { preflightHandoff } from "./handoff-preflight.js";
export function orientResumableIssue(issue, options = {}) {
  const a = auditResumableIssue(issue, {fileExists: options.fileExists});
  const verified = (Array.isArray(options.verifiedChanges) ? options.verifiedChanges : []).filter(x => x && x.verified === true && typeof x.ref === "string" && x.ref.trim() && typeof x.description === "string" && x.description.trim());
  const preflight = preflightHandoff(issue, {fileExists: options.fileExists, baseline: options.baseline});
  // Comments are untrusted evidence: newer guidance is a candidate, never automatic authority.
  const comments = Array.isArray(issue?.comments) ? issue.comments : [];
  const candidates = comments.map((entry, index) => {
    const body = typeof entry === "string" ? entry : String(entry?.body || "");
    const line = body.split(/\r?\n/).find(x => /^\s*(?:[-*]\s*)?(?:next(?: bounded)? (?:action|step)|next:|prochaine (?:action|étape))\s*[:—-]\s*\S/i.test(x));
    return line ? {source:"comment",index:index+1,ref:entry?.html_url || entry?.url || null,text:line.trim(),epistemic:"unverified_comment_claim",authorized:false} : null;
  }).filter(Boolean);
  const latestCandidate = candidates.at(-1) || null;
  const controlPaths = ["AGENTS.md", "instructions/AGENTS.shared.md", "docs/continuations_and_cognitive_packets_for_agents.md"];
  const controls = controlPaths.map(ref => ({
    ref,
    reachable: typeof options.fileExists === "function" ? options.fileExists(ref) === true : null,
    activated: false,
  }));
  const missingControls = controls.filter(item => item.reachable === false).map(item => "control_unavailable: " + item.ref);
  const controlStatus = missingControls.length ? "blocked" : controls.every(item => item.reachable === true) ? "accessible_not_activated" : "access_unverified";
  return {
    schema: "cogentia.calculette.cold-orientation/v1",
    issue: a.issue,
    goal: a.goal,
    current_state: a.current_state,
    constraints: a.constraints,
    authority: a.authority,
    acceptance: a.acceptance,
    stop_conditions: a.stop_conditions,
    context_references: a.context_references,
    next_action: {...a.next_action, authorized: false},
    continuation_candidate: latestCandidate,
    next_action_reconciliation: {status:latestCandidate ? "review_newer_comment" : "no_explicit_comment_candidate", issue_body_may_be_stale:Boolean(latestCandidate)},
    change_delta: {status: verified.length ? "externally_verified" : "unknown", verified},
    closure: a.cold_handler_closure,
    handoff_preflight: {closure:preflight.closure, first_step:preflight.first_step, dependencies:preflight.dependencies, reconciliation:preflight.reconciliation},
    blockers: [...a.cold_handler_closure.reasons, ...(a.context_references.dangling || []), ...preflight.closure.reasons.map(x => "handoff: " + x), ...missingControls],
    applicable_control: {status: controlStatus, verified: false, controls},
    authorization: {status:"not_granted", reason:"read-only orientation cannot grant mandate; handler must activate applicable controls and check scope before acting"},
    effective_ready: false,
    effects: {git_write:false, issue_mutation:false, external_act:false},
  };
}
