#!/usr/bin/env node
import assert from "node:assert/strict";
import { requestFreeCloudflareEmbeddings } from "./lib/cloudflare-free-embeddings.js";

const model="@cf/google/embeddinggemma-2";
const dimensions=768;
const base = {
  texts:["un texte public"], model, dimensions,
  baseUrl:"http://127.0.0.1:8880",
  maxBillableUsd:"0",
  effectAdmitted:true, // mock admission in isolated transport tests only
};
let calls=[];
const fake = async (url, request) => {
  calls.push({url:String(url),method:request.method,body:request.body});
  if (String(url).endsWith("/status")) return new Response(JSON.stringify({
    enabled:true,configured:true,provider:"cloudflare",model,dimensions,
    free_plan_verified:true,budget_zero:true,
  }),{status:200});
  return new Response(JSON.stringify({
    model, data:[{index:0,embedding:Array(dimensions).fill(0.25)}],
    usage:{prompt_tokens:4},
  }),{status:200});
};
let result = await requestFreeCloudflareEmbeddings({...base,fetchImpl:fake});
assert.equal(result.data.length,1);
assert.equal(result.data[0].embedding.length,dimensions);
assert.equal(calls.length,2);
assert.equal(JSON.parse(calls[1].body).embedding_role,"document");
assert.equal(calls[0].url,"http://127.0.0.1:8880/v1/magistral/embeddings/status");
assert.equal(calls[1].url,"http://127.0.0.1:8880/v1/embeddings");

calls=[];
await assert.rejects(()=>requestFreeCloudflareEmbeddings({...base,effectAdmitted:false,fetchImpl:fake}),/cop_admission_required/);
assert.equal(calls.length,0);
await assert.rejects(()=>requestFreeCloudflareEmbeddings({...base,maxBillableUsd:"0.01",fetchImpl:fake}),/zero_budget_required/);
assert.equal(calls.length,0);
await assert.rejects(()=>requestFreeCloudflareEmbeddings({...base,baseUrl:"https://api.cloudflare.com",fetchImpl:fake}),/loopback_only/);
assert.equal(calls.length,0);
await assert.rejects(()=>requestFreeCloudflareEmbeddings({...base,model:"madeup",fetchImpl:fake}),/profile_unrecognized/);
assert.equal(calls.length,0);
const deniedStatus = async (url) => {
  calls.push(String(url));
  return new Response(JSON.stringify({
    enabled:true,configured:true,provider:"openai",model,dimensions,
    free_plan_verified:true,budget_zero:true,
  }),{status:200});
};
await assert.rejects(()=>requestFreeCloudflareEmbeddings({...base,fetchImpl:deniedStatus}),/verified_free_profile_missing/);
assert.equal(calls.length,1);
calls=[];
const limited = async (url) => {
  calls.push(String(url));
  return String(url).endsWith("/status")
    ? new Response(JSON.stringify({enabled:true,configured:true,provider:"cloudflare",model,dimensions,free_plan_verified:true,budget_zero:true}),{status:200})
    : new Response("NOT SAFE FOR LOGGING",{status:429,headers:{"Retry-After":"33"}});
};
await assert.rejects(async()=> {
  try {await requestFreeCloudflareEmbeddings({...base,fetchImpl:limited})}
  catch (e) {assert.equal(e.retryAfterSeconds,33);assert.equal(e.status,429);throw e;}
},/cloudflare_rate_limited/);
assert.equal(calls.length,2);
// Match the actual Magistral projection: no Retry-After header, JSON delay.
for (const [seconds, expected] of [[47,47],[100000,86400],[-1,undefined],["47",undefined]]) {
  const projected = async url => String(url).endsWith("/status") ? fake(url,{method:"GET"}) :
    new Response(JSON.stringify({error:{code:"embedding_provider_http_error",retry_after_seconds:seconds,private:"NOT SAFE FOR LOGGING"}}),{status:429});
  await assert.rejects(requestFreeCloudflareEmbeddings({...base,fetchImpl:projected}),e=>{
    assert.equal(e.retryAfterSeconds,expected);
    assert.equal(e.status,429);
    assert.equal(JSON.stringify(e).includes("NOT SAFE FOR LOGGING"),false);
    return e.message === "cloudflare_rate_limited";
  });
}
console.log("Cloudflare free transport: PASS (mocked, no external network, gated, no paid fallback)");
