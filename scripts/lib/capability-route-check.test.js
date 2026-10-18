import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCapabilityRoutes } from "./capability-route-check.js";
const routes=[{id:"github-cop-fracta2",capability:"public-document-fetch",steps:["github.issue.write","cop.typed.compute"],mandate:"public-read"}];
test("indirect path without SSH is discoverable but not assumed operational",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"]});
 assert.equal(r.candidates[0].status,"untested"); assert.equal(r.candidates[0].callable,true);
});
test("documented but unavailable is never operational",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write"],mandates:["public-read"],evidence:[{route_id:"github-cop-fracta2",ok:true,reachable:true}]});
 assert.equal(r.candidates[0].status,"unavailable");
});
test("reachable does not grant authority",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],evidence:[{route_id:"github-cop-fracta2",ok:true,reachable:true}]});
 assert.equal(r.candidates[0].status,"unauthorized");
});
test("transport success distinct from target document retrieval",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"],evidence:[{route_id:"github-cop-fracta2",ok:true,reachable:true,verified:true,capability:"public-document-fetch",outcome:"pdf_not_found"}]});
 assert.equal(r.candidates[0].status,"operational"); assert.equal(r.candidates[0].outcome,"pdf_not_found");
});

test("empty route must not masquerade as callable or operational",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes:[{id:"empty",capability:"public-document-fetch",steps:[],mandate:"public-read"}],mandates:["public-read"],evidence:[{route_id:"empty",ok:true,reachable:true}]});
 assert.equal(r.candidates[0].status,"invalid");
 assert.equal(r.candidates[0].callable,false);
 assert.equal(r.status,"blocked");
});
test("missing path is not discovered and admitted untested path requires probing",()=>{
 const a=evaluateCapabilityRoutes({required:"public-document-fetch",routes:[]});
 assert.equal(a.status,"not_discovered");
 const b=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"]});
 assert.equal(b.status,"probe_required");
});

test("unverified receipt cannot declare a route operational",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"],evidence:[{route_id:"github-cop-fracta2",ok:true,reachable:true,outcome:"success"}]});
 assert.equal(r.status,"probe_required"); assert.equal(r.candidates[0].outcome,"not_verified");
});
test("verified receipt for another capability is not reusable",()=>{
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"],evidence:[{route_id:"github-cop-fracta2",ok:true,reachable:true,verified:true,capability:"unrelated"}]});
 assert.equal(r.status,"probe_required");
});
