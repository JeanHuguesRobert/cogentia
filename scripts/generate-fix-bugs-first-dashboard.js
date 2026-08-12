#!/usr/bin/env node

/**
 * Generate Fix Bugs First Dashboard (JSON & Markdown)
 * Command: node scripts/generate-fix-bugs-first-dashboard.js
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  buildDashboardData,
  renderDashboardMarkdown,
} from "./lib/fix-bugs-first-dashboard.js";

const require = createRequire(import.meta.url);
const rootPath = path.resolve(process.env.COGENTIA_REPOS_ROOT || path.join(process.cwd(), ".."));
const operiumRoot = path.join(rootPath, "operium");
const operiumBacklogPath = process.env.OPERIUM_BACKLOG || path.join(operiumRoot, "backlog", "items.yaml");
const outputDir = process.env.DASHBOARD_OUTPUT_DIR || path.join(rootPath, "JeanHuguesRobert");
const viewsDir = process.env.DASHBOARD_VIEWS_DIR || path.join(rootPath, "cogentia", ".cogentia", "views");
const issuesExportPath = process.env.COGENTIA_ISSUES_EXPORT || path.join(outputDir, "current-issues-list.md");

// Load Operium Backlog
let backlogItems = [];
if (fs.existsSync(operiumBacklogPath)) {
  try {
    const backlogLibPath = path.join(operiumRoot, "lib", "backlog.js");
    if (fs.existsSync(backlogLibPath)) {
      const backlogModule = await import(`file://${backlogLibPath.replaceAll("\\", "/")}`);
      const loaded = backlogModule.loadBacklog(operiumBacklogPath);
      backlogItems = loaded.items || [];
    }
  } catch (err) {
    console.warn(`[warning] Failed to parse Operium backlog at ${operiumBacklogPath}: ${err.message}`);
  }
} else {
  console.warn(`[warning] Operium backlog not found at ${operiumBacklogPath}`);
}

function loadIssuesExport(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const issues = [];
  let repository = null;
  let current = null;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const repoMatch = line.match(/^##\s+(.+?)\s+\(\d+\s+issues?\)$/);
    if (repoMatch) { repository = repoMatch[1].trim(); continue; }
    const issueMatch = line.match(/^###\s+\[#(\d+)\]\s+(.+)$/);
    if (issueMatch) {
      if (current) issues.push(current);
      current = { number: Number(issueMatch[1]), title: issueMatch[2].trim(), repository: repository || "github", status: "open", labels: [] };
      continue;
    }
    if (!current) continue;
    const urlMatch = line.match(/^\*\*URL:\*\*\s+(\S+)\s+\|\s+\*\*State:\*\*\s+(\S+)/);
    if (urlMatch) { current.url = urlMatch[1]; current.status = urlMatch[2].toLowerCase(); continue; }
    const labelsMatch = line.match(/^\*\*Labels:\*\*\s+(.+)$/);
    if (labelsMatch) current.labels = labelsMatch[1].split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  }
  if (current) issues.push(current);
  return issues.map(issue => ({
    ...issue,
    kind: issue.labels.includes("bug") ? "bug" : issue.labels.includes("feature") ? "feature" : "task",
  }));
}

const githubIssues = loadIssuesExport(issuesExportPath);

// Generate Dashboard Data
const dashboardData = buildDashboardData(backlogItems, githubIssues, {
  view_id: "fix-bugs-first-dashboard",
  visibility: "public",
  generator: "scripts/generate-fix-bugs-first-dashboard.js",
  source_backlog: operiumBacklogPath,
  source_links: [
    {
      authority: "operium-backlog",
      path: "backlog/items.yaml",
      url: "https://github.com/JeanHuguesRobert/operium/blob/main/backlog/items.yaml",
    },
    {
      authority: "github-issues",
      path: fs.existsSync(issuesExportPath) ? path.basename(issuesExportPath) : null,
      url: "https://github.com/JeanHuguesRobert?tab=repositories",
      imported_count: githubIssues.length,
      note: fs.existsSync(issuesExportPath) ? "Imported from Cogentia current-issues export." : "No local issue export found; native issue links from backlog items remain available.",
    },
  ],
});

const markdownContent = renderDashboardMarkdown(dashboardData);

// Ensure output directories exist
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(viewsDir, { recursive: true });

// Write files
const jsonPath = path.join(viewsDir, "fix-bugs-first-dashboard.json");
const mdViewsPath = path.join(viewsDir, "fix-bugs-first-dashboard.md");
const mdPubPath = path.join(outputDir, "fix-bugs-first-dashboard.md");
const jsonPubPath = path.join(outputDir, "fix-bugs-first-dashboard.json");

fs.writeFileSync(jsonPath, JSON.stringify(dashboardData, null, 2), "utf8");
fs.writeFileSync(mdViewsPath, markdownContent, "utf8");
fs.writeFileSync(mdPubPath, markdownContent, "utf8");
fs.writeFileSync(jsonPubPath, JSON.stringify(dashboardData, null, 2), "utf8");

console.log(JSON.stringify({
  ok: true,
  dashboard: "fix-bugs-first-dashboard",
  generated_at: dashboardData.generated_at,
  totals: dashboardData.metadata,
  outputs: [jsonPath, mdViewsPath, mdPubPath, jsonPubPath].map(p => p.replaceAll("\\", "/")),
}, null, 2));
