/**
 * Pure Phase-1 resumability audit.
 *
 * GitHub retrieval, continuation emission, and CLI formatting stay outside
 * this function so an audit cannot mutate an Issue or hide a network call.
 * Missing semantics are reported. They are not inferred by a model.
 */
import { createHash } from "node:crypto";

export const RESUMABLE_AUDIT_SCHEMA = "cogentia.resumable-issue-audit/v1";

export const AUDIT_EXIT = {
  PASS: 0,
  PARTIAL: 2,
  JUDGMENT_REQUIRED: 3,
  FAIL: 4,
};

const GOAL_HEADINGS = ["goal", "objectif"];
const GOAL_CONFLICT_HEADINGS = ["goal candidates", "conflicting goals", "ambiguous goal"];
const STATE_HEADINGS = ["current state", "status", "baseline", "decisions already taken"];
const CONTEXT_HEADINGS = [
  "context references",
  "canonical references",
  "durable references",
  "target documents",
  "target files",
  "read first",
];
const CONSTRAINT_HEADINGS = ["constraints", "non-goals", "invariants"];
const AUTHORITY_HEADINGS = ["authority", "effect ceiling", "coding-handler mandate", "coding mandate", "resumption coding mandate"];
const NEXT_HEADINGS = [
  "agent-resumable next action",
  "agent-resumable next step",
  "agent-resumable next steps",
  "next action",
  "next step",
  "working method",
];
const ACCEPTANCE_HEADINGS = ["acceptance", "return packet", "definition of done"];
const STOP_HEADINGS = ["stop conditions", "stop condition"];
const RATIONALE_HEADINGS = ["rationale", "original rationale"];

const EFFECT_STEMS = ["deploy", "merge", "commit", "push", "edit", "test", "rewrite", "send", "secret"];
const CONSEQUENTIAL_STEMS = ["deploy", "merge", "secret", "rewrite"];

const STRONG_NEXT = /^(?:inspect|read|add|implement|write|run|verify|report|test|check|edit|create|define|compare|open|search|audit|fetch|confirm)\b/i;
const WEAK_NEXT = /^(?:continue|finish|investigate|look into|work on|implement the architecture|finish the work|continue this|investigate more)\b/i;

export function auditResumableIssue(issue, options = {}) {
  const body = String(issue?.body || "");
  const comments = normalizeComments(issue?.comments);
  const sources = [
    { label: "body", sections: parseSections(body) },
    ...comments.map((comment, index) => ({
      label: `comment:${index + 1}`,
      sections: parseSections(comment.body),
      comment,
    })),
  ];
  const fileExists = typeof options.fileExists === "function" ? options.fileExists : null;
  const blob = [body, ...comments.map(comment => comment.body)].join("\n");
  const material = isMaterial(blob);

  const goalSection = latestSection(sources, GOAL_HEADINGS, GOAL_CONFLICT_HEADINGS);
  const conflictSection = latestSection(sources, GOAL_CONFLICT_HEADINGS);
  const conflictItems = bulletItems(conflictSection?.text || "");
  const goalAmbiguous = conflictItems.length >= 2;
  const goal = dimensionFromSection(goalSection, goalAmbiguous ? "ambiguous" : classifyGoal(goalSection?.text || ""));
  if (goalAmbiguous) {
    goal.status = "ambiguous";
    goal.judgment_required = true;
    goal.alternatives = conflictItems;
    goal.evidence = [
      ...(goal.evidence || []),
      evidenceFrom(conflictSection, "explicit"),
    ].filter(Boolean);
    goal.note = "More than one goal candidate is explicit. The audit does not choose one.";
  }

  const currentState = dimensionFromSection(
    latestSection(sources, STATE_HEADINGS),
    null,
  );
  currentState.status = classifyCurrentState(currentState.text);

  const contextSection = latestSection(sources, CONTEXT_HEADINGS);
  const contextPaths = unique(extractRepoPaths(contextSection?.text || ""));
  const checkedPaths = contextPaths.map(ref => classifyPath(ref, fileExists));
  const dangling = checkedPaths.filter(item => item.state === "dangling");
  const unchecked = checkedPaths.filter(item => item.state === "unchecked");
  const issueRefs = unique(extractIssueRefs(contextSection?.text || ""));
  const contextReferences = {
    status: classifyContext({
      text: contextSection?.text || "",
      paths: checkedPaths,
      issueRefs,
      material,
    }),
    epistemic: contextSection ? "explicit" : "unknown",
    evidence: evidenceList(contextSection),
    dangling: dangling.map(item => item.ref),
    unchecked: unchecked.map(item => item.ref),
    references: [
      ...checkedPaths.map(item => ({ kind: "path", ...item, epistemic: item.state === "unchecked" ? "unknown" : "observed" })),
      ...issueRefs.map(ref => ({ kind: "issue", ref, state: "unchecked", epistemic: "explicit" })),
    ],
  };

  const constraintSection = latestSection(sources, CONSTRAINT_HEADINGS);
  const authoritySectionForBounds = latestSection(sources, AUTHORITY_HEADINGS);
  let constraints = dimensionFromSection(constraintSection, classifyConstraints(constraintSection?.text || "", material));
  if (!constraintSection && authoritySectionForBounds && /\b(must not|do not)\b/i.test(authoritySectionForBounds.text)) {
    constraints = dimensionFromSection(authoritySectionForBounds, "present");
    constraints.note = "Boundaries are explicit in the authority section.";
  }

  const authoritySection = latestSection(sources, AUTHORITY_HEADINGS);
  const ceilingText = [authoritySection?.text || "", constraintSection?.text || ""].filter(Boolean).join("\n");
  const authority = classifyAuthority({
    ceilingText,
    nextActionText: latestSection(sources, NEXT_HEADINGS)?.text || "",
    goalText: goalSection?.text || "",
    section: authoritySection || constraintSection,
  });

  const nextSection = latestSection(sources, NEXT_HEADINGS);
  const nextAction = dimensionFromSection(nextSection, classifyNextAction(nextSection?.text || ""));

  const acceptanceSection = latestSection(sources, ACCEPTANCE_HEADINGS);
  const acceptance = dimensionFromSection(acceptanceSection, classifyAcceptance(acceptanceSection?.text || ""));

  const stopSection = latestSection(sources, STOP_HEADINGS);
  const stopConditions = dimensionFromSection(stopSection, classifyStop(stopSection?.text || "", material));

  const rationaleSection = latestSection(sources, RATIONALE_HEADINGS);
  const originalRationale = rationaleSection
    ? dimensionFromSection(rationaleSection, "explicit")
    : {
      status: "unknown",
      epistemic: "unknown",
      evidence: [],
      text: "",
      note: "No explicit rationale section. The audit does not infer one from observed actions.",
    };

  const closure = closeAudit({
    goal,
    current_state: currentState,
    context_references: contextReferences,
    constraints,
    authority,
    next_action: nextAction,
    acceptance,
    stop_conditions: stopConditions,
  });

  const judgmentQuestions = buildJudgmentQuestions({
    goal,
    authority,
    repository: issue?.repository || "",
    number: Number(issue?.number || 0),
  });
  const repairs = buildRepairs({
    goal,
    context_references: contextReferences,
    next_action: nextAction,
    acceptance,
    constraints,
    stop_conditions: stopConditions,
  });

  return {
    schema: RESUMABLE_AUDIT_SCHEMA,
    phase: 1,
    issue: {
      repository: String(issue?.repository || ""),
      number: Number(issue?.number || 0),
      title: String(issue?.title || ""),
      state: String(issue?.state || ""),
      url: String(issue?.url || ""),
    },
    material,
    supersession_rule: "later_same_heading_section",
    goal: publicDimension(goal),
    current_state: publicDimension(currentState),
    context_references: contextReferences,
    constraints: publicDimension(constraints),
    authority,
    next_action: publicDimension(nextAction),
    acceptance: publicDimension(acceptance),
    stop_conditions: publicDimension(stopConditions),
    original_rationale: publicDimension(originalRationale),
    cold_handler_closure: closure,
    deterministic_repairs: repairs,
    judgment_questions: judgmentQuestions,
    continuations: judgmentQuestions.map(question => preparedContinuation(issue, question)),
    historical_preservation: {
      phase1_mutates_issue: false,
      original_body_sha256: sha256(body),
      note: "Phase 1 records the body hash for a later refactor trace. It does not rewrite the issue.",
    },
    effects: {
      github_issue_mutation: false,
      git_commit: false,
      git_push: false,
      branch_created: false,
      deployment: false,
      external_communication: false,
      continuation_emitted: false,
    },
    exit_code: AUDIT_EXIT[closure.status],
  };
}

export function auditExitCode(status) {
  return AUDIT_EXIT[status] ?? 1;
}

export function renderResumableIssueAudit(audit) {
  const issue = audit.issue || {};
  const label = issue.repository
    ? `${issue.repository}#${issue.number || "?"}`
    : "(local fixture)";
  const lines = [
    `Resumable-issue audit  ${label}`,
    `schema: ${audit.schema}`,
    `closure: ${audit.cold_handler_closure?.status}`,
    "",
  ];
  for (const key of [
    "goal",
    "current_state",
    "context_references",
    "constraints",
    "authority",
    "next_action",
    "acceptance",
    "stop_conditions",
    "original_rationale",
  ]) {
    const dim = audit[key] || {};
    lines.push(`${key}: ${dim.status || "missing"}`);
    if (dim.note) lines.push(`  note: ${dim.note}`);
    if (Array.isArray(dim.dangling) && dim.dangling.length) {
      lines.push(`  dangling: ${dim.dangling.join(", ")}`);
    }
    if (Array.isArray(dim.alternatives) && dim.alternatives.length) {
      for (const alternative of dim.alternatives) lines.push(`  candidate: ${alternative}`);
    }
  }
  const reasons = audit.cold_handler_closure?.reasons || [];
  lines.push("", reasons.length ? "reasons:" : "reasons: none");
  for (const reason of reasons) lines.push(`- ${reason}`);
  lines.push("", audit.deterministic_repairs?.length ? "deterministic repairs:" : "deterministic repairs: none");
  for (const repair of audit.deterministic_repairs || []) {
    lines.push(`- ${repair.dimension}: ${repair.suggestion}`);
  }
  lines.push("", audit.judgment_questions?.length ? "judgment:" : "judgment: none");
  for (const question of audit.judgment_questions || []) {
    lines.push(`- ${question.reason}: ${question.question}`);
  }
  lines.push("", "remote side effects: none");
  if (audit.effects?.continuation_emitted) {
    lines.push("local continuation emitted: yes");
  }
  return lines.join("\n");
}

function closeAudit(dims) {
  const reasons = [];
  const judgment = [];
  if (dims.goal.status === "missing") reasons.push("goal_missing");
  if (dims.goal.status === "partial") reasons.push("goal_partial");
  if (dims.goal.status === "ambiguous") judgment.push("ambiguous_current_goal");
  if (dims.current_state.status === "missing") reasons.push("current_state_missing");
  if (dims.current_state.status === "partial") reasons.push("current_state_partial");
  if (dims.context_references.status === "dangling") reasons.push("dangling_required_reference");
  if (dims.context_references.status === "missing") reasons.push("context_references_missing");
  if (dims.context_references.status === "partial") reasons.push("context_references_unverified");
  if (dims.constraints.status === "missing") reasons.push("constraints_missing");
  if (dims.authority.status === "ambiguous") judgment.push(dims.authority.reason || "authority_ambiguous");
  if (dims.next_action.status === "missing") reasons.push("next_action_missing");
  if (dims.next_action.status === "weak") reasons.push("next_action_weak");
  if (dims.acceptance.status === "missing") reasons.push("acceptance_missing");
  if (dims.acceptance.status === "partial") reasons.push("acceptance_partial");
  if (dims.stop_conditions.status === "missing") reasons.push("stop_conditions_missing");

  let status = "PASS";
  if (judgment.length) status = "JUDGMENT_REQUIRED";
  else if (reasons.includes("goal_missing") || reasons.includes("dangling_required_reference")) status = "FAIL";
  else if (reasons.length) status = "PARTIAL";
  return { status, reasons: [...judgment, ...reasons] };
}

function buildJudgmentQuestions({ goal, authority, repository, number }) {
  const questions = [];
  if (goal.status === "ambiguous") {
    questions.push({
      reason: "ambiguous_current_goal",
      question: "Which explicit goal candidate is current?",
      alternatives: goal.alternatives || [],
      epistemic: "unknown",
      repository,
      number,
      note: "Present-day judgment. Not a historical fact about the original issue.",
    });
  }
  if (authority.status === "ambiguous") {
    questions.push({
      reason: authority.reason || "authority_ambiguous",
      question: authority.question || "Which effect ceiling is current?",
      alternatives: authority.alternatives || [],
      epistemic: "unknown",
      repository,
      number,
      note: "Present-day judgment. Absence of a ceiling is not unlimited authority and is not a historical grant.",
    });
  }
  return questions;
}

function preparedContinuation(issue, question) {
  return {
    emitted: false,
    continuation_id: null,
    protocol: "cogentia.continuation.v2",
    kind: "judgment",
    reason: question.reason,
    title: `Resumability judgment: ${question.reason}`,
    question: question.question,
    alternatives: question.alternatives,
    subject: {
      repository: issue?.repository || question.repository || "",
      number: Number(issue?.number || question.number || 0),
    },
    context: {
      historical_status: "new_judgment_not_historical_fact",
      reason: question.reason,
      alternatives: question.alternatives,
      note: question.note,
    },
    expected_response: {
      format: "json",
      required: ["decision", "reason"],
    },
  };
}

function buildRepairs(dims) {
  const repairs = [];
  if (dims.goal.status === "missing") {
    repairs.push({ dimension: "goal", suggestion: "Add a Goal section that states the requested work." });
  }
  if (dims.context_references.status === "dangling") {
    for (const ref of dims.context_references.dangling) {
      repairs.push({
        dimension: "context_references",
        suggestion: `Repair or replace the dangling required reference ${ref}.`,
      });
    }
  }
  if (dims.next_action.status === "missing" || dims.next_action.status === "weak") {
    repairs.push({
      dimension: "next_action",
      suggestion: "Add an Agent-resumable Next Action made of concrete steps such as inspect, edit, test, and report.",
    });
  }
  if (dims.acceptance.status === "missing") {
    repairs.push({
      dimension: "acceptance",
      suggestion: "Add an Acceptance / Return section stating what success looks like and what to leave behind.",
    });
  }
  if (dims.constraints.status === "missing") {
    repairs.push({
      dimension: "constraints",
      suggestion: "Add the material constraints and non-goals, or mark them not required.",
    });
  }
  if (dims.stop_conditions.status === "missing") {
    repairs.push({
      dimension: "stop_conditions",
      suggestion: "Add stop conditions for the material risks, including missing authority or inaccessible references.",
    });
  }
  return repairs;
}

function classifyAuthority({ ceilingText, nextActionText, goalText, section }) {
  const lines = ceilingText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const mayLines = lines.filter(line => /^(?:[-*]|\d+[.)]\s*)?MAY\b/i.test(line.replace(/^[-*]\s*/, "")));
  const mustNotLines = lines.filter(line => /^(?:[-*]|\d+[.)]\s*)?MUST NOT\b/i.test(stripBullet(line)) || /^DO NOT\b/i.test(stripBullet(line)) || /\bmust not\b/i.test(line) || /\bdo not\b/i.test(line));
  const mayStems = stemsIn(mayLines.join("\n"));
  const mustNotStems = stemsIn(mustNotLines.join("\n"));
  const conflicts = [...mayStems].filter(stem => mustNotStems.has(stem));
  const contemplated = consequentialStems(`${nextActionText}\n${goalText}`);
  const uncovered = contemplated.filter(stem => !mayStems.has(stem) && !mustNotStems.has(stem));
  const base = {
    epistemic: section ? "explicit" : "unknown",
    evidence: evidenceList(section),
    interpreted_as_unlimited: false,
    effect_ceiling: (mayLines.length || mustNotLines.length)
      ? { may: [...mayStems], must_not: [...mustNotStems] }
      : null,
    judgment_required: false,
    alternatives: [],
  };
  if (conflicts.length) {
    return {
      ...base,
      status: "ambiguous",
      judgment_required: true,
      reason: "authority_conflict",
      question: `Which effect ceiling is current for ${conflicts.join(", ")}?`,
      alternatives: lines.filter(line => conflicts.some(stem => new RegExp(`\\b${stem}\\b`, "i").test(line))),
      note: "The same effect is both allowed and forbidden. The audit does not choose a ceiling.",
    };
  }
  if (uncovered.length) {
    return {
      ...base,
      status: "ambiguous",
      judgment_required: true,
      reason: "authority_missing_for_consequential_effect",
      question: `What is the effect ceiling for ${uncovered.join(", ")}?`,
      alternatives: [],
      note: "Consequential work is contemplated and no effect ceiling covers it. Absence of authorization is not a grant. The External Side-Effect Gate in instructions/AGENTS.shared.md remains authoritative.",
    };
  }
  if (mayLines.length || mustNotLines.length) {
    return {
      ...base,
      status: "present",
      note: "Explicit effect ceiling. Effects that are not listed are not granted.",
    };
  }
  return {
    ...base,
    status: "inherited_gate",
    epistemic: "explicit",
    note: "No explicit wider mandate. The External Side-Effect Gate in instructions/AGENTS.shared.md remains authoritative.",
  };
}

function classifyPath(ref, fileExists) {
  if (!fileExists) return { ref, state: "unchecked" };
  const exists = fileExists(ref);
  if (exists === true) return { ref, state: "present" };
  if (exists === false) return { ref, state: "dangling" };
  return { ref, state: "unchecked" };
}

function classifyContext({ text, paths, issueRefs, material }) {
  if (paths.some(item => item.state === "dangling")) return "dangling";
  if (!text && paths.length === 0 && issueRefs.length === 0) return material ? "missing" : "not_required";
  if (paths.some(item => item.state === "unchecked")) return "partial";
  if (paths.length || issueRefs.length) return "sufficient";
  return "partial";
}

function classifyGoal(text) {
  if (!text.trim()) return "missing";
  if (isPlaceholder(text) || text.trim().length < 20) return "partial";
  return "present";
}

function classifyCurrentState(text) {
  if (!text.trim()) return "missing";
  if (isPlaceholder(text) || text.trim().length < 20) return "partial";
  return "present";
}

function classifyNextAction(text) {
  if (!text.trim()) return "missing";
  const lines = actionableLines(text);
  if (!lines.length) return "missing";
  const strong = lines.some(line => STRONG_NEXT.test(line));
  const weak = lines.every(line => WEAK_NEXT.test(line));
  if (strong && !weak) return "present";
  return "weak";
}

function classifyAcceptance(text) {
  if (!text.trim()) return "missing";
  if (/\[\s*[ xX]?\]/.test(text) || /success means/i.test(text) || /\bresult:\s*(completed|partial|blocked)\b/i.test(text)) {
    return "present";
  }
  return "partial";
}

function classifyConstraints(text, material) {
  if (!text.trim()) return material ? "missing" : "not_required";
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const bounded = lines.some(line => /\b(must not|do not|non-goal|forbidden)\b/i.test(line));
  if (bounded || lines.length >= 2) return "present";
  return "partial";
}

function classifyStop(text, material) {
  if (!text.trim()) return material ? "missing" : "not_required";
  return text.trim().length < 20 ? "partial" : "present";
}

function isMaterial(text) {
  if (text.length > 2500) return true;
  return /\b(deploy|production|secrets?|merge\b|push\b|rewrite|effect ceiling|phase \d)\b/i.test(text);
}

function isPlaceholder(text) {
  return /^(tbd|todo|continue|improve things|wip|\?+|n\/a|none)\.?$/i.test(text.trim());
}

function consequentialStems(text) {
  const found = new Set();
  if (/\bdeploy\b/i.test(text)) found.add("deploy");
  if (/\bmerge\b/i.test(text)) found.add("merge");
  if (/\bsecrets?\b/i.test(text)) found.add("secret");
  if (/\brewrite\b/i.test(text)) found.add("rewrite");
  return [...found].filter(stem => CONSEQUENTIAL_STEMS.includes(stem));
}

function stemsIn(text) {
  const found = new Set();
  for (const stem of EFFECT_STEMS) {
    if (new RegExp(`\\b${stem}\\b`, "i").test(text)) found.add(stem);
  }
  return found;
}

function latestSection(sources, names, exclude = []) {
  const matches = [];
  for (const source of sources) {
    for (const section of source.sections) {
      if (!headingMatches(section.heading, names, exclude)) continue;
      const text = section.lines.join("\n").trim();
      if (!text) continue;
      matches.push({
        source: source.label,
        heading: section.heading,
        text,
        epistemic: "explicit",
      });
    }
  }
  if (!matches.length) return null;
  const current = matches[matches.length - 1];
  current.prior = matches.slice(0, -1).map(item => ({ ...item, epistemic: "superseded" }));
  return current;
}

function headingMatches(heading, names, exclude = []) {
  const excluded = exclude.map(normalizeHeading);
  const wanted = names.map(normalizeHeading);
  if (excluded.some(name => heading === name || heading.startsWith(`${name} `))) return false;
  return wanted.some(name => heading === name || heading.startsWith(`${name} `));
}

function dimensionFromSection(section, status) {
  return {
    status: status || (section ? "present" : "missing"),
    epistemic: section?.epistemic || "unknown",
    evidence: evidenceList(section),
    text: section?.text || "",
  };
}

function evidenceList(section) {
  if (!section) return [];
  const prior = (section.prior || []).map(item => evidenceFrom(item, "superseded"));
  return [...prior, evidenceFrom(section, section.epistemic || "explicit")];
}

function evidenceFrom(section, epistemic) {
  if (!section) return null;
  return {
    source: section.source,
    heading: section.heading,
    excerpt: excerpt(section.text),
    epistemic,
  };
}

function publicDimension(dimension) {
  const copy = { ...dimension };
  delete copy.text;
  return copy;
}

function parseSections(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const sections = [];
  let current = { heading: "", level: 0, lines: [] };
  let fence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      current.lines.push(line);
      continue;
    }
    if (!fence) {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (match) {
        sections.push(current);
        current = { heading: normalizeHeading(match[2]), level: match[1].length, lines: [] };
        continue;
      }
    }
    current.lines.push(line);
  }
  sections.push(current);
  return sections;
}

function normalizeHeading(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[/#:_—–-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComments(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map(comment => {
    if (typeof comment === "string") return { body: comment, author: "", created_at: "" };
    return {
      body: String(comment?.body || ""),
      author: typeof comment?.author === "string" ? comment.author : comment?.author?.login || "",
      created_at: comment?.created_at || comment?.createdAt || "",
    };
  }).filter(comment => comment.body.trim());
}

function extractRepoPaths(text) {
  const out = [];
  const fenced = stripFences(text);
  const backticked = /`([^`\n]+)`/g;
  let match;
  while ((match = backticked.exec(fenced))) {
    const value = match[1].trim().replace(/\\/g, "/");
    if (isRepoPath(value)) out.push(value);
  }
  const bare = /^\s*[-*]\s+((?:[\w.@+-]+\/)+[\w.@+-]+\.[A-Za-z0-9]+)\s*$/gm;
  while ((match = bare.exec(fenced))) out.push(match[1].replace(/\\/g, "/"));
  return out;
}

function extractIssueRefs(text) {
  const out = [];
  const re = /(?:^|\s)([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?#\d+)\b/g;
  let match;
  while ((match = re.exec(stripFences(text)))) out.push(match[1]);
  return out;
}

function isRepoPath(value) {
  if (!value || value.includes("://") || value.includes("*") || value.includes("..")) return false;
  return /^(?:[\w.@+-]+\/)+[\w.@+-]+\.[A-Za-z0-9]+$/.test(value);
}

function stripFences(text) {
  return String(text || "").replace(/```[\s\S]*?```/g, "");
}

function bulletItems(text) {
  return stripFences(text)
    .split(/\r?\n/)
    .map(line => line.match(/^\s*[-*]\s+(.+)\s*$/))
    .filter(Boolean)
    .map(match => match[1].trim())
    .filter(item => item && !isPlaceholder(item));
}

function actionableLines(text) {
  return text.split(/\r?\n/)
    .map(line => stripBullet(line))
    .filter(line => line && !/^success means:?$/i.test(line));
}

function stripBullet(line) {
  return String(line || "").trim().replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "");
}

function excerpt(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > 240 ? `${clean.slice(0, 239).trimEnd()}…` : clean;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
