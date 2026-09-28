/**
 * Read-only Phase-2 resumability plan.
 *
 * Produces a proposed Issue body and a stable hash. It does not edit GitHub.
 * Strict audit headings stay strict. Explicit paths found under other headings
 * can be reorganized under "Context References" and are labeled as present-day
 * reorganization. A path proved absent from the audit root is not required
 * context: it is recorded under "Cross-repository dependencies". Missing
 * judgments are not invented.
 */
import { createHash } from "node:crypto";
import {
  auditResumableIssue,
  explicitIssueReferences,
} from "./resumable-issue-audit.js";

export const RESUMABLE_PLAN_SCHEMA = "cogentia.resumable-issue-plan/v1";
export const RESUMABLE_PLAN_METHOD = "cogentia.resumable-issue-plan/v1";

const NO_EFFECTS = {
  github_issue_mutation: false,
  git_commit: false,
  git_push: false,
  branch_created: false,
  deployment: false,
  external_communication: false,
  continuation_emitted: false,
  plan_applied: false,
};

const JUDGMENT_FILLS = {
  ambiguous_current_goal: { heading: "Goal", retitle: ["goal candidates", "conflicting goals", "ambiguous goal"], historicalHeading: "Historical goal candidates" },
  authority_conflict: { heading: "Authority", retitle: ["authority", "effect ceiling"], historicalHeading: "Historical authority" },
  authority_missing_for_consequential_effect: { heading: "Authority", retitle: [], historicalHeading: "" },
  current_state_missing: { heading: "Current state", retitle: [], historicalHeading: "" },
  next_action_missing: { heading: "Agent-resumable Next Action", retitle: [], historicalHeading: "" },
  next_action_weak: { heading: "Agent-resumable Next Action", retitle: [], historicalHeading: "" },
  acceptance_missing: { heading: "Acceptance / Return", retitle: [], historicalHeading: "" },
  goal_missing: { heading: "Goal", retitle: [], historicalHeading: "" },
  constraints_missing: { heading: "Constraints", retitle: [], historicalHeading: "" },
  stop_conditions_missing: { heading: "Stop conditions", retitle: [], historicalHeading: "" },
};

export function planResumableIssue(issue, options = {}) {
  const stepResults = normalizeStepResults(options.stepResults);
  const audit = auditResumableIssue(issue, options);
  const answered = new Set(stepResults.map(result => result.reason));
  const unanswered = (audit.judgment_questions || []).filter(question => !answered.has(question.reason));
  const base = {
    schema: RESUMABLE_PLAN_SCHEMA,
    phase: 2,
    method: RESUMABLE_PLAN_METHOD,
    issue: audit.issue,
    audit_closure: audit.cold_handler_closure,
    original_body_sha256: sha256(issue?.body || ""),
    effects: { ...NO_EFFECTS },
    strict_context_headings: true,
  };

  if (unanswered.length) {
    return {
      ...base,
      status: "needs_judgment",
      unanswered_judgments: unanswered,
      proposed_body: null,
      proposed_body_sha256: null,
      sections: [],
      unfilled_gaps: [],
      predicted_closure: null,
      note: "No replacement body is proposed while a material judgment is unanswered.",
      exit_code: 3,
    };
  }

  let proposedBody = String(issue?.body || "");
  const sections = [{
    id: "original_body",
    origin: "historical",
    sha256: base.original_body_sha256,
  }];
  const additions = [];

  for (const result of stepResults) {
    const fill = JUDGMENT_FILLS[result.reason];
    if (!fill) continue;
    if (fill.retitle.length) {
      proposedBody = retitleHeadings(proposedBody, fill.retitle, fill.historicalHeading);
      sections.push({
        id: `${result.reason}:historical_heading`,
        origin: "present_judgment",
        change: `renamed explicit heading to "${fill.historicalHeading}"`,
        reason: result.reason,
      });
    }
    additions.push(presentJudgmentSection(fill.heading, result));
    sections.push({
      id: result.reason,
      origin: "present_judgment",
      heading: fill.heading,
      reason: result.reason,
    });
  }

  const contextMissing = audit.context_references?.status === "missing";
  const harvested = harvestedContext(contextMissing, issue);
  const partitioned = partitionHarvested(harvested, options.fileExists);
  if (contextMissing && partitioned.required.length) {
    additions.push(contextSection(partitioned.required));
    sections.push({
      id: "context_references",
      origin: "reorganized_explicit",
      headings: [...new Set(partitioned.required.map(item => item.heading))],
      refs: partitioned.required.map(item => item.ref),
    });
  }
  if (contextMissing && partitioned.external.length) {
    additions.push(externalSection(partitioned.external));
    sections.push({
      id: "external_references",
      origin: "reorganized_explicit",
      headings: [...new Set(partitioned.external.map(item => item.heading))],
      refs: partitioned.external.map(item => item.ref),
      note: "Absent from the audit root. External references, not required context.",
    });
  }

  if (additions.length) {
    const banner = refactorBanner(base.original_body_sha256);
    proposedBody = `${proposedBody.replace(/\s*$/, "")}\n\n${banner}\n\n${additions.join("\n\n")}\n`;
    sections.push({
      id: "resumability_refactor",
      origin: "present_judgment",
      note: "Marks the plan addition. It does not claim the original Issue was written this way.",
    });
  }

  const unfilled = unfilledGaps(audit, sections, partitioned.required);
  const predicted = auditResumableIssue({ ...issue, body: proposedBody }, options);
  const unchanged = proposedBody === String(issue?.body || "");
  let status = "proposed";
  if (unchanged && audit.cold_handler_closure.status === "PASS") status = "already_sufficient";
  else if (unchanged) status = "incomplete";

  return {
    ...base,
    status,
    unanswered_judgments: [],
    proposed_body: proposedBody,
    proposed_body_sha256: sha256(proposedBody),
    sections,
    unfilled_gaps: unfilled,
    predicted_closure: predicted.cold_handler_closure,
    predicted_context: {
      status: predicted.context_references.status,
      dangling: predicted.context_references.dangling,
    },
    note: planNote(status, unfilled),
    exit_code: exitCodeFor(status, predicted.cold_handler_closure.status),
  };
}

export function renderResumableIssuePlan(plan) {
  const issue = plan.issue || {};
  const label = issue.repository ? `${issue.repository}#${issue.number || "?"}` : "(local fixture)";
  const lines = [
    `Resumable-issue plan  ${label}`,
    `schema: ${plan.schema}`,
    `status: ${plan.status}`,
    `original_body_sha256: ${plan.original_body_sha256}`,
    `proposed_body_sha256: ${plan.proposed_body_sha256 || "(none)"}`,
    `predicted closure: ${plan.predicted_closure?.status || "(not planned)"}`,
    "",
  ];
  const reasons = plan.predicted_closure?.reasons || [];
  lines.push(reasons.length ? "predicted reasons:" : "predicted reasons: none");
  for (const reason of reasons) lines.push(`- ${reason}`);
  lines.push("", plan.unfilled_gaps?.length ? "unfilled gaps:" : "unfilled gaps: none");
  for (const gap of plan.unfilled_gaps || []) lines.push(`- ${gap}`);
  lines.push("", "sections:");
  for (const section of plan.sections || []) {
    lines.push(`- ${section.id}: ${section.origin}`);
  }
  if (plan.unanswered_judgments?.length) {
    lines.push("", "unanswered judgments:");
    for (const question of plan.unanswered_judgments) {
      lines.push(`- ${question.reason}: ${question.question}`);
    }
  }
  lines.push("", "remote side effects: none");
  lines.push("plan applied: no");
  if (plan.proposed_body) {
    lines.push("", "proposed body:", plan.proposed_body);
  }
  return lines.join("\n");
}

function harvestReferences(issue) {
  const texts = [
    ["body", issue?.body || ""],
    ...normalizeCommentTexts(issue?.comments).map((body, index) => [`comment:${index + 1}`, body]),
  ];
  const byRef = new Map();
  for (const [source, text] of texts) {
    for (const block of explicitIssueReferences(text)) {
      for (const ref of [...block.paths, ...block.issues]) {
        const key = `${block.paths.includes(ref) ? "path" : "issue"}:${ref}`;
        const entry = byRef.get(key) || {
          ref,
          kind: block.paths.includes(ref) ? "path" : "issue",
          places: [],
        };
        entry.places.push({ source, heading: block.heading });
        byRef.set(key, entry);
      }
    }
  }
  return [...byRef.values()].map(entry => ({
    ...entry,
    heading: entry.places.map(place => place.heading).filter((heading, index, all) => all.indexOf(heading) === index).join(", "),
  }));
}

function harvestedContext(contextMissing, issue) {
  return contextMissing ? harvestReferences(issue) : [];
}

function partitionHarvested(harvested, fileExists) {
  const required = [];
  const external = [];
  const canProveAbsence = typeof fileExists === "function";
  for (const item of harvested) {
    if (item.kind === "path" && canProveAbsence && fileExists(item.ref) === false) {
      external.push(item);
    } else {
      required.push(item);
    }
  }
  return { required, external };
}

function contextSection(harvested) {
  const lines = [
    "## Context References",
    "",
    "Present-day reorganization. These references were already explicit in this Issue under other headings. This heading is new. It is not a claim that the original Issue used it.",
    "",
  ];
  for (const item of harvested) {
    const shown = item.kind === "path" ? `\`${item.ref}\`` : item.ref;
    const places = item.places.map(place => `${place.source} / ${place.heading}`).join("; ");
    lines.push(`- ${shown} (explicit in ${places})`);
  }
  return lines.join("\n");
}

function externalSection(harvested) {
  const lines = [
    "## Cross-repository dependencies",
    "",
    "Present-day reorganization. These paths were already explicit in this Issue, and they are absent from this repository. They stay external references. They are not required context for a handler rooted in this repository.",
    "",
  ];
  for (const item of harvested) {
    const places = item.places.map(place => `${place.source} / ${place.heading}`).join("; ");
    lines.push(`- \`${item.ref}\` (explicit in ${places})`);
  }
  return lines.join("\n");
}

function presentJudgmentSection(heading, result) {
  const lines = [
    `## ${heading}`,
    "",
    result.decision,
    "",
    "Present-day judgment recorded by a supplied StepResult. This is not a historical fact about the original Issue.",
  ];
  if (result.explanation) lines.push("", result.explanation);
  return lines.join("\n");
}

function refactorBanner(originalHash) {
  return [
    "## Resumability refactor",
    "",
    "```yaml",
    "resumability_refactor:",
    "  status: plan_not_applied",
    `  source_body_sha256: ${originalHash}`,
    `  method: ${RESUMABLE_PLAN_METHOD}`,
    "```",
    "",
    "This block is a present-day plan addition. Applying it requires a separate authorization.",
  ].join("\n");
}

function unfilledGaps(audit, sections, harvested) {
  const reasons = new Set(audit.cold_handler_closure?.reasons || []);
  const filled = new Set(sections.map(section => section.reason).filter(Boolean));
  if (harvested.length) reasons.delete("context_references_missing");
  for (const reason of filled) reasons.delete(reason);
  if (filled.has("next_action_weak")) reasons.delete("next_action_missing");
  if (filled.has("ambiguous_current_goal")) reasons.delete("ambiguous_current_goal");
  return [...reasons];
}

function planNote(status, unfilled) {
  if (status === "already_sufficient") return "The Issue already passes the strict audit. The proposed body is the original body.";
  if (status === "incomplete") return `Deterministic material was not enough to fill: ${unfilled.join(", ") || "remaining gaps"}. No missing section was invented.`;
  return "Proposed body only. The GitHub Issue was not modified.";
}

function exitCodeFor(status, predictedStatus) {
  if (status === "already_sufficient") return 0;
  if (status === "incomplete" && !predictedStatus) return 2;
  if (predictedStatus === "PASS") return 0;
  if (predictedStatus === "PARTIAL") return 2;
  if (predictedStatus === "JUDGMENT_REQUIRED") return 3;
  if (predictedStatus === "FAIL") return 4;
  return 2;
}

function normalizeStepResults(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.flatMap(item => Array.isArray(item) ? item : [item]).filter(item => item && item.reason && String(item.decision || "").trim()).map(item => ({
    reason: String(item.reason),
    decision: String(item.decision).trim(),
    explanation: String(item.explanation || item.reason_text || "").trim(),
  }));
}

function normalizeCommentTexts(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map(comment => typeof comment === "string" ? comment : comment?.body || "").filter(body => String(body).trim());
}

function retitleHeadings(body, names, replacement) {
  const wanted = new Set(names.map(normalizeLoose));
  let fence = false;
  return String(body).split(/\r?\n/).map(line => {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      return line;
    }
    if (fence) return line;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) return line;
    if (!wanted.has(normalizeLoose(match[2]))) return line;
    return `${match[1]} ${replacement}`;
  }).join("\n");
}

function normalizeLoose(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[/#:_—–-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
