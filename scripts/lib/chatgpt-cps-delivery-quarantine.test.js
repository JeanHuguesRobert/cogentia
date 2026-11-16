import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore}from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import{changePacketTemperature,projectPacketTemperature}from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import{linkPacketChild}from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import{quarantineUncertainBrowserDelivery,inspectQuarantinedBrowserDelivery}
  from './chatgpt-cps-delivery-quarantine.js';
import{listAssignedChatgptCpsContinuations}from './chatgpt-cps-assigned-dispatch.js';

const child='ctn_chatgpt_browser_0123456789abcdef0123456789abcdef';
const parent='ctn_legacy_parked_123';
const ct='continuation:'+child,pt='continuation:'+parent;
const intent=`chatgpt-browser:${child}:first-dispatch-intent`;
const add=(s,topic,key,payload)=>s.append({topic_id:topic,event_type:'cop.event/v1',
 actor_id:'cop:test',subject_ref:topic,epistemic_status:'observed',idempotency_key:key,payload});
function fixture({intentExists=true,linkExists=true}={}){
  const s=createSqliteCopEventStore(':memory:');
  assert.equal(add(s,ct,ct+':declared',{profile:'cop/continuation',continuation:{
    continuation_id:child,packet_ref:'packet:'+child,lifecycle:'suspended',
    provider:'chatgpt',channel:'browser',resumeTo:'handler:chatgpt-browser-result-observer',
    budget_reservation_id:'reservation:fixture',claim:{claim_id:'claim:fixture',epoch:1},
    state:{assignment_ref:'legacy:'+parent,dispatch_mode:'cps:assigned-browser-turn/v1',
      question:'Inspect the public document, return a JSON verdict.'}}}).ok,true);
  if(linkExists)assert.equal(linkPacketChild(s,{parent_ref:pt,child_ref:ct}).ok,true);
  if(intentExists)assert.equal(add(s,ct,intent,{
    profile:'cop.continuation-browser-dispatch/v1',phase:'intent_committed',
    continuation_id:child}).ok,true);
  return s;
}

test('quarantine requires exact original CPS intent and a real parent link',()=>{
 for(const opts of [{intentExists:false},{linkExists:false}]){
  const s=fixture(opts);try{
   assert.equal(quarantineUncertainBrowserDelivery(s,{continuation_id:child}).ok,false);
   assert.equal(projectPacketTemperature(s,{packet_ref:pt}).temperature,'active');
   assert.equal(s.auditCommitments().ok,true);
  }finally{s.close()}
 }
});

test('cooling alone does not erase an unresolved browser intent from the dispatch blocker',()=>{
 const s=fixture();try{
  const parked=changePacketTemperature(s,{packet_ref:pt,temperature:'parked',
    transition_id:'manual-park-without-delivery-quarantine'});
  assert.equal(parked.ok,true);
  assert.equal(inspectQuarantinedBrowserDelivery(s,child).quarantined,false);
  assert.equal(listAssignedChatgptCpsContinuations(s)[0].status,'needs_reconciliation');
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});

test('explicit quarantined parent cascades to child and survives repeated invocation',()=>{
 const s=fixture();try{
  const r=quarantineUncertainBrowserDelivery(s,{continuation_id:child});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.quarantined,true);
  assert.equal(r.retry_authorized,false);
  assert.equal(projectPacketTemperature(s,{packet_ref:pt}).temperature,'parked');
  assert.equal(projectPacketTemperature(s,{packet_ref:ct}).temperature,'parked');
  assert.equal(listAssignedChatgptCpsContinuations(s)[0].status,'parked');
  const again=quarantineUncertainBrowserDelivery(s,{continuation_id:child});
  assert.equal(again.ok,true);
  assert.equal(again.duplicate,true);
  assert.equal(s.listTopic(ct).filter(x=>x.payload?.phase==='quarantined_uncertain_delivery').length,1);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});

test('late result is preserved without un-parking the cold child or silently consuming it',()=>{
 const s=fixture();try{
  assert.equal(quarantineUncertainBrowserDelivery(s,{continuation_id:child}).ok,true);
  assert.equal(add(s,ct,'late:'+child,{profile:'cop.continuation-result/v1',
    phase:'returned'}).ok,true);
  const q=inspectQuarantinedBrowserDelivery(s,child);
  assert.equal(q.quarantined,true);
  assert.equal(q.late_return_observed,true);
  assert.equal(projectPacketTemperature(s,{packet_ref:ct}).runnable,false);
  const resume=changePacketTemperature(s,{packet_ref:pt,temperature:'active',
    transition_id:'parent-only-resumed'});
  assert.equal(resume.ok,true);
  assert.equal(projectPacketTemperature(s,{packet_ref:ct}).temperature,'parked');
  assert.equal(inspectQuarantinedBrowserDelivery(s,child).ok,false);
  assert.equal(listAssignedChatgptCpsContinuations(s).length,0); // returned, not ready
  assert.equal(s.listTopic(ct).filter(x=>x.payload?.phase==='returned').length,1);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});

test('confirmed click or result is not converted retroactively into uncertainty quarantine',()=>{
 for(const phase of ['ui_click_dispatched_not_model_result','returned']){
  const s=fixture();try{
   const payload=phase==='returned'?{profile:'cop.continuation-result/v1',phase}:
     {profile:'cop.continuation-browser-dispatch/v1',phase};
   const key=phase==='returned'?'returned:key':
     `chatgpt-browser:${child}:first-dispatch-receipt`;
   assert.equal(add(s,ct,key,payload).ok,true);
   assert.equal(quarantineUncertainBrowserDelivery(s,{continuation_id:child}).ok,false);
   assert.equal(projectPacketTemperature(s,{packet_ref:pt}).temperature,'active');
  }finally{s.close()}
 }
});
