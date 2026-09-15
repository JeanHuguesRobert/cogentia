import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLegacyProseMetadata, extractFrontmatter } from "../scripts/lib/frontmatter-validator.js";

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
