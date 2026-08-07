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

// Generate Dashboard Data
const dashboardData = buildDashboardData(backlogItems, [], {
  generator: "scripts/generate-fix-bugs-first-dashboard.js",
  source_backlog: operiumBacklogPath,
});

const markdownContent = renderDashboardMarkdown(dashboardData);

// Ensure output directories exist
fs.mkdirSync(outputDir, { recursive: true });
const viewsDir = path.join(rootPath, "cogentia", ".cogentia", "views");
fs.mkdirSync(viewsDir, { recursive: true });

// Write files
const jsonPath = path.join(viewsDir, "fix-bugs-first-dashboard.json");
const mdViewsPath = path.join(viewsDir, "fix-bugs-first-dashboard.md");
const mdPubPath = path.join(outputDir, "fix-bugs-first-dashboard.md");

fs.writeFileSync(jsonPath, JSON.stringify(dashboardData, null, 2), "utf8");
fs.writeFileSync(mdViewsPath, markdownContent, "utf8");
fs.writeFileSync(mdPubPath, markdownContent, "utf8");

console.log(JSON.stringify({
  ok: true,
  dashboard: "fix-bugs-first-dashboard",
  generated_at: dashboardData.generated_at,
  totals: dashboardData.metadata,
  outputs: [jsonPath, mdViewsPath, mdPubPath].map(p => p.replaceAll("\\", "/")),
}, null, 2));
