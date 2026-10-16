import { auditResumableIssue } from "./resumable-issue-audit.js";
export function orientResumableIssue(issue, options = {}) {
  const a = auditResumableIssue(issue, {fileExists: options.fileExists});
  const verified = (options.verifiedChanges || []).filter(x => x.verified === true && x.ref && x.description);
  return {
    schema: "cogentia.calculette.cold-orientation/v1",
    issue: a.issue,
    goal: a.goal,
    current_state: a.current_state,
    next_action: {...a.next_action, authorized: false},
    change_delta: {status: verified.length ? "externally_verified" : "unknown", verified},
    closure: a.cold_handler_closure,
    blockers: [...a.cold_handler_closure.reasons, ...(a.context_references.dangling || [])],
    applicable_control: {status: "must_activate", verified: false},
    effects: {git_write:false, issue_mutation:false, external_act:false},
  };
}
