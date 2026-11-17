#!/usr/bin/env node
/** Verify the production Magistral identity handshake without LLM requests. */
import test from "node:test";
import assert from "node:assert/strict";
import { aiRouterHealth, createAiRouterClient } from "./lib/ai-router-client.js";

function fixture({authError=false, badIdentity=false, onlyEmbeddings=false}={}) {
  const routes=[];
  const fetchImpl=async (url) => {
    const path=new URL(url).pathname;
    routes.push(path);
    if (path==="/health") {
      if(authError) return Response.json({error:"not_authorized"},{status:401});
      return new Response("Not Found",{status:404});
    }
    if(path==="/service-info") {
      return new Response(JSON.stringify({
        protocol:"cogentia.service-identity/v1",
        service:badIdentity
          ? {id:"untrusted",role:"other"}
          : {id:"magistral",role:"capability-router"},
        interfaces:[
          {href:"/v1/chat/completions",protocol:"openai-compatible"},
          {href:"/v1/embeddings",protocol:"openai-compatible"},
        ],
        capabilities:[
          ...(onlyEmbeddings ? [] : [
            {id:"local-codex-acp",adapter:"acp_stdio",tier:"fractavolta-guide"}]),
          {id:"embeddings",adapter:"openai",enabled:true},
        ],
        token:"should-never-be-reflected",
      }), {status:200,headers:{"content-type":"text/plain;charset=UTF-8"}});
    }
    throw Error("unrecognized endpoint "+path);
  };
  return {fetchImpl,routes};
}

test("Magistral /health 404 falls back to authenticated service identity",async () => {
  const {fetchImpl,routes}=fixture();
  const health=await aiRouterHealth({fetchImpl});
  assert.equal(health.ok,true);
  assert.equal(health.chat.available,true);
  assert.equal(health.embeddings.available,true);
  assert.equal(health.service,"magistral");
  assert.equal(health.mode,"service_info_fallback");
  assert.deepEqual(routes,["/health","/service-info"]);
  assert.equal(JSON.stringify(health).includes("should-never-be-reflected"),false);
});

test("no chat adapter in map still reports chat unavailable",async () => {
  const result=await aiRouterHealth({fetchImpl:fixture({onlyEmbeddings:true}).fetchImpl});
  assert.equal(result.ok,true);
  assert.equal(result.chat.available,false);
  assert.equal(result.embeddings.available,true);
});

test("invalid identity is rejected; no optimistic availability",async () => {
  const r=await aiRouterHealth({fetchImpl:fixture({badIdentity:true}).fetchImpl});
  assert.equal(r.ok,false);
  assert.equal(r.chat.available,false);
  assert.equal(r.error,"ai_router_identity_unverified");
});

test("mislabelled JSON completion is decoded as data, without requiring a model call",async () => {
  const fake=async () => new Response(JSON.stringify({
    choices:[{message:{role:"assistant",content:"Fixture"}}],
  }),{status:200,headers:{"content-type":"text/plain;charset=UTF-8"}});
  const client=createAiRouterClient({fetchImpl:fake});
  const result=await client.chatCompletions({
    model:"fixture",messages:[{role:"user",content:"fixture"}],
  });
  assert.equal(result.ok,true);
  assert.equal(result.body.choices[0].message.content,"Fixture");
});

test("401 must never trigger a service identity fallback",async () => {
  const f=fixture({authError:true});
  const health=await createAiRouterClient({fetchImpl:f.fetchImpl}).health();
  assert.equal(health.ok,false);
  assert.equal(health.status,401);
  assert.deepEqual(f.routes,["/health"]);
});
