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
  {...req,input:{...req.input,arguments:{...input,frame_id:'abc_123'}}},
  {...req,input:{...req.input,arguments:{...input,field_kind:'file'}}}];
 for(const request of bad)assert.equal((await executeJohnCanonicalForm({request,run})).error,'canonical_form_envelope_invalid');
 assert.equal(calls,0);
 assert.equal((await executeJohnCanonicalForm({request:req,authorizedKeysPath:'/no-such-file',run})).error,'trusted_form_issuer_missing');
 const rich={...req,input:{...req.input,arguments:{...input,field_kind:'contenteditable'}}};
 assert.equal((await executeJohnCanonicalForm({request:rich,authorizedKeysPath:'/no-such-file',run})).error,'trusted_form_issuer_missing');
 assert.equal(calls,0);
});

test('UID target uses the same canonical admission and cannot mix selectors or frames',async()=>{
 const epoch='a'.repeat(32);
 const target={browser_instance_id:'fracta2-hosted',tab_id:7,frame_id:'top',document_epoch:epoch,uid:epoch+':1'};
 const {field_index,...rest}=input;
 const invoke=args=>executeJohnCanonicalForm({request:{...req,input:{...req.input,arguments:args}},
  authorizedKeysPath:'/no-such-file',run:()=>assert.fail('must not execute')});
 assert.equal((await invoke({...rest,element_target:target})).error,'trusted_form_issuer_missing');
 for(const args of [{...rest,element_target:{...target,tab_id:8}},
  {...rest,element_target:{...target,uid:'b'.repeat(32)+':1'}},
  {...rest,element_target:{...target,frame_id:'other'}},
  {...rest,element_target:target,field_index:0},
  {...rest,element_target:target,frame_id:'other',expected_frame_origin:'https://example.org'}])
  assert.equal((await invoke(args)).error,'canonical_form_envelope_invalid');
});

test('managed frame UID admission pins explicit instance and origin',async()=>{
 const epoch='a'.repeat(32),browser_instance_id='firefox-fixture';
 const element_target={browser_instance_id,tab_id:7,frame_id:'frame',document_epoch:epoch,uid:epoch+':1'};
 const {field_index,...rest}=input;
 const args={...rest,browser_instance_id,element_target,expected_frame_origin:'https://frame.example'};
 const invoke=arguments_=>executeJohnCanonicalForm({request:{...req,input:{...req.input,arguments:arguments_}},
  authorizedKeysPath:'/no-such-file',run:()=>assert.fail('must not execute')});
 assert.equal((await invoke(args)).error,'trusted_form_issuer_missing');
 for(const bad of [{...args,browser_instance_id:'other'},{...args,expected_frame_origin:'https://frame.example/path'},
  {...args,element_target:{...element_target,frame_id:'top'}},{...args,field_index:0}])
  assert.equal((await invoke(bad)).error,'canonical_form_envelope_invalid');
});
