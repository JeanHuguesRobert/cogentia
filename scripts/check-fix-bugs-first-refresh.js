#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { refreshDashboardArtifacts } from "./lib/fix-bugs-first-refresh.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-dashboard-refresh-"));
const outputDir = path.join(root, "public");
const viewsDir = path.join(root, "views");
fs.mkdirSync(outputDir);
fs.mkdirSync(viewsDir);

function issueExport(title, generatedAt) {
  return `---\ntotal_issues: 1\ngenerated_at: ${generatedAt}\n---\n\n## cogentia (1 issue)\n\n### [#78] ${title}\n**URL:** https://github.com/JeanHuguesRobert/cogentia/issues/78 | **State:** OPEN\n**Labels:** bug\n`;
}

const args = {
  backlogItems: [{ id: "OP-FEAT-001", kind: "feature", title: "Feature", status: "open", subsystem: "docs" }],
  backlogBlobSha: "a".repeat(40),
  backlogRef: "b".repeat(40),
  backlogUrl: `https://github.com/JeanHuguesRobert/operium/blob/${"b".repeat(40)}/backlog/items.yaml`,
  issuesExportText: issueExport("Fix frontmatter", "2026-10-05T06:00:00Z"),
  outputDir,
  viewsDir,
};

try {
  const preview = refreshDashboardArtifacts({ ...args, dryRun: true });
  assert.equal(preview.files_written, 0);
  assert.equal(fs.existsSync(path.join(outputDir, "fix-bugs-first-dashboard.html")), false);

  const first = refreshDashboardArtifacts(args);
  assert.equal(first.files_written, 7);
  assert.equal(first.open_bugs, 1);
  const firstJson = fs.readFileSync(path.join(outputDir, "fix-bugs-first-dashboard.json"), "utf8");
  const firstHtml = fs.readFileSync(path.join(outputDir, "fix-bugs-first-dashboard.html"), "utf8");
  assert.match(firstHtml, /<!doctype html>/);
  assert.match(firstHtml, /Fix frontmatter/);

  const repeat = refreshDashboardArtifacts({ ...args, issuesExportText: issueExport("Fix frontmatter", "2026-10-05T07:00:00Z") });
  assert.equal(repeat.files_written, 0);
  assert.equal(repeat.generated_at, first.generated_at);
  assert.equal(fs.readFileSync(path.join(outputDir, "fix-bugs-first-dashboard.json"), "utf8"), firstJson);

  const changed = refreshDashboardArtifacts({ ...args, issuesExportText: issueExport('<script>alert("x")</script>', "2026-10-05T08:00:00Z") });
  assert.equal(changed.source_changed, true);
  assert.equal(changed.files_written, 7);
  const html = fs.readFileSync(path.join(outputDir, "fix-bugs-first-dashboard.html"), "utf8");
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);

  assert.throws(() => refreshDashboardArtifacts({ ...args, issuesExportText: args.issuesExportText.replace("total_issues: 1", "total_issues: 2") }), /incomplete/);
  console.log(JSON.stringify({ ok: true, checks: ["dry_run", "first_write", "repeat_noop", "changed_source", "html_escape", "incomplete_export"] }));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
