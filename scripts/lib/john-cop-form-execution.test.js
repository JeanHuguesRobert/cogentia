import test from 'node:test';import assert from 'node:assert/strict';
import {executeJohnCanonicalForm} from './john-cop-form-execution.js';
const input={tab_id:7,field_index:1,expected_url:'https://example.org/form',text:'Safe test text'};
const req={request_id:'form-gate-test',capability:'browser.form.fill',exposure:'bounded',input:{prompt:'Fill a non-secret field',arguments:input},handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:['browser.form.fill']},execution_budget:{max_steps:4,max_tool_calls:1,max_internal_effects:1,max_external_effects:0}};
test('form canonical gate validates target and budget before any execution',async()=>{
 let calls=0;const run=()=>{calls++};
 const bad=[{...req,capability:'payment.execute'}, {...req,exposure:'consequential'},
  {...req,execution_budget:{...req.execution_budget,max_external_effects:1}},
  {...req,execution_budget:{...req.execution_budget,max_internal_effects:0}},
  {...req,input:{...req.input,arguments:{...input,expected_url:'http://example.org/form'}}},
  {...req,input:{...req.input,arguments:{...input,text:''}}},
  {...req,handler:{...req.handler,kind:'capability_once'}},
  {...req,input:{...req.input,arguments:{...input,frame_id:'bad frame',expected_frame_origin:'https://auth.example'}}},
  {...req,input:{...req.input,arguments:{...input,frame_id:'abc_123',expected_frame_origin:'https://auth.example/path'}}},
  {...req,input:{...req.input,arguments:{...input,frame_id:'abc_123'}}}];
 for(const request of bad)assert.equal((await executeJohnCanonicalForm({request,run})).error,'canonical_form_envelope_invalid');
 assert.equal(calls,0);
 assert.equal((await executeJohnCanonicalForm({request:req,authorizedKeysPath:'/no-such-file',run})).error,'trusted_form_issuer_missing');
 assert.equal(calls,0);
});
