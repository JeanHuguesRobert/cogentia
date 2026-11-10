#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acquirePacketClaim, currentPacketClaim, validatePacketClaim, packetClaimFence } from "./lib/continuation-packet-claim.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"cop-claim-111-"));
try {
  const id="ctn_epoch_fixture", t0=new Date("2026-11-10T12:00:00Z");
  const first=acquirePacketClaim(root,id,"judge-a",{leaseMs:1000,now:t0});
  assert.equal(first.claimed,true);
  assert.equal(first.claim.schema,"cop.packet-claim/v1");
  assert.equal(first.claim.epoch,1);
  assert.equal(acquirePacketClaim(root,id,"judge-b",{leaseMs:1000,now:new Date(t0.getTime()+500)}).code,"ACTIVE_CLAIM");
  assert.equal(validatePacketClaim(root,id,first.claim,{now:new Date(t0.getTime()+999)}).ok,true);
  assert.equal(validatePacketClaim(root,id,first.claim,{now:new Date(t0.getTime()+1000)}).code,"STALE_CLAIM");
  const recovered=acquirePacketClaim(root,id,"judge-b",{leaseMs:1000,now:new Date(t0.getTime()+1001)});
  assert.equal(recovered.claimed,true);
  assert.equal(recovered.claim.epoch,2);
  assert.equal(validatePacketClaim(root,id,first.claim,{now:new Date(t0.getTime()+1002)}).code,"STALE_CLAIM");
  assert.equal(packetClaimFence(root,id,recovered.claim,{now:new Date(t0.getTime()+1002)}).may_execute_effect,false);
  assert.equal(validatePacketClaim(root,id,recovered.claim,{now:new Date(t0.getTime()+1002)}).ok,true);
  const race="ctn_parallel_epochs";
  const file=fileURLToPath(new URL("./lib/continuation-packet-claim.js",import.meta.url));
  const contender=(handler)=>new Promise((resolve,reject)=>{
    const src="import {acquirePacketClaim} from "+JSON.stringify(file)+";console.log(JSON.stringify(acquirePacketClaim(process.argv[1],process.argv[2],process.argv[3],{leaseMs:300000})))";
    const child=spawn(process.execPath,["--input-type=module","-e",src,root,race,handler],
      {stdio:["ignore","pipe","pipe"]});
    let out="",err="";
    child.stdout.on("data",d=>out+=d);
    child.stderr.on("data",d=>err+=d);
    child.on("error",reject);
    child.on("close",code=>code===0?resolve(JSON.parse(out)):reject(new Error(err)));
  });
  for(let i=0;i<12;i++){
    const name=race+"_"+i;
    const results=await Promise.all([contender(name+"a"),contender(name+"b")]);
    assert.equal(results.filter(r=>r.claimed).length,1,"one winner per competing pair");
    assert.equal(currentPacketClaim(root,race).epoch,i+1===1?1:1);
    // The same claim remains active; next attempts must all lose.
  }
  console.log("inseme#111 immutable epoch claim / expiry / stale fence / process collision PASS");
}finally{fs.rmSync(root,{recursive:true,force:true});}
