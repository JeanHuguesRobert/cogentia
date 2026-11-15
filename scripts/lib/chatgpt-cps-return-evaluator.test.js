import test from 'node:test';
import assert from 'node:assert/strict';
import {createReturnScheduler} from './chatgpt-cps-return-evaluator.js';
const state={parent_acceptance:['general-worker-dispatch','independent-parent-closure'],
  verified_evidence:[
    {criterion:'general-worker-dispatch',verified:true,receipt_ref:'cop:dispatch:1'},
    {criterion:'independent-parent-closure',verified:true,receipt_ref:'cop:parent:1'},
  ],next_actions:[{id:'next-child',admissible:true,available:true}]};
const execute=async(scheduler,override=state)=>{
  const r=await scheduler.execute({continuationId:'ctn_evidence_01',
    resumeTo:'handler:chatgpt-browser-result-observer',
    state:override},{payload:{candidateResult:{status:'completed'}}});
  return r.execution.result;
};
test('untrusted continuation evidence and next_actions cannot complete or advance parent',async()=>{
  const r=await execute(createReturnScheduler());
  assert.equal(r.status,'open');
  assert.deepEqual(r.missing,state.parent_acceptance);
  assert.equal(r.next_action,undefined);
  assert.equal(r.mandate_completed,false);
  assert.equal(r.next_turn_dispatched,false);
});
test('independent receipt verifier must match BOTH criterion and receipt, not a model boolean',async()=>{
  const r=await execute(createReturnScheduler({
    verifyAcceptanceReceipt:async({criterion,receipt_ref})=>({verified:true,
      criterion:criterion==='general-worker-dispatch'?criterion:'other',
      receipt_ref,issuer_ref:'cop:independent-receipt-verifier'}),
  }));
  assert.equal(r.status,'open');
  assert.deepEqual(r.missing,['independent-parent-closure']);
});
test('verified acceptance still does not certify independent mission closure automatically',async()=>{
  const r=await execute(createReturnScheduler({
    verifyAcceptanceReceipt:async({criterion,receipt_ref})=>({verified:true,criterion,
      receipt_ref,issuer_ref:'cop:independent-receipt-verifier'}),
  }));
  assert.equal(r.status,'completed');
  assert.deepEqual(r.missing,[]);
  assert.equal(r.mandate_completed,false);
  assert.equal(r.next_turn_dispatched,false);
});
test('unverified next-step hints cannot launch child; explicit admission yields candidate only',async()=>{
  const r=await execute(createReturnScheduler({
    admitNextAction:async({action_id})=>({action_id,admissible:true,
      available:true,authorization_ref:'cop:admission-receipt'}),
  }));
  assert.equal(r.status,'continue');
  assert.equal(r.next_action,'next-child');
  assert.equal(r.next_turn_dispatched,false);
  assert.equal(r.mandate_completed,false);
});
test('malformed claims and verifier exception fail closed',async()=>{
  const r=await execute(createReturnScheduler({
    verifyAcceptanceReceipt:()=>{throw Error('issuer offline');},
    admitNextAction:()=>{throw Error('quota offline');},
  }));
  assert.equal(r.status,'open');
  assert.equal(r.mandate_completed,false);
});
