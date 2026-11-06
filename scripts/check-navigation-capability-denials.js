#!/usr/bin/env node
// FBF: distinguish unavailable caller-scoped capabilities from unsafe risk.
import assert from 'node:assert/strict';
import { runJohnRequest } from './lib/john-run.js';
const capability='browser.hosted.inspect';
const base={version:'john.request.v1',request_id:'nav-negative-fixture',principal:{id:'principal:test'},mandate:{id:'mandate:test',version:'1'},budget:{id:'budget:test'},execution_budget:{max_steps:2,max_tool_calls:1,max_subagents:0,max_elapsed_ms:2000,max_external_effects:0,max_internal_effects:0},exposure:'read_only',capability,input:{prompt:'inspect page'},handler:{id:'capability.once',kind:'capability_once',allowed_capabilities:[capability]}};
for(const [name,abilities,expected] of [
 ['not_exposed',[],'read_only_capability_unavailable'],
 ['not_read_only',[{name:capability,kind:'tool',risk:'external_write',async execute(){throw Error('MUST_NOT_RUN')}}],'read_only_capability_required']
]){
 const events=await runJohnRequest({...base,request_id:`nav-negative-${name}`},{env:{COGENTIA_AGENT_JHN_REASONING_LOOP_V2:'0'},capabilities:abilities,allowedCapabilities:[capability],requiredEvents:false});
 const failed=events.find(x=>x.type==='john.run.failed');
 assert.equal(failed?.data?.data?.code,expected,`${name}: typed failure`);
 assert.equal(events.some(x=>x.type==='john.tool.receipt'),false);
 assert.equal(events.some(x=>x.type==='john.run.completed'),false);
 const settlement=events.find(x=>x.type==='john.accounting.settled');
 assert.equal(settlement?.data?.tool_calls_count,0);
 assert.equal(settlement?.data?.external_effects,0);
 console.log(`${name}: ${expected} (no effects)`);
}
