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
   for(const id of ids){
     assert.deepEqual(listChatgptCpsWakes(store).filter(x=>x.status==='pending').map(x=>x.continuation_id),[id]);
     const output=await consumeChatgptCpsWake({store,continuation_id:id,scheduler:existingScheduler,admit});
     assert.equal(output.status,'handler_completed',JSON.stringify(output));
     assert.equal(output.result?.status,id===ids[2]?'completed':'continue');
     assert.equal((await consumeChatgptCpsWake({store,continuation_id:id,scheduler:existingScheduler,admit})).status,'already_processed');
   }
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
