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
 const r=evaluateCapabilityRoutes({required:"public-document-fetch",routes,callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"],evidence:[{route_id:"github-cop-fracta2",ok:true,reachable:true,outcome:"pdf_not_found"}]});
 assert.equal(r.candidates[0].status,"operational"); assert.equal(r.candidates[0].outcome,"pdf_not_found");
});
