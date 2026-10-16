import { auditResumableIssue } from "./resumable-issue-audit.js";
import { preflightHandoff } from "./handoff-preflight.js";
export function orientResumableIssue(issue, options = {}) {
  const a = auditResumableIssue(issue, {fileExists: options.fileExists});
  const verified = (Array.isArray(options.verifiedChanges) ? options.verifiedChanges : []).filter(x => x && x.verified === true && typeof x.ref === "string" && x.ref.trim() && typeof x.description === "string" && x.description.trim());
  const preflight = preflightHandoff(issue, {fileExists: options.fileExists, baseline: options.baseline});
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
