#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");
const schemaPath = path.join(root, "docs", "frontmatter-schema.v0.1.json");
const prosePath = path.join(root, "docs", "frontmatter-schema.md");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const prose = fs.readFileSync(prosePath, "utf8");

const json = JSON.parse(execFileSync(
  process.execPath,
  [cli, "frontmatter", "schema", "--json"],
  { cwd: os.tmpdir(), encoding: "utf8" },
));

assert.deepEqual(json, schema, "CLI JSON must be the tracked machine-readable schema");
assert.equal(json.schema, "cogentia.frontmatter-schema.v0.1");
assert.deepEqual(json.field_groups.core.required, [
  "title",
  "author",
  "affiliation",
  "date",
  "license",
  "language",
]);
assert.deepEqual(json.field_groups.traceability.required, [
  "status",
  "update_policy",
  "provenance",
  "review",
]);
assert.deepEqual(json.required_blocks.provenance.required, [
  "origin_type",
  "origin_repository",
  "origin_ref",
  "origin_date",
  "derived_from",
]);
assert.deepEqual(json.required_blocks.review.required, ["status", "reviewed_by"]);
assert.ok(json.status.base_vocabulary.includes("working-paper"));
assert.ok(json.deprecated_fields.includes("canonical_path"));

const declaredFields = Object.values(json.field_groups).flatMap((group) => [
  ...(group.required || []),
  ...(group.recommended || []),
  ...(group.optional || []),
  ...Object.keys(group.conditionally_required || {}),
]);

for (const field of [
  ...declaredFields,
  ...json.required_blocks.provenance.required,
  ...json.required_blocks.review.required,
  ...json.deprecated_fields,
]) {
  assert.ok(prose.includes(field), `prose specification must mention ${field}`);
}
assert.match(prose, /frontmatter-schema\.v0\.1\.json/);

const human = execFileSync(
  process.execPath,
  [cli, "frontmatter", "schema"],
  { cwd: os.tmpdir(), encoding: "utf8" },
);
assert.match(human, /Frontmatter schema 0\.1/);
assert.match(human, /required block provenance/);
assert.match(human, /status vocabulary/);
assert.match(human, /deprecated fields/);

const help = execFileSync(
  process.execPath,
  [cli, "help"],
  { cwd: os.tmpdir(), encoding: "utf8" },
);
assert.match(help, /frontmatter schema/);

console.log("frontmatter schema CLI tests passed");
