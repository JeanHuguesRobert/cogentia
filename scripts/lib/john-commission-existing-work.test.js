import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {projectPacketWorkAssignment} from '../../../inseme/packages/cop-core/src/packet-work-assignment.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {reserveEventSourcedDelegatedBudget} from '../../../inseme/packages/cop-core/src/delegated-budget.js';
import {recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createExistingHostWorkCommissioner} from './john-commission-existing-work.js';
const REF='mandate:jhn:john-root',BUDGET='budget:'+REF;
const now=new Date('2026-11-27T12:00:00Z');
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const authClient={auth:{getUser:async t=>({data:{user:{id:t==='owner-session'?owner:'other',email_confirmed_at:'confirmed',is_anonymous:false}}})}};
const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
function fixture(){
 const rootStore=createSqliteCopEventStore(':memory:'),packetStore=createSqliteCopEventStore(':memory:');
 const key=generateKeyPairSync('ed25519'),pem=key.publicKey.export({type:'spki',format:'pem'});
 const proposal={kind:ROOT_MANDATE_KIND,mandate_id:REF,version:'v1',principal_ref:'principal:jhn',
   logical_agent_ref:'agent:jhn',valid_from:'2026-11-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',
   scope:{allowed_actions:['host.process.run'],forbidden_actions:[...RESERVED_ACTIONS],
     standing_operations:[{profile:'host.process-general/v1',capability:'host.process.run',target:'node:fracta2',provider:'unix-process',execution_mode:'normal'}]},
   max_delegation_depth:2,budget_limits:{max_steps:5}};
 assert.equal(issueVerifiedJohnRoot({store:rootStore,proposal,approval:{kind:'cogentia.principal-signature/v1',
   principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(pem),
   signature_base64:sign(null,canonicalProposalBytes(proposal),key.privateKey).toString('base64')},
   trustedPublicKeyPem:pem,now}).ok,true);
 const verifyIssuer=createOfflineJohnIssuerVerifier({trustedPublicKeyPem:pem,now:()=>now});
 const workflow=createJhnCanonicalConsentWorkflow({store:rootStore,authClient,adminClient,clock:()=>now});
 const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'},
   {headers:{authorization:'Bearer fixture'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
 const request={work_ref:'https://github.com/example/repo/issues/285',source_issue_id:'fixture-id',
   purpose:'Existing work',completion:'Verified receipt',first_act:{capability:'host.process.run',
   target:'node:fracta2',provider:'unix-process',execution_mode:'normal',command:'hostname',timeout_ms:10000}};
 const plan={request,intent:{submission_key:'github:example:repo:285',request_hash:hashPayload(request),
   principal_ref:'principal:jhn',responsible_agent_ref:'agent:jhn',capability:'host.process.run',
   mandate_ref:REF,mandate_version:'v1',parent_budget_ref:BUDGET,allocation:{max_steps:3}}};
 const commissioner=createExistingHostWorkCommissioner({rootStore,packetStore,primaryStoreId:'sqlite:fixture-local',
   ownerInstanceRef:'instance:fixture-work',verifyIssuer,authenticatePrincipal:workflow.authenticate,
   sourceRef:request.work_ref,
   plan,handler:async()=>{throw Error('commissioning_must_not_execute')},now:()=>now});
 const input={session:{accessToken:'owner-session'},auth,presented_plan_hash:commissioner.plan_hash};
 return {rootStore,packetStore,commissioner,input,plan,ledger:()=>createEventSourcedExecutionBudgetLedger({
   store:rootStore,budget_id:BUDGET,require_authority_grant:true}),close(){rootStore.close();packetStore.close()}};
}
test('authenticated owner exact commission creates and funds one local packet, without executing or issuing authority',async()=>{
 const f=fixture();try{
   const before=f.rootStore.replay();
   for(const changed of [{session:{accessToken:'other'}},{auth:{...f.input.auth}},
     {presented_plan_hash:'sha256:'+'0'.repeat(64)}]){
     assert.equal((await f.commissioner.commission({...f.input,...changed})).ok,false);
     assert.deepEqual(f.rootStore.replay(),before);assert.equal(f.packetStore.replay().length,0);
   }
   const a=await f.commissioner.commission(f.input);assert.equal(a.ok,true,JSON.stringify(a));
   assert.equal(a.funded,true);assert.equal(a.grants_authority,false);
   const events=f.packetStore.listTopic('packet:'+a.packet_ref);
   assert.equal(events[0].payload.access_context.commissioning_evidence.plan_hash,f.commissioner.plan_hash);
   assert.equal(events[0].payload.access_context.request_hash,f.plan.intent.request_hash);
   assert.equal(projectPacketWorkAssignment(f.packetStore,{packet_ref:'packet:'+a.packet_ref}).responsible_agent_ref,'agent:jhn');
   assert.equal(f.ledger().snapshot().reserved.max_steps,3);
   assert.equal(f.ledger().snapshot().settled.max_steps,0);
   const local=createEventSourcedExecutionBudgetLedger({store:f.packetStore,budget_id:a.budget_id,require_authority_grant:true});
   assert.equal(local.snapshot().available.max_steps,3);
   assert.equal(f.packetStore.auditTopicCommitment('packet:'+a.packet_ref).ok,true);
   const root=f.rootStore.replay(),child=f.packetStore.replay();
   const b=await f.commissioner.commission(f.input);
   assert.equal(b.ok,true,JSON.stringify(b));assert.equal(b.packet_ref,a.packet_ref);
   assert.equal(b.allocation_ref,a.allocation_ref);assert.deepEqual(f.rootStore.replay(),root);
   assert.deepEqual(f.packetStore.replay(),child);
   assert.ok(!JSON.stringify(child).includes('owner-session'));
   assert.equal(root.filter(e=>e.payload?.kind==='MandateDeclaration').length,1);
 }finally{f.close()}
});
test('revoked mandate prevents commission and funding despite current owner session',async()=>{
 const f=fixture();try{
   assert.equal(recordMandateControl(f.rootStore,{principal_ref:'principal:jhn',mandate_ref:REF,action:'revoke',reason:'fixture'}).ok,true);
   const r=await f.commissioner.commission(f.input);assert.equal(r.ok,false);
   assert.equal(f.packetStore.replay().length,0);assert.equal(f.ledger().snapshot().reserved.max_steps,0);
 }finally{f.close()}
});

test('an already reconciled allocation cannot be reopened by a repeated commission',async()=>{
 const f=fixture();try{
   const a=await f.commissioner.commission(f.input);assert.equal(a.ok,true);
   const delegation=reserveEventSourcedDelegatedBudget({store:f.rootStore,
     child_store:f.packetStore,child_source_ref:'sqlite:fixture-local#'+a.packet_ref,
     parent_ledger:f.ledger(),child_budget_id:a.budget_id,child_mandate_ref:REF,
     principal_ref:'principal:jhn',allocation:{max_steps:3},idempotency_key:a.packet_ref});
   assert.equal(delegation.ok,true,JSON.stringify(delegation));
   assert.equal(delegation.close().ok,true);
   const root=f.rootStore.replay(),child=f.packetStore.replay();
   const b=await f.commissioner.commission(f.input);
   assert.equal(b.error,'work_allocation_already_closed');
   assert.deepEqual(f.rootStore.replay(),root);
   assert.deepEqual(f.packetStore.replay(),child);
   assert.equal(f.ledger().snapshot().reserved.max_steps,0);
   assert.equal(f.ledger().snapshot().available.max_steps,5);
 }finally{f.close()}
});
