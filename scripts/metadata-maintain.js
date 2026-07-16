#!/usr/bin/env node

// Bounded, one-shot, read-only maintenance triage.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const value = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? Number(process.argv[i + 1]) : fallback; };
const maxFiles = value("--max-files", 100);
const maxMs = value("--max-ms", 30000);
const json = args.has("--json");
const changedOnly = args.has("--changed");
const started = Date.now();
const required = ["title", "author", "date", "provenance", "review"];

function gitChanged() {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", "."], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
}

function inspect(file) {
  const result = { path: file.replaceAll("\\", "/"), state: "complete", issues: [] };
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!/\.md(?:own)?$/i.test(file)) { result.state = "skipped"; result.reason = "non-markdown"; return result; }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) { result.state = "needs-review"; result.issues.push("missing-frontmatter"); return result; }
  try {
    const data = yaml.load(match[1]) || {};
    result.missing_fields = required.filter(k => data[k] === undefined);
    if (result.missing_fields.length) { result.state = "needs-review"; result.issues.push("missing-required-fields"); }
    result.update_policy = data.update_policy || "UP-DEFAULT-REVIEWED";
  } catch (error) { result.state = "needs-review"; result.issues.push("invalid-frontmatter"); result.error = error.message; }
  return result;
}

let candidates = changedOnly ? gitChanged() : gitChanged();
candidates = candidates.filter(f => /\.md(?:own)?$/i.test(f) && fs.existsSync(path.join(root, f))).slice(0, maxFiles);
const results = [];
for (const file of candidates) {
  if (Date.now() - started >= maxMs) break;
  results.push(inspect(file));
}
const report = {
  schema: "cogentia.metadata-maintenance.v1",
  generated_at: new Date().toISOString(),
  read_only: true,
  network_used: false,
  mode: changedOnly ? "changed" : "changed-default",
  budget: { max_files: maxFiles, max_ms: maxMs },
  checkpoint: { resumable: true, cursor: results.length, total_candidates: candidates.length },
  totals: { candidates: candidates.length, inspected: results.length, needs_review: results.filter(r => r.state === "needs-review").length },
  results,
};
if (json) console.log(JSON.stringify(report, null, 2));
else console.log(`Metadata maintenance (read-only): ${results.length}/${candidates.length} inspected; ${report.totals.needs_review} need review.`);
