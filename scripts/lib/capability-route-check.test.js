import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCapabilityRoutes } from "./capability-route-check.js";

const route = {
  id:"github-cop-fracta2", capability:"public-document-fetch",
  requirement_ref:"requirement:corte:092", offer_id:"offer:fracta2",
  steps:["github.issue.write","cop.typed.compute"], mandate:"public-read"
};
const access = {required:route.capability,routes:[route],
  callable:["github.issue.write","cop.typed.compute"],mandates:["public-read"]};
const receipt = {
  schema:"magistral.execution-receipt/v1",status:"completed",terminal:true,
  binding:{schema:"magistral.execution-binding/v1",
    requirement_ref:route.requirement_ref,offer_id:route.offer_id,
    provider_execution_id:"run-123",provider_ref:"fracta2"}
};

test("composed route discoverable without direct SSH, but requires receipt",()=>{
 const r=evaluateCapabilityRoutes(access);
 assert.equal(r.status,"probe_required");
 assert.equal(r.candidates[0].callable,true);
});
test("schema-valid receipt without trusted verifier remains untested",()=>{
 const r=evaluateCapabilityRoutes({...access,evidence:[receipt]});
 assert.equal(r.status,"probe_required");
});
test("trusted verifier and correlated completed receipt confirm execution only",()=>{
 const r=evaluateCapabilityRoutes({...access,evidence:[receipt],
   verifyReceipt:(r,route)=>r.binding.offer_id===route.offer_id});
 assert.equal(r.status,"operational");
 assert.equal(r.candidates[0].outcome,"execution_confirmed");
});
test("cross-route receipt is rejected even if verifier would accept it",()=>{
 const forged={...receipt,binding:{...receipt.binding,offer_id:"offer:other"}};
 const r=evaluateCapabilityRoutes({...access,evidence:[forged],verifyReceipt:()=>true});
 assert.equal(r.status,"probe_required");
});
test("nonterminal receipt is not execution completion",()=>{
 const running={...receipt,status:"running",terminal:false};
 const r=evaluateCapabilityRoutes({...access,evidence:[running],verifyReceipt:()=>true});
 assert.equal(r.status,"probe_required");
});
test("unbound receipt is not accepted",()=>{
 const pending={...receipt,binding:{...receipt.binding,provider_execution_id:null}};
 const r=evaluateCapabilityRoutes({...access,evidence:[pending],verifyReceipt:()=>true});
 assert.equal(r.status,"probe_required");
});
test("authorization cannot be supplied by a receipt",()=>{
 const r=evaluateCapabilityRoutes({...access,mandates:[],evidence:[receipt],verifyReceipt:()=>true});
 assert.equal(r.status,"blocked");
 assert.equal(r.candidates[0].status,"unauthorized");
});
test("unreachable route cannot be rescued by a receipt",()=>{
 const r=evaluateCapabilityRoutes({...access,callable:["github.issue.write"],evidence:[receipt],verifyReceipt:()=>true});
 assert.equal(r.candidates[0].status,"unavailable");
});
test("empty or missing route is invalid or undiscovered",()=>{
 const bad={...route,steps:[]};
 assert.equal(evaluateCapabilityRoutes({...access,routes:[bad]}).candidates[0].status,"invalid");
 assert.equal(evaluateCapabilityRoutes({...access,routes:[]}).status,"not_discovered");
});
test("failed provider execution must not be described operational",()=>{
 const failed={...receipt,status:"failed",terminal:true};
 const r=evaluateCapabilityRoutes({...access,evidence:[failed],verifyReceipt:()=>true});
 assert.equal(r.status,"probe_required");
});

test("trusted receipt source integrates without caller-supplied verification", async()=>{
 const {assessCapabilityFromReceiptSource} = await import("./capability-route-check.js");
 const seen=[];
 const resolved=await assessCapabilityFromReceiptSource({
   ...access, receiptSource:{fetchVerified:async query=>{
     seen.push(query); return {verified:true,receipt};
   }}
 });
 assert.equal(resolved.status,"operational");
 assert.deepEqual(seen,[{requirement_ref:route.requirement_ref,offer_id:route.offer_id}]);
});
test("untrusted source result remains untested",async()=>{
 const {assessCapabilityFromReceiptSource} = await import("./capability-route-check.js");
 const resolved=await assessCapabilityFromReceiptSource({
   ...access, receiptSource:{fetchVerified:async()=>({verified:false,receipt})}
 });
 assert.equal(resolved.status,"probe_required");
});
test("without receipt source no execution claim",async()=>{
 const {assessCapabilityFromReceiptSource} = await import("./capability-route-check.js");
 await assert.rejects(()=>assessCapabilityFromReceiptSource({...access}),/trusted receipt source/);
});
