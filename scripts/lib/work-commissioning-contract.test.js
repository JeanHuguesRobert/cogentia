import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkCommissioningContract as build,compareWorkCommissioningContract as compare} from './work-commissioning-contract.js';
const intent={principal_ref:'principal:alice',responsible_agent_ref:'agent:root',
 submission_key:'order-01',request_hash:'sha256:'+'a'.repeat(64),capability:'corpus.search',
 mandate_ref:'mandate:alice:root',mandate_version:'v8',
 parent_budget_ref:'budget:alice',allocation:{max_steps:3}};
const context={verified:true,principal_ref:'principal:alice',request_hash:intent.request_hash,
 requesting_agent_ref:'agent:client-a',commissioned_by_principal_ref:'principal:alice',
 commissioning_ref:'event:order-01',destination_ref:'destination:personal',
 recipient_ref:'principal:alice',result_visibility:'public'};
test('root order separates commissioner, requester, responsible agent, authority, funding and delivery',()=>{
 const a=build({intent,context});
 assert.equal(a.ok,true);
 assert.equal(a.grants_authority,false);
 assert.equal(a.assignment.commissioned_by_principal_ref,'principal:alice');
 assert.equal(a.contract.requesting_agent_ref,'agent:client-a');
 assert.equal(a.assignment.responsible_agent_ref,'agent:root');
 assert.equal(a.contract.delivery.destination_ref,'destination:personal');
 assert.equal(a.contract.delivery.recipient_ref,'principal:alice');
 assert.equal(a.contract.authority.version,'v8');
 assert.equal(a.contract.twin_ref,null);
 assert.equal(a.contract.subject_ref,null);
 assert.equal(a.contract.delivery.provider_account_ref,null);
 assert.equal(compare(a.contract,build({intent:structuredClone(intent),context:structuredClone(context)})).ok,true);
});
test('delegated work uses explicit agent commissioner and proven parent; no fictional root agent',()=>{
 const c={...context,commissioned_by_principal_ref:null,commissioned_by_agent_ref:'agent:root',
   requesting_agent_ref:'agent:root',parent_work_ref:'packet:parent'};
 const i={...intent,responsible_agent_ref:'agent:child',capability:'reasoning.code'};
 const a=build({intent:i,context:c});
 assert.equal(a.ok,true);
 assert.equal(a.assignment.commissioned_by_agent_ref,'agent:root');
 for(const bad of [{parent_work_ref:null},{commissioned_by_principal_ref:'principal:alice'},
   {commissioned_by_agent_ref:'agent:child'}]){
   assert.equal(build({intent:i,context:{...c,...bad}}).ok,false);
 }
});
test('unverified context, mismatched request, identity, and malformed funding rejected',()=>{
 for(const bad of [{verified:false},{request_hash:'sha256:'+'b'.repeat(64)},
  {principal_ref:'principal:other'},{requesting_agent_ref:null},{recipient_ref:null},
  {destination_ref:null},{provider_account_ref:{}},{twin_ref:42},{result_visibility:'unknown'},{parent_work_ref:'packet:parent'}]){
  assert.equal(build({intent,context:{...context,...bad}}).ok,false);
 }
 for(const bad of [{allocation:{max_steps:-1}},{allocation:{max_steps:1.5}},
  {allocation:{unbounded:3}},{mandate_ref:'transport:token'},{mandate_version:''}]){
  assert.equal(build({intent:{...intent,...bad},context}).ok,false);
 }
});
test('retrieval cannot substitute another requester, recipient, destination, funding or mandate',()=>{
 const a=build({intent,context});
 for(const c of [{requesting_agent_ref:'agent:client-b'},{destination_ref:'destination:collective'},
  {recipient_ref:'principal:other'},{result_visibility:'restricted'},{commissioning_ref:'event:other'},
  {subject_ref:'subject:other'},{twin_ref:'twin:collective'},{provider_account_ref:'account:other'}]){
  assert.equal(compare(a.contract,build({intent,context:{...context,...c}})).ok,false);
 }
 for(const i of [{allocation:{max_steps:4}},{mandate_version:'v9'},{capability:'reasoning.code'}]){
  assert.equal(compare(a.contract,build({intent:{...intent,...i},context})).ok,false);
 }
 const forged=structuredClone(a);forged.contract.delivery.destination_ref='destination:other';
 assert.equal(compare(a.contract,forged).ok,false);
});
