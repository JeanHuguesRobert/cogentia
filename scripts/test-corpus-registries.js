#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildRegistryGraph,
  checkRegistryGraph,
  findRegistry,
  relatedRegistries,
} from "./corpus-registries.js";

function writeDescriptor(root, repo, rel, descriptor) {
  const full = path.join(root, repo, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, descriptor, "utf8");
  return full;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-registries-"));

try {
  writeDescriptor(root, "cogentia", "research/alpha.registry.yaml", `
schema: cogentia.registry.v0.2
registry:
  id: registry:alpha
  name: Alpha Registry
  registry_class: domain-governance
  records:
    kinds: [alpha-record]
  facets:
    function: [governance]
    authority: source-authority
    topology: local
    temporality: [versioned]
    visibility: public
    substrate: [git-yaml]
    granularity: corpus
    mutation: [human-reviewed]
  definition_source:
    repo: cogentia
    path: research/alpha.md
  record_authority:
    mode: source-local
  relations:
    - predicate: depends_on
      object: registry:beta
`);

  writeDescriptor(root, "operium", "research/beta.registry.yaml", `
schema: cogentia.registry.v0.2
registry:
  id: registry:beta
  name: Beta Registry
  registry_class: runtime
  records:
    kinds: [beta-record]
  facets:
    function: [routing]
    authority: runtime-local-state
    topology: runtime-local
    temporality: [ephemeral]
    visibility: runtime-internal
    substrate: [runtime-memory]
    granularity: component
    mutation: [runtime-managed]
  definition_source:
    repo: operium
    path: src/beta.js
  record_authority:
    mode: runtime-local
`);

  const graph = buildRegistryGraph(root);
  assert.equal(graph.registries.length, 2);
  assert.equal(graph.relations.length, 1);

  const check = checkRegistryGraph(graph);
  assert.equal(check.ok, true);
  assert.equal(check.issues.length, 0);
  assert.equal(check.warnings.length, 0);

  const alpha = findRegistry(graph, "registry:alpha");
  assert.equal(alpha.ok, true);
  assert.equal(alpha.registry.name, "Alpha Registry");

  const outgoing = relatedRegistries(graph, "registry:alpha", { direction: "out" });
  assert.equal(outgoing.ok, true);
  assert.equal(outgoing.relations.length, 1);
  assert.equal(outgoing.relations[0].object, "registry:beta");

  const incoming = relatedRegistries(graph, "registry:beta", { direction: "in" });
  assert.equal(incoming.relations.length, 1);
  assert.equal(incoming.relations[0].subject, "registry:alpha");

  writeDescriptor(root, "inseme", "duplicate.registry.yaml", `
schema: cogentia.registry.v0.2
registry:
  id: registry:alpha
  name: Duplicate Alpha
  registry_class: runtime
  records:
    kinds: [duplicate]
  facets: {}
  definition_source:
    repo: inseme
    path: duplicate.js
  record_authority:
    mode: runtime-local
`);

  const duplicateGraph = buildRegistryGraph(root);
  const duplicateCheck = checkRegistryGraph(duplicateGraph);
  assert.equal(duplicateCheck.ok, false);
  assert.ok(duplicateCheck.issues.some(issue => issue.type === "duplicate_registry_id"));

  console.log(JSON.stringify({
    ok: true,
    status: "passed",
    cases: 9,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
