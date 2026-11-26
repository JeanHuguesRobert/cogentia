import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createServer} from 'node:http';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {projectPacketWorkAssignment} from '../../../inseme/packages/cop-core/src/packet-work-assignment.js';
import {createMcpCore} from './cogentia-mcp-core.js';
import {verifyMcpOAuthToken} from './mcp-oauth-token.js';
import {createOAuthWorkDeliveryResolver,createSupabaseWorkDeliveryResolver,verifySupabaseWorkDeliveryToken} from './work-delivery-access.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {packetTopicForMcpTask,packetRefForMcpTask} from './mcp-tasks-cop-pilot.mjs';
import {assessCanonicalPublicJohnWork,createCanonicalJohnPublicWorkPilot,normalizePublicJohnWork} from './john-public-work-admission.js';

const REF='mandate:jhn:john-root',BUDGET='budget:'+REF,now=new Date();
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture-only'},{
 headers:{authorization:'Bearer fixture-only'},meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
const request={version:'john.request.v1',request_id:'ccc-canonical-fixture-01',
 principal:{id:'principal:jhn'},mandate:{id:REF,version:'v1'},budget:{id:BUDGET},
 exposure:'read_only',capability:'corpus.search',execution_budget:{max_steps:3,max_tool_calls:1,max_subagents:0,max_elapsed_ms:15000,max_external_effects:0,max_internal_effects:0},
 input:{prompt:'contrat de confiance capacitaire',arguments:{query:'contrat de confiance capacitaire',repo:'privai',mode:'keyword',limit:3}},
 handler:{id:'capability.once',kind:'capability_once',allowed_capabilities:['corpus.search']}};
const args={request};
const key=generateKeyPairSync('ed25519');
const pem=key.publicKey.export({type:'spki',format:'pem'});
function fixture({allowed=true,steps=12}={}){
 const store=createSqliteCopEventStore(':memory:');
 const proposal={kind:ROOT_MANDATE_KIND,mandate_id:REF,version:'v1',
  principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
  valid_from:new Date(+now-86400000).toISOString(),valid_until:new Date(+now+86400000).toISOString(),
  scope:{allowed_actions:allowed?['corpus.search']:['host.process.run'],forbidden_actions:[...RESERVED_ACTIONS]},
  max_delegation_depth:2,budget_limits:{max_steps:steps}};
 const issued=issueVerifiedJohnRoot({store,proposal,approval:{
  kind:'cogentia.principal-signature/v1',principal_ref:'principal:jhn',
  payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(pem),
  signature_base64:sign(null,canonicalProposalBytes(proposal),key.privateKey).toString('base64')},
  trustedPublicKeyPem:pem,now});
 assert.equal(issued.ok,true,JSON.stringify(issued));
 const verifyIssuer=createOfflineJohnIssuerVerifier({trustedPublicKeyPem:pem,now:()=>now});
 const state={destination:'destination:fixture-personal',recipient:'principal:jhn',verified:true};
 // Fixture for the independently verified Principal's exact commissioning
 // and destination context. A transport token alone cannot satisfy this.
 const resolveContext=({request_hash})=>({verified:state.verified,
   principal_ref:'principal:jhn',commissioned_by_principal_ref:'principal:jhn',
   request_hash,result_visibility:'public',destination_ref:state.destination,
   requesting_agent_ref:'agent:jhn',recipient_ref:state.recipient,
   commissioning_ref:'fixture:principal-exact-commissioning'});
 return {store,verifyIssuer,resolveContext,state,ledger:()=>createEventSourcedExecutionBudgetLedger({store,budget_id:BUDGET,require_authority_grant:true})};
}

test('signed semantic authority and independently verified context required; no writes on refusal',()=>{
 const f=fixture({allowed:false}),g=fixture();
 try{
  assert.equal(assessCanonicalPublicJohnWork({...f,auth,args,now}).ok,false);
  assert.equal(f.store.replay().length,2);
  const assess=options=>assessCanonicalPublicJohnWork({...g,auth,args,now,...options});
  assert.equal(assess({}).ok,true);
  for(const opts of [{auth:{...auth}},{verifyIssuer:()=>({verified:false})},{resolveContext:undefined},
    {resolveContext:()=>({verified:true,principal_ref:'principal:jhn'})},
    {args:{request:{...request,mandate:{id:REF,version:'v2'}}}},
    {args:{request:{...request,handler:{...request.handler,options:{api_key:'fixture'}}}}},
    {args:{request:{...request,input:{...request.input,arguments:{...request.input.arguments,view:'full'}}}}}]){
   assert.equal(assess(opts).ok,false);
  }
  assert.equal(g.store.replay().length,2);
 }finally{f.store.close();g.store.close()}
});

test('one canonical public work, packet-local act chain, funded steps, destination recheck and idempotent delivery',async()=>{
 const f=fixture();
 const real=process.env.COGENTIA_342_REALITY_DAEMON_URL;
 const server=real?null:createServer((req,res)=>{
   const u=new URL(req.url,'http://localhost');
   assert.equal(u.searchParams.get('view'),'public');
   assert.equal(u.searchParams.get('repo'),'privai');
   assert.equal(req.headers.authorization,undefined);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({ok:true,view:'public',count:1,results:[{id:'fixture:ccc',title:'CCC'}]}));
 });
 if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let calls=0;
 const core=createMcpCore({COGENTIA_MCP_VIEW:'public',COGENTIA_DAEMON_URL:real||'http://127.0.0.1:'+server.address().port});
 const publicCore={async callTool(...a){calls++;return core.callTool(...a)}};
 const make=()=>createCanonicalJohnPublicWorkPilot({...f,publicCore,primaryStoreId:'sqlite:fixture-ccc',ownerInstanceRef:'instance:fixture-ccc',now:()=>now});
 try{
  const p=make(),c={name:'cogentia_john_run',args,auth};
  const created=await p.adapter.create(c);
  assert.equal((await p.adapter.create(c)).taskId,created.taskId);
  const id=created.taskId,topic=packetTopicForMcpTask(id);
  assert.equal(projectPacketWorkAssignment(f.store,{packet_ref:topic}).responsible_agent_ref,'agent:jhn');
  assert.equal(f.ledger().snapshot().settled.max_steps,0);
  f.state.destination='destination:other';
  await assert.rejects(p.adapter.get({taskId:id,auth}));
  await assert.rejects(p.run(id,auth));
  assert.equal(calls,0);
  f.state.destination='destination:fixture-personal';
  // A different destination or recipient cannot acquire the same work
  // through the stable submission key, even if the transport is identical.
  f.state.recipient='principal:other';
  await assert.rejects(p.adapter.create(c));
  await assert.rejects(p.adapter.get({taskId:id,auth}));
  f.state.recipient='principal:jhn';
  const done=await p.run(id,auth);
  assert.equal(done.status,'completed',JSON.stringify(done));
  const result=JSON.parse(done.result.content[0].text);
  assert.equal(result.ok,true);
  assert.equal(result.view,'public');
  assert.equal(result.accounting.canonical_cop,true);
  assert.equal(result.accounting.parent_allocation_settled,true);
  assert.equal(f.ledger().snapshot().settled.max_steps,result.accounting.settled_steps);
  assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  const child=createEventSourcedExecutionBudgetLedger({store:f.store,budget_id:'budget:'+packetRefForMcpTask(id),require_authority_grant:true});
  assert.equal(child.snapshot().settled.max_steps,result.accounting.settled_steps);
  assert.equal(child.snapshot().reserved.max_steps,0);
  const persisted=f.store.listTopic(topic).find(e=>e.payload?.phase==='created').payload.access_context;
  assert.equal(persisted.schema,'cogentia.work-commissioning/v1');
  assert.equal(persisted.delivery.recipient_ref,'principal:jhn');
  assert.equal(persisted.authority.mandate_ref,REF);
  assert.deepEqual(persisted.funding.allocation,{max_steps:3});
  assert.ok(f.store.listTopic(topic).some(e=>e.payload?.kind==='Imputation'));
  assert.equal(f.store.auditTopicCommitment(topic).ok,true);
  assert.equal(make().auditPacket(id).ok,true);
  const replay=make();
  assert.deepEqual((await replay.adapter.get({taskId:id,auth})).result,done.result);
  await replay.run(id,auth);
  assert.equal(calls,1);
  f.state.destination='destination:other';
  await assert.rejects(replay.adapter.get({taskId:id,auth}));
  assert.equal(calls,1);
  if(real)console.log('CCC_SIGNED_FIXTURE_REAL_DAEMON',JSON.stringify({results:result.result.results.length,
    calls,settled_steps:result.accounting.settled_steps,local_commitment_verified:true}));
 }finally{f.store.close();if(server)await new Promise(resolve=>server.close(resolve))}
});

test('revocation before dispatch prevents provider invocation and allocation',async()=>{
 const f=fixture();
 try{
  const p=createCanonicalJohnPublicWorkPilot({...f,publicCore:{async callTool(){throw Error('must not invoke')}},
    primaryStoreId:'sqlite:fixture-ccc',ownerInstanceRef:'instance:fixture-ccc',now:()=>now});
  const {taskId}=await p.adapter.create({name:'cogentia_john_run',args,auth});
  assert.equal(recordMandateControl(f.store,{principal_ref:'principal:jhn',mandate_ref:REF,action:'revoke',reason:'fixture'}).ok,true);
  await assert.rejects(p.run(taskId,auth));
  await assert.rejects(p.adapter.get({taskId,auth}));
  assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  assert.equal(f.ledger().snapshot().settled.max_steps,0);
 }finally{f.store.close()}
});

test('two independently signed OAuth subjects retrieve one completed work without becoming John or spending again',async()=>{
 const f=fixture();
 const issuer='https://issuer.work-fixture.test',audience='https://mcp.work-fixture.test/mcp';
 const keys=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...keys.publicKey.export({format:'jwk'}),kid:'work-fixture',alg:'RS256',use:'sig'};
 const opts={issuer,audience,jwksUrl:issuer+'/jwks',nowMs:+now,
   requiredScopes:['cogentia.private.read'],fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
 function token(sub,scope='cogentia.private.read cogentia.work.retrieve'){
   const h=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
   const p=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub,scope,exp:Math.floor(+now/1000)+600})).toString('base64url');
   const b=h+'.'+p;return b+'.'+sign('RSA-SHA256',Buffer.from(b),keys.privateKey).toString('base64url');
 }
 const a=await verifyMcpOAuthToken(token('client-a'),opts);
 const b=await verifyMcpOAuthToken(token('client-b'),opts);
 const wrong=await verifyMcpOAuthToken(token('client-collective'),opts);
 const other=await verifyMcpOAuthToken(token('other-principal'),opts);
 const readOnly=await verifyMcpOAuthToken(token('client-a','cogentia.private.read'),opts);
 const delivery={destination_ref:'destination:fixture-personal',recipient_ref:'principal:jhn',
   visibility:'public',provider_account_ref:null,subject_ref:null,twin_ref:null};
 const bindingsJson=JSON.stringify([
   ...['client-a','client-b'].map(subject=>({issuer,subject,principal:'principal:jhn',work_delivery:[delivery]})),
   {issuer,subject:'client-collective',principal:'principal:jhn',work_delivery:[{...delivery,destination_ref:'destination:collective'}]},
   {issuer,subject:'other-principal',principal:'principal:other',work_delivery:[delivery]},
 ]);
 let calls=0;
 const real=process.env.COGENTIA_342_REALITY_DAEMON_URL;
 const realCore=real?createMcpCore({COGENTIA_MCP_VIEW:'public',COGENTIA_DAEMON_URL:real}):null;
 const publicCore={async callTool(...args){
   calls++;
   if(realCore)return realCore.callTool(...args);
   return {ok:true,status:'completed',text:JSON.stringify({ok:true,view:'public',results:[{id:'fixture:ccc'}]}),
     accounting:{observed_steps:2,tool_calls_count:1,external_effects:0,internal_effects:0,ithaca_returned:true}};
 }};
 const resolveDelivery=createOAuthWorkDeliveryResolver({bindingsJson,now:()=>+now});
 const make=()=>createCanonicalJohnPublicWorkPilot({...f,resolveDelivery,publicCore,
   primaryStoreId:'sqlite:fixture-ccc',ownerInstanceRef:'instance:fixture-ccc',now:()=>now});
 const p=make();
 const env={COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_OAUTH_IDENTITY_BINDINGS:bindingsJson};
 const meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28',
   'io.modelcontextprotocol/clientCapabilities':{extensions:{'io.modelcontextprotocol/tasks':{}}}};
 const rpc=(method,params,oauthPrincipal,extraMeta={})=>createMcpCore(env,{mcpTasksAdapter:make().adapter})
   .handleJsonRpc({jsonrpc:'2.0',id:1,method,params:{...params,_meta:{...meta,...extraMeta}}},
     {oauthPrincipal,headers:{}});
 try{
   const {taskId}=await p.adapter.create({name:'cogentia_john_run',args,auth});
   assert.equal((await rpc('tasks/get',{taskId},a)).error.code,-32602);
   const done=await p.run(taskId,auth);
   assert.equal(done.status,'completed');
   const before=f.store.replay().length;
   const aa=await rpc('tasks/get',{taskId},a),bb=await rpc('tasks/get',{taskId},b);
   assert.equal(aa.result?.status,'completed',JSON.stringify(aa));
   assert.deepEqual(aa.result.result,bb.result.result);
   assert.deepEqual(aa.result.result,done.result);
   assert.equal(calls,1);
   for(const proof of [wrong,other,readOnly,{...a},undefined]){
     const denied=await rpc('tasks/get',{taskId},proof,{'cogentia.actor':'agent:jhn','cogentia.principal_ref':'principal:jhn'});
     assert.equal(denied.error?.code,-32602,JSON.stringify(denied));
   }
   assert.equal((await rpc('tasks/cancel',{taskId},a)).error?.code,-32602);
   assert.equal((await rpc('tasks/update',{taskId,inputResponses:{answer:'fixture'}},b)).error?.code,-32602);
   assert.equal(f.store.replay().length,before);
   assert.equal(f.ledger().snapshot().settled.max_steps,2);
   if(real)console.log('CCC_TWO_OAUTH_SUBJECTS_REAL_DAEMON',JSON.stringify({
     results:JSON.parse(done.result.content[0].text).result.results.length,
     provider_calls:calls,identical_delivery:true,additional_events:0,settled_steps:2}));
   assert.equal(resolveDelivery({oauthPrincipal:a,contract:{...f.store.listTopic(packetTopicForMcpTask(taskId)).find(x=>x.payload?.phase==='created').payload.access_context,
     twin_ref:'twin:collective'}}),false);
   assert.equal(createOAuthWorkDeliveryResolver({bindingsJson,now:()=>+now+700000})({oauthPrincipal:a,
     contract:f.store.listTopic(packetTopicForMcpTask(taskId)).find(x=>x.payload?.phase==='created').payload.access_context}),false);
   assert.equal(recordMandateControl(f.store,{principal_ref:'principal:jhn',mandate_ref:REF,action:'revoke',reason:'fixture'}).ok,true);
   assert.equal((await rpc('tasks/get',{taskId},b)).error?.code,-32602);
 }finally{f.store.close()}
});


test('Supabase delivery profile: same user, distinct signed client IDs, one COP result',async()=>{
 const f=fixture();
 const issuer='https://project.fixture.test/auth/v1',audience='https://mcp.fixture.test/mcp';
 const keys=generateKeyPairSync('ec',{namedCurve:'P-256'});
 const jwk={...keys.publicKey.export({format:'jwk'}),kid:'fixture',alg:'ES256',use:'sig'};
 const subject='11111111-1111-4111-8111-111111111111';
 const clientA='22222222-2222-4222-8222-222222222222';
 const clientB='33333333-3333-4333-8333-333333333333';
 const clientC='44444444-4444-4444-8444-444444444444';
 const opts={issuer,audience,jwksUrl:issuer+'/.well-known/jwks.json',nowMs:+now,
   fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
 async function proof(client_id){
   const h=Buffer.from(JSON.stringify({alg:'ES256',kid:jwk.kid})).toString('base64url');
   const p=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:subject,
     exp:Math.floor(+now/1000)+600,client_id,role:'authenticated',is_anonymous:false,scope:'openid email'})).toString('base64url');
   const b=h+'.'+p;
   return verifySupabaseWorkDeliveryToken(b+'.'+sign('sha256',Buffer.from(b),
      {key:keys.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url'),opts);
 }
 const delivery={destination_ref:'destination:fixture-personal',recipient_ref:'principal:jhn',
   visibility:'public',provider_account_ref:null,subject_ref:null,twin_ref:null};
 const bindingsJson=JSON.stringify([{issuer,subject,principal:'principal:jhn',work_delivery:[
  {...delivery,client_id:clientA},{...delivery,client_id:clientB},
  {...delivery,client_id:clientC,destination_ref:'destination:collective'}]}]);
 const resolveDelivery=createSupabaseWorkDeliveryResolver({issuer,audience,bindingsJson,now:()=>+now});
 let calls=0;
 const real=process.env.COGENTIA_342_REALITY_DAEMON_URL;
 const realCore=real?createMcpCore({COGENTIA_MCP_VIEW:'public',COGENTIA_DAEMON_URL:real}):null;
 const publicCore={async callTool(...args){
   calls++;
   if(realCore)return realCore.callTool(...args);
   return {ok:true,status:'completed',text:JSON.stringify({ok:true,view:'public',results:[{id:'fixture:ccc'}]}),
     accounting:{observed_steps:2,tool_calls_count:1,external_effects:0,internal_effects:0,ithaca_returned:true}};
 }};
 const make=()=>createCanonicalJohnPublicWorkPilot({...f,resolveDelivery,publicCore,
    primaryStoreId:'sqlite:fixture-ccc',ownerInstanceRef:'instance:fixture-ccc',now:()=>now});
 const meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28',
   'io.modelcontextprotocol/clientCapabilities':{extensions:{'io.modelcontextprotocol/tasks':{}}}};
 const rpc=(method,params,oauthPrincipal)=>createMcpCore({
    COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_OAUTH_IDENTITY_BINDINGS:bindingsJson
  },{mcpTasksAdapter:make().adapter}).handleJsonRpc({jsonrpc:'2.0',id:1,method,
    params:{...params,_meta:meta}},{oauthPrincipal,headers:{}});
 try{
   const p=make(),{taskId}=await p.adapter.create({name:'cogentia_john_run',args,auth});
   const [a,b,c]=await Promise.all([proof(clientA),proof(clientB),proof(clientC)]);
   const done=await p.run(taskId,auth);
   assert.equal(done.status,'completed');
   const before=f.store.replay().length;
   const aa=await rpc('tasks/get',{taskId},a),bb=await rpc('tasks/get',{taskId},b);
   assert.equal(aa.result?.status,'completed',JSON.stringify(aa));
   assert.deepEqual(aa.result.result,bb.result.result);
   assert.deepEqual(aa.result.result,done.result);
   assert.equal((await rpc('tasks/get',{taskId},c)).error?.code,-32602);
   assert.equal((await rpc('tasks/cancel',{taskId},a)).error?.code,-32602);
   assert.equal((await rpc('tasks/update',{taskId,inputResponses:{answer:'fixture'}},b)).error?.code,-32602);
   assert.equal(f.store.replay().length,before);
   assert.equal(f.ledger().snapshot().settled.max_steps,2);
   assert.equal(calls,1);
   if(real)console.log('CCC_SUPABASE_CLIENT_IDS_REAL_DAEMON',JSON.stringify({
      results:JSON.parse(done.result.content[0].text).result.results.length,
      provider_calls:calls,identical_delivery:true,additional_events:0,settled_steps:2}));
 }finally{f.store.close()}
});
