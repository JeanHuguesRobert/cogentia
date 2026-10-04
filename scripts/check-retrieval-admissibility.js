#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  loadRetrievalAdmissibilityPolicy,
  retrievalChunkAdmissible,
  retrievalDocumentKind,
} from "./lib/retrieval-admissibility.js";

const policy = loadRetrievalAdmissibilityPolicy();
assert.deepEqual(policy.derivedClasses.map(item => item.id), ["living-book-manuscript"]);
assert.equal(policy.derivedClasses[0].path_contains, "/manuscript/");
assert.equal(policy.derivedClasses[0].does_not_grant, "sovereign source status");

const cases = [
  { row: { role: "source", path: "research/pathologie_du_secret.md" }, admissible: true, kind: "source" },
  { row: { role: "source", path: ".cogentia/notes.md" }, admissible: false, kind: "source" },
  { row: { role: "source", path: "research/issues/12.md" }, admissible: false, kind: "source" },
  { row: { role: "derived", path: "projects/privai/manuscript/n1/00-qui-restera-souverain.md" }, admissible: true, kind: "derived" },
  { row: { role: "derived", path: "projects/suicide-corse/manuscript/00-ouverture.md" }, admissible: true, kind: "derived" },
  { row: { role: "derived", path: "projects/capable/manuscript/00-ouverture.md" }, admissible: true, kind: "derived" },
  { row: { role: "derived", path: "projects/rise-and-fall/manuscript/book/05.md" }, admissible: true, kind: "derived" },
  { row: { role: "derived", path: "research/senatoriales-2026/media/kit_presse_post_scrutin_2026-09-27.md" }, admissible: false, kind: "" },
  { row: { role: "derived", path: "memory/marie-louise/capability-matrix.md" }, admissible: false, kind: "" },
  { row: { role: "trail", path: "research/trails/capable.md" }, admissible: false, kind: "" },
  { row: { role: "operational", path: "projects/privai/institutional-status.md" }, admissible: false, kind: "" },
  { row: { role: "derived", path: ".cogentia/manuscript/secret.md" }, admissible: false, kind: "" },
  { row: { role: "derived", path: "projects/privai/manuscript/issues/draft.md" }, admissible: false, kind: "" },
  { row: { role: "derived", path: "research/blogpost.md", sovereign_status: "latent" }, admissible: false, kind: "" },
  { row: { role: "derived", path: "projects/privai/manuscript/n1/00-qui-restera-souverain.md", sovereign_status: "latent" }, admissible: true, kind: "derived" },
];

for (const item of cases) {
  assert.equal(retrievalChunkAdmissible(item.row), item.admissible, item.row.path);
  assert.equal(retrievalDocumentKind(item.row), item.kind, `${item.row.path} kind`);
}

console.log(JSON.stringify({ ok: true, cases: cases.length }));
