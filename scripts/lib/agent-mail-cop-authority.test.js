import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {createCanonicalAgentMailAuthorizer} from './agent-mail-cop-authority.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {createAgentMail} from './agent-mail.js';
import {createAgentMailIssuerLineageVerifier} from './agent-mail-issuer-lineage.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
const sender='john@mail.fractavolta.com',receiver='john-worker@mail.fractavolta.com';
const ref='mandate:jhn:john-root';
const now=new Date('2026-11-10T11:00:00Z');
function setup(allowed=['agent.mail.send','agent.mail.receive']){
  const key=generateKeyPairSync('ed25519');
  const trusted=key.publicKey.export({type:'spki',format:'pem'});
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:allowed,forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:1,budget_limits:{max_steps:3}};
  const approval={kind:'cogentia.principal-signature/v1',principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(trusted),signature_base64:sign(null,canonicalProposalBytes(proposal),key.privateKey).toString('base64')};
  const store=createSqliteCopEventStore(':memory:');
  assert.equal(issueVerifiedJohnRoot({store,proposal,approval,trustedPublicKeyPem:trusted,now}).ok,true);
  const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'},
    {headers:{authorization:'Bearer fixture'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
  const caller={auth,principal_ref:auth.principal_ref,actor_ref:auth.actor,mailbox:sender};
  const verifyIssuer=createOfflineJohnIssuerVerifier({trustedPublicKeyPem:trusted,now:()=>now});
  const canonical=createCanonicalAgentMailAuthorizer({store,verifyIssuer});
  return {store,caller,canonical,verifyIssuer};
}
test('signed Inseme root mandate + optimistic budget reserves and settles one internal mail',async()=>{
  const {store,caller,canonical}=setup();
  try {
    const events=[];
    const session=({address})=>({primaryAccounts:{'urn:ietf:params:jmap:mail':'acct:'+address},accounts:{['acct:'+address]:{}}});
    const post=async({methodCalls})=>{
      events.push(methodCalls);
      if(methodCalls[0][0]==='Identity/get')return {methodResponses:[['Identity/get',{list:[{email:sender,id:'ident'}]},'i']]};
      if(methodCalls[0][0]==='Mailbox/get')return {methodResponses:[['Mailbox/get',{list:[{id:'draft',role:'drafts'}]},'b']]};
      return {methodResponses:[['Email/set',{created:{m:{id:'1'}}},'e'],['EmailSubmission/set',{created:{s:{id:'2'}}},'s'],['Email/set',{destroyed:['1']},'s']]};
    };
    const mail=createAgentMail({credentialBroker:async()=>({password:'fixture'}),post,getSession:session,
      authorize:request=>canonical({request,caller})});
    const result=await mail.send({from:sender,to:receiver,subject:'test',body:'private',correlation_id:'receipt-1'});
    assert.equal(result.ok,true);
    assert.equal(events.at(-1)[1][0],'EmailSubmission/set');
    const budget=store.listTopic('execution-budget:budget:'+ref).map(e=>e.event_type==='cop.event/v1'?e.payload?.kind:e.event_type);
    assert.ok(budget.includes('ExecutionBudgetReservation'));
    assert.ok(budget.includes('ExecutionBudgetSettlement'));
    await assert.rejects(mail.send({from:sender,to:receiver,subject:'test',body:'private',correlation_id:'receipt-1'}), /mail_duplicate_or_reserved/);
    assert.equal(events.length,3);
  }finally{store.close();}
});
test('signed mandate without agent.mail.send denies before credential or JMAP access',async()=>{
  const {store,caller,canonical}=setup(['agent.mail.receive']);
  try {
    await assert.rejects(canonical({request:{capability:'agent.mail.send',principal:'principal:jhn',actor:sender,to:receiver,subject:'x',body:'y',correlation_id:'1'},caller}),/capability_out_of_scope|capability_not_allowed|mail_canonical_mandate_denied|mandate_/);
    assert.equal(store.listTopic('execution-budget:budget:'+ref).filter(e=>e.payload?.kind==='ExecutionBudgetReservation').length,0);
  }finally{store.close();}
});

test('authenticated canonical consent v2 is verified through signed root + exact consumed amendment',async()=>{
  const {store,caller,verifyIssuer}=setup(['browser.hosted.inspect']);
  try {
    const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const authClient={auth:{getUser:async token=>({data:{user:token==='owner-session'?{id:owner,email_confirmed_at:now.toISOString(),is_anonymous:false}:null}})}};
    const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
    const workflow=createJhnCanonicalConsentWorkflow({store,authClient,adminClient,clock:()=>now});
    const current=store.replay().find(e=>e.payload?.kind==='MandateDeclaration').payload;
    const scope={...current.scope,allowed_actions:[...current.scope.allowed_actions,'agent.mail.send']};
    const req=workflow.request({mandate:{mandate_ref:ref,principal_ref:'principal:jhn',expected_version:'v1',scope,reason:'Autoriser les messages internes au Twin sans revue des brouillons'}});
    assert.equal(req.ok,true,JSON.stringify(req));
    const decision=await workflow.decide({challenge_id:req.challenge_id,payload_hash:req.payload_hash,session:{accessToken:'owner-session'},decision:'approve'});
    assert.equal(decision.ok,true,JSON.stringify(decision));
    const applied=await workflow.apply({challenge_id:req.challenge_id,session:{accessToken:'owner-session'}});
    assert.equal(applied.version,'v2',JSON.stringify(applied));
    const lineage=createAgentMailIssuerLineageVerifier({store,verifyRootIssuer:verifyIssuer});
    const newer=store.replay().filter(e=>e.payload?.kind==='MandateDeclaration').at(-1).payload;
    assert.equal(lineage({mandate:newer,mandate_ref:ref}).verified,true);
    const authorized=createCanonicalAgentMailAuthorizer({store,verifyIssuer:lineage});
    const r=await authorized({caller,request:{capability:'agent.mail.send',principal:'principal:jhn',actor:sender,to:receiver,subject:'hello',body:'there',correlation_id:'amended-1'}});
    assert.equal(r.authorized,true);
    await r.finalize({outcome:'submitted'});
    // A locally forged v3 declaration cannot fake a consent lineage.
    const tampered={...newer,version:'v3',scope:{...newer.scope,allowed_actions:['gmail.send']}};
    assert.equal(lineage({mandate:tampered,mandate_ref:ref}).verified,false);
  }finally{store.close();}
});
