#!/usr/bin/env node

/**
 * scripts/test-frontmatter-validator.js
 *
 * Unit and integration tests for frontmatter-validator.js.
 * Part of Issue #163.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadFrontmatterSchema,
  extractFrontmatter,
  validateFrontmatter,
  validateFrontmatterText,
  validateFrontmatterPaths,
  formatValidationReport,
  CANONICAL_DOCUMENT_ROLES,
} from "./lib/frontmatter-validator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("Running frontmatter-validator unit tests...");

// 1. Schema loading
const schema = loadFrontmatterSchema();
assert.equal(schema.schema, "cogentia.frontmatter-schema.v0.1");
assert.ok(Array.isArray(schema.field_groups.core.required));
assert.ok(schema.status.base_vocabulary.includes("stable"));

// 2. Extraction tests
{
  const missing = extractFrontmatter("# Just a title without frontmatter");
  assert.equal(missing.present, false);
  assert.equal(missing.data, null);

  const unclosed = extractFrontmatter("---\ntitle: Unclosed\n");
  assert.equal(unclosed.present, false);
  assert.match(unclosed.error, /missing closing '---'/i);

  const syntaxErr = extractFrontmatter("---\ntitle: [unclosed array\n---");
  assert.equal(syntaxErr.present, true);
  assert.equal(syntaxErr.data, null);
  assert.match(syntaxErr.error, /YAML parse error/i);

  const valid = extractFrontmatter("---\ntitle: Hello World\nauthor: John Doe\n---");
  assert.equal(valid.present, true);
  assert.equal(valid.error, null);
  assert.equal(valid.data.title, "Hello World");
}

// 3. Validation rule tests
{
  const validDoc = {
    title: "Test Document",
    author: "Jean Hugues Noël Robert, baron Mariani",
    affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica",
    date: "2026-09-08",
    license: "CC BY-SA 4.0",
    language: "en",
    document_role: "operational",
    status: "stable — normative",
    update_policy: "UP-DEFAULT-REVIEWED",
    provenance: {
      origin_type: "repository",
      origin_repository: "JeanHuguesRobert/cogentia",
      origin_ref: "abcdef1234",
      origin_date: "2026-09-08",
      derived_from: [],
    },
    review: {
      status: "verified",
      reviewed_by: ["Jean Hugues Noël Robert"],
    },
  };

  const res = validateFrontmatter(validDoc, schema);
  assert.equal(res.valid, true, `Expected valid, got errors: ${res.errors.join("; ")}`);
  assert.equal(res.errors.length, 0);

  // Missing core required fields
  const missingCore = validateFrontmatter({ ...validDoc, title: undefined, author: "" }, schema);
  assert.equal(missingCore.valid, false);
  assert.ok(missingCore.errors.some(e => e.includes("'title'")));
  assert.ok(missingCore.errors.some(e => e.includes("'author'")));

  // Missing traceability required fields
  const missingTrace = validateFrontmatter({ ...validDoc, provenance: undefined, review: undefined }, schema);
  assert.equal(missingTrace.valid, false);
  assert.ok(missingTrace.errors.some(e => e.includes("'provenance'")));
  assert.ok(missingTrace.errors.some(e => e.includes("'review'")));

  // Invalid provenance origin_type
  const badOriginType = validateFrontmatter({
    ...validDoc,
    provenance: { ...validDoc.provenance, origin_type: "magic_portal" },
  }, schema);
  assert.equal(badOriginType.valid, false);
  assert.ok(badOriginType.errors.some(e => e.includes("origin_type")));

  // Non-array derived_from
  const badDerived = validateFrontmatter({
    ...validDoc,
    provenance: { ...validDoc.provenance, derived_from: "not-an-array" },
  }, schema);
  assert.equal(badDerived.valid, false);
  assert.ok(badDerived.errors.some(e => e.includes("derived_from")));

  // Invalid review field (review_status instead of status)
  const badReview = validateFrontmatter({
    ...validDoc,
    review: { review_status: "verified", reviewed_by: ["Jean"] },
  }, schema);
  assert.equal(badReview.valid, false);
  assert.ok(badReview.errors.some(e => e.includes("review.status")));

  // Status vocabulary validation
  const validStatusList = [
    "stable",
    "working-paper",
    "draft",
    "stable — normative",
    "working-paper — Batch 0 verified",
    "working-paper, under-review",
    ["draft", "superceded"],
  ];
  for (const st of validStatusList) {
    const r = validateFrontmatter({ ...validDoc, status: st }, schema);
    assert.equal(r.valid, true, `Status '${st}' should be valid, but got: ${r.errors.join("; ")}`);
  }

  const badStatusList = [
    "normative", // must start with stable, working-paper, etc.
    "active",    // active is a lifecycle_state, not a valid status base vocabulary
    "completed",
  ];
  for (const st of badStatusList) {
    const r = validateFrontmatter({ ...validDoc, status: st }, schema);
    assert.equal(r.valid, false, `Status '${st}' should be invalid`);
    assert.ok(r.errors.some(e => e.includes("canonical base vocabulary")));
  }

  // Deprecated fields check
  const deprecatedDoc = validateFrontmatter({ ...validDoc, canonical_path: "/foo/bar" }, schema);
  assert.equal(deprecatedDoc.valid, true); // warning, does not fail validation unless strict
  assert.ok(deprecatedDoc.warnings.some(w => w.includes("canonical_path")));

  // Document role check
  const badRoleDoc = validateFrontmatter({ ...validDoc, document_role: "custom-role-xyz" }, schema);
  assert.ok(badRoleDoc.warnings.some(w => w.includes("custom-role-xyz")));
}

// 4. File and text validation integration
{
  const text = `---
title: "Sample"
author: "Author"
affiliation: "Affiliation"
date: "2026-09-08"
license: "CC BY-SA 4.0"
language: "en"
status: "stable"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "repository"
  origin_repository: "owner/repo"
  origin_ref: "12345"
  origin_date: "2026-09-08"
  derived_from: []
review:
  status: "verified"
  reviewed_by: ["Author"]
---
# Content here
`;

  const textRes = validateFrontmatterText(text);
  assert.equal(textRes.valid, true);
  assert.equal(textRes.data.title, "Sample");

  // Validate real files in workspace
  const docPath = path.join(root, "docs", "frontmatter-schema.md");
  const pathsRes = validateFrontmatterPaths([docPath]);
  assert.equal(pathsRes.total, 1);
  const formatted = formatValidationReport(pathsRes);
  assert.ok(formatted.includes("Frontmatter validation:"));
}

// 5. CLI end-to-end integration tests
{
  const { execFileSync } = await import("node:child_process");
  const cli = path.join(root, "scripts", "cogentia.js");
  const targetDoc = path.join(root, "docs", "frontmatter-schema.md");

  // Verify command
  const stdoutVerify = execFileSync(process.execPath, [cli, "frontmatter", "verify", targetDoc], {
    encoding: "utf8",
  });
  assert.ok(stdoutVerify.includes("1/1 valid"));
  assert.ok(stdoutVerify.includes("✓"));

  // Check alias with --json
  const stdoutJson = execFileSync(process.execPath, [cli, "frontmatter", "check", targetDoc, "--json"], {
    encoding: "utf8",
  });
  const parsedJson = JSON.parse(stdoutJson);
  assert.equal(parsedJson.ok, true);
  assert.equal(parsedJson.total, 1);
  assert.equal(parsedJson.valid_count, 1);
  assert.equal(parsedJson.files[0].valid, true);

  // Failure scenario returns exit code 1
  assert.throws(
    () => {
      execFileSync(
        process.execPath,
        [cli, "frontmatter", "verify", path.join(root, "nonexistent-file.md")],
        { encoding: "utf8" }
      );
    },
    /Command failed/,
    "Expected exit code 1 on nonexistent or invalid file"
  );
}

console.log("All frontmatter-validator tests passed successfully!");
