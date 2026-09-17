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

// namesToContent: { "a/foo.md": "content", "b/foo.md": "content", ... }
function withTempFiles(namesToContent, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-fm-test-"));
  const files = Object.entries(namesToContent).map(([name, content]) => {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
    return file;
  });
  try {
    return fn(files);
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

// cogentia#183 step 2: private-registry repos (registre-mariani and any
// future one) get an extra gate — a strong prediction alone must not
// auto-scaffold sensitive/third-party content.
test("planFrontmatterRepairs gates a strong prediction in a private-registry repo (sensitive-repo gate)", () => {
  const content = "# Title\n\nJust a document with no self-declared metadata.\n";
  withTempFile(content, (file) => {
    const classify = () => ({ role: "source", role_confidence: "strong", document_kind: "biographical-map", kind_confidence: "strong", visibility: "private" });
    const plan = planFrontmatterRepairs([file], { classify });
    assert.equal(plan.changes_count, 0, "strong confidence alone must not bypass the sensitive-repo gate");
    assert.equal(plan.needs_judgment_count, 1);
    assert.match(plan.needs_judgment[0].reason, /private-registry repo/);
  });
});

test("planFrontmatterRepairs still auto-scaffolds a private-registry file with self-declared legacy role", () => {
  const content = "# Title\n\nDocument role: derived\nVisibility: private\n\nbody\n";
  withTempFile(content, (file) => {
    const classify = () => ({ role: "unknown", role_confidence: "weak", document_kind: null, kind_confidence: "weak", visibility: "private" });
    const plan = planFrontmatterRepairs([file], { classify });
    assert.equal(plan.changes_count, 1, "explicit self-declared prose overrides the gate — a human already wrote it down");
    assert.equal(plan.needs_judgment_count, 0);
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

// cogentia#187: identical content at different paths (hardlinks, monorepo
// build-system copies, plain duplicates) should be flagged as one shared
// decision, not N independent ones — found the hard way in inseme
// (cogentia#183), where 12 of 39 needs_judgment files were hardlinked
// copies across 4 apps.
test("planFrontmatterRepairs flags needs_judgment duplicates via shared_with", () => {
  const content = "# Shared Title\n\nIdentical content, no self-declared metadata.\n";
  withTempFiles({ "a/doc.md": content, "b/doc.md": content, "c/other.md": "# Different\n\nUnrelated.\n" }, (files) => {
    const plan = planFrontmatterRepairs(files, {});
    assert.equal(plan.needs_judgment_count, 3);
    assert.equal(plan.duplicate_groups_count, 1);
    const a = plan.needs_judgment.find(x => x.path.endsWith("a/doc.md") || x.path.endsWith("a\\doc.md"));
    const c = plan.needs_judgment.find(x => x.path.endsWith("c/other.md") || x.path.endsWith("c\\other.md"));
    assert.equal(a.shared_with.length, 1, "the two identical files should reference each other");
    assert.equal(c.shared_with.length, 0, "the unrelated file has no duplicates");
  });
});

test("planFrontmatterRepairs flags scaffold duplicates via shared_with too, not just needs_judgment", () => {
  const content = "# Shared Title\n\nIdentical content.\n";
  withTempFiles({ "a/doc.md": content, "b/doc.md": content }, (files) => {
    const classify = () => ({ role: "template", role_confidence: "strong", document_kind: "template", kind_confidence: "strong", visibility: null });
    const plan = planFrontmatterRepairs(files, { classify });
    assert.equal(plan.changes_count, 2);
    assert.equal(plan.duplicate_groups_count, 1);
    assert.equal(plan.changes[0].shared_with.length, 1);
    assert.equal(plan.changes[1].shared_with.length, 1);
  });
});
