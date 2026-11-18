import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore}
  from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordCompletedDirectCpsBrowserJudgment}
  from './cps-browser-return-fractalog.mjs';
import {copEnvelopeToFractalogRecord}
  from '../../../inseme/packages/cop-core/src/fractalog.js';

const id='ctn_chatgpt_browser_0123456789abcdef0123456789abcdef';
const topic='continuation:'+id;
function fixture({click=true,recovered=false,settlement=true}={}){
 const s=createSqliteCopEventStore(':memory:');
 const append=(topic,key,payload,event_type='cop.event/v1')=>{
  const r=s.append({topic_id:topic,event_type,actor_id:'cop:fixture',
   subject_ref:topic,epistemic_status:'observed',idempotency_key:key,payload});
  assert.equal(r.ok,true,JSON.stringify(r));
 };
 const reservationId='reservation:cps-fixture';
 append(topic,topic+':declared',{profile:'cop/continuation',continuation:{
  continuation_id:id,provider:'chatgpt',channel:'browser',
  budget_reservation_id:reservationId,packet_ref:'packet:'+id,
  claim:{epoch:1}}});
 const clickRef='chatgpt-browser:'+id+':first-dispatch-receipt';
 if(click)append(topic,clickRef,{profile:'cop.continuation-browser-dispatch/v1',
  phase:'ui_click_dispatched_not_model_result'});
 append(topic,'mcp:fixture',{surface:'mcp',usage_observation:recovered?
  {direct_model_tool_submission:false}:null});
 for(const phase of ['accepted','returned'])append(topic,'result:'+phase,
  {profile:'cop.continuation-result/v1',phase,
   candidate_result:{status:'answered',result:{answer:'Budget step is not a price.'}}});
 append(topic,'handler:fixture',{profile:'cop.continuation-dispatch/v1',
  phase:'handler_completed'});
 append('execution-budget:budget:mandate:jhn:john-root','budget-reserve',{
  reservation:{reservation_id:reservationId}},'ExecutionBudgetReservation');
 if(settlement)append('execution-budget:budget:mandate:jhn:john-root',
  'budget-settlement',{reservation_id:reservationId,usage:{max_steps:1}},
  'ExecutionBudgetSettlement');
 return s;
}
test('direct ChatGPT receipt -> FractaLog exactly once and no monetary fiction',()=>{
 const s=fixture();
 try{
  const r=recordCompletedDirectCpsBrowserJudgment({store:s,continuation_id:id});
  assert.equal(r.ok,true,JSON.stringify(r));
  const again=recordCompletedDirectCpsBrowserJudgment({store:s,continuation_id:id});
  assert.equal(again.duplicate,true);
  const log=copEnvelopeToFractalogRecord(s.eventByIdempotency(r.receipt_ref));
  assert.equal(log.effect.new_browser_submissions,1);
  assert.equal(log.effect.cop_budget_settled_max_steps,1);
  assert.equal(log.effect.provider_monetary_cost,'not_measured');
  assert.equal(log.links.length,4);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});
test('missing click or provider settlement never becomes an invented receipt',()=>{
 for(const opts of [{click:false},{settlement:false}]){
  const s=fixture(opts);try{
   const r=recordCompletedDirectCpsBrowserJudgment({store:s,continuation_id:id});
   assert.equal(r.ok,false);
   assert.equal(s.replay().filter(e=>e.event_type==='fractalog.act-record/v1').length,0);
  }finally{s.close()}
 }
});
test('recovered visible answer cannot be relabelled as direct model tool return',()=>{
 const s=fixture({recovered:true});try{
  const r=recordCompletedDirectCpsBrowserJudgment({store:s,continuation_id:id});
  assert.equal(r.status,'visible_recovery_requires_separate_fractalog');
 }finally{s.close()}
});
