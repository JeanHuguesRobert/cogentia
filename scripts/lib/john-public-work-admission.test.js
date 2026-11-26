import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createServer} from 'node:http';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {projectPacketWorkAssignment} from '../../../inseme/packages/cop-core/src/packet-work-assignment.js';
import {createMcpCore} from './cogentia-mcp-core.js';
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
 const state={destination:'destination:fixture-personal',verified:true};
 // Fixture for the independently verified Principal's exact commissioning
 // and destination context. A transport token alone cannot satisfy this.
 const resolveContext=({request_hash})=>({verified:state.verified,
   principal_ref:'principal:jhn',commissioned_by_principal_ref:'principal:jhn',
   request_hash,result_visibility:'public',destination_ref:state.destination,
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
