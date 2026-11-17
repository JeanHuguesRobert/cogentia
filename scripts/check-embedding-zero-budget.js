#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createContinuationSqliteRepository } from "./lib/continuation-sqlite-repository.mjs";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"embedding-budget-"));
const registry=path.join(dir,".cogentia.json");
const dbPath=path.join(dir,"continuations.sqlite");
const old=process.env.COGENTIA_CONTINUATIONS_DB;
process.env.COGENTIA_CONTINUATIONS_DB=dbPath;
const store=createContinuationSqliteRepository({registryRoot:dir,dbPath});
try {
  fs.writeFileSync(registry, JSON.stringify({repos:[]}));
  store.save({
    id:"ctn_budget0",status:"active",kind:"embeddings-index",
    title:"No paid inference",question:"Embed one public chunk",
    subject:{repo:"demo",path:"README.md"},
    context:{
      chunks:[{chunk_id:1,repo:"demo",path:"README.md",content_hash:"unchanged",text:"A public document",start_line:1,end_line:1}],
      embedding_profile:{provider:"openai",model_name:"text-embedding-3-small",dimensions:2},
    },
    expected_response:{format:"json",required:["embeddings"]},
    resume:{command:"continuation resolve"},created_at:new Date().toISOString(),
  });
  const result=spawnSync(process.execPath,["scripts/smart-embed-worker.js","run","--id","ctn_budget0"],{
    cwd:process.cwd(),encoding:"utf8",
    env:{...process.env,COGENTIA_REGISTRY:registry,COGENTIA_EMBEDDINGS_MAX_BILLABLE_USD:"0",
      OPENAI_API_KEY:"test-no-network-openai-key-should-never-call",
      OPENROUTER_API_KEY:"test-no-network-openrouter-key-should-never-call",
      COGENTIA_AI_ROUTER_URL:"http://127.0.0.1:1"},
    timeout:7000,
  });
  assert.match(result.stdout,/BLOCKED: zero monetary budget/);
  assert.match(result.stdout,/BLOCKED: zero monetary budget/);
  assert.equal(result.status,1,"rejected work must not report a successful worker exit");
  assert.equal(store.load("ctn_budget0").status,"active");
  const resultFiles=fs.existsSync(path.join(dir,".cogentia"))
    ?fs.readdirSync(path.join(dir,".cogentia")).filter(n=>n.startsWith("embeddings_result_")):[];
  assert.equal(resultFiles.length,0);
  console.log("embedding-zero-budget: PASS (no remote call, active continuation preserved)");
} finally {
  store.close();
  if(old===undefined)delete process.env.COGENTIA_CONTINUATIONS_DB;
  else process.env.COGENTIA_CONTINUATIONS_DB=old;
  fs.rmSync(dir,{recursive:true,force:true});
}
