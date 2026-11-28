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
import {createExistingHostWorkCommissioner,createCommissionedHostWorkRunner,createExistingHostWorkCatalog,createCommissionedHostWorkDispatcher} from './john-commission-existing-work.js';
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


test('multiple proposals share one catalog, and a replacement handler resolves commissioned work from durable creation alone',async()=>{
 const f=fixture();try{
   const second=structuredClone(f.plan);
   second.request.work_ref='https://github.com/example/repo/issues/286';
   second.request.source_issue_id='fixture-id-2';second.request.first_act.command='pwd';
   second.intent.submission_key='github:example:repo:286';
   second.intent.request_hash=hashPayload(second.request);
   second.intent.allocation.max_steps=2;
   const options={...f,primaryStoreId:'sqlite:fixture-local',ownerInstanceRef:'instance:fixture-work',
     authenticatePrincipal:f.workflow.authenticate,handler:async()=>{throw Error('must_not_execute')},now:()=>now};
   assert.throws(()=>createExistingHostWorkCatalog({...options,plans:[f.plan,f.plan]}),/ambiguous/);
   const catalog=createExistingHostWorkCatalog({...options,plans:[f.plan,second]});
   const confirm=plan=>catalog.commissionFromPrincipal({session:f.input.session,presented_plan_hash:hashPayload(plan)});
   assert.equal((await confirm({...second,unexpected:true})).ok,false);
   const a=await confirm(f.plan),b=await confirm(second);
   assert.equal(a.ok,true,JSON.stringify(a));assert.equal(b.ok,true,JSON.stringify(b));
   assert.notEqual(a.packet_ref,b.packet_ref);
   assert.equal(f.ledger().snapshot().reserved.max_steps,5);
   assert.equal(f.ledger().snapshot().available.max_steps,0);
   // No proposal, plan path or proposal catalog is passed to the worker.
   const runner=createCommissionedHostWorkDispatcher({rootStore:f.rootStore,packetStore:f.packetStore,
     primaryStoreId:'sqlite:fixture-local',verifyIssuer:f.verifyIssuer,now:()=>now});
   const resolver=createCanonicalStandingMissionResolver({store:f.rootStore,verifyIssuer:f.verifyIssuer,
     now:()=>now,resolvePacketContext:runner.resolvePacketContext});
   const router=createHostCapabilityRouter({missionAuthorityResolver:resolver});
   const core=createMcpCore({}, {hostRouter:router,runCommissionedHostWork:runner.run});
   try{
     const {capability,...act}=f.plan.request.first_act;
     const args={...act,work_ref:a.packet_ref};
     assert.equal((await core.callTool('cogentia_host_process_run',{...args,work_ref:second.request.work_ref},{auth:f.input.auth})).ok,false);
     assert.equal((await core.callTool('cogentia_host_process_run',{...args,work_ref:'https://github.com/example/repo/issues/999'},{auth:f.input.auth})).ok,false);
     assert.equal(f.ledger().snapshot().reserved.max_steps,5);
     const one=await core.callTool('cogentia_host_process_run',args,{auth:f.input.auth});
     assert.equal(one.ok,true,JSON.stringify(one));assert.equal(one.packet_ref,a.packet_ref);
     const {capability:_,...act2}=second.request.first_act;
     const two=await core.callTool('cogentia_host_process_run',{...act2,work_ref:second.request.work_ref},{auth:f.input.auth});
     assert.equal(two.ok,true,JSON.stringify(two));assert.equal(two.packet_ref,b.packet_ref);
     assert.equal(one.task.result.result.stdout.trim(),hostname());
     assert.ok(two.task.result.result.stdout.trim().startsWith('/'));
     assert.equal(f.ledger().snapshot().settled.max_steps,2);
     assert.equal(f.ledger().snapshot().reserved.max_steps,0);
     const root=f.rootStore.replay(),local=f.packetStore.replay();
     const replay=await core.callTool('cogentia_host_process_run',args,{auth:f.input.auth});
     assert.equal(replay.duplicate,true);assert.equal(replay.ok,true);
     assert.deepEqual(f.rootStore.replay(),root);assert.deepEqual(f.packetStore.replay(),local);
   }finally{await router.stop()}
 }finally{f.close()}
});


async function withTurns(f,body){
 let clock=now;
 const plan=structuredClone(f.plan);
 const {command,timeout_ms,...route}=plan.request.first_act;
 delete plan.request.first_act;plan.request.route=route;
 plan.request.turn_policy={kind:'agent_selected_normal/v1',valid_until:'2026-11-27T12:30:00.000Z'};
 plan.intent.request_hash=hashPayload(plan.request);
 const options={...f,primaryStoreId:'sqlite:fixture-local',ownerInstanceRef:'instance:fixture-work',
   authenticatePrincipal:f.workflow.authenticate,handler:async()=>{throw Error('must_not_execute')},now:()=>clock};
 const catalog=createExistingHostWorkCatalog({...options,plans:[plan]});
 const a=await catalog.commissionFromPrincipal({session:f.input.session,presented_plan_hash:hashPayload(plan)});
 assert.equal(a.ok,true,JSON.stringify(a));
 const runner=createCommissionedHostWorkDispatcher(options);
 const resolver=createCanonicalStandingMissionResolver({store:f.rootStore,verifyIssuer:f.verifyIssuer,
   now:()=>clock,resolvePacketContext:runner.resolvePacketContext});
 const router=createHostCapabilityRouter({missionAuthorityResolver:resolver});
 const core=createMcpCore({}, {hostRouter:router,runCommissionedHostWork:runner.run});
 const {capability,...routeArgs}=plan.request.route;
 const act={...routeArgs,command,timeout_ms};
 const call=(args)=>core.callTool('cogentia_host_process_run',{work_ref:a.packet_ref,...args},{auth:f.input.auth});
 const run=(id,command=act.command,overrides={})=>call({...act,command,work_turn:{id,kind:'act'},...overrides});
 const finish=(status='completed')=>call({work_turn:{id:'finish',kind:'finish',status,summary:'Observed results assessed against work goal'}});
 try{await body({a,plan,call,run,finish,setClock:t=>{clock=new Date(t)},local:()=>createEventSourcedExecutionBudgetLedger({store:f.packetStore,budget_id:a.budget_id,require_authority_grant:true}).snapshot()})}
 finally{await router.stop()}
}
test('commission one objective, choose subsequent Unix acts from observed results, then return unused budget once',async()=>{
 const f=fixture();try{await withTurns(f,async({a,run,finish,local,call})=>{
   assert.equal((await run('wrong','pwd',{execution_mode:'super'})).ok,false);
   const first=await run('initial');assert.equal(first.ok,true,JSON.stringify(first));
   assert.equal(first.task.status,'input_required');assert.equal(first.turn_receipt.result.stdout.trim(),hostname());
   assert.equal(local().settled.max_steps,1);assert.equal(f.ledger().snapshot().reserved.max_steps,3);
   const root=f.rootStore.replay(),child=f.packetStore.replay();
   assert.equal((await run('initial')).duplicate,true);
   assert.equal((await run('initial','pwd')).ok,false);
   assert.deepEqual(f.rootStore.replay(),root);assert.deepEqual(f.packetStore.replay(),child);
   assert.equal((await run('second','pwd',{execution_mode:'super'})).ok,false);
   assert.equal((await run('second','pwd',{target:'node:i7-thinkpad-jhr'})).ok,false);
   assert.equal((await call({work_turn:{id:'finish',kind:'finish',status:'completed',summary:'done'},command:'pwd'})).ok,false);
   const second=await run('second','pwd');assert.equal(second.ok,true,JSON.stringify(second));
   assert.equal(second.turn_receipt.remaining_steps,1);assert.ok(second.turn_receipt.result.stdout.trim().startsWith('/'));
   assert.equal(second.turn_receipt.result.trace.verification.cop_spend.packet_ref,a.packet_ref);
   assert.equal((await run('second','hostname')).ok,false);
   const final=await finish();assert.equal(final.ok,true,JSON.stringify(final));
   assert.equal(final.task.status,'completed');assert.equal(final.turn_receipt.work_complete,true);
   assert.equal(f.ledger().snapshot().settled.max_steps,2);assert.equal(f.ledger().snapshot().reserved.max_steps,0);
   assert.equal(f.ledger().snapshot().available.max_steps,3);
   assert.equal(local().settled.max_steps,2);assert.equal((await finish()).duplicate,true);
   assert.equal((await run('third','id -un')).ok,false);
   assert.equal(f.packetStore.auditTopicCommitment('packet:'+a.packet_ref).ok,true);
   assert.equal(f.packetStore.auditTopicCommitment('execution-budget:'+a.budget_id).ok,true);
 })}finally{f.close()}
});
test('multi-turn work has a hard local budget and can finish without a fourth paid act',async()=>{
 const f=fixture();try{await withTurns(f,async({run,finish,local})=>{
   assert.equal((await run('initial')).ok,true);
   assert.equal((await run('second','pwd')).ok,true);
   assert.equal((await run('third','id -un')).ok,true);
   assert.equal(local().available.max_steps,0);
   const denied=await run('fourth','hostname');assert.equal(denied.ok,false);
   assert.equal((await finish('blocked')).ok,true);
   assert.equal(f.ledger().snapshot().settled.max_steps,3);assert.equal(f.ledger().snapshot().reserved.max_steps,0);
 })}finally{f.close()}
});
test('expired work admits no next command, but the assigned agent can close accounting with a blocked judgment',async()=>{
 const f=fixture();try{await withTurns(f,async({run,finish,setClock})=>{
   assert.equal((await run('initial')).ok,true);
   setClock('2026-11-27T12:31:00Z');
   assert.equal((await run('second','pwd')).ok,false);
   const done=await finish('blocked');assert.equal(done.ok,true,JSON.stringify(done));
   assert.equal(done.turn_receipt.packet_status,'blocked');assert.equal(done.turn_receipt.work_complete,false);
   assert.equal(f.ledger().snapshot().settled.max_steps,1);assert.equal(f.ledger().snapshot().reserved.max_steps,0);
 })}finally{f.close()}
});

test('unstarted work can be closed without executing or consuming a Step',async()=>{
 const f=fixture();try{await withTurns(f,async({run,finish,setClock})=>{
   setClock('2026-11-27T12:31:00Z');
   assert.equal((await run('first','pwd')).ok,false);
   const done=await finish('blocked');assert.equal(done.ok,true,JSON.stringify(done));
   assert.equal(f.ledger().snapshot().settled.max_steps,0);assert.equal(f.ledger().snapshot().reserved.max_steps,0);
 })}finally{f.close()}
});


test('a running turn rejects a competing command for the same suspension; later turns remain available',async()=>{
 const f=fixture();try{await withTurns(f,async({a,run,finish,local})=>{
   const first=run('slow','sleep 0.2; hostname');
   for(let i=0;i<100;i++){
     if(f.packetStore.listTopic('packet:'+a.packet_ref).some(e=>e.payload?.phase==='claimed'))break;
     await new Promise(resolve=>setTimeout(resolve,2));
   }
   assert.equal(f.packetStore.listTopic('packet:'+a.packet_ref).some(e=>e.payload?.phase==='claimed'),true);
   assert.equal((await run('competing','pwd')).ok,false);
   const result=await first;assert.equal(result.ok,true,JSON.stringify(result));
   assert.equal(local().settled.max_steps,1);
   assert.equal((await run('competing','pwd')).ok,true);
   assert.equal((await finish()).ok,true);assert.equal(local().settled.max_steps,2);
 })}finally{f.close()}
});
test('proposal catalog reloads without service restart and refuses a removed hash',async()=>{
 const f=fixture();try{
   let proposals=[];
   const catalog=createExistingHostWorkCatalog({...f,primaryStoreId:'sqlite:fixture-local',ownerInstanceRef:'instance:fixture-work',
     authenticatePrincipal:f.workflow.authenticate,handler:async()=>{throw Error('must_not_execute')},now:()=>now,getPlans:()=>proposals});
   const input={session:f.input.session,presented_plan_hash:hashPayload(f.plan)};
   assert.equal((await catalog.commissionFromPrincipal(input)).ok,false);
   proposals=[f.plan];const result=await catalog.commissionFromPrincipal(input);assert.equal(result.ok,true);
   proposals=[];assert.equal((await catalog.commissionFromPrincipal(input)).ok,false);
   const dispatcher=createCommissionedHostWorkDispatcher({...f,primaryStoreId:'sqlite:fixture-local',now:()=>now});
   assert.ok(dispatcher.resolvePacketContext({packet_ref:result.packet_ref,actor_ref:'agent:jhn',principal_ref:'principal:jhn',mandate_ref:REF,mandate_version:'v1'}));
 }finally{f.close()}
});
