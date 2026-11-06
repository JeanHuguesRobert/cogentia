import test from 'node:test';import assert from 'node:assert/strict';
import {runJohnRequest} from './john-run.js';
const input={tab_id:1,field_index:0,expected_url:'https://example.org/test',text:'NON_SECRET_TEST_STRING'};
const cap={name:'browser.form.fill',kind:'tool',risk:'internal_recoverable',costUnits:1,async execute(){return {ok:true,inserted_length:22,submitted:false}}};
const req={version:'john.request.v1',request_id:'bounded-form-fixture',principal:{id:'principal:jhn'},mandate:{id:'mandate:jhn:form-assist',version:'v1'},budget:{id:'budget:form-test'},execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,max_elapsed_ms:9000,max_external_effects:0,max_internal_effects:1},exposure:'bounded',capability:'browser.form.fill',input:{prompt:'Fill an ordinary form field',arguments:input},handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:['browser.form.fill']}};
test('bounded form assistance requires trusted server-side option and redacts data in events',async()=>{
 const opts={capabilities:[cap],allowedCapabilities:['browser.form.fill'],maxInternalEffects:1,requiredEvents:false};
 const deny=await runJohnRequest(req,opts);
 assert.equal(deny.some(e=>e.type==='john.tool.receipt'),false);
 const granted=await runJohnRequest({...req,request_id:'bounded-form-approved'}, {...opts,approvedBoundedOnceCapability:'browser.form.fill'});
 assert.equal(granted.some(e=>e.type==='john.tool.receipt'),true,JSON.stringify(granted.filter(e=>e.type==='john.run.failed')));
 assert.equal(granted.some(e=>e.type==='john.run.completed'),true);
 assert.equal(granted.find(e=>e.type==='john.accounting.settled')?.data?.internal_effects,1);
 assert.ok(!JSON.stringify(granted).includes('NON_SECRET_TEST_STRING'));
});
