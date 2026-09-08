#!/usr/bin/env node

/**
 * scripts/test-frontmatter-validator.js
 *
 * Unit and integration tests for frontmatter-validator.js.
 * Part of Issue #163.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  loadFrontmatterSchema,
  extractFrontmatter,
  validateFrontmatter,
  validateFrontmatterText,
  validateFrontmatterPaths,
  formatValidationReport,
  scaffoldFrontmatter,
  scaffoldFrontmatterFile,
  planFrontmatterRepairs,
  applyFrontmatterRepairs,
  formatRepairsPlan,
  formatRepairsApply,
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

// 6. Scaffolding tests
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frontmatter-scaffold-test-"));
  try {
    // 6.1 scaffoldFrontmatter object conforms to schema
    const scaffoldedObj = scaffoldFrontmatter({
      title: "My New Operational Guide",
      role: "operational",
      status: "working-paper",
      lang: "fr",
      author: "Jean Hugues Noël Robert, baron Mariani",
    });

    const valResult = validateFrontmatter(scaffoldedObj, schema, { strictRole: true });
    assert.equal(valResult.valid, true, `Scaffolded object must be strictly valid: ${valResult.errors.join("; ")}`);
    assert.equal(scaffoldedObj.title, "My New Operational Guide");
    assert.equal(scaffoldedObj.language, "fr");
    assert.equal(scaffoldedObj.license, "CC BY-SA 4.0");
    assert.equal(scaffoldedObj.document_role, "operational");
    assert.equal(scaffoldedObj.update_policy, "UP-DEFAULT-REVIEWED");
    assert.equal(scaffoldedObj.provenance.origin_type, "repository");
    assert.equal(scaffoldedObj.review.status, "unreviewed");

    // 6.2 scaffoldFrontmatterFile creates a new file passing verification
    const newDoc = path.join(tmpDir, "new-guidance.md");
    const createRes = scaffoldFrontmatterFile(newDoc, {
      title: "New Guidance Document",
      role: "operational",
      lang: "en",
    });
    assert.equal(createRes.ok, true);
    assert.equal(createRes.mode, "created");
    assert.ok(fs.existsSync(newDoc));

    const checkRes = validateFrontmatterPaths([newDoc], { strictRole: true });
    assert.equal(checkRes.ok, true, `Newly scaffolded file must pass verification: ${checkRes.files[0]?.errors.join("; ")}`);
    assert.equal(checkRes.valid_count, 1);

    // 6.3 scaffoldFrontmatterFile refuses to overwrite existing frontmatter without --force
    const failRes = scaffoldFrontmatterFile(newDoc, { force: false });
    assert.equal(failRes.ok, false);
    assert.equal(failRes.error, "file_already_has_frontmatter");

    // 6.4 scaffoldFrontmatterFile prepends to markdown without frontmatter
    const bareDoc = path.join(tmpDir, "bare-doc.md");
    fs.writeFileSync(bareDoc, "# Heading One\n\nSome body text without frontmatter.\n", "utf8");
    const prependRes = scaffoldFrontmatterFile(bareDoc);
    assert.equal(prependRes.ok, true);
    assert.equal(prependRes.mode, "prepended");

    const content = fs.readFileSync(bareDoc, "utf8");
    assert.ok(content.startsWith("---\n"));
    assert.ok(content.includes("title: Heading One"));
    assert.ok(content.includes("Some body text without frontmatter."));
    const bareCheck = validateFrontmatterPaths([bareDoc]);
    assert.equal(bareCheck.ok, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 7. Repair planning & application tests
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frontmatter-repair-test-"));
  try {
    // Document with repairable defects:
    // - synonym: licence instead of license
    // - synonym: lang instead of language
    // - synonym: created instead of date
    // - synonym: keywords instead of tags
    // - deprecated: path
    // - missing: affiliation, update_policy, review, provenance
    const defectiveDoc = path.join(tmpDir, "defective.md");
    const defectiveContent = `---
title: Defective Metadata Spec
author: Jean Hugues Noël Robert
licence: CC BY-SA 4.0
lang: en
created: "2026-09-08"
keywords: ["cop", "fractalog"]
path: "docs/defective.md"
---

# Defective Metadata Spec

Body content here.
`;
    fs.writeFileSync(defectiveDoc, defectiveContent, "utf8");

    // Planning repairs (dry-run)
    const plan = planFrontmatterRepairs([defectiveDoc]);
    assert.equal(plan.ok, true);
    assert.equal(plan.changes_count, 1);
    const change = plan.changes[0];

    assert.ok(change.repairs.some(r => r.includes("migrate_synonym:licence->license")));
    assert.ok(change.repairs.some(r => r.includes("migrate_synonym:lang->language")));
    assert.ok(change.repairs.some(r => r.includes("migrate_synonym:created->date")));
    assert.ok(change.repairs.some(r => r.includes("migrate_synonym:keywords->tags")));
    assert.ok(change.repairs.some(r => r.includes("remove_deprecated:path")));
    assert.ok(change.repairs.some(r => r.includes("add_default:affiliation")));
    assert.ok(change.repairs.some(r => r.includes("add_default:update_policy")));
    assert.ok(change.repairs.some(r => r.includes("add_block:review")));
    assert.ok(change.repairs.some(r => r.includes("add_block:provenance")));

    // Content was not yet modified on disk during plan
    assert.equal(fs.readFileSync(defectiveDoc, "utf8"), defectiveContent);

    // Apply repairs
    const applyRes = applyFrontmatterRepairs(plan);
    assert.equal(applyRes.ok, true);
    assert.equal(applyRes.applied, 1);

    // Repaired document on disk now passes schema verification
    const verifyAfter = validateFrontmatterPaths([defectiveDoc]);
    assert.equal(verifyAfter.ok, true, `Repaired document must be valid: ${verifyAfter.files[0]?.errors.join("; ")}`);
    assert.equal(verifyAfter.valid_count, 1);

    // Test hash-safety preflight abort when modified concurrently
    fs.writeFileSync(defectiveDoc, "Modified content after planning!\n", "utf8");
    const staleApply = applyFrontmatterRepairs(plan);
    assert.equal(staleApply.ok, false);
    assert.equal(staleApply.applied, 0);
    assert.ok(staleApply.preflight_failed.some(f => f.error.includes("hash_mismatch")));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 8. CLI subprocess tests for scaffold, plan, apply
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frontmatter-cli-test-"));
  const cli = path.join(root, "scripts", "cogentia.js");

  try {
    // 8.1 CLI frontmatter scaffold
    const targetDoc = path.join(tmpDir, "cli-scaffold.md");
    const stdoutScaffold = execFileSync(
      process.execPath,
      [cli, "frontmatter", "scaffold", targetDoc, "--title", "CLI Created Doc", "--role", "operational", "--lang", "en"],
      { encoding: "utf8" }
    );
    assert.ok(stdoutScaffold.includes("Created new file with frontmatter"));
    assert.ok(fs.existsSync(targetDoc));

    // Verify it passes CLI verify
    const stdoutVerify = execFileSync(
      process.execPath,
      [cli, "frontmatter", "verify", targetDoc],
      { encoding: "utf8" }
    );
    assert.ok(stdoutVerify.includes("1/1 valid"));

    // 8.2 CLI frontmatter plan --fix and apply --fix
    const unreviewedDoc = path.join(tmpDir, "unreviewed.md");
    fs.writeFileSync(
      unreviewedDoc,
      `---
title: Doc Needing Defaults
author: Jean Hugues
date: "2026-09-08"
language: en
document_role: operational
status: working-paper
---

# Content
`,
      "utf8"
    );

    // Plan
    const stdoutPlan = execFileSync(
      process.execPath,
      [cli, "frontmatter", "plan", "--fix", unreviewedDoc, "--json"],
      { encoding: "utf8" }
    );
    const parsedPlan = JSON.parse(stdoutPlan);
    assert.equal(parsedPlan.ok, true);
    assert.equal(parsedPlan.changes_count, 1);

    // Apply
    const stdoutApply = execFileSync(
      process.execPath,
      [cli, "frontmatter", "apply", "--fix", unreviewedDoc, "--json"],
      { encoding: "utf8" }
    );
    const parsedApply = JSON.parse(stdoutApply);
    assert.equal(parsedApply.ok, true);
    assert.equal(parsedApply.applied, 1);

    // Verify applied document
    const stdoutVerifyRepaired = execFileSync(
      process.execPath,
      [cli, "frontmatter", "verify", unreviewedDoc],
      { encoding: "utf8" }
    );
    assert.ok(stdoutVerifyRepaired.includes("1/1 valid"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("All frontmatter-validator tests passed successfully!");

