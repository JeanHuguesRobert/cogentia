#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import {
  loadAgentAcquiredContextSchema,
  validateAgentAcquiredContext,
  validateAgentAcquiredContextFile,
} from "./lib/agent-acquired-context.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, "schemas", "fixtures", "agent-acquired-context");
const validDir = path.join(fixtureRoot, "valid");
const invalidDir = path.join(fixtureRoot, "invalid");

const expectedInvalid = {
  "missing-source.yaml": 'missing required property "source"',
  "accepted-as-fact.yaml": 'unexpected property "accepted_as_fact"',
  "unknown-time-with-value.yaml": "status unknown requires a null value",
  "mneme-promotion.yaml": 'unexpected property "mneme_id"',
  "bad-origin.yaml": "is not in the allowed enum",
  "dangling-contradiction.yaml": "does not resolve to an item in this snapshot",
  "self-contradiction.yaml": "an item cannot contradict itself",
  "annotation-rewrites-item.yaml": 'unexpected property "content"',
  "raw-hash-mismatch.yaml": "does not match the UTF-8 body",
  "known-capture-time-null.yaml": "status known requires a non-empty string value",
  "retention-policy.yaml": 'unexpected property "retention"',
};

const forbiddenKeys = new Set([
  "mneme_id",
  "cogentigram",
  "accepted_as_fact",
  "retention",
  "lawful_basis",
  "promoted",
]);

function listYaml(dir) {
  return fs.readdirSync(dir).filter((name) => name.endsWith(".yaml")).sort();
}

function walkForbidden(value, where) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForbidden(item, `${where}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenKeys.has(key), false, `${where}.${key} is not part of the contract`);
    walkForbidden(child, `${where}.${key}`);
  }
}

const schema = loadAgentAcquiredContextSchema();
assert.equal(schema.$id, "urn:cogentia:schema:agent-acquired-context:v0");
assert.equal(schema.$defs.snapshot.properties.claim_status.const, "agent_claim_not_fact");
assert.equal(schema.$defs.annotation.properties.claim_status.const, "human_annotation_not_a_rewrite");
assert.equal(schema.$defs.item.properties.category.type, "string");
assert.equal(schema.$defs.item.properties.category.enum, undefined);

const validNames = listYaml(validDir);
assert.ok(validNames.length >= 8, "representative valid fixtures are missing");
for (const name of validNames) {
  const file = path.join(validDir, name);
  const report = validateAgentAcquiredContextFile(file);
  assert.equal(report.ok, true, `${name}: ${report.errors.join("; ")}`);
  assert.equal(report.schema_id, schema.$id);
  walkForbidden(yaml.load(fs.readFileSync(file, "utf8")), name);
}

const invalidNames = listYaml(invalidDir);
assert.deepEqual(invalidNames, Object.keys(expectedInvalid).sort());
for (const [name, needle] of Object.entries(expectedInvalid)) {
  const report = validateAgentAcquiredContextFile(path.join(invalidDir, name));
  assert.equal(report.ok, false, `${name} should be invalid`);
  assert.ok(
    report.errors.some((error) => error.includes(needle)),
    `${name}: expected ${JSON.stringify(needle)} in ${report.errors.join("; ")}`,
  );
}

const explicit = yaml.load(fs.readFileSync(path.join(validDir, "explicit-user-statement.yaml"), "utf8"));
assert.equal(explicit.layer, "normalized_snapshot");
assert.equal(explicit.raw_response.role, "immutable_raw_measurement");
assert.equal(explicit.items[0].claimed_origin, "explicit_user_statement");

const undated = yaml.load(fs.readFileSync(path.join(validDir, "undated-claim.yaml"), "utf8"));
assert.equal(undated.captured_at.status, "known");
assert.equal(undated.items[0].claimed_time.status, "unknown");
assert.equal(undated.items[0].claimed_time.value, null);

const unknownOrigin = yaml.load(fs.readFileSync(path.join(validDir, "unknown-origin.yaml"), "utf8"));
assert.equal(unknownOrigin.items[0].claimed_origin, "unknown");
assert.equal(unknownOrigin.captured_at.value, null);

const openCategory = yaml.load(fs.readFileSync(path.join(validDir, "open-category.yaml"), "utf8"));
assert.equal(openCategory.items[0].category, "neighbourhood-walks");

const contradictory = yaml.load(fs.readFileSync(path.join(validDir, "contradictory-items.yaml"), "utf8"));
assert.equal(contradictory.items.length, 2);
assert.deepEqual(contradictory.items[0].contradicts, ["item:office"]);
assert.deepEqual(contradictory.items[1].contradicts, ["item:remote"]);

const annotation = yaml.load(fs.readFileSync(path.join(validDir, "human-annotation.yaml"), "utf8"));
const annotationReport = validateAgentAcquiredContext(annotation);
assert.equal(annotationReport.ok, true, annotationReport.errors.join("; "));
assert.equal(annotationReport.layer, "human_annotation");
assert.equal(annotationReport.kind, "agent_acquired_context_annotation");
assert.equal(Object.hasOwn(annotation, "content"), false);
assert.equal(Object.hasOwn(annotation, "items"), false);
assert.equal(Object.hasOwn(annotation, "raw_response"), false);

const rawAbsent = validateAgentAcquiredContextFile(path.join(validDir, "raw-absent.yaml"));
assert.equal(rawAbsent.ok, true, rawAbsent.errors.join("; "));
assert.ok(rawAbsent.warnings.some((warning) => warning.includes("body is absent")));

const duplicate = structuredClone(explicit);
duplicate.items.push(structuredClone(explicit.items[0]));
const duplicateReport = validateAgentAcquiredContext(duplicate);
assert.equal(duplicateReport.ok, false);
assert.ok(duplicateReport.errors.some((error) => error.includes("duplicate item id: item:morning-meetings")));

const broken = validateAgentAcquiredContextFile(path.join(invalidDir, "not-a-file.yaml"));
assert.equal(broken.ok, false);
assert.ok(broken.errors.some((error) => error.includes("file not found")));

console.log("agent-acquired-context: ok");
