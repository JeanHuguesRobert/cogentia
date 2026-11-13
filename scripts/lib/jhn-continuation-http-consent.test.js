import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration,resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {createJhnConsentHttpHandler} from './jhn-consent-http-handler.js';
const origin='https://jhn.baronsmariani.org',owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
const authClient={auth:{getUser:async token=>({data:{user:token==='principal-live-session'?{id:owner,email_confirmed_at:'2026-11-13T10:00:00Z',is_anonymous:false}:null}})}};
function fixture(){
 const store=createSqliteCopEventStore(':memory:');
 const ref='mandate:jhn:john-root';
 recordMandateDeclaration(store,{mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
  valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:['browser.hosted.inspect'],
    forbidden_actions:['communication.send'],budget_ceiling:{max_steps:10}}});
 const plan=()=>{const current=resolveMandate(store,ref); if(current.scope.allowed_actions.includes('continuation.resolve'))
   return {ok:true,already_authorized_in_scope:true};
  return {ok:true,requires_owner_consent:true,mandate_ref:ref,previous_version:current.version,
   mandate:{mandate_ref:ref,principal_ref:'principal:jhn',expected_version:current.version,
   reason:'exact continuation only',valid_from:current.valid_from,valid_until:current.valid_until,
   scope:{...structuredClone(current.scope),allowed_actions:[...current.scope.allowed_actions,'continuation.resolve']}}};};
 const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>new Date('2026-11-13T10:00:00Z')});
 const handler=createJhnConsentHttpHandler({workflow,origin,exactContinuationAmendmentPlan:plan,
  requestExactContinuationConsent:async()=>{const result=workflow.request({mandate:plan().mandate});return result;}});
 const request=(path,token,body='{}',method='POST',headers={})=>handler(new Request(origin+path,{method,
  headers:{origin,...(token?{authorization:'Bearer '+token}:{}),...headers},...(method==='POST'?{body}:{})}));
 return {store,workflow,request};
}
test('new continuation request rejects agents and cross-origin, and only accepts empty body',async()=>{
 const f=fixture();try{
  const path='/api/cop/principal-consent/continuation-request';
  assert.equal((await f.request(path,null)).status,401);
  assert.equal((await f.request(path,'agent-token')).status,403);
  assert.equal((await f.request(path,'principal-live-session','{}','POST',{origin:'https://evil.test'})).status,403);
  assert.equal((await f.request(path,'principal-live-session','{"mandate_ref":"arbitrary"}')).status,400);
  assert.equal(f.store.replay().filter(e=>e.payload?.kind==='PrincipalConsentRequested').length,0);
 }finally{f.store.close();}
});
test('Supabase Principal requests exact continuation and approval applies it once',async()=>{
 const f=fixture();try{
  const path='/api/cop/principal-consent/continuation-request';
  const response=await f.request(path,'principal-live-session');
  assert.equal(response.status,201,await response.clone().text());
  const created=await response.json();
  const pending=f.workflow.inspect({challenge_id:created.challenge_id});
  assert.equal(pending.status,'pending');
  assert.deepEqual(pending.proposal.scope.allowed_actions,['browser.hosted.inspect','continuation.resolve']);
  const decision='/api/cop/principal-consent/'+created.challenge_id;
  assert.equal((await f.request(decision,'agent-token',JSON.stringify({decision:'approve',payload_hash:created.payload_hash}))).status,403);
  const approved=await f.request(decision,'principal-live-session',JSON.stringify({decision:'approve',payload_hash:created.payload_hash}));
  assert.equal(approved.status,200,await approved.clone().text());
  const result=await approved.json();
  assert.equal(result.mandate_amendment_applied,true);
  assert.equal(result.mandate_version,'v2');
  assert.equal(f.workflow.inspect({challenge_id:created.challenge_id}).status,'consumed');
  const current=resolveMandate(f.store,'mandate:jhn:john-root');
  assert.equal(current.scope.allowed_actions.includes('continuation.resolve'),true);
  assert.deepEqual(current.scope.forbidden_actions,['communication.send']);
  assert.equal((await f.request(decision,'principal-live-session',JSON.stringify({decision:'approve',payload_hash:created.payload_hash}))).status,409);
  assert.equal((await f.request(path,'principal-live-session')).status,200);
 }finally{f.store.close();}
});
