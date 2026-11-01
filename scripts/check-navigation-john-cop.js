#!/usr/bin/env node
/** A governed COP receipt with real read-only gateway inventory, no browser tab access. */
import assert from 'node:assert/strict';
import { createHostedBrowserCapabilities } from './lib/hosted-browser-capabilities.js';
import { runJohnRequest } from './lib/john-run.js';
import { resolveCallerAuth } from './lib/cogentia-mcp-auth.js';

const env={COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture-only-token'};
const options={meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:nav-test'},headers:{authorization:'Bearer fixture-only-token'}};
const verified=resolveCallerAuth(env,options);
const unverified=resolveCallerAuth(env,{meta:options.meta,headers:{}});
assert.equal(verified.auth,'jhn');
assert.equal(unverified.auth,'none');
const capability='browser.navigation.instances';
const abilities=createHostedBrowserCapabilities({timeoutMs:4000});
const request={version:'john.request.v1',request_id:'nav-cop-fixture-20261101',principal:{id:'principal:test'},mandate:{id:'mandate:nav-test',version:'1'},budget:{id:'budget:nav-test'},execution_budget:{max_steps:3,max_tool_calls:1,max_subagents:0,max_elapsed_ms:8000,max_external_effects:0,max_internal_effects:0},exposure:'read_only',capability:'john.converse',input:{prompt:'list connected browsers without inspecting pages'},handler:{id:'fixture.reasoner',kind:'governed_reasoner',allowed_capabilities:[capability]}};
let index=0;
const events=await runJohnRequest(request,{env:{COGENTIA_AGENT_JHN_REASONING_LOOP_V2:'0'},capabilities:abilities,allowedCapabilities:verified.auth==='jhn'?[capability]:[],maxInternalEffects:0,requiredEvents:false,reasoner:{nextStep:async()=>++index===1?{kind:'capability_call',capability,input:{}}:{kind:'answer',answer:'Browser inventory retrieved.'}}});
const receipt=events.find(x=>x.type==='john.tool.receipt');
assert.ok(receipt,'governed capability receipt');
assert.equal(receipt.data.capability,capability);
assert.equal(events.some(x=>x.type==='john.accounting.settled'),true);
assert.equal(events.some(x=>x.type==='john.run.completed'),true);
const observation=events.find(x=>x.type==='john.tool.requested');
assert.ok(observation);
const accounting=events.find(x=>x.type==='john.accounting.settled');
index=0;
const deniedEvents=await runJohnRequest({...request,request_id:'nav-cop-unauth-denied'}, {env:{COGENTIA_AGENT_JHN_REASONING_LOOP_V2:'0'},capabilities:abilities,allowedCapabilities:[],maxInternalEffects:0,requiredEvents:false,reasoner:{nextStep:async()=>++index===1?{kind:'capability_call',capability,input:{}}:{kind:'answer',answer:'Not authorized'}}});
const rejected=deniedEvents.find(x=>x.type==='john.tool.rejected');
assert.equal(rejected?.data?.reason,'not_in_authorization_envelope');
assert.equal(deniedEvents.some(x=>x.type==='john.tool.receipt'),false);

console.log(JSON.stringify({authenticated_test_fixture:true,unauthenticated_denied:unverified.auth==='none',governed_denial:rejected?.data?.reason,capability,request_id:request.request_id,receipt_status:receipt.data.status,accounting:accounting.data,completed:true}).slice(0,1400));
