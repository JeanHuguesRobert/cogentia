#!/usr/bin/env node

// Read-only metadata audit. It reports durable tracked artifacts and never writes files.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

const root = process.cwd();
const durable = /\.(md|markdown|ya?ml|json)$/i;
const ignored = /(^|[\\/])(node_modules|\.git|dist|build|coverage|_site)([\\/]|$)/i;
const required = ["title", "author", "date", "provenance", "review"];

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
      .split("\0").filter(Boolean);
  } catch (error) {
    throw new Error(`git ls-files failed: ${error.message}`);
  }
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { present: false, data: null, error: null };
  try { return { present: true, data: yaml.load(match[1]) || {}, error: null }; }
  catch (error) { return { present: true, data: null, error: error.message }; }
}

function audit(file) {
  const absolute = path.join(root, file);
  const text = fs.readFileSync(absolute, "utf8");
  const result = { path: file.replaceAll("\\", "/"), artifact_kind: "durable-document", metadata: "missing", issues: [] };
  if (/\.md(?:own)?$/i.test(file)) {
    const parsed = frontmatter(text);
    if (!parsed.present) result.issues.push("missing-frontmatter");
    else if (parsed.error) { result.metadata = "invalid"; result.issues.push("invalid-frontmatter"); result.error = parsed.error; return result; }
    else {
      result.metadata = "present";
      result.missing_fields = required.filter(key => parsed.data[key] === undefined);
      if (result.missing_fields.length) result.issues.push("missing-required-fields");
      if (parsed.data.document_role === "adapted") {
        const adaptationFields = ["derivation_mode", "adaptation_context", "derived_from"];
        result.missing_adaptation_fields = adaptationFields.filter(key => parsed.data[key] === undefined);
        if (result.missing_adaptation_fields.length) result.issues.push("missing-adaptation-trace");
      }
      if (parsed.data.adapted_products !== undefined && !Array.isArray(parsed.data.adapted_products)) result.issues.push("invalid-adapted-products");
      result.update_policy = parsed.data.update_policy || "UP-DEFAULT-REVIEWED";
    }
  } else {
    result.artifact_kind = "structured-data";
    try { JSON.parse(text); result.metadata = "embedded-or-structured"; }
    catch { try { yaml.load(text); result.metadata = "embedded-or-structured"; } catch { result.issues.push("invalid-structured-data"); } }
  }
  result.state = result.issues.length ? "needs-review" : "complete";
  return result;
}

const files = trackedFiles().filter(file => durable.test(file) && !ignored.test(file));
const artifacts = files.map(audit);
const report = {
  schema: "cogentia.metadata-audit.v1",
  generated_at: new Date().toISOString(),
  repository_root: root.replaceAll("\\", "/"),
  read_only: true,
  policy_default: "UP-DEFAULT-REVIEWED",
  totals: {
    scanned: artifacts.length,
    complete: artifacts.filter(a => a.state === "complete").length,
    needs_review: artifacts.filter(a => a.state === "needs-review").length,
  },
  artifacts,
};
console.log(JSON.stringify(report, null, 2));
