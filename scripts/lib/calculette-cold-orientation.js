import { auditResumableIssue } from "./resumable-issue-audit.js";
import { preflightHandoff } from "./handoff-preflight.js";
export function orientResumableIssue(issue, options = {}) {
  const a = auditResumableIssue(issue, {fileExists: options.fileExists});
  const verified = (Array.isArray(options.verifiedChanges) ? options.verifiedChanges : []).filter(x => x && x.verified === true && typeof x.ref === "string" && x.ref.trim() && typeof x.description === "string" && x.description.trim());
  const preflight = preflightHandoff(issue, {fileExists: options.fileExists, baseline: options.baseline});
  return {
    schema: "cogentia.calculette.cold-orientation/v1",
    issue: a.issue,
    goal: a.goal,
    current_state: a.current_state,
    next_action: {...a.next_action, authorized: false},
    change_delta: {status: verified.length ? "externally_verified" : "unknown", verified},
    closure: a.cold_handler_closure,
    handoff_preflight: {closure:preflight.closure, first_step:preflight.first_step, dependencies:preflight.dependencies, reconciliation:preflight.reconciliation},
    blockers: [...a.cold_handler_closure.reasons, ...(a.context_references.dangling || []), ...preflight.closure.reasons.map(x => "handoff: " + x)],
    applicable_control: {status: "must_activate", verified: false},
    effects: {git_write:false, issue_mutation:false, external_act:false},
  };
}
