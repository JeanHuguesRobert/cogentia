import test from "node:test";
import assert from "node:assert/strict";
import {createGitHubActionsReceiptSource} from "./github-actions-receipt-source.js";
import {assessCapabilityFromReceiptSource} from "./capability-route-check.js";

const sha="e3f42083585429dd9b27ec428ed8df2fbd906f32";
const spec={offer_id:"offer:github-actions",run_id:37761550017,job_id:113258910427,artifact_id:11542726388,head_sha:sha};
const route={id:"github-actions-read",capability:"compute.execution",
  requirement_ref:"requirement:inseme:120:historical",offer_id:spec.offer_id,
  mandate:"public-read",steps:["github.jobs.read","github.artifacts.read"]};
const job={id:spec.job_id,run_id:spec.run_id,status:"completed",conclusion:"success"};
const artifact={id:spec.artifact_id,expired:false,
  digest:"sha256:f5389f093c1973cb245ccb62f67de3a1da386ca8005c0c2c8cc958299732b966",
  workflow_run:{id:spec.run_id,head_sha:sha}};
function adapter(jobs=[job],artifacts=[artifact]) {
 return createGitHubActionsReceiptSource({
   repository:"JeanHuguesRobert/inseme",
   pinned:{[route.requirement_ref]:spec},
   github:{
     fetchRunJobs:async()=>jobs,
     fetchRunArtifacts:async()=>artifacts
   }
 });
}
const options={required:route.capability,routes:[route],
  callable:["github.jobs.read","github.artifacts.read"],mandates:["public-read"]};
test("pinned GitHub run and artifact produce provider-correlated transport receipt",async()=>{
 const x=await assessCapabilityFromReceiptSource({...options,receiptSource:adapter()});
 assert.equal(x.status,"operational");
 assert.equal(x.candidates[0].outcome,"execution_confirmed");
});
test("skipped job is not proof of execution",async()=>{
 const x=await assessCapabilityFromReceiptSource({...options,
  receiptSource:adapter([{...job,conclusion:"skipped"}])});
 assert.equal(x.status,"probe_required");
});
test("expired or mismatched artifact rejects verification",async()=>{
 for (const bad of [{...artifact,expired:true},{...artifact,workflow_run:{id:spec.run_id,head_sha:"0".repeat(40)}}]) {
   const x=await assessCapabilityFromReceiptSource({...options,receiptSource:adapter([job],[bad])});
   assert.equal(x.status,"probe_required");
 }
});
test("unknown requirement and mismatched offer are rejected",async()=>{
 const source=adapter();
 assert.equal((await source.fetchVerified({requirement_ref:"other",offer_id:spec.offer_id})).verified,false);
 assert.equal((await source.fetchVerified({requirement_ref:route.requirement_ref,offer_id:"other"})).verified,false);
});
test("caller without mandate never becomes authorized via a valid run",async()=>{
 const x=await assessCapabilityFromReceiptSource({...options,mandates:[],receiptSource:adapter()});
 assert.equal(x.status,"blocked");
});
