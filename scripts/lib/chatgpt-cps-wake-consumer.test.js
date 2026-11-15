import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {declaredContinuationRecord} from '../../../inseme/packages/cop-core/src/continuation-result.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {COPScheduler} from '../../../inseme/packages/cop-kernel/src/scheduler.js';
import {COPBus} from '../../../inseme/packages/cop-kernel/src/bus.js';
import {recordChatgptReturnWake} from './chatgpt-cps-return-wake.js';
import {consumeChatgptCpsWake,listChatgptCpsWakes} from './chatgpt-cps-wake-consumer.js';
import {runChatgptCpsWakeBatch} from './chatgpt-cps-wake-batch.js';
import {createChatgptCpsLocalWakeReconciler,createReturnScheduler} from './chatgpt-cps-return-evaluator.js';
import {listChatgptCpsNextSteps,consumeChatgptCpsNextStep,runChatgptCpsNextStepBatch} from './chatgpt-cps-next-step.js';
const HANDLER='handler:chatgpt-browser-result-observer';
const BUDGET='budget:mandate:jhn:john-root';
const commit=(store,e)=>assert.equal(store.append(e).ok,true);
const event=(topic,id,payload,event_type='cop.event/v1')=>({
  topic_id:topic,event_type,actor_id:'cop:test',subject_ref:topic,
  visibility:'restricted',epistemic_status:'observed',idempotency_key:id,payload,
});
function addReturned(store,id,candidate_result=null){
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
   candidate_result:candidate_result||{status:'answered',result:{answer:'step '+id}},
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
   assert.equal(drained.parent_packet_completed,false);
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
   max_steps:2,admit:nextActionAdmit,verifyDispatchReceipt:nextActionVerifiedReceipt,
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
  assert.equal(result.parent_packet_completed,false);
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


function addFixtureSignedMandate(store){
 recordMandateDeclaration(store,{
   mandate_id:'mandate:jhn:john-root',version:'v1',
   principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
   valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',
   scope:{allowed_actions:['cogentia.continuation.result.submit'],
     forbidden_actions:['gmail.send','payment.execute']},
 });
}
const fixtureVerifiedIssuer=({mandate_ref})=>({verified:true,
 principal_ref:'principal:jhn',mandate_ref});
function localReconciler(store,verifyIssuer=fixtureVerifiedIssuer,budget_id=BUDGET){
 return createChatgptCpsLocalWakeReconciler({store,
   mandate_ref:'mandate:jhn:john-root',budget_id,verifyIssuer});
}

test('resident local reconciliation reuses COPScheduler after cold restart, no new browser action',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cps-resident-'));
 const file=join(dir,'cop.sqlite');
 try{
   let store=createSqliteCopEventStore(file);
   addFixtureSignedMandate(store);
   addReturned(store,'ctn_resident_replay_01');
   addReturned(store,'ctn_resident_replay_02');
   const replay=localReconciler(store);
   assert.equal((await replay({max_steps:4})).status,'queue_drained');
   assert.equal(store.replay().filter(x=>x.payload?.phase==='handler_completed').length,2);
   assert.deepEqual(listChatgptCpsWakes(store),[]);
   store.close();
   store=createSqliteCopEventStore(file);
   assert.equal((await localReconciler(store)({max_steps:4})).steps_completed,0);
   assert.equal(store.replay().filter(x=>x.payload?.phase==='handler_completed').length,2);
   assert.equal(store.auditCommitments().ok,true);
   store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('resident replay requires current independently verified issuer and non-revoked mandate',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
   addFixtureSignedMandate(store);
   addReturned(store,'ctn_resident_denied_01');
   const denied=await localReconciler(store,()=>({verified:false}))({max_steps:3});
   assert.equal(denied.status,'step_failed');
   assert.equal(denied.steps_completed,0);
   assert.equal(listChatgptCpsWakes(store)[0].status,'pending');
   recordMandateControl(store,{principal_ref:'principal:jhn',
     mandate_ref:'mandate:jhn:john-root',action:'revoke'});
   const revoked=await localReconciler(store)({max_steps:3});
   assert.equal(revoked.steps_completed,0);
   assert.equal(listChatgptCpsWakes(store)[0].status,'pending');
 }finally{store.close()}
});

test('a settlement under another COP budget never admits resident result replay',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
   addFixtureSignedMandate(store);
   addReturned(store,'ctn_resident_budget_mix_01');
   const differentBudget=await localReconciler(store,fixtureVerifiedIssuer,
     'budget:unrelated-mandate')({max_steps:2});
   assert.equal(differentBudget.steps_completed,0);
   assert.equal(differentBudget.status,'step_failed');
   assert.equal(listChatgptCpsWakes(store)[0].status,'pending');
 }finally{store.close()}
});

test('real COPScheduler trusts explicit agent completion and records parent as completed',async()=>{
  const store=createSqliteCopEventStore(':memory:');
  try{
    const id='ctn_judgment_completed_01';
    addReturned(store,id,{status:'answered',result:{answer:'Completed',
      packet_status:'completed'}});
    const result=await consumeChatgptCpsWake({store,continuation_id:id,
      scheduler:createReturnScheduler(),admit});
    assert.equal(result.ok,true);
    assert.equal(result.parent_packet_status,'completed');
    const row=store.eventByIdempotency('chatgpt-browser:'+id+':dispatch-result');
    assert.equal(row.payload.parent_packet_status,'completed');
    assert.equal(row.payload.parent_packet_acceptance_basis,'agent_judgment');
    assert.deepEqual(listChatgptCpsNextSteps(store),[]);
  }finally{store.close()}
});
test('real COPScheduler trusts agent next action but waits for distinct dispatch authority',async()=>{
  const store=createSqliteCopEventStore(':memory:');
  try{
    const id='ctn_judgment_continue_01';
    addReturned(store,id,{status:'answered',result:{answer:'Inspect next input',
      packet_status:'continue',next_action:'inspect-next-source'}});
    const result=await consumeChatgptCpsWake({store,continuation_id:id,
      scheduler:createReturnScheduler(),admit});
    assert.equal(result.ok,true);
    assert.equal(result.parent_packet_status,'open');
    assert.deepEqual(listChatgptCpsNextSteps(store).map(e=>[e.action_id,e.status]),
      [['inspect-next-source','pending_admission']]);
  }finally{store.close()}
});

test('optimistic dispatch trusts the mandated John executor receipt without a redundant verifier',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const id='ctn_optimistic_parent_01';addReturned(store,id);
  assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:scheduler(()=>({status:'continue',next_action:'inspect-source'})),admit})).ok,true);
  let dispatched=0;
  const result=await consumeChatgptCpsNextStep({store,continuation_id:id,
   admit:nextActionAdmit,dispatch:async()=>{dispatched++;return {ok:true,
    child_continuation_id:'ctn_optimistic_child_01',execution_receipt_ref:'john:receipt:1'};}});
  assert.equal(result.status,'child_dispatched');
  assert.equal(dispatched,1);
  const event=store.eventByIdempotency('chatgpt-browser:'+id+':next-step-dispatched');
  assert.equal(event.payload.receipt_basis,'mandated_dispatcher_report');
  assert.equal(event.payload.child_dispatch_evidence_ref,'john:receipt:1');
  assert.equal((await consumeChatgptCpsNextStep({store,continuation_id:id,
   admit:nextActionAdmit,dispatch:()=>{throw Error('should never repeat')}})).status,'already_dispatched');
 }finally{store.close()}
});
test('optimistic batch accepts the mandated dispatcher without extra verifier',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const id='ctn_optimistic_batch_01';addReturned(store,id);
  await consumeChatgptCpsWake({store,continuation_id:id,
   scheduler:scheduler(()=>({status:'continue',next_action:'inspect-source'})),admit});
  const result=await runChatgptCpsNextStepBatch({store,max_steps:2,
   admit:nextActionAdmit,dispatch:async()=>({ok:true,
    child_continuation_id:'ctn_optimistic_batch_child_01',
    execution_receipt_ref:'john:receipt:batch'})});
  assert.equal(result.ok,true);
  assert.equal(result.steps_completed,1);
 }finally{store.close()}
});

test('next-question from an admitted agent result persists as CPS data, without new authority',async()=>{
  const store=createSqliteCopEventStore(':memory:');try{
    const id='ctn_next_question_01';
    addReturned(store,id,{status:'answered',result:{answer:'Continue',
      packet_status:'continue',next_action:'inspect-next',
      next_question:'Inspect the next relevant source'}});
    const r=await consumeChatgptCpsWake({store,continuation_id:id,
      scheduler:createReturnScheduler(),admit});
    assert.equal(r.ok,true);
    const event=store.eventByIdempotency('chatgpt-browser:'+id+':dispatch-result');
    assert.equal(event.payload.next_action_candidate,'inspect-next');
    assert.equal(event.payload.next_action_question_candidate,'Inspect the next relevant source');
  }finally{store.close()}
});

test('legacy parent_mandate_status receipt still produces a CPS next-step candidate',()=>{
  const store=createSqliteCopEventStore(':memory:');
  try{
    const id='ctn_legacy_parent_packet_status_01';
    addReturned(store,id,{status:'answered',result:{answer:'Legacy continue',
      mandate_status:'continue',next_action:'inspect-source'}});
    commit(store,event('continuation:'+id,'chatgpt-browser:'+id+':dispatch-result',{
      profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
      continuation_id:id,parent_mandate_status:'open',
      next_turn_dispatched:false,next_action_admitted:false,
      next_action_candidate:'inspect-source'}));
    assert.deepEqual(listChatgptCpsNextSteps(store).map(e=>e.action_id),
      ['inspect-source']);
  }finally{store.close()}
});

test('blocked cognitive packet is not mistaken for an open mandate',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
  const id='ctn_packet_blocked_01';
  addReturned(store,id,{status:'answered',result:{answer:'Missing input',packet_status:'blocked'}});
  const r=await consumeChatgptCpsWake({store,continuation_id:id,
    scheduler:createReturnScheduler(),admit});
  assert.equal(r.ok,true);
  assert.equal(r.parent_packet_status,'blocked');
  assert.deepEqual(listChatgptCpsNextSteps(store),[]);
 }finally{store.close()}
});
