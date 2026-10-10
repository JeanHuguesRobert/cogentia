#!/usr/bin/env node
import assert from "node:assert/strict";
import { upstream, downstream, impact } from "./lib/dependency-janus.js";

const edges = [
  { subject: "A", predicate: "depends_on", object: "X" },
  { subject: "B", predicate: "depends_on", object: "A" },
  { subject: "C", predicate: "depends_on", object: "X" },
  { subject: "A", predicate: "depends_on", object: "C" },
  { subject: "C", predicate: "depends_on", object: "A" }, // A <-> C dependency cycle
  { subject: "SECRET", predicate: "depends_on", object: "X", private: true },
];
const allowed = edge => edge.private !== true;
const up = upstream(edges, "B", { allowed });
assert.deepEqual(new Set(up.entries.filter(e => !e.cycle).map(e => e.id)), new Set(["A","X","C"]));
const down = downstream(edges, "X", { allowed });
assert.deepEqual(new Set(down.entries.filter(e => !e.cycle).map(e => e.id)), new Set(["A","C","B"]));
assert.ok(down.entries.some(e => e.cycle));
assert.ok(!JSON.stringify(down).includes("SECRET"));
const result = impact(edges, "X", "new contrary evidence", { allowed });
assert.equal(result.mode, "prospective");
assert.equal(result.disposition, "review_candidates_only");
assert.equal(result.entries.filter(e => !e.cycle).length, 3);
assert.deepEqual(downstream(edges, "X", { allowed, depth: 0 }).entries, []);
assert.deepEqual(downstream(edges, "X", { allowed }), down);
assert.throws(() => downstream(edges, "X", { depth: -1 }), /depth/);
assert.throws(() => impact(edges, "X", ""), /change/);
console.log("ok - dependency Janus upstream/downstream/impact, redaction, cycles, bounds");

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "janus-registry-cli-"));
try {
  const mk = (id, dependency, visibility = "public") => {
    const file = path.join(root, "cogentia", id + ".registry.yaml");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `schema: cogentia.registry.v0.2
registry:
  id: registry:${id}
  name: ${id}
  records:
    kinds: [test]
  facets:
    visibility: ${visibility}
  definition_source:
    repo: cogentia
    path: ${id}.md
  record_authority:
    mode: source-local
${dependency ? `  relations:
    - predicate: depends_on
      object: registry:${dependency}
` : ""}`);
  };
  mk("x", null);
  mk("a", "x");
  mk("b", "a");
  mk("secret", "x", "private");
  const cli = (op, id, change) => {
    const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "corpus-registries.js");
    const args = [script, op, id, "--root", root];
    if (change) args.push("--change", change);
    const out = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(out.status, 0, out.stderr || out.stdout);
    return JSON.parse(out.stdout);
  };
  assert.deepEqual(cli("upstream", "registry:b").entries.map(e => e.id), ["registry:a", "registry:x"]);
  assert.deepEqual(cli("downstream", "registry:x").entries.map(e => e.id), ["registry:a", "registry:b"]);
  assert.ok(!JSON.stringify(cli("impact", "registry:x", "new evidence")).includes("registry:secret"));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("ok - registry-backed CLI traversal and public visibility gate");
