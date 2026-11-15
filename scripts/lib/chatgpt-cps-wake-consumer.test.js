import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {declaredContinuationRecord} from '../../../inseme/packages/cop-core/src/continuation-result.js';
import {COPScheduler} from '../../../inseme/packages/cop-kernel/src/scheduler.js';
import {COPBus} from '../../../inseme/packages/cop-kernel/src/bus.js';
import {recordChatgptReturnWake} from './chatgpt-cps-return-wake.js';
import {consumeChatgptCpsWake,listChatgptCpsWakes} from './chatgpt-cps-wake-consumer.js';
import {runChatgptCpsWakeBatch} from './chatgpt-cps-wake-batch.js';
import {listChatgptCpsNextSteps,consumeChatgptCpsNextStep,runChatgptCpsNextStepBatch} from './chatgpt-cps-next-step.js';
const HANDLER='handler:chatgpt-browser-result-observer';
const BUDGET='budget:mandate:jhn:john-root';
const commit=(store,e)=>assert.equal(store.append(e).ok,true);
const event=(topic,id,payload,event_type='cop.event/v1')=>({
  topic_id:topic,event_type,actor_id:'cop:test',subject_ref:topic,
  visibility:'restricted',epistemic_status:'observed',idempotency_key:id,payload,
});
function addReturned(store,id){
 const topic='continuation:'+id;
 const reservation_id='reservation:'+id;
 commit(store,declaredContinuationRecord({
   continuation_id:id,packet_ref:'packet:'+id,version:1,
   attempt_id:'a1',execution_binding_ref:'binding:'+id,
   lifecycle:'suspended',correlation:{challenge:'challenge:'+id},
   budget_reservation_id:reservation_id,expected_result:{schema:'cogentia.step_result/v1'},
   provider:'chatgpt',channel:'browser',resumeTo:HANDLER,
 }));
 const returned=event(topic,'return:'+id,{
   profile:'cop.continuation-result/v1',phase:'returned',continuation_id:id,
   candidate_result:{status:'answered',result:{answer:'step '+id}},
 });
 commit(store,returned);
 commit(store,event('execution-budget:'+BUDGET,'settlement:'+id,{
   reservation_id,usage:{max_steps:1},
 },'ExecutionBudgetSettlement'));
 const actual=store.eventByIdempotency('return:'+id);
 assert.equal(recordChatgptReturnWake({store,continuation:{
   continuation_id:id,provider:'chatgpt',channel:'browser',budget_reservation_id:reservation_id,
 },returned:actual,budget_id:BUDGET}).ok,true);
}
const admit=async ({continuation})=>({granted:true,authorization_ref:'verified:fixture',
  handler_ref:continuation.resumeTo});
const denied=async()=>({granted:false});
function scheduler(onStep){
 return new COPScheduler(new COPBus({name:'fixture'}),{
   handlerResolver:async resumeTo=>resumeTo===HANDLER?{
     execute:async ({continuation,payload})=>onStep(continuation,payload),
   }:null,
 });
}

test('3 causally chained returns re-enter existing COPScheduler, no duplicate after restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cps-wake-'));
 const file=join(dir,'events.sqlite');
 try{
   let store=createSqliteCopEventStore(file);
   const seen=[];
   const ids=['ctn_loop_001','ctn_loop_002','ctn_loop_003'];
   const existingScheduler=scheduler((cont,payload)=>{
     seen.push([cont.continuationId,payload.yield?.answer]);
     const idx=ids.indexOf(cont.continuationId);
     if(idx<ids.length-1)addReturned(store,ids[idx+1]);
     return {status:idx===ids.length-1?'completed':'continue',
       next_action:ids[idx+1]||null};
   });
   addReturned(store,ids[0]);
   assert.deepEqual(listChatgptCpsWakes(store).map(x=>x.continuation_id),[ids[0]]);
   assert.equal((await consumeChatgptCpsWake({store,continuation_id:ids[0],scheduler:existingScheduler,admit:denied})).status,'not_admitted');
   assert.equal(seen.length,0);
   // No controller must manually invoke each next continuation: one bounded
   // Cogentia mandate driver consumes all three causally chained returns.
   const drained=await runChatgptCpsWakeBatch({store,scheduler:existingScheduler,
     admit,max_steps:4});
   assert.equal(drained.status,'queue_drained',JSON.stringify(drained));
   assert.equal(drained.steps_completed,3);
   assert.equal(drained.autonomous_browser_worker,false);
   assert.equal(drained.parent_mandate_completed,false);
   for(const id of ids)
     assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,
       scheduler:existingScheduler,admit})).status,'already_processed');
   assert.equal(seen.length,3);
   store.close();
   store=createSqliteCopEventStore(file);
   assert.deepEqual(listChatgptCpsWakes(store).map(x=>x.status),[]);
   assert.equal((await consumeChatgptCpsWake({store,continuation_id:ids[0],scheduler:existingScheduler,admit})).status,'already_processed');
   assert.equal(seen.length,3);
   assert.equal(store.auditCommitments().ok,true);
   store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('crash after dispatch intent persists a reconciliation gate across process restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cps-crash-'));
 const file=join(dir,'events.sqlite');
 try{
   let store=createSqliteCopEventStore(file);
   addReturned(store,'ctn_crash_01');
   let invoked=0;
   const failing=scheduler(()=>{invoked++;throw new Error('crash_after_uncertain_effect');});
   assert.equal((await consumeChatgptCpsWake({store,continuation_id:'ctn_crash_01',scheduler:failing,admit})).status,'needs_reconciliation');
   store.close();
   store=createSqliteCopEventStore(file);
   assert.equal((await consumeChatgptCpsWake({store,continuation_id:'ctn_crash_01',scheduler:failing,admit})).status,'needs_reconciliation');
   assert.equal(invoked,1);
   assert.deepEqual(listChatgptCpsWakes(store).map(x=>x.status),['needs_reconciliation']);
   assert.equal(store.auditCommitments().ok,true);
   store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('simultaneous consumers are fenced by COP transaction',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
   addReturned(store,'ctn_race_01');
   let invoked=0;
   const shared=scheduler(async()=>{invoked++;await Promise.resolve();return {status:'continue'};});
   const results=await Promise.all([1,2].map(()=>consumeChatgptCpsWake({
     store,continuation_id:'ctn_race_01',scheduler:shared,admit,
   })));
   assert.equal(results.filter(x=>x.status==='handler_completed').length,1);
   assert.equal(results.filter(x=>x.status==='needs_reconciliation'||x.status==='already_processed').length,1);
   assert.equal(invoked,1);
 }finally{store.close()}
});


test('bounded batch stops on authorization denial instead of spinning',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
   addReturned(store,'ctn_denied_01');
   let invokes=0;
   const result=await runChatgptCpsWakeBatch({store,scheduler:scheduler(()=>{
     invokes++;return {status:'continue'};
   }),admit:denied,max_steps:3});
   assert.equal(result.status,'step_failed');
   assert.equal(result.steps_completed,0);
   assert.equal(result.pending_count,1);
   assert.equal(invokes,0);
 }finally{store.close()}
});

const nextActionVerifiedReceipt=async({child_continuation_id,execution_receipt_ref})=>({
  verified:true,child_continuation_id,execution_receipt_ref,
  evidence_ref:'fixture:verified-john-dispatch-receipt:'+child_continuation_id,
});
const nextActionAdmit=async({action_id})=>({granted:true,action_id,
  authorization_ref:'fixture:independently-verified-mandate',
  provider_permitted:true,provider_permission_receipt_ref:'fixture:provider-review',
  budget_admitted:true,budget_authorization_ref:'fixture:budget-admission'});

test('next-step candidate becomes a durable separately admitted child, no replay after cold restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cps-next-action-'));
 const file=join(dir,'cop.sqlite');
 try{
  let store=createSqliteCopEventStore(file);
  const id='ctn_next_parent_01';
  addReturned(store,id);
  const r=await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:scheduler(()=>({status:'continue',next_action:'inspect-next-source'})),admit});
  assert.equal(r.status,'handler_completed');
  assert.deepEqual(listChatgptCpsNextSteps(store).map(x=>[x.action_id,x.status]),
    [['inspect-next-source','pending_admission']]);
  let invokes=0;
  const dispatch=async()=>{invokes++;return {ok:true,
    child_continuation_id:'ctn_next_child_01',execution_receipt_ref:'fixture:john-result'};};
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:async()=>({granted:false}),dispatch,verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'not_admitted');
  assert.equal(invokes,0);
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:async x=>({...await nextActionAdmit(x),provider_permission_receipt_ref:''}),
    dispatch,verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'not_admitted');
  assert.equal(invokes,0);
  const done=await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch,verifyDispatchReceipt:nextActionVerifiedReceipt});
  assert.equal(done.status,'child_dispatched');
  assert.equal(done.child_continuation_id,'ctn_next_child_01');
  assert.equal(invokes,1);
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch,verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'already_dispatched');
  store.close();
  store=createSqliteCopEventStore(file);
  assert.deepEqual(listChatgptCpsNextSteps(store),[]);
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch,verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'already_dispatched');
  assert.equal(invokes,1);
  assert.equal(store.auditCommitments().ok,true);
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('unknown dispatch after durable next-step intent is never blindly retried',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cps-next-ambiguous-'));
 const file=join(dir,'cop.sqlite');
 try{
  let store=createSqliteCopEventStore(file);
  const id='ctn_next_unknown_01';
  addReturned(store,id);
  assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:scheduler(()=>({status:'continue',next_action:'inspect-source'})),admit})).ok,true);
  let invoked=0;
  const fail=async()=>{invoked++;throw Error('unknown_dispatch_after_network_cut')};
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch:fail,verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'needs_reconciliation');
  store.close();
  store=createSqliteCopEventStore(file);
  assert.deepEqual(listChatgptCpsNextSteps(store).map(x=>x.status),['needs_reconciliation']);
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch:fail,verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'needs_reconciliation');
  assert.equal(invoked,1);
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('finished or uncorrelated scheduler output is never upgraded to autonomous execution',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const id='ctn_next_none_01';addReturned(store,id);
  assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:scheduler(()=>({status:'completed',next_action:'claimed-by-model'})),admit})).ok,true);
  assert.deepEqual(listChatgptCpsNextSteps(store),[]);
  let invoked=0;
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch:async()=>{invoked++;return {ok:true}},
    verifyDispatchReceipt:nextActionVerifiedReceipt})).status,'verified_candidate_missing');
  assert.equal(invoked,0);
 }finally{store.close()}
});


test('one bounded mandate driver dispatches three separately admitted causal children',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const ids=['ctn_bounded_chain_01','ctn_bounded_chain_02','ctn_bounded_chain_03'];
  const handled=[];
  const stepScheduler=scheduler(({continuationId})=>({
    status:continuationId===ids[2]?'open':'continue',
    next_action:continuationId===ids[2]?null:'inspect-next-source',
  }));
  async function record(id){
   addReturned(store,id);
   const r=await consumeChatgptCpsWake({store,continuation_id:id,
     scheduler:stepScheduler,admit});
   assert.equal(r.status,'handler_completed');
  }
  await record(ids[0]);
  const result=await runChatgptCpsNextStepBatch({store,
   max_steps:4,admit:nextActionAdmit,verifyDispatchReceipt:nextActionVerifiedReceipt,
   dispatch:async({continuation_id})=>{
    const index=ids.indexOf(continuation_id);
    handled.push(continuation_id);
    await record(ids[index+1]);
    return {ok:true,child_continuation_id:ids[index+1],
      execution_receipt_ref:'fixture:john:'+ids[index+1]};
   },
  });
  assert.equal(result.status,'queue_drained',JSON.stringify(result));
  assert.equal(result.steps_completed,2);
  assert.deepEqual(handled,ids.slice(0,2));
  assert.equal(result.parent_mandate_completed,false);
  assert.equal(result.persistent_worker,false);
  assert.deepEqual(listChatgptCpsNextSteps(store),[]);
 }finally{store.close()}
});

test('competing next-step consumers cannot dispatch the same candidate twice',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const id='ctn_next_concurrent_01';
  addReturned(store,id);
  assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:scheduler(()=>({status:'continue',next_action:'inspect-next-source'})),admit})).ok,true);
  let dispatched=0;
  const dispatch=async()=>{dispatched++;await Promise.resolve();return {
    ok:true,child_continuation_id:'ctn_next_concurrent_child_01',
    execution_receipt_ref:'fixture:john:concurrent',
  }};
  const results=await Promise.all([0,1,2].map(()=>consumeChatgptCpsNextStep({
    store,continuation_id:id,admit:nextActionAdmit,dispatch,
    verifyDispatchReceipt:nextActionVerifiedReceipt,
  })));
  assert.equal(results.filter(x=>x.status==='child_dispatched').length,1);
  assert.equal(results.filter(x=>['needs_reconciliation','already_dispatched'].includes(x.status)).length,2);
  assert.equal(dispatched,1);
  assert.equal(store.auditCommitments().ok,true);
 }finally{store.close()}
});

test('a self-claimed dispatch receipt never certifies a child without independent evidence',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const id='ctn_next_fake_receipt_01';addReturned(store,id);
  assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:scheduler(()=>({status:'continue',next_action:'inspect-next-source'})),admit})).ok,true);
  const dispatch=async()=>({ok:true,child_continuation_id:'ctn_next_fake_child_01',
    execution_receipt_ref:'john:claimed-but-not-verified'});
  const result=await consumeChatgptCpsNextStep({store,continuation_id:id,
    admit:nextActionAdmit,dispatch,
    verifyDispatchReceipt:async()=>({verified:false})});
  assert.equal(result.status,'needs_reconciliation');
  assert.equal(store.eventByIdempotency('chatgpt-browser:'+id+':next-step-dispatched'),null);
  assert.deepEqual(listChatgptCpsNextSteps(store).map(x=>x.status),['needs_reconciliation']);
 }finally{store.close()}
});
