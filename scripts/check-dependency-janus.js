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
