import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const authClient={auth:{getUser:async t=>({data:{user:t==='owner-session'?{id:owner,email_confirmed_at:'2026-11-09T09:00:00Z',is_anonymous:false}:{id:'smoke',email_confirmed_at:'2026-11-09T09:00:00Z'}}})}};
const adminClient={from(t){assert.equal(t,'instances');return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
const scope={allowed_actions:['corpus.read','corpus.search'],forbidden_actions:['gmail.send']};
const mandate={mandate_ref:'mandate:jhn:fixture',principal_ref:'principal:jhn',expected_version:'v1',scope,reason:'A narrow authorized correction'};
function make(now=new Date('2026-11-09T09:00:00Z')){
 const s=createSqliteCopEventStore(':memory:');recordMandateDeclaration(s,{mandate_id:mandate.mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['corpus.read']}});
 const state={now};return {s,state,w:createJhnCanonicalConsentWorkflow({store:s,adminClient,authClient,clock:()=>state.now})};
}
test('authenticated approved exact proposal is single-use; second apply does not change mandate',async()=>{
 const {s,w}=make();try{
  const req=w.request({mandate});assert.equal(req.ok,true,JSON.stringify(req));
  assert.equal(req.grants_mandate_authority,false);
  assert.equal((await w.decide({challenge_id:req.challenge_id,payload_hash:req.payload_hash,session:{accessToken:'smoke-session'},decision:'approve'})).error,'principal_session_unverified');
  assert.equal(w.inspect({challenge_id:req.challenge_id}).status,'pending');
  assert.equal((await w.decide({challenge_id:req.challenge_id,payload_hash:'sha256:'+'0'.repeat(64),session:{accessToken:'owner-session'},decision:'approve'})).error,'proposal_hash_mismatch');
  const confirmed=await w.decide({challenge_id:req.challenge_id,payload_hash:req.payload_hash,session:{accessToken:'owner-session'},decision:'approve'});
  assert.equal(confirmed.ok,true,JSON.stringify(confirmed));assert.equal(confirmed.grants_mandate_authority,false);
  assert.equal(w.inspect({challenge_id:req.challenge_id}).status,'approved');
  const accepted=await w.apply({challenge_id:req.challenge_id,session:{accessToken:'owner-session'}});
  assert.equal(accepted.ok,true,JSON.stringify(accepted));assert.equal(accepted.version,'v2');
  assert.equal(w.inspect({challenge_id:req.challenge_id}).status,'consumed');
  assert.equal((await w.apply({challenge_id:req.challenge_id,session:{accessToken:'owner-session'}})).error,'approved_challenge_required');
  assert.equal((await w.decide({challenge_id:req.challenge_id,payload_hash:req.payload_hash,session:{accessToken:'owner-session'},decision:'approve'})).error,'challenge_not_pending');
  assert.equal(s.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,2);
 }finally{s.close()}
});
test('refusal cannot be applied and does not create a second mandate',async()=>{
 const {s,w}=make();try{
  const r=w.request({mandate});const d=await w.decide({challenge_id:r.challenge_id,payload_hash:r.payload_hash,session:{accessToken:'owner-session'},decision:'refuse'});
  assert.equal(d.ok,true);assert.equal(w.inspect({challenge_id:r.challenge_id}).status,'refused');
  assert.equal((await w.apply({challenge_id:r.challenge_id,session:{accessToken:'owner-session'}})).error,'approved_challenge_required');
  assert.equal(s.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,1);
 }finally{s.close()}
});
test('expired, replay, version-conflict and missing session fail closed',async()=>{
 const {s,w,state}=make();try{
  const a=w.request({mandate,ttl_ms:1000});state.now=new Date('2026-11-09T09:00:02Z');
  assert.equal(w.inspect({challenge_id:a.challenge_id}).status,'expired');
  assert.equal((await w.decide({challenge_id:a.challenge_id,payload_hash:a.payload_hash,session:{accessToken:'owner-session'},decision:'approve'})).error,'challenge_not_pending');
  state.now=new Date('2026-11-09T09:00:00Z');
  const b=w.request({mandate});assert.equal((await w.decide({challenge_id:b.challenge_id,payload_hash:b.payload_hash,session:{accessToken:'owner-session'},decision:'approve'})).ok,true);
  assert.equal((await w.apply({challenge_id:b.challenge_id,session:{accessToken:'smoke-session'}})).error,'principal_authentication_failed');
  recordMandateControl(s,{principal_ref:'principal:jhn',mandate_ref:mandate.mandate_ref,action:'revoke',reason:'Test revocation'});
  const denied=await w.apply({challenge_id:b.challenge_id,session:{accessToken:'owner-session'}});
  assert.equal(denied.error,'mandate_inactive');
  assert.equal(s.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,1);
 }finally{s.close()}
});
