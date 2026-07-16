#!/usr/bin/env node

// Deterministic, read-only metadata migration planner. It never writes source files.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const maxFiles = (() => { const i = process.argv.indexOf("--max-files"); return i >= 0 ? Number(process.argv[i + 1]) : Infinity; })();
const required = ["title", "author", "date", "provenance", "review"];
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
function parse(text) { const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/); if (!m) return { data: {}, valid: false }; try { return { data: yaml.load(m[1]) || {}, valid: true }; } catch (error) { return { data: {}, valid: false, error: error.message }; } }
function plan(file) {
  const before = fs.readFileSync(path.join(root, file), "utf8"); const parsed = parse(before);
  if (!parsed.valid) return {
    path: file,
    action: "provenance-continuation",
    continuation_kind: "frontmatter_review",
    status: "pending",
    reason: "missing-or-invalid-frontmatter",
    before_hash: sha(before),
    confidence: "low",
    questions: ["Who authored the substantive content?", "When was it first introduced?", "What document role and source relationship are justified?"],
    evidence_to_collect: ["git log --follow", "git blame", "repository AGENTS.md and README", "linked source documents", "related issues or pull requests"],
    unknowns: ["author", "date", "origin_ref", "derived_from"],
    next_actor: "human-or-authorized-agent"
  };
  const changes = {};
  if (parsed.data.author === undefined) changes.author = "unknown";
  if (parsed.data.date === undefined) changes.date = "unknown";
  if (parsed.data.provenance === undefined) changes.provenance = { origin_type: "unknown", origin_repository: "unknown", origin_ref: "unknown", origin_date: "unknown", derived_from: [] };
  if (parsed.data.review === undefined) changes.review = { status: "unreviewed", reviewed_by: [] };
  if (!Object.hasOwn(parsed.data, "update_policy")) changes.update_policy = "UP-DEFAULT-REVIEWED";
  if (!Object.keys(changes).length) return null;
  const merged = { ...parsed.data, ...changes }; const block = `---\n${yaml.dump(merged, { lineWidth: -1, noRefs: true })}---\n`;
  const after = before.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, block);
  return { path: file, action: "add-safe-metadata", changes, before_hash: sha(before), proposed_after_hash: sha(after), confidence: "medium", requires_review: true };
}
const plans = tracked.filter(f => /\.md(?:own)?$/i.test(f)).slice(0, maxFiles).map(plan).filter(Boolean);
const report = { schema: "cogentia.metadata-plan.v1", generated_at: new Date().toISOString(), read_only: true, totals: { plans: plans.length, safe_metadata_plans: plans.filter(p => p.action === "add-safe-metadata").length, provenance_continuations: plans.filter(p => p.action === "provenance-continuation").length }, plans };
if (json) console.log(JSON.stringify(report, null, 2)); else console.log(`Metadata plan (dry-run): ${report.totals.safe_metadata_plans} safe plans; ${report.totals.manual_review} manual reviews.`);
