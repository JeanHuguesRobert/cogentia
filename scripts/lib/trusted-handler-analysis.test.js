import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {executeTrustedAnalysis} from "./trusted-handler-analysis.js";
const issue={url:"https://github.com/JeanHuguesRobert/inseme/issues/120"};
test("trusted analysis calls ACP and persists a distinct receipt",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cogentia-analysis-"));
  try{
    const x=await executeTrustedAnalysis({issue,prompt:"diagnose",token:"test-secret",receiptDir:dir,
      fetchImpl:async(url,opts)=>{assert.ok(!opts.body.includes("test-secret"));return {ok:true,status:200,json:async()=>({choices:[{message:{content:"diagnostic"}}]})}}});
    assert.equal(x.receipt.status,"PASS");
    assert.equal(x.receipt.guaranteed_read_only,false);
    assert.equal(x.receipt.execution_authorized_for_mutations,false);
    assert.equal(JSON.parse(fs.readFileSync(x.receipt_path,"utf8")).answer,"diagnostic");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("trusted analysis fails closed on unsupported Packet",async()=>{
 await assert.rejects(executeTrustedAnalysis({issue:{url:"https://github.com/other/repo/issues/1"},prompt:"x",token:"x"}),/packet_not_allowlisted/);
});
test("failed handler response is durably recorded as failure",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cogentia-analysis-"));
 try{
 const x=await executeTrustedAnalysis({issue,prompt:"x",token:"x",receiptDir:dir,fetchImpl:async()=>{throw Error("offline")}});
 assert.equal(x.receipt.status,"FAILED");
 assert.equal(JSON.parse(fs.readFileSync(x.receipt_path,"utf8")).status,"FAILED");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
