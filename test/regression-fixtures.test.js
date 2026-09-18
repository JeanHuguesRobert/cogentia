import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFrontmatter, validateFrontmatter } from "../scripts/lib/frontmatter-validator.js";
import {
  inferDocumentKind,
  classifyDocumentForFrontmatter,
  explicitDocumentRole,
} from "../scripts/lib/document-classifier.js";

// ============================================================================
// cogentia#179 Fixture 1: Nested-YAML frontmatter with provenance.derived_from
// ============================================================================
test("cogentia#179: nested YAML frontmatter with provenance.derived_from as array parses and validates", () => {
  const docText = `---
title: "Hardened Capability Router Specification"
author: "Agent JHN"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-09-18"
status: "draft"
license: "CC BY-SA 4.0"
language: "en"
document_role: "derived"
document_kind: "spec"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "cogentia"
  origin_ref: "main"
  origin_date: "2026-09-18"
  derived_from:
    - "docs/host_fs_desktop_commander.md"
    - "docs/cogentia-mcp.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Specification Content

Details here.
`;

  const extracted = extractFrontmatter(docText);
  assert.equal(extracted.present, true);
  assert.equal(extracted.attempted, true);
  assert.equal(extracted.error, null);
  assert.ok(extracted.data);
  assert.equal(extracted.data.title, "Hardened Capability Router Specification");
  assert.equal(extracted.data.document_role, "derived");

  // Verify nested provenance structure
  assert.ok(extracted.data.provenance);
  assert.equal(extracted.data.provenance.origin_type, "conversation");
  assert.ok(Array.isArray(extracted.data.provenance.derived_from));
  assert.deepEqual(extracted.data.provenance.derived_from, [
    "docs/host_fs_desktop_commander.md",
    "docs/cogentia-mcp.md",
  ]);

  // Verify validation passes without schema error
  const validation = validateFrontmatter(extracted.data);
  assert.equal(validation.valid, true, `Validation failed: ${validation.errors.join("; ")}`);
});

test("cogentia#179: provenance.derived_from as non-array string produces clear validation error", () => {
  const invalidData = {
    title: "Bad Derived Doc",
    date: "2026-09-18",
    status: "working",
    document_role: "derived",
    document_kind: "spec",
    provenance: {
      origin_type: "conversation",
      derived_from: "docs/single-source.md", // Invalid: string instead of array
    },
    review: {
      status: "unreviewed",
    },
  };

  const validation = validateFrontmatter(invalidData);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some(err => err.includes("provenance.derived_from") && err.includes("array")),
    `Expected array error on provenance.derived_from, got: ${validation.errors.join("; ")}`
  );
});

// ============================================================================
// cogentia#179 Fixture 2: .cogentia/issues/** kind classification
// ============================================================================
test("cogentia#179: .cogentia/issues/** paths infer issue_packet kind with strong confidence and source role", () => {
  const sampleIssueDocs = [
    { repo: "cogentia", rel: ".cogentia/issues/192.md", title: "Hardening host.fs" },
    { repo: "cogentia", rel: ".cogentia/issues/owner-repo/issue-00179.md", title: "Test suite issue" },
    { repo: "inseme", rel: "subfolder/.cogentia/issues/001.md", title: "Nested issue packet" },
  ];

  for (const doc of sampleIssueDocs) {
    const kindInfo = inferDocumentKind(doc);
    assert.equal(kindInfo.kind, "issue_packet", `Expected issue_packet for ${doc.rel}`);
    assert.equal(kindInfo.rule, "issue-packet");
    assert.equal(kindInfo.confidence, "strong");
    assert.equal(kindInfo.role, "source");

    const fullClass = classifyDocumentForFrontmatter(doc);
    assert.equal(fullClass.document_kind, "issue_packet");
    assert.equal(fullClass.document_role, "source");
    assert.equal(fullClass.confidence, "strong");
  }
});

test("cogentia#179: explicit document_kind: issue_packet infers issue_packet even if path is outside .cogentia/issues", () => {
  const doc = {
    repo: "cogentia",
    rel: "external/packets/custom-issue.md",
    title: "Custom issue packet",
    frontmatter: {
      document_kind: "issue_packet",
    },
  };

  const kindInfo = inferDocumentKind(doc);
  assert.equal(kindInfo.kind, "issue_packet");
  assert.equal(kindInfo.rule, "issue-packet");
  assert.equal(kindInfo.confidence, "strong");
  assert.equal(kindInfo.role, "source");
});

// ============================================================================
// Explicit Document Role extraction regression
// ============================================================================
test("explicitDocumentRole distinguishes canonical roles from legacy free text", () => {
  assert.equal(explicitDocumentRole({ document_role: "source" }), "source");
  assert.equal(explicitDocumentRole({ document_role: "operational" }), "operational");
  assert.equal(explicitDocumentRole({ document_role: "derived temporal map" }), ""); // legacy free-text, not canonical
  assert.equal(explicitDocumentRole({ corpus_role: "template" }), "template");
  assert.equal(explicitDocumentRole({ role: "index" }), "index");
  assert.equal(explicitDocumentRole({}), "");
});
