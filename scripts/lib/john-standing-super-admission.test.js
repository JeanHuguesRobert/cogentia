import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reserveEventSourcedDelegatedBudget} from '../../../inseme/packages/cop-core/src/delegated-budget.js';
import {validateFractalogActRecord} from '../../../inseme/packages/cop-core/src/fractalog.js';
import {createPacketWithInitialContinuation} from '../../../inseme/packages/cop-kernel/src/Cop-kerneltasks.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {RESERVED_ACTIONS} from './john-root-mandate.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {johnStandingMandatePlan} from './jhn-standing-mandate-plan.js';
import {BROWSER_UPLOAD_POLICY} from './jhn-browser-upload-mandate-plan.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {canonicalPayloadHash,buildEffectPayload} from './side-effect-authorization.js';
import {assessStandingSuperEffect,claimStandingSuperEffect} from './john-standing-super-admission.js';
const ref='mandate:jhn:john-root',now=new Date('2026-11-26T12:00:00Z'),owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture-only'},{
 headers:{authorization:'Bearer fixture-only'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
async function fixture({amend=true,steps=2}={}){
 const dir=mkdtempSync(join(tmpdir(),'standing-super-local-'));
 const store=createSqliteCopEventStore(join(dir,'principal.sqlite'));
 assert.equal(recordMandateDeclaration(store,{mandate_id:ref,version:'v7',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
 valid_from:'2026-11-06T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',
 scope:{allowed_actions:['host.process.run','browser.form.upload'],forbidden_actions:[...RESERVED_ACTIONS],
 budget_ceiling:{max_steps:steps},browser_upload_policy:{...BROWSER_UPLOAD_POLICY},standing_operations:[
 {profile:'host.process-general/v1',capability:'host.process.run',target:'node:fracta2',provider:'unix-process',execution_mode:'normal'},
 {profile:'host.process-general/v1',capability:'host.process.run',target:'node:i7-thinkpad-jhr',provider:'windows-ssh',execution_mode:'normal'}]}}).ok,true);
 assert.equal(recordExecutionBudgetGrant(store,{budget_id:'budget:'+ref,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:steps},authority_version:1}).ok,true);
 if(amend){
  const plan=johnStandingMandatePlan({store,at_time:now});assert.equal(plan.next_version,'v8');
  const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
  const authClient={auth:{getUser:async token=>({data:{user:token==='fixture-owner'?{id:owner,email_confirmed_at:now.toISOString(),is_anonymous:false}:null}})}};
  const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>now});
  assert.equal((await workflow.applyAuthenticated({session:{accessToken:'fixture-owner'},mandate:plan.mandate})).ok,true);
 }
 const packetStore=createSqliteCopEventStore(join(dir,'packet.sqlite'));
 const packet_ref='pkt-fixture-administration';
 const primary_store_id='sqlite:fixture-packet';
 const budget_id='budget:'+packet_ref;
 const {packet,continuation}=await createPacketWithInitialContinuation({
   packetId:packet_ref,packetKind:'work',
   placements:[{store_id:primary_store_id,store_kind:'sqlite',
     locator:primary_store_id+'#'+packet_ref,is_primary:true}],
   resumeTo:'handler:fixture',resumeIntent:'test local administration',emit:false
 });
 assert.equal(packetStore.append({topic_id:'packet:'+packet_ref,packet_id:packet_ref,
   payload:{packet,continuation}}).ok,true);
 const parent_ledger=createEventSourcedExecutionBudgetLedger({
   store,budget_id:'budget:'+ref,require_authority_grant:true});
 const delegation=reserveEventSourcedDelegatedBudget({store,child_store:packetStore,
   child_source_ref:primary_store_id+'#'+packet_ref,parent_ledger,child_budget_id:budget_id,
   child_mandate_ref:ref,principal_ref:'principal:jhn',allocation:{max_steps:steps},
   idempotency_key:packet_ref});
 assert.equal(delegation.ok,true,JSON.stringify(delegation));
 const context={store:packetStore,primary_store_id,budget_id,
   allocation_ref:delegation.reservation.reservation_id};
 const request={packet_ref,request_id:'fixture-administrative-act',principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:ref,mandate_version:'v8',
 capability:'host.process.run',target:'node:fracta2',provider:'unix-process',execution_mode:'super',
 command:'sudo -n systemctl restart example.service',timeout_ms:15000,
 purpose:'Fixture service restart',effect_class:'service_installation_configuration_and_deployment',
 recovery_ref:'fixture:restore-service',before_state_hash:'sha256:'+'a'.repeat(64)};
 request.payload_hash=canonicalPayloadHash(buildEffectPayload(request.capability,request,{target:request.target,provider:request.provider}));
 const input={store,auth,request,at_time:now,
  // Explicit synthetic protected-host dependencies. No production issuer,
  // custody, judgment, grant or command execution is simulated as real.
  resolvePacketContext:({packet_ref:id})=>id===packet_ref?context:null,
  verifyProtectedCustody:({store:s})=>s===store,
  verifyIssuer:({mandate,mandate_ref})=>({verified:mandate.version==='v8',principal_ref:'principal:jhn',mandate_ref}),
  verifyIntent:({request:r,payload_hash})=>({allowed:r.command===request.command,effect_class:r.effect_class,payload_hash,evidence_ref:'fixture:judgment'})};
 return {store,packetStore,input,request,context,delegation,close(){packetStore.close();store.close();rmSync(dir,{recursive:true,force:true})}};
}
test('v8 preflight binds exact administrative act without a grant or mutation',async()=>{
 const f=await fixture();try{
  const before=f.store.replay().length,localBefore=f.packetStore.replay().length,r=assessStandingSuperEffect(f.input);
  assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.grant,null);assert.equal(r.executed,false);
  assert.equal(r.payload_hash,f.request.payload_hash);assert.equal(r.mandate_version,'v8');
  assert.equal(r.requires_root_issuance,true);assert.equal(f.store.replay().length,before);assert.equal(f.packetStore.replay().length,localBefore);
 }finally{f.close()}
});
test('requires protected custody, real caller, issuer and exact intent',async()=>{
 const f=await fixture();try{
  const before=f.store.replay().length,localBefore=f.packetStore.replay().length;
  for(const change of [{verifyProtectedCustody:()=>false},{verifyProtectedCustody:undefined},
   {resolvePacketContext:()=>null},{resolvePacketContext:()=>({...f.context,primary_store_id:'sqlite:foreign'})},
   {resolvePacketContext:()=>({...f.context,allocation_ref:'forged'})},{auth:{...auth}},{verifyIssuer:()=>({verified:false})},{verifyIntent:()=>({allowed:true})},
   {verifyIntent:()=>{throw Error('unavailable')}}]){
   assert.equal(assessStandingSuperEffect({...f.input,...change}).ok,false);
  }
  for(const change of [{packet_ref:'pkt-foreign'},{packet_ref:undefined},{target:'node:i7-thinkpad-jhr'},{execution_mode:'normal'},{mandate_version:'v7'},
   {command:'sudo -n true'},{effect_class:'self_authorization_or_mandate_change'},{before_state_hash:'missing'},
   {recovery_ref:''},{actor_ref:'agent:jhn.subagent:other'}]){
   assert.equal(assessStandingSuperEffect({...f.input,request:{...f.request,...change}}).ok,false);
  }
  assert.equal(f.store.replay().length,before);assert.equal(f.packetStore.replay().length,localBefore);
 }finally{f.close()}
});
test('v7, revocation and exhausted budget refuse administrative admission',async()=>{
 const a=await fixture({amend:false}),b=await fixture({steps:1});try{
  assert.equal(assessStandingSuperEffect(a.input).ok,false);
  const ledger=b.delegation.child_ledger;
  assert.equal(ledger.reserve({idempotency_key:'fixture',expected_version:ledger.snapshot().version,demand:{max_steps:1}}).ok,true);
  assert.equal(assessStandingSuperEffect(b.input).error,'budget_exhausted');
  assert.equal(recordMandateControl(b.store,{principal_ref:'principal:jhn',mandate_ref:ref,action:'revoke',reason:'fixture'}).ok,true);
  assert.equal(assessStandingSuperEffect(b.input).ok,false);
 }finally{a.close();b.close()}
});

test('packet-local reservation and FractaLog are atomic; root allocation unchanged',async()=>{
 const f=await fixture({steps:3});try{
  const rootBefore=f.store.replay(),localBefore=f.packetStore.replay().length;
  const r=claimStandingSuperEffect(f.input);
  assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.phase,'PACKET_COP_PREPARED_NOT_ISSUED');
  assert.equal(r.grant,null);assert.equal(r.executed,false);
  assert.equal(r.requires_protected_claim,true);
  const ledger=f.delegation.child_ledger;
  assert.equal(ledger.snapshot().reserved.max_steps,1);
  const entries=f.packetStore.listTopic('packet:'+f.request.packet_ref);
  assert.equal(entries.length,2);assert.equal(entries[1].event_id,r.packet_claim_event_id);
  const log=entries[1].payload;
  assert.equal(validateFractalogActRecord(log).ok,true);
  assert.equal(log.effect.payload_hash,f.request.payload_hash);
  assert.equal(log.effect.before_state_hash,f.request.before_state_hash);
  assert.equal(log.effect.recovery_ref,f.request.recovery_ref);
  assert.equal(log.effect.command,undefined);
  assert.equal(log.authority.budget_reservation_id,r.budget_reservation_id);
  assert.equal(log.trace.packet_ref,f.request.packet_ref);
  assert.deepEqual(entries[1].parent_event_ids,[entries[0].event_id]);
  assert.equal(f.packetStore.auditTopicCommitment('packet:'+f.request.packet_ref).ok,true);
  assert.equal(f.packetStore.replay().length,localBefore+2);
  assert.deepEqual(f.store.replay(),rootBefore);
  assert.equal(claimStandingSuperEffect(f.input).error,'administrative_request_already_reserved');
  assert.equal(ledger.snapshot().reserved.max_steps,1);
  assert.equal(recordMandateControl(f.store,{principal_ref:'principal:jhn',mandate_ref:ref,action:'revoke',reason:'fixture'}).ok,true);
  assert.equal(claimStandingSuperEffect({...f.input,request:{...f.request,request_id:'after-revoke'}}).ok,false);
  assert.equal(ledger.snapshot().reserved.max_steps,1);
 }finally{f.close()}
});

test('failed packet append rolls back its budget reservation without touching root',async()=>{
 const f=await fixture({steps:3});try{
  const rootBefore=f.store.replay(),localBefore=f.packetStore.replay();
  const broken={...f.packetStore,transaction:fn=>f.packetStore.transaction(tx=>fn({
    ...tx,append:e=>e.topic?.id==='packet:'+f.request.packet_ref
      ?{ok:false,error:'fixture_append_failure'}:tx.append(e)
  }))};
  const result=claimStandingSuperEffect({...f.input,resolvePacketContext:()=>({...f.context,store:broken})});
  assert.equal(result.error,'packet_administrative_claim_failed');
  assert.deepEqual(f.packetStore.replay(),localBefore);
  assert.deepEqual(f.store.replay(),rootBefore);
  assert.equal(f.delegation.child_ledger.snapshot().reserved.max_steps,0);
  assert.equal(claimStandingSuperEffect(f.input).ok,true);
 }finally{f.close()}
});
test('several local acts use one allocation; only a summary returns to the parent',async()=>{
 const f=await fixture({steps:3});try{
  const before=f.store.replay();
  for(const request_id of ['first-act','second-act']){
   const r=claimStandingSuperEffect({...f.input,request:{...f.request,request_id}});
   assert.equal(r.ok,true,JSON.stringify(r));
   // Fixture only: settlement stands for a verified outcome, no real effect.
   const ledger=f.delegation.child_ledger;
   assert.equal(ledger.settle({reservation_id:r.budget_reservation_id,
     expected_version:ledger.snapshot().version,usage:{max_steps:1},
     evidence:{fixture:true}}).ok,true);
  }
  assert.deepEqual(f.store.replay(),before);
  const closed=f.delegation.close();
  assert.equal(closed.ok,true,JSON.stringify(closed));
  assert.equal(closed.evidence.kind,'fractalog.local-budget-summary/v1');
  assert.equal(closed.evidence.source_ref,f.context.primary_store_id+'#'+f.request.packet_ref);
  assert.equal(f.store.replay().length,before.length+1);
  assert.equal(f.store.listTopic('packet:'+f.request.packet_ref).length,0);
  const parent=createEventSourcedExecutionBudgetLedger({store:f.store,budget_id:'budget:'+ref,require_authority_grant:true});
  assert.equal(parent.snapshot().settled.max_steps,2);
  assert.equal(parent.snapshot().available.max_steps,1);
  assert.equal(claimStandingSuperEffect({...f.input,request:{...f.request,request_id:'after-close'}}).ok,false);
 }finally{f.close()}
});
