#!/usr/bin/env node
/** Experimental COP v1 terminal settlement; isolated fake records only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { acquirePacketClaim, currentPacketClaim, validatePacketClaim } from "./lib/continuation-packet-claim.js";
import {
  resolveClaimedContinuation, recoverClaimedResolution, continuationRevision,
} from "./lib/continuation-terminal-settlement.js";
import { projectPacketCoordination, PacketClaimEvent } from "../../inseme/packages/cop-core/src/packet-coordination.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"cop-terminal-111-"));
const cli=(...args)=>JSON.parse(execFileSync(process.execPath,
  [path.join(import.meta.dirname,"cogentia.js"),"continuation",...args,"--json"],
  {encoding:"utf8",cwd:root,env:{...process.env,COGENTIA_REGISTRY:path.join(root,".cogentia.json")},timeout:15000}));
const permitted=()=>({ok:true,test_fixture:true});
const denied=()=>({ok:false});
fs.writeFileSync(path.join(root,".cogentia.json"),JSON.stringify({repos:[]}));
try {
  const first=cli("emit","--kind","judgment","--question","Synthetic guarded answer").continuation;
  const id=first.id;
  const claim=acquirePacketClaim(root,id,"judge-b",{leaseMs:20000}).claim;
  const originalRevision=continuationRevision(root,id);
  assert.equal(resolveClaimedContinuation(root,id,{witness:claim,expectedSha256:originalRevision,
    decision:"answer"}).code,"AUTHORITY_ADAPTER_REQUIRED");
  assert.equal(resolveClaimedContinuation(root,id,{witness:claim,expectedSha256:originalRevision,
    decision:"answer",authorize:denied}).code,"NOT_ADMISSIBLE");
  assert.equal(resolveClaimedContinuation(root,id,{witness:claim,expectedSha256:"0".repeat(64),
    decision:"answer",authorize:permitted}).code,"BASELINE_CHANGED");
  // Old CLI resolve and cancel must not bypass the witnessed protocol.
  for(const sub of ["resolve","cancel"]) {
    let failed=false;
    try { execFileSync(process.execPath,
      [path.join(import.meta.dirname,"cogentia.js"),"continuation",sub,id,
        "--decision","unauthorized","--reason","fixture","--json"],
      {encoding:"utf8",cwd:root,env:{...process.env,COGENTIA_REGISTRY:path.join(root,".cogentia.json")},stdio:"pipe"}); }
    catch(e){failed=/cop_v1_claim_requires_guarded_terminal/.test(String(e.stderr));}
    assert.equal(failed,true,"legacy "+sub+" must refuse v1");
  }
  const result=resolveClaimedContinuation(root,id,{witness:claim,
    expectedSha256:originalRevision,decision:"synthetic_answer",
    reason:"fixture",payload:{a:1},authorize:permitted});
  assert.equal(result.ok,true);
  assert.equal(result.code,"COMPLETED");
  assert.equal(result.receipt.type,PacketClaimEvent.COMPLETED);
  assert.equal(result.receipt.claim.claim_id,claim.claim_id);
  assert.equal(validatePacketClaim(root,id,claim).code,"STALE_CLAIM");
  assert.equal(acquirePacketClaim(root,id,"other",{leaseMs:1000}).code,"TERMINAL_SETTLEMENT_PENDING");
  const resolved=cli("inspect",id).continuation;
  assert.equal(resolved.status,"resolved");
  assert.equal(resolved.resolution.decision,"synthetic_answer");
  assert.equal(resolved.resolution.return_state.delivered,false);
  assert.equal(recoverClaimedResolution(root,id).code,"RECEIPT_ALREADY_PRESENT");
  const projection=projectPacketCoordination([
    {type:PacketClaimEvent.GRANTED,claim},
    result.receipt,
  ]);
  assert.equal(projection.active_claim,null);
  assert.equal(projection.completed_claims[0].result_ref,result.result_ref);
  // Crash after exclusive intent but before writing canonical continuation.
  const second=cli("emit","--kind","judgment","--question","Recovery fixture").continuation;
  const witness=acquirePacketClaim(root,second.id,"judge-b",{leaseMs:20000}).claim;
  const baseline=continuationRevision(root,second.id);
  assert.throws(()=>resolveClaimedContinuation(root,second.id,{witness,
    expectedSha256:baseline,decision:"after_crash",authorize:permitted,
    beforeCanonicalWrite:()=>{throw new Error("simulated_process_crash");}}),
    /simulated_process_crash/);
  assert.equal(cli("inspect",second.id).continuation.status,"active");
  assert.equal(currentPacketClaim(root,second.id).status,"settlement_prepared");
  assert.equal(acquirePacketClaim(root,second.id,"reclaimer").code,"TERMINAL_SETTLEMENT_PENDING");
  const recovery=recoverClaimedResolution(root,second.id);
  assert.equal(recovery.ok,true);
  assert.equal(recovery.recovered,true);
  assert.equal(cli("inspect",second.id).continuation.status,"resolved");
  assert.equal(recoverClaimedResolution(root,second.id).code,"RECEIPT_ALREADY_PRESENT");
  // The old witness cannot write after a newer claim epoch.
  const third=cli("emit","--kind","judgment","--question","Stale fixture").continuation;
  const past=new Date("2026-01-01T00:00:00.000Z");
  const stale=acquirePacketClaim(root,third.id,"old",{leaseMs:100,now:past}).claim;
  const fresh=acquirePacketClaim(root,third.id,"new",{leaseMs:20000}).claim;
  assert.equal(fresh.epoch,2);
  assert.equal(resolveClaimedContinuation(root,third.id,{witness:stale,
    expectedSha256:continuationRevision(root,third.id),decision:"late",authorize:permitted}).code,
    "STALE_CLAIM");
  assert.equal(cli("inspect",third.id).continuation.status,"active");
  console.log("inseme#111 canonical terminal settlement / crash replay / stale fencing PASS");
} finally { fs.rmSync(root,{recursive:true,force:true}); }
