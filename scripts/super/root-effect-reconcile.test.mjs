import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {reconcileCompletedEffect,reconcileRootEffect,projectCompletedPacketEffect,readRootPacketEffectReceipt} from './root-effect-reconcile.mjs';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'cop-receipt-'));
 const store=createSqliteCopEventStore(join(dir,'cop.sqlite'));
 const mandate_ref='mandate:jhn:maintenance',budget_id='budget:'+mandate_ref;
 recordMandateDeclaration(store,{mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['host.process.run']}});
 recordExecutionBudgetGrant(store,{budget_id,mandate_ref,principal_ref:'principal:jhn',limits:{max_steps:12}});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id,require_authority_grant:true});
 const reserved=ledger.reserve({idempotency_key:'once',expected_version:ledger.snapshot().version,demand:{max_steps:1}});
 assert.equal(reserved.ok,true);
 const id=reserved.reservation.reservation_id;
 const claim=store.append({event_type:'PrivilegedEffectClaim',topic:{id:`privileged-issuer:${id}`,seq:1},epistemic_status:'normative',visibility:'restricted',payload:{kind:'PrivilegedEffectClaim',effect_hash:'sha256:exact'}});
 assert.equal(claim.ok,true);
 const authorization_id='sea_4944ba77-7140-4bbd-af6c-278bb0030704';
 const grant={authorization_id,consumed_at:'2026-11-07T08:53:35Z',authority_origin:'principal',single_use:true,action_class:'host.process.run',principal:'principal:jhn',actor:'agent:jhn',mandate_ref,budget_reservation_id:id,payload_hash:'sha256:exact',provenance:{cop_claim_event_id:claim.event.event_id}};
 const logEntries=[{event:'cop_reserve',authorization_id,payload_hash:'sha256:exact',at:'2026-11-07T08:53:35Z'}, {event:'effect_result',authorization_id,payload_hash:'sha256:exact',ok:true,exit_code:0,timeout:false,at:'2026-11-07T08:53:38Z'}];
 return {dir,store,grant,logEntries,authorization_id,budget_id,id};
}
test('settles exactly once on root-consumed + matched result and claim, never releases/replays',()=>{
 const f=fixture();try{
  const result=reconcileCompletedEffect(f);assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.phase,'COP_EFFECT_SETTLED');assert.equal(result.grants_authority,false);
  const again=reconcileCompletedEffect(f);assert.equal(again.ok,true);assert.equal(again.duplicate,true);
  const events=f.store.listTopic('execution-budget:'+f.budget_id);
  assert.equal(events.filter(x=>x.event_type==='ExecutionBudgetSettlement').length,1);
  const ledger=createEventSourcedExecutionBudgetLedger({store:f.store,budget_id:f.budget_id,require_authority_grant:true});
  assert.equal(ledger.snapshot().settled.max_steps,1);
 }finally{f.store.close();rmSync(f.dir,{recursive:true,force:true});}
});
test('fails closed when grant not consumed, forged receipt, missing claim or result',()=>{
 for(const mutation of [f=>delete f.grant.consumed_at,
  f=>f.logEntries.pop(),f=>f.logEntries[1].payload_hash='sha256:forged',
  f=>f.logEntries.push({...f.logEntries[1]}),f=>f.grant.provenance.cop_claim_event_id='wrong']){
  const f=fixture();try{mutation(f);assert.equal(reconcileCompletedEffect(f).ok,false);}finally{f.store.close();rmSync(f.dir,{recursive:true,force:true});}
 }
});
test('normal context cannot read or alter root COP journal',()=>{
 if(process.geteuid?.()!==0)assert.equal(reconcileRootEffect({authorization_id:'sea_4944ba77-7140-4bbd-af6c-278bb0030704'}).error,'root_required');
});


function packetFixture(){
 const f=fixture();
 const grant={...f.grant,authority_origin:'verified_mission',
   mandate_ref:'mandate:jhn:john-root',mandate_version:'v8',
   budget_reservation_id:'reservation:budget:pkt-test:one',
   payload_hash:'sha256:'+'a'.repeat(64),target:{node:'node:fracta2'},
   provenance:{packet_ref:'pkt-test',packet_claim_event_id:'packet-claim-test'}};
 const claim=f.store.append({event_type:'PrivilegedEffectClaim',topic:{id:'privileged-issuer:'+grant.budget_reservation_id,seq:1},
  epistemic_status:'normative',payload:{kind:'PrivilegedEffectClaim',verification:'verified_standing_mandate',
   mandate_version:grant.mandate_version,budget_reservation_id:grant.budget_reservation_id,effect_hash:grant.payload_hash,
   packet_ref:grant.provenance.packet_ref,packet_claim_event_id:grant.provenance.packet_claim_event_id,
   target:grant.target.node,principal_ref:grant.principal,actor_ref:grant.actor,
   before_state_hash:'sha256:'+'b'.repeat(64)}});
 assert.equal(claim.ok,true);
 grant.provenance.cop_claim_event_id=claim.event.event_id;
 const logEntries=f.logEntries.map(e=>({...e,payload_hash:grant.payload_hash}));
 logEntries.push({event:'effect_state_observed',authorization_id:grant.authorization_id,payload_hash:grant.payload_hash,
   packet_claim_event_id:grant.provenance.packet_claim_event_id,target:grant.target.node,
   before_state_hash:'sha256:'+'b'.repeat(64),after_state_hash:'sha256:'+'c'.repeat(64),
   evidence_ref:'fixture:node-local-observation',at:'2026-11-07T08:53:39Z',stdout:'not-for-packet'});
 return {...f,grant,logEntries};
}
test('node-local packet receipt is a deterministic projection, not a second ledger',()=>{
 const f=packetFixture();try{
  const before=f.store.replay();
  const r=projectCompletedPacketEffect(f);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.verified,true);assert.equal(r.grants_authority,false);
  assert.equal(r.receipt.packet_ref,'pkt-test');
  assert.equal(r.receipt.packet_claim_event_id,'packet-claim-test');
  assert.equal(r.receipt.before_state_hash,'sha256:'+'b'.repeat(64));
  assert.equal(r.receipt.after_state_hash,'sha256:'+'c'.repeat(64));
  assert.equal(r.receipt.stdout,undefined);
  assert.deepEqual(projectCompletedPacketEffect(f),r);
  assert.deepEqual(f.store.replay(),before);
 }finally{f.store.close();rmSync(f.dir,{recursive:true,force:true});}
});
test('node projection refuses mismatches and refuses to infer postconditions from exit status',()=>{
 for(const mutate of [
   f=>delete f.grant.consumed_at,
   f=>f.grant.authority_origin='principal',
   f=>f.grant.provenance.packet_claim_event_id='wrong',
   f=>f.grant.provenance.cop_claim_event_id='wrong',
   f=>f.logEntries.pop(),
   f=>f.logEntries[2].after_state_hash='unobserved',
   f=>f.logEntries[2].before_state_hash='sha256:'+'d'.repeat(64),
   f=>f.logEntries[2].at='2026-11-07T08:53:34Z',
   f=>f.logEntries[1].at='invalid',
   f=>f.logEntries.push({...f.logEntries[1]}),
   f=>f.logEntries[1].payload_hash='sha256:'+'e'.repeat(64),
   f=>f.logEntries[1].exit_code=1]){
  const f=packetFixture();try{
   mutate(f);assert.equal(projectCompletedPacketEffect(f).ok,false);
  }finally{f.store.close();rmSync(f.dir,{recursive:true,force:true});}
 }
});
test('ordinary shell cannot invoke the protected receipt reader',()=>{
 if(process.geteuid?.()!==0)
   assert.equal(readRootPacketEffectReceipt({authorization_id:'sea_4944ba77-7140-4bbd-af6c-278bb0030704'}).error,'root_required');
});
