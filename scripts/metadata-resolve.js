#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const json = args.has("--json");
const matchArg = process.argv.find((arg) => arg.startsWith("--match="));
const match = matchArg ? matchArg.slice(8).toLowerCase() : null;
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/).filter((file) => /\.md(?:own)?$/i.test(file));

function origin(file) {
  try {
    const [ref, date] = execFileSync("git", ["log", "--follow", "--format=%h|%ad", "--date=short", "-1", "--", file], { cwd: root, encoding: "utf8" }).trim().split("|");
    return { ref: ref || "unknown", date: date || "unknown" };
  } catch { return { ref: "unknown", date: "unknown" }; }
}
function repositoryIdentity() {
  try {
    const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], { cwd: root, encoding: "utf8" }).trim();
    return remote.replace(/^https?:\/\/github.com\//, "").replace(/^git@github.com:/, "").replace(/\.git$/, "");
  } catch { return "unknown"; }
}
const repository = repositoryIdentity();

function title(text, file) {
  const heading = text.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(file, path.extname(file));
}

const results = [];
for (const file of files) {
  if (match && !file.toLowerCase().endsWith(match)) continue;
  const target = path.join(root, file);
  const before = fs.readFileSync(target, "utf8");
  if (/^---\r?\n/.test(before)) continue;
  const o = origin(file);
  const data = {
    title: title(before, file), author: "unknown", date: o.date,
    document_role: "source", document_kind: "documentation", visibility: "public",
    lifecycle_state: "working", update_policy: "UP-DEFAULT-REVIEWED",
    provenance: { origin_type: "repository", origin_repository: repository, origin_ref: o.ref, origin_date: o.date, derived_from: [] },
    review: { status: "unreviewed", reviewed_by: [] },
  };
  const after = `---\n${yaml.dump(data, { lineWidth: -1, noRefs: true })}---\n\n${before}`;
  if (apply) fs.writeFileSync(target, after, "utf8");
  results.push({ path: file, state: apply ? "applied" : "planned", before_hash: sha(before), proposed_after_hash: sha(after), continuation: "frontmatter_review", unresolved: ["author", "document_role", "derived_from"], origin: o });
}

const report = { schema: "cogentia.metadata-resolve.v1", read_only: !apply, applied: apply, match, totals: { candidates: results.length, applied: apply ? results.length : 0, planned: apply ? 0 : results.length }, results };
if (json) console.log(JSON.stringify(report, null, 2));
else console.log(`Metadata resolve (${apply ? "apply" : "preview"}): ${results.length} files.`);
