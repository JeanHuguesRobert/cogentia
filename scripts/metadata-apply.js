#!/usr/bin/env node

// Guarded metadata application. Default is preview; --apply is required to write.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const planArg = process.argv.indexOf("--plan");
const planPath = planArg >= 0 ? process.argv[planArg + 1] : null;
if (!planPath) throw new Error("Usage: node scripts/metadata-apply.js --plan metadata-plan.json [--apply] [--json]");
const report = JSON.parse(fs.readFileSync(path.resolve(root, planPath), "utf8"));
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const results = [];

for (const item of report.plans || []) {
  if (item.action !== "add-safe-metadata") { results.push({ path: item.path, state: "skipped", reason: item.action }); continue; }
  const target = path.join(root, item.path);
  const before = fs.readFileSync(target, "utf8");
  if (sha(before) !== item.before_hash) { results.push({ path: item.path, state: "stale", expected: item.before_hash, actual: sha(before) }); continue; }
  const match = before.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) { results.push({ path: item.path, state: "manual-review", reason: "frontmatter-disappeared" }); continue; }
  const data = yaml.load(match[1]) || {};
  const additions = Object.fromEntries(Object.entries(item.changes || {}).filter(([key]) => data[key] === undefined));
  if (!Object.keys(additions).length) { results.push({ path: item.path, state: "already-applied" }); continue; }
  const updated = { ...data, ...additions };
  const block = `---\n${yaml.dump(updated, { lineWidth: -1, noRefs: true })}---\n`;
  const after = before.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, block);
  if (args.has("--apply")) {
    const temp = `${target}.metadata-tmp-${process.pid}`;
    fs.writeFileSync(temp, after, "utf8"); fs.renameSync(temp, target);
    results.push({ path: item.path, state: "applied", after_hash: sha(after) });
  } else results.push({ path: item.path, state: "planned", after_hash: sha(after) });
}

const output = { schema: "cogentia.metadata-apply.v1", applied: args.has("--apply"), read_only: !args.has("--apply"), totals: { applied: results.filter(r => r.state === "applied").length, planned: results.filter(r => r.state === "planned").length, stale: results.filter(r => r.state === "stale").length, skipped: results.filter(r => r.state === "skipped").length }, results };
if (args.has("--json")) console.log(JSON.stringify(output, null, 2)); else console.log(`Metadata ${output.applied ? "apply" : "preview"}: ${output.totals.applied || output.totals.planned} changes; ${output.totals.stale} stale; ${output.totals.skipped} skipped.`);
if (output.totals.stale) process.exitCode = 2;
