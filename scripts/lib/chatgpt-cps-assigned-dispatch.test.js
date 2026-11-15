import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {declaredContinuationRecord} from '../../../inseme/packages/cop-core/src/continuation-result.js';
import {EventStorePacketClaimCoordinator} from '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {runChatgptCpsResidentCycle} from '../ops/ona-chatgpt-cps-reconcile.mjs';
import {buildAssignedChatgptCpsPrompt,listAssignedChatgptCpsContinuations,dispatchAssignedChatgptCpsContinuation,
  runAssignedChatgptCpsBatch} from './chatgpt-cps-assigned-dispatch.js';
const BUDGET='budget:mandate:jhn:john-root';
const permit=async()=>({granted:true,provider_permitted:true,budget_admitted:true,
  authorization_ref:'cop:mandate:v4',provider_permission_receipt_ref:'cop:provider:authorized',
  budget_authorization_ref:'cop:budget:reserved'});
const decline=async()=>({granted:false});
const send=async({continuation_id})=>({ok:true,submitted:true,continuation_id,
  execution_receipt_ref:'john:ui-click:'+continuation_id});
async function assigned(store,id,{mode='cps:assigned-browser-turn/v1',channel='browser'}={}){
  const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:BUDGET,
    limits:{max_steps:20},require_authority_grant:false});
  const reserved=ledger.reserve({idempotency_key:'assigned:'+id,
    expected_version:ledger.snapshot().version,demand:{max_steps:1}});
  assert.equal(reserved.ok,true,JSON.stringify(reserved));
  const packet_ref='packet:'+id;
  const coordinator=new EventStorePacketClaimCoordinator({store});
  const claim=await coordinator.tryClaim({packetRef:packet_ref,
    handlerRef:'agent:jhn',ttlMs:600000});
  assert.equal(claim.ok,true,JSON.stringify(claim));
  const c={continuation_id:id,packet_ref,version:1,attempt_id:'a1',
    execution_binding_ref:'binding:'+id,lifecycle:'suspended',
    correlation:{challenge:'c-1'},budget_reservation_id:reserved.reservation.reservation_id,
    claim:{claim_id:claim.claim.claim_id,epoch:claim.claim.epoch},
    provider:'chatgpt',channel,resumeTo:'handler:chatgpt-browser-result-observer',
    expected_result:{schema:'cogentia.step_result/v1'},
    state:{dispatch_mode:mode,question:'Please examine the assigned source safely'},
  };
  assert.equal(store.append(declaredContinuationRecord(c)).ok,true);
  return c;
}

test('only explicitly routed continuations are eligible, never historical tests',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  await assigned(s,'ctn_assigned_good_01');
  await assigned(s,'ctn_assigned_historical_01',{mode:null});
  await assigned(s,'ctn_assigned_other_01',{channel:'mcp'});
  assert.deepEqual(listAssignedChatgptCpsContinuations(s).map(e=>e.continuation_id),
    ['ctn_assigned_good_01']);
  assert.equal((await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:'ctn_assigned_historical_01',admit:permit,dispatch:send})).status,
    'assigned_continuation_missing');
 }finally{s.close()}
});
test('explicitly admitted first delivery has a durable single receipt, not a model answer',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const id='ctn_assigned_first_01';await assigned(s,id);
  let invoked=0;
  const rejected=await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:id,admit:decline,dispatch:send});
  assert.equal(rejected.status,'not_admitted');
  const accepted=await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:id,admit:permit,dispatch:async p=>{invoked++;return send(p)}});
  assert.equal(accepted.status,'dispatched_awaiting_mcp_return');
  assert.equal(invoked,1);
  assert.deepEqual(listAssignedChatgptCpsContinuations(s),[]);
  assert.equal(s.listTopic('continuation:'+id).filter(x=>x.payload?.profile==='cop.continuation-browser-dispatch/v1').length,2);
  assert.equal((await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:id,admit:permit,dispatch:async()=>{invoked++;return null}})).ok,false);
  assert.equal(invoked,1);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});
test('unconfirmed UI effect is not replayed after a cold restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cps-assigned-'));
 const file=join(dir,'journal.sqlite');let s;
 try{
  s=createSqliteCopEventStore(file);const id='ctn_assigned_crash_01';await assigned(s,id);
  let attempts=0;
  assert.equal((await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:id,admit:permit,dispatch:async()=>{attempts++;throw Error('timeout')}})).status,
    'needs_reconciliation');
  s.close();s=createSqliteCopEventStore(file);
  assert.deepEqual(listAssignedChatgptCpsContinuations(s).map(x=>x.status),['needs_reconciliation']);
  assert.equal((await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:id,admit:permit,dispatch:async()=>{attempts++;return send({continuation_id:id})}})).status,
    'needs_reconciliation');
  assert.equal(attempts,1);
 }finally{s?.close();rmSync(dir,{recursive:true,force:true})}
});
test('expired claim and settled reservation prevent even admission or send',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const id='ctn_assigned_stale_01';const c=await assigned(s,id);
  let admitted=0;
  const a=await dispatchAssignedChatgptCpsContinuation({store:s,continuation_id:id,
    now:new Date(Date.now()+3600000),admit:async()=>{admitted++;return permit()},dispatch:send});
  assert.equal(a.status,'stale_claim_or_budget');
  assert.equal(admitted,0);
  const ledger=createEventSourcedExecutionBudgetLedger({store:s,budget_id:BUDGET,
    limits:{max_steps:20},require_authority_grant:false});
  const settled=ledger.settle({reservation_id:c.budget_reservation_id,
    expected_version:ledger.snapshot().version,usage:{max_steps:1}});
  assert.equal(settled.ok,true);
  assert.equal((await dispatchAssignedChatgptCpsContinuation({store:s,
    continuation_id:id,admit:permit,dispatch:send})).status,'stale_claim_or_budget');
 }finally{s.close()}
});
test('three assigned continuations use the existing bounded mandate driver, no duplicate sends',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  for(let i=1;i<=3;i++)await assigned(s,'ctn_assigned_batch_0'+i);
  let sent=0;
  const batch=await runAssignedChatgptCpsBatch({store:s,max_steps:3,admit:permit,
    dispatch:async input=>{sent++;return send(input)}});
  assert.equal(batch.ok,true,JSON.stringify(batch));
  assert.equal(sent,3);
  assert.equal(batch.steps_completed,3);
  assert.equal((await runAssignedChatgptCpsBatch({store:s,max_steps:3,
    admit:permit,dispatch:async()=>{sent++;throw Error('replayed')}})).status,'queue_drained');
  assert.equal(sent,3);
 }finally{s.close()}
});

const noWakes=async()=>({ok:true,status:'queue_drained',steps_completed:0,
  pending_count:0,needs_reconciliation:0});
test('resident ONA cycle sees assigned work but never sends without explicit dispatch enable',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  await assigned(s,'ctn_resident_opt_in_01');
  let sent=0;
  const disabled=await runChatgptCpsResidentCycle({store:s,reconcile:noWakes,
    env:{},assignedWorker:{admit:permit,dispatch:async x=>{sent++;return send(x)}}});
  assert.equal(disabled.ok,true);
  assert.equal(disabled.pending_assigned,1);
  assert.equal(sent,0);
  const notConfigured=await runChatgptCpsResidentCycle({store:s,
    reconcile:noWakes,env:{COGENTIA_CPS_BROWSER_DISPATCH_ENABLED:'1'}});
  assert.equal(notConfigured.status,'governed_browser_dispatcher_not_configured');
  assert.equal(sent,0);
  assert.equal(listAssignedChatgptCpsContinuations(s).length,1);
 }finally{s.close()}
});
test('existing resident ONA cycle dispatches admitted work once, no second scheduler',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  await assigned(s,'ctn_resident_send_01');
  let sent=0;
  const inputs={store:s,reconcile:noWakes,
    env:{COGENTIA_CPS_BROWSER_DISPATCH_ENABLED:'1'},
    assignedWorker:{admit:permit,dispatch:async x=>{sent++;return send(x)}}};
  const result=await runChatgptCpsResidentCycle(inputs);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.status,'dispatched_awaiting_return');
  assert.equal(result.pending_assigned,0);
  assert.equal(sent,1);
  const replay=await runChatgptCpsResidentCycle(inputs);
  assert.equal(replay.ok,true);
  assert.equal(sent,1);
 }finally{s.close()}
});
test('resident ONA handles existing next-action bridge under the same cycle',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const id='ctn_resident_next_action_01';
  const topic='continuation:'+id;
  const add=(key,payload)=>s.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:topic,idempotency_key:key,
    visibility:'restricted',epistemic_status:'observed',payload});
  assert.equal(add('return:'+id,{profile:'cop.continuation-result/v1',
    continuation_id:id,phase:'returned'}).ok,true);
  assert.equal(add('wake:'+id,{profile:'cop.continuation-scheduler-wake/v1',
    continuation_id:id,returned_receipt_ref:'return:'+id}).ok,true);
  assert.equal(add('chatgpt-browser:'+id+':dispatch-attempt',{profile:'cop.continuation-dispatch/v1',
    phase:'intent_committed',continuation_id:id}).ok,true);
  assert.equal(add('chatgpt-browser:'+id+':dispatch-result',{profile:'cop.continuation-dispatch/v1',
    phase:'handler_completed',continuation_id:id,parent_packet_status:'open',
    next_turn_dispatched:false,next_action_admitted:false,next_action_candidate:'inspect-child'}).ok,true);
  let calls=0;
  const result=await runChatgptCpsResidentCycle({store:s,reconcile:noWakes,
    env:{COGENTIA_CPS_BROWSER_DISPATCH_ENABLED:'1'},nextWorker:{
    admit:async({action_id})=>({granted:true,action_id,
      authorization_ref:'cop:mandate:v4',provider_permitted:true,
      budget_admitted:true,provider_permission_receipt_ref:'cop:provider:allowed',
      budget_authorization_ref:'cop:budget:authorized'}),
    dispatch:async()=>{calls++;return {ok:true,
      child_continuation_id:'ctn_resident_next_child_01',
      execution_receipt_ref:'john:child:receipt'}}}});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.status,'dispatched_awaiting_return');
  assert.equal(result.pending_next_actions,0);
  assert.equal(calls,1);
 }finally{s.close()}
});

test('CPS source recipe carries real packet question and exact return binding, never a fixed fake READY',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const c=await assigned(s,'ctn_bound_prompt_01');
  const built=buildAssignedChatgptCpsPrompt(c);
  assert.equal(built.ok,true);
  assert.equal(built.prompt.includes(c.state.question),true);
  assert.equal(built.prompt.includes(c.execution_binding_ref),true);
  assert.equal(built.prompt.includes(c.correlation.challenge),true);
  assert.equal(built.prompt.includes('cogentia_continuation_result_submit'),true);
  assert.equal(built.prompt.includes('packet_status'),true);
  assert.equal(built.prompt.length<=6000,true);
  assert.equal(buildAssignedChatgptCpsPrompt({...c,correlation:{challenge:''}}).ok,false);
  assert.equal(buildAssignedChatgptCpsPrompt({...c,state:{...c.state,
    question:'x'.repeat(5500)}}).ok,false);
 }finally{s.close()}
});
