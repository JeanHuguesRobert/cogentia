import test from "node:test";
import assert from "node:assert/strict";
import {wipMergeInventories} from "./wip-merge.js";
function fixture(machine,opts={}) {
 return {schema:"wip.inventory/v1",machine,root:"/tmp",
  observed_at:opts.date||"2026-11-15T11:30:00Z",summary:{errors:0},discovery_errors:[],
  repositories:[{path:"/"+machine+"/repo",origin:opts.origin===undefined?
   "https://github.com/example/repo.git":opts.origin,head:opts.head||"abcd",branch:"main",
   dirty:!!opts.privatePath,staged:[],unstaged:[],
   untracked:opts.privatePath?[opts.privatePath]:[],stashes:[],ignored:{count:0},
   refs:opts.refs===undefined?[{name:"refs/remotes/origin/main",oid:"abcd"}]:opts.refs,errors:[]}]};
}
const merge=(a,b)=>wipMergeInventories([a,b],{now:"2026-11-15T11:31:00Z"});
test("matching SHA cannot authorize deletion or semantic equivalence",()=>{
 const r=merge(fixture("a"),fixture("b")).repositories[0];
 assert.equal(r.state,"same_head_no_detected_local_wip");
 assert.equal(r.semantic_equivalence,"not_assessed"); assert.equal(r.deletion_authorized,false);
});
test("untracked WIP is detected without exposing its filename",()=>{
 const r=merge(fixture("a",{privatePath:"secret.json"}),fixture("b"));
 assert.equal(r.repositories[0].state,"same_head_local_wip_present");
 assert.ok(!JSON.stringify(r).includes("secret.json"));
});
test("cached ref absence is not a live remote-deletion proof",()=>{
 const r=merge(fixture("a"),fixture("b",{refs:[]}));
 assert.equal(r.repositories[0].state,"cached_remote_refs_differ");
 assert.equal(r.repositories[0].ref_differences[0].interpretation,
   "cached_ref_disagreement_not_live_remote_absence");
});
test("stale, unpaired and differing heads remain uncertain",()=>{
 assert.equal(merge(fixture("a"),fixture("b",{date:"2026-10-01T00:00:00Z"}))
  .repositories[0].state,"insufficient_or_stale_coverage");
 assert.equal(merge(fixture("a",{origin:null}),fixture("b",{origin:null})).repositories.length,2);
 assert.equal(merge(fixture("a"),fixture("b",{head:"def"}))
  .repositories[0].state,"heads_differ_no_semantic_claim");
});
