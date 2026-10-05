import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildDashboardData, renderDashboardHtml, renderDashboardMarkdown } from "./fix-bugs-first-dashboard.js";

const DASHBOARD_FILE = "fix-bugs-first-dashboard";

export function parseIssuesExport(content) {
  const issues = [];
  let repository = null;
  let current = null;
  for (const line of String(content || "").split(/\r?\n/)) {
    const repoMatch = line.match(/^##\s+(.+?)\s+\(\d+\s+issues?\)$/);
    if (repoMatch) {
      if (current) issues.push(current);
      current = null;
      repository = repoMatch[1].trim();
      continue;
    }
    const issueMatch = line.match(/^###\s+\[#(\d+)\]\s+(.+)$/);
    if (issueMatch) {
      if (current) issues.push(current);
      current = { number: Number(issueMatch[1]), title: issueMatch[2].trim(), repository, status: "open", labels: [] };
      continue;
    }
    if (!current) continue;
    const urlMatch = line.match(/^\*\*URL:\*\*\s+(\S+)\s+\|\s+\*\*State:\*\*\s+(\S+)/);
    if (urlMatch) {
      current.url = urlMatch[1];
      current.status = urlMatch[2].toLowerCase();
      continue;
    }
    const labelsMatch = line.match(/^\*\*Labels:\*\*\s+(.+)$/);
    if (labelsMatch) current.labels = labelsMatch[1].split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  }
  if (current) issues.push(current);
  return issues.map(issue => ({
    ...issue,
    kind: issue.labels.includes("bug") ? "bug" : issue.labels.includes("feature") ? "feature" : "task",
  }));
}

function sourceHash(backlogBlobSha, issues) {
  const canonicalIssues = issues.map(issue => ({
    repository: issue.repository,
    number: issue.number,
    title: issue.title,
    status: issue.status,
    url: issue.url,
    labels: [...issue.labels].sort(),
  })).sort((a, b) => `${a.repository}#${a.number}`.localeCompare(`${b.repository}#${b.number}`));
  return createHash("sha256").update(JSON.stringify({ backlogBlobSha, issues: canonicalIssues })).digest("hex");
}

function readText(file) {
  try { return fs.readFileSync(file, "utf8"); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function readDashboard(file) {
  const content = readText(file);
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.schema === "cogentia.fix-bugs-first-dashboard.v1" && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

function exportTimestamp(content) {
  return String(content || "").match(/^generated_at:\s*["']?([^\n"']+)/m)?.[1]?.trim() || null;
}

function preflightWrites(files) {
  for (const file of files) {
    let parent = path.dirname(file.path);
    while (!fs.existsSync(parent)) {
      const next = path.dirname(parent);
      if (next === parent) throw new Error(`No writable parent for ${file.path}`);
      parent = next;
    }
    fs.accessSync(parent, fs.constants.W_OK);
    if (fs.existsSync(file.path)) fs.accessSync(file.path, fs.constants.W_OK);
  }
}

export function refreshDashboardArtifacts({
  backlogItems,
  backlogBlobSha,
  backlogRef,
  backlogUrl,
  issuesExportText,
  outputDir,
  viewsDir,
  dryRun = false,
}) {
  if (!Array.isArray(backlogItems)) throw new Error("Operium backlog items are unavailable");
  if (!backlogBlobSha || !backlogRef || !backlogUrl) throw new Error("Verified Operium backlog provenance is required");
  if (!issuesExportText) throw new Error("Public GitHub issue export is unavailable");

  const issues = parseIssuesExport(issuesExportText);
  const declaredTotal = Number(String(issuesExportText).match(/^total_issues:\s*(\d+)/m)?.[1]);
  if (!Number.isInteger(declaredTotal) || declaredTotal !== issues.length) {
    throw new Error(`Issue export is incomplete: declared ${declaredTotal}, parsed ${issues.length}`);
  }

  const fingerprint = sourceHash(backlogBlobSha, issues);
  const publicJson = path.join(outputDir, `${DASHBOARD_FILE}.json`);
  const current = readDashboard(publicJson);
  const sourceChanged = current?.metadata?.source_fingerprint !== fingerprint;
  const issuesPath = path.join(outputDir, "current-issues-list.md");
  const oldIssuesText = readText(issuesPath);
  const oldIssues = oldIssuesText ? parseIssuesExport(oldIssuesText) : null;
  const issuesChanged = !oldIssues || sourceHash(backlogBlobSha, oldIssues) !== fingerprint;
  const chosenIssuesText = issuesChanged ? issuesExportText : oldIssuesText;

  const dashboard = sourceChanged ? buildDashboardData(backlogItems, issues, {
    view_id: DASHBOARD_FILE,
    visibility: "public",
    generator: "scripts/cogentia.js dashboard refresh",
    source_backlog: backlogUrl,
    source_backlog_ref: backlogRef,
    source_backlog_blob_sha: backlogBlobSha,
    source_fingerprint: fingerprint,
    source_issues_generated_at: exportTimestamp(chosenIssuesText),
    source_links: [
      { authority: "operium-backlog", path: "backlog/items.yaml", url: backlogUrl },
      {
        authority: "github-issues",
        path: "current-issues-list.md",
        url: "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/current-issues-list.md",
        imported_count: issues.length,
        note: "Imported from the public Cogentia issues export.",
      },
    ],
  }) : current;

  const json = `${JSON.stringify(dashboard, null, 2)}\n`;
  const markdown = `${renderDashboardMarkdown(dashboard).trimEnd()}\n`;
  const html = renderDashboardHtml(dashboard);
  const candidates = [
    { path: issuesPath, content: chosenIssuesText },
    { path: publicJson, content: json },
    { path: path.join(outputDir, `${DASHBOARD_FILE}.md`), content: markdown },
    { path: path.join(outputDir, `${DASHBOARD_FILE}.html`), content: html },
    { path: path.join(viewsDir, `${DASHBOARD_FILE}.json`), content: json },
    { path: path.join(viewsDir, `${DASHBOARD_FILE}.md`), content: markdown },
    { path: path.join(viewsDir, `${DASHBOARD_FILE}.html`), content: html },
  ];
  const changes = candidates.filter(file => readText(file.path) !== file.content);
  if (!dryRun && changes.length) {
    preflightWrites(changes);
    for (const file of changes) {
      fs.mkdirSync(path.dirname(file.path), { recursive: true });
      fs.writeFileSync(file.path, file.content, "utf8");
    }
  }
  return {
    ok: true,
    dry_run: Boolean(dryRun),
    changed: changes.length > 0,
    source_changed: sourceChanged,
    source_fingerprint: fingerprint,
    issue_count: issues.length,
    item_count: dashboard.metadata.total_items,
    open_bugs: dashboard.metadata.open_bugs_count,
    generated_at: dashboard.generated_at,
    files_written: dryRun ? 0 : changes.length,
    files_to_update: changes.map(file => file.path.replaceAll("\\", "/")),
  };
}
