#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerResolver, releaseClaim } from "./lib/resolver-registry.js";
import { nextContinuation, rerouteContinuation, inspectRouting, recordRoutingOutcome } from "./lib/continuation-routing.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "inseme-111-"));
const previousDb=process.env.COGENTIA_CONTINUATIONS_DB;
process.env.COGENTIA_CONTINUATIONS_DB=path.join(root,"test-continuations.sqlite");
try {
  registerResolver(root, "router-a", ["tool_use"]);
  registerResolver(root, "judge-b", ["Judgement", "tool_use"]);
  const c = { id: "ctn_routing_test", status: "active", kind: "judgment",
    required_capabilities: ["Judgement"], priority: 3,
    return_contract: { result_ref: "continuation:ctn_routing_test/resolution" } };
  const yes = () => true;
  const no = () => false;
  assert.equal(nextContinuation(root, [c], {resolver_id:"router-a",capabilities:["tool_use"]}, {admissible:yes}).continuation, null);
  assert.equal(nextContinuation(root, [c], {resolver_id:"judge-b",capabilities:["Judgement"]}, {admissible:no}).continuation, null);
  const hop = rerouteContinuation(root, c, {from:"router-a",to:"judge-b",reason:"Judgement missing",admissible:yes});
  assert.equal(hop.status, "proposed");
  assert.equal(inspectRouting(root,c.id)[0].return_ref, c.return_contract.result_ref);
  assert.equal(rerouteContinuation(root,c,{from:"judge-b",to:"router-a",admissible:yes}).status,"routing_exhausted");
  assert.equal(inspectRouting(root,c.id).length,2,"blocked route is durably recorded");
  assert.equal(inspectRouting(root,c.id)[1].status,"routing_exhausted");
  assert.equal(rerouteContinuation(root,c,{from:"router-a",to:"missing-agent",admissible:yes}).status,"destination_unregistered");
  assert.equal(inspectRouting(root,c.id).filter((h)=>h.status==="proposed").length,1,"failed attempts do not consume hop budget");
  const profile = {resolver_id:"judge-b",capabilities:["Judgement","tool_use"]};
  assert.equal(nextContinuation(root,[c],profile,{admissible:yes}).status,"available");
  assert.equal(nextContinuation(root,[c],profile,{claim:true,admissible:yes}).status,"claimed");
  assert.equal(nextContinuation(root,[c],profile,{claim:true,admissible:yes}).continuation,null);
  // Historical PR #306 carried an end-to-end outcome test whose old CLI
  // no longer exists. Preserve its contract at the current shared-core layer.
  const accepted=recordRoutingOutcome(root,c,{resolverId:"judge-b",phase:"accepted"});
  assert.equal(accepted.status,"accepted");
  assert.equal(accepted.event.delivery_confirmed,false);
  assert.equal(recordRoutingOutcome(root,c,{resolverId:"judge-b",phase:"accepted"}).status,"already_recorded");
  assert.equal(recordRoutingOutcome(root,c,{resolverId:"judge-b",phase:"treated"}).status,"resolution_not_observed");
  const resolved={...c,status:"resolved",
    resolution:{return_state:{result_ref:c.return_contract.result_ref,
      result_available:true,delivered:false}}};
  const treated=recordRoutingOutcome(root,resolved,{resolverId:"judge-b",phase:"treated"});
  assert.equal(treated.status,"treated");
  assert.equal(treated.event.receipt_ref,c.return_contract.result_ref);
  assert.equal(treated.event.delivery_confirmed,false,
    "ready durable return slot must never be reported as delivered");
  assert.equal(recordRoutingOutcome(root,resolved,{resolverId:"judge-b",phase:"treated"}).status,"already_recorded");
  assert.deepEqual(inspectRouting(root,c.id).filter(x=>["proposed","accepted","treated"].includes(x.status)).map(x=>x.status),
    ["proposed","accepted","treated"]);
  releaseClaim(root,c.id);
  assert.equal(nextContinuation(root,[c],profile,{claim:true,admissible:yes}).status,"claimed");
  releaseClaim(root,c.id);
  // Concurrent claims from distinct operating-system processes.
  const registryFile = fileURLToPath(new URL("./lib/resolver-registry.js", import.meta.url));
  const raceId = "ctn_parallel";
  const runClaim = (who) => new Promise((resolve,reject) => {
    const program = "import { claimContinuation } from " + JSON.stringify(registryFile) +
      "; const r=claimContinuation(process.argv[1],process.argv[2],process.argv[3]); console.log(JSON.stringify(r));";
    const child=spawn(process.execPath,["--input-type=module","-e",program,root,raceId,who],{stdio:["ignore","pipe","pipe"]});
    let out="",err="";
    child.stdout.on("data",d=>out+=d);
    child.stderr.on("data",d=>err+=d);
    child.on("error",reject);
    child.on("close",code=>code===0 ? resolve(JSON.parse(out)) : reject(new Error(err)));
  });
  const competing = await Promise.all([runClaim("router-a"),runClaim("judge-b")]);
  assert.equal(competing.filter((r)=>r.claimed).length,1,"exactly one independent process must win PacketClaim");
  assert.equal(competing.filter((r)=>!r.claimed).length,1,"loser must observe the existing claim");
  // A resolution is produced by the canonical continuation store, not by routing.
  assert.equal(c.id, "ctn_routing_test");
  console.log("inseme#111 local routing and PacketClaim tests: PASS");
} finally {
  if(previousDb===undefined)delete process.env.COGENTIA_CONTINUATIONS_DB;
  else process.env.COGENTIA_CONTINUATIONS_DB=previousDb;
  fs.rmSync(root,{recursive:true,force:true});
}
