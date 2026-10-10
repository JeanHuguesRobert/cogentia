#!/usr/bin/env node
import assert from "node:assert/strict";
import { bootstrapCorpusOpenIssues } from "./lib/calculette-corpus-bootstrap.js";
const at="2026-10-10T00:00:00Z";
const item=(repo,n)=>({number:n,state:"open",title:"Task",body:"",created_at:at,
 html_url:`https://github.com/${repo}/issues/${n}`});
const names=["JeanHuguesRobert/cogentia","JeanHuguesRobert/inseme","JeanHuguesRobert/operium"];
const load=async name=>({issues:[item(name,1),{...item(name,2),pull_request:{}}],complete:true,pages_checked:1});
const result=await bootstrapCorpusOpenIssues(names,{load,observedAt:at});
assert.equal(result.repositories_loaded,3);
assert.equal(result.work_queue.length,3);
assert.equal(new Set(result.work_queue.map(x=>x.id)).size,3);
assert.equal(result.complete,true);
assert.ok(result.work_queue.every(x=>x.readiness==="unknown" && x.authorization==="not_inferred"));
const partial=await bootstrapCorpusOpenIssues(names,{load:async name=>name.endsWith("inseme")?Promise.reject(new Error("unavailable")):load(name),observedAt:at});
assert.equal(partial.complete,false);
assert.equal(partial.failures.length,1);
assert.equal(partial.work_queue.length,2);
assert.throws(()=>bootstrapCorpusOpenIssues(names,{load,observedAt:at,maxRepositories:2}),/budget/);
console.log("ok - federated multi-repository bootstrap, stable qualified IDs and partial coverage");
