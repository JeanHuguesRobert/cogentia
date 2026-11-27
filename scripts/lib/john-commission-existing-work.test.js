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
import {createLocalConsentServer} from '../ops/jhn-consent-local-server.js';
import {createCanonicalStandingMissionResolver} from './john-standing-mission-authority.js';
import {createHostCapabilityRouter} from './host-capability-router.js';
import {createMcpCore} from './cogentia-mcp-core.js';
import {hostname} from 'node:os';
import {request as httpRequest} from 'node:http';
import {createExistingHostWorkCommissioner,createCommissionedHostWorkRunner} from './john-commission-existing-work.js';
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
 return {rootStore,packetStore,commissioner,input,plan,workflow,verifyIssuer,ledger:()=>createEventSourcedExecutionBudgetLedger({
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

test('real HTTP owner commissioning then authenticated MCP agent executes and settles the exact local work',async()=>{
 const f=fixture();
 const origin='https://browser.fractavolta.com';
 const server=createLocalConsentServer({workflow:f.workflow,origin,enableDecision:true,workCommissioner:f.commissioner});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const post=(body,token='owner-session',from=origin)=>new Promise((resolve,reject)=>{
   const q=httpRequest({hostname:'127.0.0.1',port:server.address().port,
     path:'/api/cop/principal-consent/work-commission',method:'POST',
     headers:{host:new URL(origin).host,origin:from,authorization:'Bearer '+token,
       'content-type':'application/json'}},res=>{
     let raw='';res.setEncoding('utf8');res.on('data',x=>raw+=x);
     res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}))
   });q.on('error',reject);q.end(JSON.stringify(body));
 });
 const runner=createCommissionedHostWorkRunner({...f,primaryStoreId:'sqlite:fixture-local',now:()=>now});
 const resolver=createCanonicalStandingMissionResolver({store:f.rootStore,verifyIssuer:f.verifyIssuer,
   now:()=>now,resolvePacketContext:runner.resolvePacketContext});
 const router=createHostCapabilityRouter({missionAuthorityResolver:resolver});
 const core=createMcpCore({}, {hostRouter:router,runCommissionedHostWork:runner.run});
 try{
  const before=f.rootStore.replay(),body={plan_hash:f.commissioner.plan_hash};
  assert.equal((await post(body,'other')).status,403);
  assert.equal((await post(body,'owner-session','https://other.invalid')).status,403);
  assert.equal((await post({...body,command:'uname'})).status,400);
  assert.deepEqual(f.rootStore.replay(),before);
  assert.equal(f.packetStore.replay().length,0);
  const response=await post(body);
  assert.equal(response.status,200,JSON.stringify(response));const a=response.body;
  assert.equal(a.funded,true);
  const created=f.packetStore.listTopic('packet:'+a.packet_ref)[0].payload;
  assert.equal(created.access_context.requesting_agent_ref,null);
  assert.equal(created.access_context.requesting_principal_ref,'principal:jhn');
  assert.equal((await post(body)).body.allocation_ref,a.allocation_ref);
  const {capability,...act}=f.plan.request.first_act;
  const args={...act,work_ref:f.plan.request.work_ref};
  assert.equal((await runner.run({args,auth:{...f.input.auth},invoke:()=>{throw Error('must not execute')}})).ok,false);
  const wrong=await core.callTool('cogentia_host_process_run',{...args,command:'pwd'},{auth:f.input.auth});
  assert.equal(wrong.ok,false);
  assert.equal(f.ledger().snapshot().reserved.max_steps,3);
  const done=await core.callTool('cogentia_host_process_run',args,{auth:f.input.auth});
  assert.equal(done.ok,true,JSON.stringify(done));
  assert.equal(done.task.result.result.stdout.trim(),hostname());
  assert.equal(done.task.result.result.trace.verification.cop_spend.packet_ref,a.packet_ref);
  assert.equal(done.task.result.work_complete,false);
  assert.equal(f.ledger().snapshot().settled.max_steps,1);
  assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  const root=f.rootStore.replay(),local=f.packetStore.replay();
  const duplicate=await core.callTool('cogentia_host_process_run',args,{auth:f.input.auth});
  assert.equal(duplicate.ok,true);assert.equal(duplicate.duplicate,true);
  assert.deepEqual(f.rootStore.replay(),root);assert.deepEqual(f.packetStore.replay(),local);
  assert.equal((await post(body)).body.status,'completed');
  assert.equal(f.packetStore.auditTopicCommitment('packet:'+a.packet_ref).ok,true);
  assert.equal(f.packetStore.auditTopicCommitment('execution-budget:'+a.budget_id).ok,true);
  console.log('HTTP_OWNER_COMMISSION_MCP_REAL_UNIX_PASS',JSON.stringify({hostname:hostname(),allocated:3,used:1,returned:2}));
 }finally{await router.stop();await new Promise(resolve=>server.close(resolve));f.close()}
});
