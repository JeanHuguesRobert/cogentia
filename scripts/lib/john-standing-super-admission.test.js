import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
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
 const store=createSqliteCopEventStore(':memory:');
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
 const request={request_id:'fixture-administrative-act',principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:ref,mandate_version:'v8',
 capability:'host.process.run',target:'node:fracta2',provider:'unix-process',execution_mode:'super',
 command:'sudo -n systemctl restart example.service',timeout_ms:15000,
 purpose:'Fixture service restart',effect_class:'service_installation_configuration_and_deployment',
 recovery_ref:'fixture:restore-service',before_state_hash:'sha256:'+'a'.repeat(64)};
 request.payload_hash=canonicalPayloadHash(buildEffectPayload(request.capability,request,{target:request.target,provider:request.provider}));
 const input={store,auth,request,at_time:now,
  // Explicit synthetic protected-host dependencies. No production issuer,
  // custody, judgment, grant or command execution is simulated as real.
  verifyProtectedCustody:({store:s})=>s===store,
  verifyIssuer:({mandate,mandate_ref})=>({verified:mandate.version==='v8',principal_ref:'principal:jhn',mandate_ref}),
  verifyIntent:({request:r,payload_hash})=>({allowed:r.command===request.command,effect_class:r.effect_class,payload_hash,evidence_ref:'fixture:judgment'})};
 return {store,input,request};
}
test('v8 preflight binds exact administrative act without a grant or mutation',async()=>{
 const f=await fixture();try{
  const before=f.store.replay().length,r=assessStandingSuperEffect(f.input);
  assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.grant,null);assert.equal(r.executed,false);
  assert.equal(r.payload_hash,f.request.payload_hash);assert.equal(r.mandate_version,'v8');
  assert.equal(r.requires_root_issuance,true);assert.equal(f.store.replay().length,before);
 }finally{f.store.close()}
});
test('requires protected custody, real caller, issuer and exact intent',async()=>{
 const f=await fixture();try{
  const before=f.store.replay().length;
  for(const change of [{verifyProtectedCustody:()=>false},{verifyProtectedCustody:undefined},
   {auth:{...auth}},{verifyIssuer:()=>({verified:false})},{verifyIntent:()=>({allowed:true})},
   {verifyIntent:()=>{throw Error('unavailable')}}]){
   assert.equal(assessStandingSuperEffect({...f.input,...change}).ok,false);
  }
  for(const change of [{target:'node:i7-thinkpad-jhr'},{execution_mode:'normal'},{mandate_version:'v7'},
   {command:'sudo -n true'},{effect_class:'self_authorization_or_mandate_change'},{before_state_hash:'missing'},
   {recovery_ref:''},{actor_ref:'agent:jhn.subagent:other'}]){
   assert.equal(assessStandingSuperEffect({...f.input,request:{...f.request,...change}}).ok,false);
  }
  assert.equal(f.store.replay().length,before);
 }finally{f.store.close()}
});
test('v7, revocation and exhausted budget refuse administrative admission',async()=>{
 const a=await fixture({amend:false}),b=await fixture({steps:1});try{
  assert.equal(assessStandingSuperEffect(a.input).ok,false);
  const ledger=createEventSourcedExecutionBudgetLedger({store:b.store,budget_id:'budget:'+ref,require_authority_grant:true});
  assert.equal(ledger.reserve({idempotency_key:'fixture',expected_version:ledger.snapshot().version,demand:{max_steps:1}}).ok,true);
  assert.equal(assessStandingSuperEffect(b.input).error,'budget_exhausted');
  assert.equal(recordMandateControl(b.store,{principal_ref:'principal:jhn',mandate_ref:ref,action:'revoke',reason:'fixture'}).ok,true);
  assert.equal(assessStandingSuperEffect(b.input).ok,false);
 }finally{a.store.close();b.store.close()}
});

test('one standing claim reserves one step, persists correlated evidence and cannot replay',async()=>{
 const f=await fixture({steps:3});try{
  const r=claimStandingSuperEffect(f.input);
  assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.phase,'COP_CLAIMED_NOT_ISSUED');
  assert.equal(r.grant,null);assert.equal(r.executed,false);
  const ledger=createEventSourcedExecutionBudgetLedger({store:f.store,budget_id:'budget:'+ref,require_authority_grant:true});
  assert.equal(ledger.snapshot().reserved.max_steps,1);
  const entries=f.store.listTopic('privileged-issuer:'+r.budget_reservation_id);
  assert.equal(entries.length,1);assert.equal(entries[0].event_id,r.claim_event_id);
  assert.equal(entries[0].payload.effect_hash,f.request.payload_hash);
  assert.equal(entries[0].payload.before_state_hash,f.request.before_state_hash);
  assert.equal(entries[0].payload.recovery_ref,f.request.recovery_ref);
  assert.equal(entries[0].payload.command,undefined);
  assert.equal(claimStandingSuperEffect(f.input).error,'administrative_request_already_reserved');
  assert.equal(ledger.snapshot().reserved.max_steps,1);
  assert.equal(recordMandateControl(f.store,{principal_ref:'principal:jhn',mandate_ref:ref,action:'revoke',reason:'fixture'}).ok,true);
  assert.equal(claimStandingSuperEffect({...f.input,request:{...f.request,request_id:'after-revoke'}}).ok,false);
  assert.equal(ledger.snapshot().reserved.max_steps,1);
 }finally{f.store.close()}
});
