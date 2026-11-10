import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const authClient={auth:{getUser:async token=>({data:{user:{id:token==='AUTH'?uuid:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email_confirmed_at:'2026-11-09T00:00:00Z'}}})}};
const adminClient={from(){return{select(){return{eq(){return{single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:uuid}})}}}}}}};
const mandate_ref='mandate:jhn:john-root';
function create(){const store=createSqliteCopEventStore(':memory:');
 recordMandateDeclaration(store,{mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['browser.hosted.inspect']},valid_until:'2027-11-06T00:00:00Z'});
 const state={time:new Date('2026-11-10T02:20:00Z')};
 return {store,state,flow:createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>state.time})};}
test('ratifying an EXISTING real-structured mandate records a decision and cannot ever amend or grant it',async()=>{
 const {store,flow}=create();try{
  const before=store.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length;
  const asked=flow.requestRatification({mandate_ref});assert.equal(asked.ok,true,JSON.stringify(asked));
  assert.equal(asked.proposal.version,'v1');assert.equal(asked.proposal.amendment,false);
  assert.equal(asked.proposal.scope.allowed_actions[0],'browser.hosted.inspect');
  assert.equal((await flow.decide({challenge_id:asked.challenge_id,payload_hash:asked.payload_hash,decision:'approve',session:{accessToken:'OTHER'}})).error,'principal_session_unverified');
  const accepted=await flow.decide({challenge_id:asked.challenge_id,payload_hash:asked.payload_hash,decision:'approve',session:{accessToken:'AUTH'}});
  assert.equal(accepted.ok,true,JSON.stringify(accepted));assert.equal(accepted.grants_mandate_authority,false);
  assert.equal(flow.inspect({challenge_id:asked.challenge_id}).status,'approved');
  assert.equal((await flow.apply({challenge_id:asked.challenge_id,session:{accessToken:'AUTH'}})).error,'ratification_never_grants_mandate');
  assert.equal(store.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,before);
  assert.equal((await flow.decide({challenge_id:asked.challenge_id,payload_hash:asked.payload_hash,decision:'refuse',session:{accessToken:'AUTH'}})).error,'challenge_not_pending');
 }finally{store.close()}
});
test('ratification refuses stale revoked or superseded current mandate',async()=>{
 const {store,flow}=create();try{
  const r=flow.requestRatification({mandate_ref});
  recordMandateControl(store,{principal_ref:'principal:jhn',mandate_ref,action:'revoke',reason:'fixture revoke'});
  assert.equal((await flow.decide({challenge_id:r.challenge_id,payload_hash:r.payload_hash,decision:'approve',session:{accessToken:'AUTH'}})).error,'ratification_mandate_changed');
  assert.equal(store.replay().filter(e=>e.payload?.kind==='PrincipalConsentApproved').length,0);
 }finally{store.close()}
});
test('ratification creates no new grant or mandate even if refused',async()=>{
 const {store,flow}=create();try{
  const r=flow.requestRatification({mandate_ref});
  const d=await flow.decide({challenge_id:r.challenge_id,payload_hash:r.payload_hash,decision:'refuse',session:{accessToken:'AUTH'}});
  assert.equal(d.ok,true);assert.equal(flow.inspect({challenge_id:r.challenge_id}).status,'refused');
  const events=store.replay();assert.equal(events.filter(e=>e.payload?.kind==='MandateDeclaration').length,1);
  assert.equal(events.filter(e=>e.payload?.kind==='ExecutionBudgetGrant').length,0);
  assert.equal(events.filter(e=>e.payload?.kind==='PrincipalConsentRefused').length,1);
 }finally{store.close()}
});
