import { auditResumableIssue } from "./resumable-issue-audit.js";
import { preflightHandoff } from "./handoff-preflight.js";
export function orientResumableIssue(issue, options = {}) {
  const a = auditResumableIssue(issue, {fileExists: options.fileExists});
  const verified = (Array.isArray(options.verifiedChanges) ? options.verifiedChanges : []).filter(x => x && x.verified === true && typeof x.ref === "string" && x.ref.trim() && typeof x.description === "string" && x.description.trim());
  const preflight = preflightHandoff(issue, {fileExists: options.fileExists, baseline: options.baseline});
  // The original Next Action may be superseded by explicit post-merge work.
  // Preserve provenance and never turn newer text into execution authority.
  const body = String(issue?.body || "");
  const postMerge = body.match(/^##\s+Post-merge continuation[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/mi);
  const bodyLine = postMerge?.[1]?.split(/\r?\n/).find(line => /^\s*[-*]\s*Next bounded work\s*:/i.test(line));
  const bodyCandidate = bodyLine ? {source:"body",heading:"post-merge continuation",text:bodyLine.trim(),epistemic:"explicit_issue_claim",authorized:false} : null;
  const comments = Array.isArray(issue?.comments) ? issue.comments : [];
  const commentCandidates = comments.map((entry,index) => {
    const text = typeof entry === "string" ? entry : String(entry?.body || "");
    const line = text.split(/\r?\n/).find(x => /^\s*(?:[-*]\s*)?(?:next(?: bounded)? (?:action|step|work)|next\s+FBF|next:|prochaine (?:action|étape))\s*[:—-]\s*\S/i.test(x));
    return line ? {source:"comment",index:index+1,ref:entry?.html_url || entry?.url || null,text:line.trim(),epistemic:"unverified_comment_claim",authorized:false} : null;
  }).filter(Boolean);
  const latestCandidate = commentCandidates.at(-1) || bodyCandidate;
  // Janus: keep intent, execution receipts and achieved outcome separate.
  // Comments are claims until independently verified; no keyword can grant completion.
  const janusEvidence = comments.flatMap((entry,index) => {
    const text = typeof entry === "string" ? entry : String(entry?.body || "");
    const ref = entry?.html_url || entry?.url || null;
    const matched = /(?:matched benchmark batch|benchmark batch[12]|batch[12].*complete|control:.*assisted:)/i.test(text);
    if (!matched) return [];
    const control = /control[:\\s].*?(?:[0-9]+(?:\\.[0-9]+)?\\s*s|completed)/i.test(text);
    const assisted = /assisted[:\\s].*?(?:[0-9]+(?:\\.[0-9]+)?\\s*s|completed)/i.test(text);
    return [{source:"comment",index:index+1,ref,kind:"trial_execution_claim",
      control_claimed:control,assisted_claimed:assisted,
      epistemic:"reported_not_independently_verified"}];
  });
  const pairedClaims = janusEvidence.filter(e => e.control_claimed && e.assisted_claimed);
  const candidateIsBenchmark = Boolean(latestCandidate && /matched|benchmark|trial/i.test(latestCandidate.text));
  const janus = {
    schema:"cogentia.calculette.janus-reconciliation/v1",
    planned: Boolean(latestCandidate),
    execution: pairedClaims.length ? "reported_both_arms" : "not_established",
    result: pairedClaims.length ? "comparison_reported_quality_unverified" : "not_established",
    evidence:janusEvidence,
    independently_verified:false,
    requires_review:pairedClaims.length > 0,
    caution: "A completion report is not independent proof of validity, effectiveness or authorization."
  };
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
    janus_reconciliation: janus,
    next_action_reconciliation: {status:candidateIsBenchmark && pairedClaims.length ? "review_execution_receipts_before_repeat" : latestCandidate?.source==="comment" ? "review_newer_comment" : latestCandidate ? "review_post_merge_body" : "no_explicit_continuation", issue_body_may_be_stale:Boolean(latestCandidate)},
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
