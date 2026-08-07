/**
 * Fix Bugs First Dashboard generator module.
 * Normalized Taxonomy & Read-Only Work Dashboard (CPKT-2026-006).
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function parseYaml(content, operiumPath) {
  try {
    const yamlModulePath = path.resolve(operiumPath, "node_modules", "yaml");
    const YAML = require(yamlModulePath);
    return YAML.parse(content);
  } catch {
    // Simple fallback YAML parser for items
    return { items: [] };
  }
}

export const DASHBOARD_SCHEMA = "cogentia.fix-bugs-first-dashboard.v1";
export const TAXONOMY_SCHEMA = "cogentia.work-taxonomy.v1";

export const VALID_KINDS = ["bug", "feature", "incident", "debt", "task"];
export const VALID_WORK_TYPES = ["maintenance", "implementation", "research", "promotion"];
export const VALID_URGENCIES = ["now", "soon", "planned", "deferred"];
export const VALID_IMPORTANCES = ["essential", "high", "normal", "low"];
export const VALID_SEVERITIES = ["critical", "high", "medium", "low"];
export const VALID_STATUSES = ["open", "in_progress", "blocked", "deferred", "done", "closed"];

const BLOCKING_SEVERITIES = new Set(["critical", "high"]);

export function normalizeItem(raw, sourceLabel = "operium-backlog") {
  if (!raw || typeof raw !== "object") return null;

  const kind = String(raw.kind || "task").toLowerCase();
  const severity = raw.severity ? String(raw.severity).toLowerCase() : null;
  const status = String(raw.status || "open").toLowerCase();
  const subsystem = String(raw.subsystem || "general").toLowerCase();

  let urgency = raw.urgency ? String(raw.urgency).toLowerCase() : null;
  if (!urgency) {
    if (severity === "critical" || severity === "high") urgency = "now";
    else if (severity === "medium") urgency = "soon";
    else urgency = "planned";
  }

  let importance = raw.importance ? String(raw.importance).toLowerCase() : null;
  if (!importance) {
    if (raw.priority === "p1" || severity === "critical" || severity === "high") importance = "essential";
    else importance = "normal";
  }

  let workType = raw.work_type ? String(raw.work_type).toLowerCase() : null;
  if (!workType) {
    if (kind === "bug" || kind === "debt") workType = "maintenance";
    else if (kind === "feature") workType = "implementation";
    else workType = "implementation";
  }

  const isBug = kind === "bug";
  const isOpen = status === "open" || status === "in_progress" || status === "blocked";
  const blocksFeatures = raw.blocks_features != null
    ? Boolean(raw.blocks_features)
    : (isBug && BLOCKING_SEVERITIES.has(severity || ""));

  return {
    id: String(raw.id || raw.node_id || `item_${Math.random().toString(36).substring(2, 9)}`),
    kind: VALID_KINDS.includes(kind) ? kind : "task",
    work_type: VALID_WORK_TYPES.includes(workType) ? workType : "implementation",
    urgency: VALID_URGENCIES.includes(urgency) ? urgency : "planned",
    importance: VALID_IMPORTANCES.includes(importance) ? importance : "normal",
    severity: severity && VALID_SEVERITIES.includes(severity) ? severity : null,
    status: VALID_STATUSES.includes(status) ? status : "open",
    subsystem,
    title: String(raw.title || "(untitled)").trim(),
    evidence: raw.evidence ? String(raw.evidence).trim() : null,
    next_action: raw.next_action ? String(raw.next_action).trim() : null,
    github_issue: raw.github_issue ?? (raw.number ?? null),
    url: raw.url || (raw.github_issue ? `https://github.com/JeanHuguesRobert/operium/issues/${raw.github_issue}` : null),
    repository: raw.repository || "operium",
    blocks_features: blocksFeatures,
    waiver: raw.waiver || null,
    opened_at: raw.opened_at || raw.createdAt || null,
    closed_at: raw.closed_at || raw.closedAt || null,
    provenance: {
      source: sourceLabel,
      imported_at: new Date().toISOString(),
    },
  };
}

export function evaluateSubsystemGates(items) {
  const subsystems = new Set();
  for (const item of items) {
    if (item.subsystem) subsystems.add(item.subsystem);
  }

  const gates = {};
  for (const sub of Array.from(subsystems).sort()) {
    const subItems = items.filter(i => i.subsystem === sub);
    const openBugs = subItems.filter(i => i.kind === "bug" && (i.status === "open" || i.status === "in_progress" || i.status === "blocked"));
    const blocking = openBugs.filter(i => i.blocks_features && BLOCKING_SEVERITIES.has(i.severity || ""));

    gates[sub] = {
      subsystem: sub,
      state: blocking.length === 0 ? "OK" : "BLOCKED",
      total_items: subItems.length,
      open_bugs: openBugs.length,
      blocking_bugs: blocking.map(b => b.id),
      gated_features: subItems.filter(i => i.kind === "feature" && (i.status === "open" || i.status === "in_progress")).map(f => f.id),
    };
  }

  return gates;
}

export function buildDashboardData(backlogItems = [], githubIssues = [], metadata = {}) {
  const normalizedBacklog = backlogItems.map(i => normalizeItem(i, "operium-backlog")).filter(Boolean);
  const normalizedGh = githubIssues.map(i => normalizeItem(i, "github-issues")).filter(Boolean);

  // Deduplicate by ID / github_issue if present
  const itemMap = new Map();
  for (const item of [...normalizedBacklog, ...normalizedGh]) {
    const key = item.github_issue ? `${item.repository}#${item.github_issue}` : item.id;
    if (!itemMap.has(key) || item.provenance.source === "operium-backlog") {
      itemMap.set(key, item);
    }
  }

  const allItems = Array.from(itemMap.values());
  const gates = evaluateSubsystemGates(allItems);

  const openBugs = allItems.filter(i => i.kind === "bug" && (i.status === "open" || i.status === "in_progress" || i.status === "blocked"))
    .sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, null: 4 };
      return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
    });

  const openFeatures = allItems.filter(i => i.kind === "feature" && (i.status === "open" || i.status === "in_progress"));
  const closedItems = allItems.filter(i => i.status === "closed" || i.status === "done");

  return {
    schema: DASHBOARD_SCHEMA,
    generated_at: new Date().toISOString(),
    doctrine: "Fix Bugs First (Operium / Cogentia)",
    metadata: {
      total_items: allItems.length,
      open_bugs_count: openBugs.length,
      open_features_count: openFeatures.length,
      subsystems_count: Object.keys(gates).length,
      ...metadata,
    },
    gates,
    open_bugs: openBugs,
    open_features: openFeatures,
    closed_items: closedItems,
    items: allItems,
  };
}

export function renderDashboardMarkdown(dashboardData) {
  const lines = [];
  lines.push("---");
  lines.push(`title: "Fix Bugs First Work Dashboard"`);
  lines.push(`schema: "${dashboardData.schema}"`);
  lines.push(`generated_at: "${dashboardData.generated_at}"`);
  lines.push(`doctrine: "${dashboardData.doctrine}"`);
  lines.push(`total_items: ${dashboardData.metadata.total_items}`);
  lines.push(`open_bugs: ${dashboardData.metadata.open_bugs_count}`);
  lines.push("---");
  lines.push("");
  lines.push("# 🛡️ Fix Bugs First Work Dashboard");
  lines.push("");
  lines.push(`> *Generated at ${dashboardData.generated_at} from native system of records (Operium Backlog & GitHub Issues).*`);
  lines.push("");
  lines.push("## 🚦 Subsystem Gates Overview");
  lines.push("");
  lines.push("| Subsystem | Gate Status | Open Bugs | Blocking Bugs | Features Gated |");
  lines.push("|---|---|---|---|---|");

  for (const [sub, gate] of Object.entries(dashboardData.gates)) {
    const statusBadge = gate.state === "OK" ? "✅ **OK**" : "🚫 **BLOCKED**";
    const blockingText = gate.blocking_bugs.length > 0 ? gate.blocking_bugs.join(", ") : "None";
    const gatedText = gate.gated_features.length > 0 ? gate.gated_features.join(", ") : "None";
    lines.push(`| \`${sub}\` | ${statusBadge} | ${gate.open_bugs} | ${blockingText} | ${gatedText} |`);
  }

  lines.push("");
  lines.push("## 🐛 Open Bugs (Fix First)");
  lines.push("");

  if (dashboardData.open_bugs.length === 0) {
    lines.push("*No open bugs reported! Clear path for feature development.*");
  } else {
    for (const bug of dashboardData.open_bugs) {
      const targetUrl = bug.url || "#";
      const issueLink = bug.github_issue ? `[#${bug.github_issue}](${targetUrl})` : "";
      lines.push(`### [${bug.id}] ${bug.title} ${issueLink}`);
      lines.push(`- **Subsystem:** \`${bug.subsystem}\` | **Severity:** \`${bug.severity || "normal"}\` | **Urgency:** \`${bug.urgency}\` | **Status:** \`${bug.status}\``);
      if (bug.next_action) lines.push(`- **Next Action:** ${bug.next_action}`);
      if (bug.evidence) lines.push(`- **Evidence:** ${bug.evidence}`);
      lines.push("");
    }
  }

  lines.push("## 🚀 Gated Features & Planned Work");
  lines.push("");

  if (dashboardData.open_features.length === 0) {
    lines.push("*No active open features registered.*");
  } else {
    for (const feat of dashboardData.open_features) {
      const gateState = dashboardData.gates[feat.subsystem]?.state || "OK";
      const gateBadge = gateState === "OK" ? "🟢 READY" : "🔴 GATED BY BUGS";
      const targetUrl = feat.url || "#";
      const issueLink = feat.github_issue ? `[#${feat.github_issue}](${targetUrl})` : "";
      lines.push(`### [${feat.id}] ${feat.title} ${issueLink}`);
      lines.push(`- **Subsystem:** \`${feat.subsystem}\` | **Gate:** ${gateBadge} | **Status:** \`${feat.status}\``);
      if (feat.next_action) lines.push(`- **Next Action:** ${feat.next_action}`);
      lines.push("");
    }
  }

  lines.push("## 📜 Completed Items");
  lines.push("");
  for (const item of dashboardData.closed_items) {
    lines.push(`- [x] **[${item.id}]** ${item.title} (\`${item.subsystem}\` - ${item.kind})`);
  }
  lines.push("");

  return lines.join("\n");
}
