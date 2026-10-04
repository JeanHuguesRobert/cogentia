#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  LATENT_SOVEREIGN_KIND,
  applyResolvedCorpusRole,
  explicitRoleIsSource,
  isLatentSovereign,
  materializeLatentSovereignMarkdown,
  resolutionMaterializes,
} from "./lib/latent-sovereign.js";

const latent = {
  document_role: "derived-projection",
  sovereign_status: "latent",
  derived_from: ["README.md"],
};
assert.equal(isLatentSovereign(latent), true);
assert.equal(explicitRoleIsSource(latent), false);
assert.equal(explicitRoleIsSource({ document_role: "source" }), true);
assert.equal(explicitRoleIsSource({ document_role: "source", sovereign_status: "latent" }), false);
assert.equal(explicitRoleIsSource({ document_role: "symmetric-derived-sovereign-provisional" }), false);
assert.equal(explicitRoleIsSource({ document_role: "derived-projection" }), false);

const raw = `---
title: "PrivAI n°1"
document_role: derived-projection
document_kind: reading-projection
sovereign_status: latent
derived_from:
  - README.md
  - research/democratic_ai_safety.md
---

# Chapitre
`;
const actual = materializeLatentSovereignMarkdown(raw);
assert.match(actual, /^document_role: "source"$/m);
assert.match(actual, /^sovereign_status: "actual"$/m);
assert.match(actual, /derived_from:\n {2}- README.md\n {2}- research\/democratic_ai_safety.md/);
assert.match(actual, /# Chapitre/);
assert.throws(() => materializeLatentSovereignMarkdown(actual), /sovereign_status: latent/);
assert.throws(() => materializeLatentSovereignMarkdown("---\ndocument_role: derived\n---\n"), /sovereign_status: latent/);

assert.equal(resolutionMaterializes("source"), true);
assert.equal(resolutionMaterializes("keep"), false);
assert.equal(resolutionMaterializes("keep", { materialize: true }), true);

const kept = applyResolvedCorpusRole(
  { role: "derived", role_confidence: "strong" },
  { kind: "document_role_review", role: "source", continuation_id: "ctn_old" },
);
assert.equal(kept.role, "derived");
assert.equal(kept.resolved_via_continuation, null);

const applied = applyResolvedCorpusRole(
  { role: "derived", role_confidence: "strong" },
  { kind: LATENT_SOVEREIGN_KIND, role: "source", continuation_id: "ctn_exit" },
);
assert.equal(applied.role, "source");
assert.equal(applied.resolved_via_continuation, "ctn_exit");

console.log(JSON.stringify({ ok: true }));
