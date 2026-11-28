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

test('workshop recursion: one Principal, a Root Agent and two levels of delegated work',()=>{
 const root=build({intent,context});
 assert.equal(root.ok,true);
 const childIntent={...intent,submission_key:'order-01-child',
  request_hash:'sha256:'+'b'.repeat(64),responsible_agent_ref:'agent:elf-a',
  capability:'research.compare',parent_budget_ref:'budget:root-work',allocation:{max_steps:2}};
 const childContext={...context,request_hash:childIntent.request_hash,
  requesting_agent_ref:'agent:root',commissioned_by_principal_ref:null,
  commissioned_by_agent_ref:'agent:root',parent_work_ref:'packet:root-work',
  commissioning_ref:'event:root-order-child',recipient_ref:'agent:root',
  destination_ref:'destination:root-work'};
 const child=build({intent:childIntent,context:childContext});
 assert.equal(child.ok,true);
 const leafIntent={...childIntent,submission_key:'order-01-leaf',
  request_hash:'sha256:'+'c'.repeat(64),responsible_agent_ref:'agent:elf-b',
  capability:'corpus.search',parent_budget_ref:'budget:child-work',allocation:{max_steps:1}};
 const leafContext={...childContext,request_hash:leafIntent.request_hash,
  requesting_agent_ref:'agent:elf-a',commissioned_by_agent_ref:'agent:elf-a',
  parent_work_ref:'packet:child-work',commissioning_ref:'event:child-order-leaf',
  recipient_ref:'agent:elf-a',destination_ref:'destination:child-work'};
 const leaf=build({intent:leafIntent,context:leafContext});
 assert.equal(leaf.ok,true);
 for(const a of [root,child,leaf]){
  assert.equal(a.contract.principal_ref,'principal:alice');
  assert.equal(a.grants_authority,false);
 }
 assert.equal(child.assignment.commissioned_by_agent_ref,root.assignment.responsible_agent_ref);
 assert.equal(leaf.assignment.commissioned_by_agent_ref,child.assignment.responsible_agent_ref);
 assert.equal(leaf.contract.delivery.recipient_ref,child.assignment.responsible_agent_ref);
 assert.equal(child.contract.delivery.recipient_ref,root.assignment.responsible_agent_ref);
 assert.equal(root.contract.delivery.recipient_ref,'principal:alice');
 assert.equal(new Set([root.contract_hash,child.contract_hash,leaf.contract_hash]).size,3);
 // A descendant cannot substitute its own identity for the governing Principal.
 assert.equal(build({intent:leafIntent,context:{...leafContext,principal_ref:'principal:elf-a'}}).ok,false);
 // The same work cannot be silently redirected to the root's recipient.
 assert.equal(compare(leaf.contract,build({intent:leafIntent,context:{
  ...leafContext,recipient_ref:'principal:alice',destination_ref:'destination:personal'}})).ok,false);
 // The constructor does not itself prove attenuation, reserve funds, or
 // delegate authority. These remain existing COP admission obligations.
});

test('multi-capability authority binds one exact capability set, preserving legacy contracts',()=>{
 const multi={...intent,capabilities:['host.process.run','browser.navigation.instances']};delete multi.capability;
 const a=build({intent:multi,context});
 assert.equal(a.ok,true);
 assert.deepEqual(a.contract.authority.capabilities,multi.capabilities);
 assert.equal(Object.hasOwn(a.contract.authority,'capability'),false);
 assert.equal(compare(a.contract,build({intent:multi,context})).ok,true);
 assert.equal(compare(a.contract,build({intent:{...multi,capabilities:['host.process.run']},context})).ok,false);
 for(const capabilities of [[],['host.process.run','host.process.run'],[null]]){
   assert.equal(build({intent:{...multi,capabilities},context}).ok,false);
 }
 assert.equal(build({intent:{...multi,capability:'host.process.run'},context}).ok,false);
 assert.equal(build({intent,context}).contract.authority.capability,intent.capability);
});

test('trusted temporal window is bound in the contract and cannot be substituted',()=>{
 const temporal_window={not_before:'2026-11-28T13:00:00.000Z',review_at:'2026-12-01T13:00:00.000Z'};
 const a=build({intent,context:{...context,temporal_window}});
 assert.equal(a.ok,true);
 assert.deepEqual(a.contract.temporal_window,temporal_window);
 assert.equal(compare(a.contract,build({intent,context})).ok,false);
 assert.equal(compare(a.contract,build({intent,context:{...context,temporal_window:{...temporal_window,review_at:'2026-12-02T13:00:00.000Z'}}})).ok,false);
 assert.equal(build({intent,context:{...context,temporal_window:{...temporal_window,review_at:temporal_window.not_before}}}).ok,false);
});
