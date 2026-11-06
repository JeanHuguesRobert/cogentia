import test from 'node:test';import assert from 'node:assert/strict';
import {executeJohnCanonicalRead} from './john-cop-read-execution.js';
const request={request_id:'test-prevalidation',capability:'browser.navigation.instances',exposure:'read_only',handler:{kind:'capability_once',allowed_capabilities:['browser.navigation.instances']},execution_budget:{max_steps:2,max_tool_calls:1,max_external_effects:0,max_internal_effects:0}};
test('forbidden capabilities, wider budgets and mutating exposure fail before any call',async()=>{
 let calls=0;const run=()=>{calls++;throw Error('should never run')};
 for(const variant of [
  {...request,capability:'payment.execute'},
  {...request,exposure:'bounded'},
  {...request,execution_budget:{...request.execution_budget,max_external_effects:1}},
  {...request,execution_budget:{...request.execution_budget,max_steps:9}},
  {...request,handler:{...request.handler,allowed_capabilities:['browser.navigation.instances','browser.hosted.inspect']}},
  {...request,request_id:'invalid request id'},
 ]){
  const response=await executeJohnCanonicalRead({request:variant,run});
  assert.equal(response.ok,false);assert.equal(response.error,'canonical_read_envelope_invalid');
 }
 assert.equal(calls,0);
});
test('without a trusted issuer public key even an otherwise valid request cannot run',async()=>{
 let calls=0;const response=await executeJohnCanonicalRead({request,authorizedKeysPath:'/nonexistent-test-issuer-keys',run:()=>{calls++}});
 assert.equal(response.error,'trusted_issuer_key_unavailable');assert.equal(calls,0);
});
