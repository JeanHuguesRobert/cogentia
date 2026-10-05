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
    id: String(raw.id || raw.node_id || (raw.repository && raw.number ? `${raw.repository}#${raw.number}` : `item_${Math.random().toString(36).substring(2, 9)}`)),
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
  const generatedDate = dashboardData.generated_at.slice(0, 10);
  lines.push("---");
  lines.push(`title: "Fix Bugs First Work Dashboard"`);
  lines.push("author: unknown");
  lines.push("affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica");
  lines.push(`date: '${generatedDate}'`);
  lines.push("license: CC BY-SA 4.0");
  lines.push("language: en");
  lines.push("document_role: operational");
  lines.push("document_kind: dashboard");
  lines.push("visibility: public");
  lines.push("lifecycle_state: active");
  lines.push("canonical_url: https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/fix-bugs-first-dashboard.md");
  lines.push("status: working-paper");
  lines.push("update_policy: UP-DEFAULT-REVIEWED");
  lines.push("generated_by: scripts/generate-fix-bugs-first-dashboard.js");
  lines.push(`schema: "${dashboardData.schema}"`);
  lines.push(`generated_at: "${dashboardData.generated_at}"`);
  lines.push(`doctrine: "${dashboardData.doctrine}"`);
  lines.push(`total_items: ${dashboardData.metadata.total_items}`);
  lines.push(`open_bugs: ${dashboardData.metadata.open_bugs_count}`);
  lines.push("provenance:");
  lines.push("  origin_type: generated");
  lines.push("  origin_repository: JeanHuguesRobert/cogentia");
  lines.push("  origin_ref: unknown");
  lines.push(`  origin_date: '${generatedDate}'`);
  lines.push("  derived_from:");
  lines.push(`    - ${dashboardData.metadata.source_links?.[0]?.url || "https://github.com/JeanHuguesRobert/operium/blob/main/backlog/items.yaml"}`);
  lines.push("    - https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/current-issues-list.md");
  lines.push("review:");
  lines.push("  status: unreviewed");
  lines.push("  reviewed_by: []");
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function safeLink(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderHtmlItems(items) {
  if (!items.length) return '<p class="empty">No items in this section.</p>';
  return `<ul class="work-list">${items.map(item => {
    const href = safeLink(item.url);
    const title = escapeHtml(item.title);
    const heading = href
      ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${title}</a>`
      : title;
    const facts = [item.repository, item.subsystem, item.status, item.severity].filter(Boolean).map(escapeHtml).join(" · ");
    return `<li><div class="work-heading"><span class="work-id">${escapeHtml(item.id)}</span><strong>${heading}</strong></div><p class="facts">${facts}</p>${item.next_action ? `<p class="next">Next: ${escapeHtml(item.next_action)}</p>` : ""}</li>`;
  }).join("")}</ul>`;
}

export function renderDashboardHtml(dashboardData) {
  const metadata = dashboardData.metadata || {};
  const gates = Object.values(dashboardData.gates || {});
  const otherOpen = (dashboardData.items || []).filter(item =>
    ["open", "in_progress", "blocked"].includes(item.status) && !["bug", "feature"].includes(item.kind));
  const byRepository = new Map();
  for (const item of otherOpen) {
    const name = item.repository || "unknown";
    if (!byRepository.has(name)) byRepository.set(name, []);
    byRepository.get(name).push(item);
  }
  const repositorySections = [...byRepository].sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items]) => `<details><summary>${escapeHtml(name)} <span class="count">${items.length}</span></summary>${renderHtmlItems(items)}</details>`).join("");
  const gateRows = gates.map(gate => `<tr><th scope="row">${escapeHtml(gate.subsystem)}</th><td><span class="gate ${gate.state === "OK" ? "ok" : "blocked"}">${escapeHtml(gate.state)}</span></td><td>${Number(gate.open_bugs) || 0}</td><td>${escapeHtml((gate.blocking_bugs || []).join(", ") || "—")}</td></tr>`).join("");
  const generated = escapeHtml(dashboardData.generated_at || "unknown");
  const sourceIssues = escapeHtml(metadata.source_issues_generated_at || "unknown");
  const sourceBacklog = safeLink(metadata.source_backlog);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Public, read-only Fix Bugs First work dashboard">
  <title>Fix Bugs First · Operium</title>
  <style>
    :root{color-scheme:light;--ink:#152235;--muted:#53677d;--line:#d7e0e9;--paper:#f4f7fa;--card:#fff;--accent:#095a9d;--bad:#a62432;--ok:#216d45}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--accent)}a:hover{text-decoration-thickness:2px}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
    .wrap{max-width:1100px;margin:auto;padding:1.5rem}header{background:#122b45;color:white;padding:2rem 0}header a{color:#c7e4ff}h1{margin:.2rem 0;font-size:clamp(1.8rem,4vw,2.8rem)}h2{font-size:1.35rem;margin:0 0 1rem}.lead{max-width:72ch;color:#d2e3f2}.eyebrow{letter-spacing:.11em;text-transform:uppercase;font-size:.75rem;font-weight:700;color:#a5d7ff}
    .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.8rem;margin:1.3rem 0}.metric,.panel{background:var(--card);border:1px solid var(--line);border-radius:.7rem;box-shadow:0 2px 12px #122b4508}.metric{padding:1rem}.metric strong{display:block;font-size:1.65rem}.metric span,.facts,.source,.empty{color:var(--muted)}.panel{padding:1.2rem;margin:1rem 0}.source{font-size:.88rem}.source p{margin:.35rem 0}
    .scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:.6rem .7rem;border-bottom:1px solid var(--line)}thead th{font-size:.8rem;text-transform:uppercase;color:var(--muted)}.gate{font-weight:700}.gate.ok{color:var(--ok)}.gate.blocked{color:var(--bad)}
    .work-list{list-style:none;margin:0;padding:0}.work-list li{padding:.85rem 0;border-top:1px solid var(--line)}.work-heading{display:flex;align-items:baseline;gap:.65rem;flex-wrap:wrap}.work-id{font:700 .78rem ui-monospace,monospace;color:var(--muted)}.facts,.next{margin:.25rem 0 0;font-size:.88rem}.next{color:var(--ink)}details{border-top:1px solid var(--line);padding:.6rem 0}summary{cursor:pointer;font-weight:600}.count{color:var(--muted);font-size:.85rem;margin-left:.3rem}footer{font-size:.85rem;color:var(--muted);padding:1rem 0 2rem}@media print{header{background:white;color:var(--ink)}header a{color:var(--accent)}.panel,.metric{box-shadow:none}details{break-inside:avoid}}
  </style>
</head>
<body>
<a class="skip" href="#main">Skip to dashboard</a>
<header><div class="wrap"><div class="eyebrow">Operium · public work view</div><h1>Fix Bugs First</h1><p class="lead">A readable snapshot of open work. The Operium backlog and linked GitHub issues remain authoritative; this page cannot edit them.</p><a href="/ops/console/">Back to Operium Console</a></div></header>
<main class="wrap" id="main">
  <div class="metrics"><div class="metric"><strong>${Number(metadata.open_bugs_count) || 0}</strong><span>Open bugs</span></div><div class="metric"><strong>${Number(metadata.open_features_count) || 0}</strong><span>Open features</span></div><div class="metric"><strong>${Number(metadata.subsystems_count) || 0}</strong><span>Subsystems</span></div><div class="metric"><strong>${Number(metadata.total_items) || 0}</strong><span>Total items</span></div></div>
  <section class="panel source" aria-label="Sources and freshness"><p><strong>Generated:</strong> <time datetime="${generated}">${generated}</time></p><p><strong>GitHub issues read:</strong> ${sourceIssues}</p><p><strong>Backlog:</strong> ${sourceBacklog ? `<a href="${escapeHtml(sourceBacklog)}">Operium source at GitHub</a>` : "unknown"}</p><p><strong>Scope:</strong> public repositories only; issue labels and Operium records determine the categories shown.</p></section>
  <section class="panel" aria-labelledby="bugs"><h2 id="bugs">Open bugs · fix first</h2>${renderHtmlItems(dashboardData.open_bugs || [])}</section>
  <section class="panel" aria-labelledby="gates"><h2 id="gates">Subsystem gates</h2><div class="scroll"><table><thead><tr><th scope="col">Subsystem</th><th scope="col">Gate</th><th scope="col">Open bugs</th><th scope="col">Blocking bugs</th></tr></thead><tbody>${gateRows}</tbody></table></div></section>
  <section class="panel" aria-labelledby="features"><h2 id="features">Features and planned work</h2>${renderHtmlItems(dashboardData.open_features || [])}</section>
  <section class="panel" aria-labelledby="other"><h2 id="other">Other open work <span class="count">${otherOpen.length}</span></h2><p class="source">Expand a repository to browse its open items.</p>${repositorySections || '<p class="empty">No other open work.</p>'}</section>
</main><footer class="wrap">Read-only projection · ${escapeHtml(dashboardData.schema)}</footer>
</body></html>\n`;
}
