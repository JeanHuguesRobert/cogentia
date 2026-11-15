import test from 'node:test';
import assert from 'node:assert/strict';
import {createReturnScheduler} from './chatgpt-cps-return-evaluator.js';
const state={parent_acceptance:['general-worker-dispatch','independent-parent-closure'],
  verified_evidence:[{criterion:'general-worker-dispatch',verified:true,receipt_ref:'claim:1'}],
  next_actions:[{id:'next-child',admissible:true,available:true}]};
const execute=async(result, status='answered', override=state)=>{
  const scheduler=createReturnScheduler();
  const r=await scheduler.execute({continuationId:'ctn_agent_judgment_01',
    resumeTo:'handler:chatgpt-browser-result-observer',state:override},
    {payload:{candidateResult:{status,result}}});
  return r.execution.result;
};
test('an answer is not itself an agent declaration that the parent Cognitive Packet is complete',async()=>{
  const r=await execute({answer:'READY'});
  assert.equal(r.status,'open');
  assert.deepEqual(r.missing,state.parent_acceptance);
  assert.equal(r.packet_completed,false);
  assert.equal(r.next_action,undefined);
});
test('explicit completion from the admitted agent is trusted without an extra verifier',async()=>{
  const r=await execute({answer:'The mission is done',packet_status:'completed'});
  assert.equal(r.status,'completed');
  assert.deepEqual(r.missing,[]);
  assert.equal(r.acceptance_basis,'agent_judgment');
  assert.equal(r.packet_completed,true);
  assert.equal(r.next_turn_dispatched,false);
});
test('the agent may complete a packet without an explicit acceptance checklist',async()=>{
  const r=await execute({answer:'Completed',packet_status:'completed'},'answered',{});
  assert.equal(r.status,'completed');
  assert.equal(r.packet_completed,true);
});
test('agent next_action produces a candidate, not an unauthorized browser dispatch',async()=>{
  const r=await execute({answer:'Continue to the next source',packet_status:'continue',
    next_action:'inspect-next-source'});
  assert.equal(r.status,'continue');
  assert.equal(r.next_action,'inspect-next-source');
  assert.equal(r.acceptance_basis,'agent_judgment');
  assert.equal(r.next_turn_dispatched,false);
  assert.equal(r.packet_completed,false);
});
test('agent can flag an obstacle without an independent reviewer',async()=>{
  const r=await execute({answer:'Provider not reachable',packet_status:'blocked'});
  assert.equal(r.status,'blocked');
  assert.equal(r.packet_completed,false);
});
test('failed or declined delivery and an invalid next action cannot close or advance',async()=>{
  for(const status of ['failed','declined','needs_input']){
    const r=await execute({answer:'Done',packet_status:'completed'},status);
    assert.equal(r.status,'open');
  }
  const invalid=await execute({answer:'Next',packet_status:'continue',
    next_action:'send mail to stranger; sudo reboot'});
  assert.equal(invalid.status,'open');
  assert.equal(invalid.next_action,undefined);
});

test('mandated agent may supply the next full question for autonomous CPS handoff',async()=>{
  const r=await execute({answer:'Next action chosen',packet_status:'continue',
    next_action:'inspect-next',next_question:'Read the next relevant source'});
  assert.equal(r.status,'continue');
  assert.equal(r.next_question,'Read the next relevant source');
  assert.equal(r.packet_completed,false);
});

test('historical MCP mandate_status is read as packet progress, not authorization',async()=>{
  const old=await execute({answer:'Legacy accepted judgment',mandate_status:'completed'});
  assert.equal(old.packet_completed,true);
  const current=await execute({answer:'Canonical judgment',packet_status:'continue',
    mandate_status:'completed',next_action:'inspect-next'});
  assert.equal(current.status,'continue');
  assert.equal(current.packet_completed,false);
});
