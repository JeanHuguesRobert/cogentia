/**
 * Read-only preflight for a resumable handoff.
 *
 * Sibling of resumable-audit. It does not change that audit's closure, and it
 * does not fetch, write, reset, or execute a repair. Accessibility is decided
 * from explicit issue text plus an optional fileExists oracle for the target
 * handler's repository. A file the producer can see is not retrievable unless
 * the target handler's channel can retrieve it.
 */
export const HANDOFF_PREFLIGHT_SCHEMA = "cogentia.handoff-preflight/v1";

export const PREFLIGHT_EXIT = {
  PASS: 0,
  PARTIAL: 2,
  JUDGMENT_REQUIRED: 3,
  BLOCKED: 4,
};

const MEASURED_RISK = [
  "objective",
  "exposure",
  "recovery",
  "residue",
  "responsibility",
  "mandate",
  "budget",
  "option_loss",
];

const PRODUCER_CHANNELS = new Set([
  "chatgpt-library",
  "chatgpt",
  "chat-attachment",
  "private-memory",
  "producer-local",
  "unpublished",
  "local-draft",
]);
const HUMAN_CHANNELS = new Set(["human", "principal", "human-assist"]);
const NEXT_HEADINGS = [
  "agent-resumable next action",
  "agent-resumable next step",
  "agent-resumable next steps",
  "next action",
  "next step",
];
const MANDATE_HEADINGS = ["constraints", "non-goals", "authority", "effect ceiling"];
const FORBIDDEN_STEMS = ["commit", "edit", "deploy", "push", "reset", "overwrite"];

const NO_EFFECTS = {
  github_issue_mutation: false,
  git_commit: false,
  git_push: false,
  branch_created: false,
  deployment: false,
  external_communication: false,
  repair_executed: false,
  continuation_emitted: false,
};

export function preflightHandoff(issue, options = {}) {
  const fileExists = typeof options.fileExists === "function" ? options.fileExists : null;
  const sections = parseSections(issueText(issue));
  const next = latestSection(sections, NEXT_HEADINGS);
  const firstStep = firstActionableStep((next?.lines || []).join("\n"));
  const dependencies = collectDependencies(sections, firstStep, fileExists);
  const mandate = readMandate(sections);
  const baseline = readBaseline(sections, options.baseline);
  const necessary = necessaryMeans(dependencies, mandate);
  const reconciliation = reconcile(baseline, firstStep.text);
  const closure = closePreflight({ dependencies, necessary, reconciliation, firstStep });

  return {
    schema: HANDOFF_PREFLIGHT_SCHEMA,
    phase: 1,
    relationship_to_resumable_audit: "sibling command; resumable-audit closure is unchanged",
    issue: {
      repository: String(issue?.repository || ""),
      number: Number(issue?.number || 0),
      title: String(issue?.title || ""),
    },
    first_step: firstStep,
    dependencies,
    necessary_means: necessary,
    reconciliation,
    measured_risk: {
      governs: MEASURED_RISK,
      executed: false,
      authority_widened: false,
      note: "Phase 1 names the governing dimensions. It does not score them and it does not execute a repair.",
    },
    mandate: { forbids: mandate.forbids, authority_widened: false },
    closure,
    effects: { ...NO_EFFECTS },
    exit_code: PREFLIGHT_EXIT[closure.status] ?? 1,
  };
}

export function renderHandoffPreflight(result) {
  const lines = [
    `handoff preflight: ${result.closure.status}`,
    `first step: ${result.first_step.text || "(missing)"}`,
    "dependencies:",
  ];
  for (const dep of result.dependencies) {
    lines.push(`- ${dep.ref} ${dep.required ? "required" : "optional"} ${dep.state} retrievable=${dep.retrievable}`);
  }
  if (!result.dependencies.length) lines.push("- none");
  lines.push(`reconciliation: ${result.reconciliation.required ? "required" : "not required"}`);
  lines.push(`method: ${result.reconciliation.method.join(" → ")}`);
  lines.push(`rejected: ${result.reconciliation.rejected.join(", ")}`);
  if (result.reconciliation.principal_relay.requested) {
    lines.push(`principal relay: ${result.reconciliation.principal_relay.message}`);
  }
  lines.push("remote side effects: none");
  return lines.join("\n");
}

function closePreflight({ dependencies, necessary, reconciliation, firstStep }) {
  const reasons = [];
  const required = dependencies.filter(dep => dep.required);
  const inaccessible = required.filter(dep => ["absent", "producer-local", "blocked", "impossible"].includes(dep.state));
  const impossible = required.filter(dep => dep.state === "impossible");
  const unknown = required.filter(dep => dep.state === "unknown");
  const unverified = required.filter(dep => dep.state === "present-unverified");
  if (!firstStep.text) reasons.push("first_step_missing");
  if (inaccessible.length) reasons.push("inaccessible_required_input");
  if (impossible.length) reasons.push("impossible_under_current_regime");
  if (unknown.length) reasons.push("unknown_required_input");
  if (unverified.length) reasons.push("unverified_required_input");
  if (reconciliation.required) reasons.push("stale_baseline");
  if (reconciliation.blind_overwrite_rejected) reasons.push("blind_overwrite_rejected");
  if (necessary.escalation) reasons.push("repair_exceeds_mandate");

  let status = "PASS";
  if (reasons.includes("inaccessible_required_input") || reasons.includes("impossible_under_current_regime")) status = "BLOCKED";
  else if (reasons.includes("unknown_required_input")) status = "JUDGMENT_REQUIRED";
  else if (reasons.length) status = "PARTIAL";

  return {
    status,
    reasons,
    blocked_is_impossible: false,
    authority_widened: false,
  };
}

function necessaryMeans(dependencies, mandate) {
  const paths = [];
  for (const dep of dependencies.filter(item => item.required && item.state !== "present-retrievable" && item.state !== "present-unverified")) {
    if (dep.state === "impossible" || dep.state === "unknown") continue;
    const copyForbidden = dep.state !== "blocked" && (mandate.forbids.includes("commit") || mandate.forbids.includes("edit"));
    if (dep.assist) {
      paths.push(meansPath({
        id: "human-assist",
        ref: dep.ref,
        summary: "Ask for the smallest human assist that makes this input retrievable by the target handler.",
        admissible: true,
        exceeds_mandate: false,
        principal_relay: true,
      }));
      continue;
    }
    if (dep.state === "blocked") {
      paths.push(meansPath({
        id: "blocked-channel",
        ref: dep.ref,
        summary: "The declared channel is blocked. Do not treat the block as impossibility, and do not bypass it.",
        admissible: false,
        exceeds_mandate: false,
        principal_relay: false,
      }));
      continue;
    }
    paths.push(meansPath({
      id: "copy-into-repository",
      ref: dep.ref,
      summary: "Copy the smallest sufficient content into the repository or the packet at the declared path.",
      admissible: !copyForbidden,
      exceeds_mandate: copyForbidden,
      principal_relay: false,
      escalation: copyForbidden ? "The repair would commit or edit, and the mandate forbids it. Do not bypass." : "",
    }));
  }
  return {
    searched: true,
    executed: false,
    authority_widened: false,
    escalation: paths.some(path => path.exceeds_mandate),
    paths,
  };
}

function meansPath(path) {
  return {
    ...path,
    executable: false,
    executed: false,
    authority_widened: false,
    escalation: path.escalation || "",
    measured_risk: {
      governs: MEASURED_RISK,
      executed: false,
    },
  };
}

function reconcile(baseline, firstStep) {
  const drifted = Boolean(baseline.declared && baseline.current && baseline.declared !== baseline.current);
  const required = drifted && baseline.material === true;
  const blind = /\bgit\s+reset\b|\breset\s+--hard\b|\boverwrite\b|\bcheckout\s+--\b/i.test(firstStep);
  const relay = required && baseline.active_handler === true && baseline.shared_substrate === false;
  return {
    drifted,
    material: baseline.material,
    required,
    method: ["fetch", "compare", "reconcile"],
    rejected: ["reset", "overwrite", "blind checkout"],
    blind_overwrite_rejected: blind,
    principal_relay: {
      requested: relay,
      minimal: true,
      valid_path: true,
      message: relay
        ? "Please ask the active handler to refresh current main and re-read the relevant Corpus instructions before continuing."
        : "",
    },
  };
}

function collectDependencies(sections, firstStep, fileExists) {
  const byRef = new Map();
  for (const section of sections) {
    const text = section.lines.join("\n");
    for (const ref of extractRepoPaths(text)) {
      const bullets = text.split(/\n/).filter(line => line.includes(ref));
      const entry = byRef.get(ref) || { ref, notes: [] };
      entry.notes.push(...bullets);
      if (firstStep.text.includes(ref)) entry.in_first_step = true;
      byRef.set(ref, entry);
    }
  }
  return [...byRef.values()].map(entry => classifyDependency(entry, fileExists));
}

function classifyDependency(entry, fileExists) {
  const blob = entry.notes.join("\n");
  const channel = channelOf(blob);
  const markedOptional = /\boptional\b/i.test(blob);
  const markedRequired = /\brequired\b/i.test(blob);
  const required = entry.in_first_step || (markedRequired && !markedOptional);
  let exists = null;
  if (fileExists) {
    const value = fileExists(entry.ref);
    if (value === true) exists = true;
    else if (value === false) exists = false;
  }
  const classified = classifyAccess({ channel, blob, exists });
  return {
    ref: entry.ref,
    required: Boolean(required),
    exists,
    ...classified,
    authority_widened: false,
  };
}

function classifyAccess({ channel, blob, exists }) {
  if (channel === "impossible" || /\bimpossible\b/i.test(blob)) {
    return { state: "impossible", channel: channel || "impossible", retrievable: false, assist: false };
  }
  if (PRODUCER_CHANNELS.has(channel)) {
    return { state: "producer-local", channel, retrievable: false, assist: false };
  }
  if (HUMAN_CHANNELS.has(channel)) {
    return { state: "blocked", channel, retrievable: false, assist: true };
  }
  if (channel === "blocked" || /\bblocked\b/i.test(blob)) {
    return { state: "blocked", channel: channel || "blocked", retrievable: false, assist: false };
  }
  if (/\bunverified\b/i.test(blob)) {
    return { state: "present-unverified", channel: channel || "repo", retrievable: null, assist: false };
  }
  if (exists === true) return { state: "present-retrievable", channel: channel || "repo", retrievable: true, assist: false };
  if (exists === false) return { state: "absent", channel: channel || "repo", retrievable: false, assist: false };
  return { state: "unknown", channel, retrievable: null, assist: false };
}

function channelOf(text) {
  const explicit = String(text).match(/\bchannel:\s*([a-z0-9-]+)/i);
  if (explicit) return explicit[1].toLowerCase();
  if (/chatgpt library/i.test(text)) return "chatgpt-library";
  if (/producer-local|private memory|chat attachment/i.test(text)) return "producer-local";
  if (/human assist|human-assist/i.test(text)) return "human-assist";
  return "";
}

function readMandate(sections) {
  const text = sections
    .filter(section => headingMatches(section.heading, MANDATE_HEADINGS))
    .map(section => section.lines.join("\n"))
    .join("\n");
  const forbids = FORBIDDEN_STEMS.filter(stem => new RegExp(`must not\\s+${stem}|do not\\s+${stem}`, "i").test(text));
  return { forbids };
}

function readBaseline(sections, override = {}) {
  const section = [...sections].reverse().find(item => item.heading === "baseline" || item.heading.startsWith("baseline "));
  const text = section ? section.lines.join("\n") : "";
  const pick = name => {
    const match = text.match(new RegExp(`^\\s*[-*]?\\s*${name}\\s*[:=]\\s*(\\S+)`, "im"));
    return match ? match[1] : "";
  };
  const yn = name => {
    const value = pick(name);
    if (/^(yes|true)$/i.test(value)) return true;
    if (/^(no|false)$/i.test(value)) return false;
    return null;
  };
  const parsed = {
    declared: pick("declared"),
    current: pick("current"),
    material: yn("material"),
    active_handler: yn("active handler"),
    shared_substrate: yn("shared substrate"),
  };
  const result = { ...parsed };
  for (const [key, value] of Object.entries(override || {})) {
    if (value !== undefined && value !== null && value !== "") result[key] = value;
  }
  return result;
}

function firstActionableStep(text) {
  const lines = String(text).split(/\n/).map(line => line.trim()).filter(Boolean);
  const line = lines.find(item => /^\d+[.)]\s+\S/.test(item)) || "";
  return { text: line.replace(/^\d+[.)]\s+/, ""), missing: !line };
}

function headingMatches(heading, names) {
  return names.some(name => {
    const normalized = normalizeHeading(name);
    return heading === normalized || heading.startsWith(`${normalized} `);
  });
}

function latestSection(sections, names) {
  const matches = sections.filter(section => headingMatches(section.heading, names));
  return matches.length ? matches[matches.length - 1] : null;
}

function extractRepoPaths(text) {
  const out = [];
  const re = /`([^`\n]+)`/g;
  let match;
  const source = String(text).replace(/```[\s\S]*?```/g, "");
  while ((match = re.exec(source))) {
    const value = match[1].trim().replace(/\\/g, "/");
    if (isRepoPath(value)) out.push(value);
  }
  return [...new Set(out)];
}

function isRepoPath(value) {
  if (!value || value.includes("://") || value.includes("*") || value.includes("..")) return false;
  return /^(?:[\w.@+-]+\/)+[\w.@+-]+\.[A-Za-z0-9]+$/.test(value);
}

function issueText(issue) {
  const comments = Array.isArray(issue?.comments)
    ? issue.comments.map(comment => typeof comment === "string" ? comment : comment?.body || "")
    : [];
  return [issue?.body || "", ...comments].filter(Boolean).join("\n\n");
}

function parseSections(text) {
  const sections = [];
  let current = { heading: "", lines: [] };
  let fence = false;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      current.lines.push(line);
      continue;
    }
    const match = !fence && line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (match) {
      sections.push(current);
      current = { heading: normalizeHeading(match[1]), lines: [] };
      continue;
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
