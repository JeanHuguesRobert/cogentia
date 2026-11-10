#!/usr/bin/env node
import assert from "node:assert/strict";
import { importRegistrySnapshot } from "./lib/calculette-registry-import.js";
import { buildJanusSeed } from "./lib/calculette-janus-seed.js";
const pub = (id,file,visibility="public") => ({id,_source_file:file,facets:{visibility}});
const registries=[pub("registry:x","public/x.registry.yaml"),pub("registry:a","public/a.registry.yaml"),pub("registry:hidden","private/h.registry.yaml","private")];
const byId = new Map(registries.map(r=>[r.id,[r]]));
const graph={registries,byId,relations:[
 {subject:"registry:a",object:"registry:x",predicate:"depends_on",_source_file:"public/a.registry.yaml"},
 {subject:"registry:hidden",object:"registry:x",predicate:"depends_on",_source_file:"private/h.registry.yaml"}
]};
const observedAt="2026-10-09T23:00:00Z";
const imported=importRegistrySnapshot(graph,{observedAt});
assert.equal(imported.observations.length,2);
assert.equal(imported.edges.length,1);
assert.ok(!JSON.stringify(imported).includes("registry:hidden"));
const seed=buildJanusSeed({...imported,asOf:observedAt});
assert.equal(seed.relations[0].predicate,"depends_on");
assert.equal(seed.facts[0].occurred_at,null);
assert.equal(buildJanusSeed({...imported,asOf:"2026-10-09T22:00:00Z"}).facts.length,0);
assert.deepEqual(seed,buildJanusSeed({...imported,asOf:observedAt}));
console.log("ok - Janus registry prefill: provenance, public gate, retrospective as-of replay");
