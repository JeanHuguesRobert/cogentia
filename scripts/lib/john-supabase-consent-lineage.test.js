import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';

const ref='mandate:jhn:john-root';
const now=new Date('2026-11-15T06:00:00Z');
test('a signed root followed by exact Supabase consent is verified; tampering fails',async()=>{
 const keys=generateKeyPairSync('ed25519');
 const pem=keys.publicKey.export({type:'spki',format:'pem'});
 const proposal={kind:ROOT_MANDATE_KIND,mandate_id:ref,version:'v1',principal_ref:'principal:jhn',
  logical_agent_ref:'agent:jhn',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',
  scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:[...RESERVED_ACTIONS]},
  max_delegation_depth:1,budget_limits:{max_steps:5}};
 const approval={kind:'cogentia.principal-signature/v1',principal_ref:'principal:jhn',
  payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(pem),
  signature_base64:sign(null,canonicalProposalBytes(proposal),keys.privateKey).toString('base64')};
 const store=createSqliteCopEventStore(':memory:');
 try{
  assert.equal(issueVerifiedJohnRoot({store,proposal,approval,trustedPublicKeyPem:pem,now}).ok,true);
  const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:user}})}}}}}}};
  const authClient={auth:{getUser:async token=>({data:{user:token==='owner'?{id:user,email_confirmed_at:now.toISOString(),is_anonymous:false}:null}})}};
  const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>now});
  const root=resolveMandate(store,ref);
  const scope={...root.scope,allowed_actions:[...root.scope.allowed_actions,'browser.chatgpt.turn']};
  const request=workflow.request({mandate:{mandate_ref:ref,principal_ref:'principal:jhn',
   expected_version:'v1',scope,reason:'Standing agent browser turn'}});
  assert.equal(request.ok,true);
  assert.equal((await workflow.decide({challenge_id:request.challenge_id,payload_hash:request.payload_hash,
   session:{accessToken:'owner'},decision:'approve'})).ok,true);
  assert.equal((await workflow.apply({challenge_id:request.challenge_id,session:{accessToken:'owner'}})).ok,true);
  const verify=createOfflineJohnIssuerVerifier({trustedPublicKeyPem:pem,now:()=>now});
  const amended=resolveMandate(store,ref);
  assert.equal(verify({mandate:amended,mandate_ref:ref,store}).verified,true);
  assert.equal(verify({mandate:{...amended,scope:{...amended.scope,allowed_actions:['gmail.send']}},mandate_ref:ref,store}).verified,false);
  const consumed=store.replay().find(e=>e.payload?.kind==='PrincipalConsentConsumed');
  const fakeStore={replay:()=>store.replay().filter(e=>e.event_id!==consumed.event_id),listTopic:id=>store.listTopic(id)};
  assert.equal(verify({mandate:amended,mandate_ref:ref,store:fakeStore}).verified,false);
 }finally{store.close()}
});

test('direct Supabase Principal intent verifies the signed COP amendment without second approval',async()=>{
 const keys=generateKeyPairSync('ed25519');
 const pem=keys.publicKey.export({type:'spki',format:'pem'});
 const root={kind:ROOT_MANDATE_KIND,mandate_id:ref,version:'v1',
   principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
   valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',
   scope:{allowed_actions:['host.process.run'],forbidden_actions:[...RESERVED_ACTIONS]},
   max_delegation_depth:1,budget_limits:{max_steps:10}};
 const signature={kind:'cogentia.principal-signature/v1',
   principal_ref:'principal:jhn',payload_hash:proposalHash(root),
   key_fingerprint:publicKeyFingerprint(pem),
   signature_base64:sign(null,canonicalProposalBytes(root),keys.privateKey).toString('base64')};
 const store=createSqliteCopEventStore(':memory:');
 try{
   assert.equal(issueVerifiedJohnRoot({store,proposal:root,approval:signature,
      trustedPublicKeyPem:pem,now}).ok,true);
   const principalId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
   const adminClient={from(){return {select(){return {eq(){return {single:async()=>({
     data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',
       status:'autonomous',principal_id:principalId}
   })}}}}}}};
   const authClient={auth:{getUser:async token=>({data:{
     user:token==='owner'?{id:principalId,email_confirmed_at:now.toISOString(),
       is_anonymous:false}:{id:'other-user',email_confirmed_at:now.toISOString(),
       is_anonymous:false}
   }})}};
   const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>now});
   const mandate={mandate_ref:ref,principal_ref:'principal:jhn',expected_version:'v1',
     scope:{...resolveMandate(store,ref).scope,
       standing_operations:[{profile:'host.process-general/v1',capability:'host.process.run',
       target:'node:fracta2',provider:'unix-process',execution_mode:'normal'}]},
     reason:'Administration générale du Fractanet'};
   assert.equal((await workflow.applyAuthenticated({session:{accessToken:'other'},
     mandate})).error,'principal_session_unverified');
   assert.equal(resolveMandate(store,ref).version,'v1');
   const applied=await workflow.applyAuthenticated({session:{accessToken:'owner'},mandate});
   assert.equal(applied.ok,true,JSON.stringify(applied));
   assert.equal(applied.mandate_version,'v2');
   const verify=createOfflineJohnIssuerVerifier({trustedPublicKeyPem:pem,now:()=>now});
   const amended=resolveMandate(store,ref);
   assert.equal(verify({mandate:amended,mandate_ref:ref,store}).verified,true);
   const evidence=store.replay().find(e=>e.payload?.kind==='PrincipalAuthenticatedMandateIntent');
   assert.ok(evidence?.event_id);
   assert.equal(store.replay().filter(e=>e.payload?.kind==='PrincipalConsentRequested').length,0);
   const fakeStore={replay:()=>store.replay().filter(e=>e.event_id!==evidence.event_id),
     listTopic:id=>store.listTopic(id)};
   assert.equal(verify({mandate:amended,mandate_ref:ref,store:fakeStore}).verified,false);
   const mutated=structuredClone(amended);
   mutated.scope.allowed_actions.push('gmail.send');
   assert.equal(verify({mandate:mutated,mandate_ref:ref,store}).verified,false);
 }finally{store.close()}
});
