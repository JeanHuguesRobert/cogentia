import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractLegacyProseMetadata, extractFrontmatter, planFrontmatterRepairs } from "../scripts/lib/frontmatter-validator.js";

function withTempFile(content, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-fm-test-"));
  const file = path.join(dir, "doc.md");
  fs.writeFileSync(file, content, "utf8");
  try {
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// cogentia#181: documents that self-describe their own metadata in plain
// prose instead of YAML frontmatter (a recognized idiom in at least the
// registre-mariani twin dossier, migrated by hand 2026-09-14).
test("recognizes the known Status/Visibility/Document role prose idiom", () => {
  const text = [
    "# Childhood before 2007 — provisional reconstruction",
    "",
    "Status: working map",
    "Visibility: private",
    "Document role: derived temporal map",
    "",
    "## Purpose",
  ].join("\n");

  const found = extractLegacyProseMetadata(text);
  assert.deepEqual(found, {
    status: "working map",
    visibility: "private",
    document_role: "derived temporal map",
  });
});

test("finds nothing in an ordinary document (no false positives)", () => {
  const text = "# A Plain Document\n\nJust some content, no self-declared metadata here.\n";
  assert.deepEqual(extractLegacyProseMetadata(text), {});
});

test("does not read prose metadata lines past the scan window", () => {
  const padding = Array.from({ length: 20 }, (_, i) => `paragraph ${i}`).join("\n");
  const text = `# Title\n\n${padding}\n\nStatus: too late to count\n`;
  assert.deepEqual(extractLegacyProseMetadata(text), {});
});

// The dead-code fix this session found: extractFrontmatter must distinguish
// "no --- ever attempted" from "--- opened but broken", since both report
// present: false and previously shared the same implicit signal, making
// planFrontmatterRepairs' missing-frontmatter scaffold branch unreachable.
test("extractFrontmatter distinguishes 'no frontmatter attempted' from 'malformed frontmatter'", () => {
  const noAttempt = extractFrontmatter("# Just a heading\n\nbody text\n");
  assert.equal(noAttempt.present, false);
  assert.equal(noAttempt.attempted, false);

  const brokenAttempt = extractFrontmatter("---\ntitle: unterminated\n\nbody text with no closing delimiter\n");
  assert.equal(brokenAttempt.present, false);
  assert.equal(brokenAttempt.attempted, true);

  const valid = extractFrontmatter("---\ntitle: ok\n---\n\nbody\n");
  assert.equal(valid.present, true);
  assert.equal(valid.attempted, true);
});

// cogentia#183: scaffolding must not guess document_role at corpus scale.
// Three-way tiering: explicit self-declared prose wins, a strong classifier
// prediction is trusted, anything else is routed to judgment instead of
// silently defaulting to "operational".
test("planFrontmatterRepairs auto-scaffolds a file with self-declared legacy role", () => {
  const content = "# Title\n\nStatus: working map\nDocument role: derived\n\nbody\n";
  withTempFile(content, (file) => {
    const plan = planFrontmatterRepairs([file], {});
    assert.equal(plan.changes_count, 1);
    assert.equal(plan.needs_judgment_count, 0);
    assert.ok(plan.changes[0].repairs.includes("migrate_legacy_prose_metadata"));
    assert.match(plan.changes[0].after_yaml, /document_role: derived/);
  });
});

test("planFrontmatterRepairs auto-scaffolds using a strong classifier prediction", () => {
  const content = "# Title\n\nJust a document with no self-declared metadata.\n";
  withTempFile(content, (file) => {
    const classify = () => ({ role: "template", role_confidence: "strong", document_kind: "template", kind_confidence: "strong", visibility: null });
    const plan = planFrontmatterRepairs([file], { classify });
    assert.equal(plan.changes_count, 1);
    assert.equal(plan.needs_judgment_count, 0);
    assert.ok(plan.changes[0].repairs.includes("classified_role_from_inventory"));
    assert.match(plan.changes[0].after_yaml, /document_role: template/);
    assert.match(plan.changes[0].after_yaml, /document_kind: template/);
  });
});

test("planFrontmatterRepairs routes a weak/unknown prediction to needs_judgment, not a guess", () => {
  const content = "# Title\n\nJust a document with no self-declared metadata.\n";
  withTempFile(content, (file) => {
    const classify = () => ({ role: "unknown", role_confidence: "weak", document_kind: null, kind_confidence: "weak", visibility: null });
    const plan = planFrontmatterRepairs([file], { classify });
    assert.equal(plan.changes_count, 0, "must not write a generic-default guess");
    assert.equal(plan.needs_judgment_count, 1);
    assert.match(plan.needs_judgment[0].reason, /docs judgments/);
  });
});

test("planFrontmatterRepairs routes to needs_judgment when no classifier is available at all", () => {
  const content = "# Title\n\nNo metadata, and no classifier provided.\n";
  withTempFile(content, (file) => {
    const plan = planFrontmatterRepairs([file], {});
    assert.equal(plan.changes_count, 0);
    assert.equal(plan.needs_judgment_count, 1);
  });
});
