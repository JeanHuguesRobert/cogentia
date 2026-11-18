import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {EventStorePacketClaimCoordinator} from '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {projectCpsResultClaim} from './cps-effective-result-claim.mjs';

const id='ctn_chatgpt_browser_0123456789abcdef0123456789abcdef';
const topic='continuation:'+id;
const packet='packet:'+id;
const click='chatgpt-browser:'+id+':first-dispatch-receipt';
const add=(s,k,p,causal_refs=[])=>s.append({topic_id:topic,event_type:'cop.event/v1',
  actor_id:'cop:test',subject_ref:topic,epistemic_status:'observed',
  idempotency_key:k,causal_refs,payload:p});
async function setup(){
 const s=createSqliteCopEventStore(':memory:');
 let clock=Date.now();
 const coord=new EventStorePacketClaimCoordinator({store:s,now:()=>clock});
 const first=await coord.tryClaim({packetRef:packet,handlerRef:'agent:jhn',ttlMs:60000});
 assert.equal(first.ok,true);
 const c={continuation_id:id,packet_ref:packet,claim:{
  claim_id:first.claim.claim_id,epoch:first.claim.epoch,
  expected_generation:coord.inspect(packet).generation}};
 return {s,coord,c,advance:ms=>{clock+=ms;return new Date(clock)},
   finish:()=>s.close()};
}

test('unmodified original claim is current but expiration fails closed',async()=>{
 const x=await setup();try{
  const current=projectCpsResultClaim({store:x.s,continuation:x.c,actor:'agent:jhn'});
  assert.equal(current.ok,true);
  assert.equal(current.source,'declared');
  const late=projectCpsResultClaim({store:x.s,continuation:x.c,actor:'agent:jhn',
   now:new Date(Date.now()+65000)});
  assert.equal(late.ok,false);
  assert.equal(late.status,'STALE_CLAIM');
 }finally{x.finish()}
});

test('original declaration remains immutable: validated pre-submit rebind is honored',async()=>{
 const x=await setup();try{
  const timestamp=x.advance(65000);
  const claim=await x.coord.tryClaim({packetRef:packet,
    handlerRef:'agent:jhn',ttlMs:120000,now:timestamp});
  assert.equal(claim.ok,true);
  assert.equal(add(x.s,'rebound-key',{
    profile:'cogentia.cps-assigned-recovery-claim/v1',phase:'recovery_claim_rebound',
    continuation_id:id,prior_claim_id:x.c.claim.claim_id,
    prior_epoch:x.c.claim.epoch,new_claim_id:claim.claim.claim_id,
    new_epoch:claim.claim.epoch}).ok,true);
  const valid=projectCpsResultClaim({store:x.s,continuation:x.c,actor:'agent:jhn',
    now:timestamp});
  assert.equal(valid.ok,true,JSON.stringify(valid));
  assert.equal(valid.claim.epoch,2);
  assert.equal(valid.source,'pre_submit_rebound');
  assert.equal(x.c.claim.epoch,1);
 }finally{x.finish()}
});

test('observed late result plus new independent claim is admitted only under causal evidence',async()=>{
 const x=await setup();try{
  const ref='visible:'+id;
  assert.equal(add(x.s,click,{profile:'cop.continuation-browser-dispatch/v1',
   phase:'ui_click_dispatched_not_model_result',continuation_id:id}).ok,true);
  assert.equal(add(x.s,ref,{profile:'cogentia.cps-browser-visible-result/v1',
   phase:'governed_browser_reply_observed',continuation_id:id,
   original_click_receipt_ref:click,response_sha256:'a'.repeat(64)}).ok,true);
  const timestamp=x.advance(65000);
  const claim=await x.coord.tryClaim({packetRef:packet,
   handlerRef:'agent:jhn',ttlMs:120000,now:timestamp});
  assert.equal(claim.ok,true);
  assert.equal(add(x.s,'late-rebound',{
    profile:'cogentia.cps-late-observed-result-claim/v1',
    phase:'late_return_claim_rebound',continuation_id:id,packet_ref:packet,
    prior_claim_id:x.c.claim.claim_id,prior_epoch:1,
    new_claim_id:claim.claim.claim_id,new_epoch:claim.claim.epoch,
    observation_receipt_ref:ref,original_click_receipt_ref:click},
   [ref,click]).ok,true);
  const valid=projectCpsResultClaim({store:x.s,continuation:x.c,actor:'agent:jhn',
   now:timestamp});
  assert.equal(valid.ok,true,JSON.stringify(valid));
  assert.equal(valid.source,'late_observed_return');
  assert.equal(valid.claim.epoch,2);
  assert.equal(projectCpsResultClaim({store:x.s,continuation:x.c,
    actor:'agent:someone_else',now:timestamp}).ok,false);
  // Expiry of new claim is still real.
  assert.equal(projectCpsResultClaim({store:x.s,continuation:x.c,
    actor:'agent:jhn',now:new Date(Date.now()+260000)}).ok,false);
 }finally{x.finish()}
});

test('a claim from another actor or forged uncaused late result is never promoted',async()=>{
 const x=await setup();try{
  const at=x.advance(65000);
  const fresh=await x.coord.tryClaim({packetRef:packet,
    handlerRef:'agent:intruder',ttlMs:120000,now:at});
  assert.equal(fresh.ok,true);
  assert.equal(add(x.s,click,{profile:'cop.continuation-browser-dispatch/v1',
   phase:'ui_click_dispatched_not_model_result'}).ok,true);
  const ref='visible:invalid';
  assert.equal(add(x.s,ref,{profile:'cogentia.cps-browser-visible-result/v1',
   phase:'governed_browser_reply_observed',continuation_id:id,
   original_click_receipt_ref:click}).ok,true);
  assert.equal(add(x.s,'late-forged',{
   profile:'cogentia.cps-late-observed-result-claim/v1',
   phase:'late_return_claim_rebound',continuation_id:id,packet_ref:packet,
   prior_claim_id:x.c.claim.claim_id,prior_epoch:1,
   new_claim_id:fresh.claim.claim_id,new_epoch:fresh.claim.epoch,
   observation_receipt_ref:ref,original_click_receipt_ref:click},[]).ok,true);
  assert.equal(projectCpsResultClaim({store:x.s,continuation:x.c,
   actor:'agent:jhn',now:at}).status,'late_rebind_provenance_invalid');
 }finally{x.finish()}
});
