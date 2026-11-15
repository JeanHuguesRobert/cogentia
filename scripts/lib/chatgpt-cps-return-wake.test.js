import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordChatgptReturnWake} from './chatgpt-cps-return-wake.js';

const budget_id='budget:test-chatgpt-wake';
function fixtures(store,id,{settled=true}={}){
 const res='reservation:'+id;
 const continuation={continuation_id:id,provider:'chatgpt',
   channel:'browser',budget_reservation_id:res};
 const returned={idempotency_key:'result:'+id, payload:{
   profile:'cop.continuation-result/v1',phase:'returned',continuation_id:id}};
 if(settled)assert.equal(store.append({
   topic_id:'execution-budget:'+budget_id,
   event_type:'ExecutionBudgetSettlement',
   actor_id:'cop:test',subject_ref:res,visibility:'restricted',
   epistemic_status:'observed',idempotency_key:'settlement:'+id,
   payload:{reservation_id:res,usage:{max_steps:1}},
 }).ok,true);
 return {store,continuation,returned,budget_id};
}

test('no next-turn wake without real settlement or returned event',()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
   const args=fixtures(store,'unpaid',{settled:false});
   assert.equal(recordChatgptReturnWake(args).error,'settlement_required');
   assert.equal(recordChatgptReturnWake({...args,
     returned:{...args.returned,payload:{...args.returned.payload,phase:'observed'}}}).error,'canonical_return_required');
   assert.equal(recordChatgptReturnWake({...args,continuation:{...args.continuation,channel:'web'}}).ok,false);
   assert.equal(store.listTopic('continuation:unpaid').length,0);
 }finally{store.close()}
});

test('three independently returned continuations survive replay without extra wake',()=>{
 const store=createSqliteCopEventStore(':memory:');
 try{
   const ids=['first','second','third'];
   for(const id of ids){
     const args=fixtures(store,id);
     const first=recordChatgptReturnWake(args);
     assert.equal(first.ok,true);
     assert.equal(first.duplicate,false);
     const replay=recordChatgptReturnWake(args);
     assert.equal(replay.ok,true);
     assert.equal(replay.duplicate,true);
     const events=store.listTopic('continuation:'+id)
       .filter(e=>e.payload?.profile==='cop.continuation-scheduler-wake/v1');
     assert.equal(events.length,1);
     assert.equal(events[0].payload.dispatch_permitted,false);
     assert.equal(events[0].payload.parent_packet_status,'open');
     assert.equal(events[0].payload.returned_receipt_ref,'result:'+id);
   }
 }finally{store.close()}
});
