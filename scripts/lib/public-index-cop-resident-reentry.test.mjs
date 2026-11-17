/** CPKT-2026-010: COP accepted-return -> existing resident -> real CLI
 * -> durable local reentry -> SAME index update, all on disposable stores.
 *
 * COP events here are fixtures, not verified JHN credentials or a live browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {createPrimitiveContinuationStore} from './primitive-continuations.mjs';
import {inspectAcceptedLegacyPublicIndex,bindAcceptedLegacyPublicIndex,
  recordAcceptedLegacyPublicReentry}
  from './legacy-public-index-reentry-backfill.mjs';
import {previewPublicLegacyJudgment} from './legacy-public-judgment-cps.js';
import {linkPacketChild,registerParentJoin,reconcilePacketParentContinuations}
  from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {runResidentPublicLegacyJudgmentSettlement}
  from './legacy-public-judgment-resident.js';
import {createMcpCore} from './cogentia-mcp-core.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {createCanonicalMcpJudgmentResultHost,RESULT_RETURN_CAPABILITY}
  from './cogentia-mcp-judgment-result-host.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,
  proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {createEventSourcedExecutionBudgetLedger}
  from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {preparePublicLegacyJudgmentCps} from './legacy-public-judgment-cps.js';


const cli=resolve('scripts/cogentia.js');
const reason='Published public documentation is an indexable source with a meaningful section.';
function setup({seedAccepted=true}={}){
 const root=mkdtempSync(join(tmpdir(),'cop-resident-reentry-'));
 mkdirSync(join(root,'docs'));
 writeFileSync(join(root,'docs','public.md'),
  '---\ntitle: Public guide\nvisibility: public\n---\n# Public guide\n## Scope\nA well-defined public chapter.\n');
 writeFileSync(join(root,'.cogentia.json'),JSON.stringify({repos:[{
  name:'cogentia',path:'docs',branch:'main',kind:'public',
 }]}));
 execFileSync('git',['-C',join(root,'docs'),'init','-q','-b','main']);
 execFileSync('git',['-C',join(root,'docs'),'add','public.md']);
 execFileSync('git',['-C',join(root,'docs'),'-c','user.email=robot@local.invalid',
  '-c','user.name=Test','commit','-qm','published test source']);
 execFileSync('git',['-C',join(root,'docs'),'update-ref','refs/remotes/origin/main','HEAD']);
 const localDbPath=join(root,'continuations.sqlite'),copPath=join(root,'cop.sqlite');
 const env={...process.env,COGENTIA_REGISTRY:join(root,'.cogentia.json'),
  COGENTIA_CONTINUATIONS_DB:localDbPath,COGENTIA_DATA_DIR:join(root,'data')};
 const run=(...args)=>{
  const p=spawnSync(process.execPath,[cli,...args,'--json'],{encoding:'utf8',env,timeout:25000});
  let data;try{data=JSON.parse(p.stdout||'{}')}catch{throw Error(p.stdout+' '+p.stderr)}
  return {...p,data};
 };
 const produced=run('index','rebuild');
 assert.equal(produced.status,0,produced.stdout);
 assert.equal(produced.data.partial,true);
 const id=produced.data.continuations[0].id;
 const repo=()=>createContinuationSqliteRepository({registryRoot:root,dbPath:localDbPath});
 const local=repo(),continuation=local.load(id);local.close();
 assert.ok(continuation.resumption_target?.handler_ref);
 const p=previewPublicLegacyJudgment({continuation,repositoryRoot:join(root,'docs')});
 assert.equal(p.ok,true,JSON.stringify(p));
 const store=createSqliteCopEventStore(copPath);
 const child=p.child_ref,parent=p.parent_ref;
 const emit=(topic,key,payload)=>{
  const r=store.append({topic_id:topic,event_type:'cop.event/v1',
   actor_id:'cop:fixture',subject_ref:topic,epistemic_status:'observed',
   idempotency_key:key,payload});
  assert.equal(r.ok,true,JSON.stringify(r));
 };
 if(seedAccepted){
 emit(child,'declared:cpkt010',{profile:'cop/continuation',
  continuation:{continuation_id:child.slice(13),provider:'chatgpt',
   channel:'browser',state:{assignment_ref:p.task_ref,question:p.question}}});
 assert.equal(linkPacketChild(store,{parent_ref:parent,child_ref:child}).ok,true);
 assert.equal(registerParentJoin(store,{parent_ref:parent,
  join_id:'public-document-role-judgment',mode:'all'}).ok,true);
 emit(child,'returned:cpkt010',{profile:'cop.continuation-result/v1',phase:'returned',
  candidate_result:{status:'answered',result:{answer:JSON.stringify({
   decision:'source',reason}),packet_status:'completed'}}});
 emit(child,'accepted:cpkt010',{profile:'cop.continuation-result/v1',phase:'accepted'});
 emit(child,'completed:cpkt010',{profile:'cop.continuation-dispatch/v1',
  phase:'handler_completed',parent_packet_status:'completed'});
 }
 return {root,env,id,repo,store,run,p,parent,localDbPath,child,
  settle:options=>runResidentPublicLegacyJudgmentSettlement({
   store,registryRoot:root,sourceRoot:join(root,'docs'),localDbPath,
   ...options}),
  cleanup:()=>{store.close();rmSync(root,{recursive:true,force:true})}};
}

test('COP source receipt alone must NOT confirm local work without successful reentry',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const r=await c.settle({resolveCli:async()=>({ok:true})});
  assert.equal(r.settled,0,'no local CAS or reentry occurred');
  const local=c.repo();
  assert.equal(local.load(c.id).status,'active');
  local.close();
  assert.equal(c.store.listTopic(c.parent).filter(e=>
   e.payload?.phase==='local_resolution_confirmed').length,0);
 }finally{c.cleanup()}
});

test('COP resident must retry crash window: local resolved, but no resume artifact',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const db=c.repo(),row=db.load(c.id);
  row.status='resolved';
  row.resolution={decision:'source',reason,payload:{
   continuation_id:c.id,decision:'source',reason,
   cps_child_ref:c.child,cps_return_receipt_ref:'returned:cpkt010',
   source_digest:c.p.source_digest},return_state:{result_available:true,delivered:false}};
  row.history.push({event:'resolved'});
  db.save(row);db.close();
  const r=await c.settle({resolveCli:async()=>({ok:true})});
  assert.equal(r.settled,0,'not a successful first resolution');
  assert.equal(c.store.listTopic(c.parent).filter(e=>
   e.payload?.phase==='local_resolution_confirmed').length,0,
   'resolved without resumed must never be a complete COP receipt');
 }finally{c.cleanup()}
});

test('accepted COP fixture returns through original resident and resumes real indexer',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const resolveCli=async({continuation_id,payload})=>{
   const out=c.run('continuation','resolve',continuation_id,
    '--payload-json',JSON.stringify(payload));
   assert.equal(out.status,0,JSON.stringify(out.data));
   return {ok:out.data.ok===true,reentry:out.data.reentry};
  };
  const r=await c.settle({resolveCli});
  assert.equal(r.settled,1,JSON.stringify(r));
  const db=c.repo(),after=db.load(c.id);
  assert.equal(after.status,'resolved');
  assert.equal(after.resolution.return_state.resumed,true);
  assert.equal(db.snapshot(c.id).slots.length,1);
  db.close();
  const receipt=c.store.listTopic(c.parent).filter(e=>
   e.payload?.phase==='local_resolution_confirmed');
  assert.equal(receipt.length,1);
  assert.equal(receipt[0].parent_event_ids[0],'returned:cpkt010');
  const index=c.run('index','update');
  assert.equal(index.status,0,JSON.stringify(index.data));
  assert.equal(index.data.partial,false);
  assert.ok(index.data.searchable_public>=1);
  const replay=await c.settle({resolveCli});
  assert.equal(replay.settled,0,'no repeat after COP settlement receipt');
  assert.equal(c.store.auditCommitments().ok,true);
 }finally{c.cleanup()}
});


test('COP accepted return reconciles real crash between local CAS and reentry',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const db=c.repo(),row=db.load(c.id);
  row.status='resolved';
  row.resolution={decision:'source',reason,payload:{
   continuation_id:c.id,decision:'source',reason,
   cps_child_ref:c.child,cps_return_receipt_ref:'returned:cpkt010',
   source_digest:c.p.source_digest},return_state:{
     result_available:true,delivered:false,result_ref:'continuation:'+c.id+'/resolution'}};
  row.history.push({event:'resolved'});
  db.save(row);db.close();
  let retried=0;
  const r=await c.settle({resolveCli:async({continuation_id,payload})=>{
   retried++;
   const out=c.run('continuation','resolve',continuation_id,
    '--payload-json',JSON.stringify(payload));
   assert.equal(out.status,0,JSON.stringify(out.data));
   assert.equal(out.data.reentry.status,'resumed');
   return {ok:out.data.ok===true,reentry:out.data.reentry};
  }});
  assert.equal(r.reconciled,1,JSON.stringify(r));
  assert.equal(retried,1);
  const final=c.repo(),rowAfter=final.load(c.id);
  assert.equal(rowAfter.resolution.return_state.resumed,true);
  assert.equal(final.snapshot(c.id).slots.length,1);
  final.close();
  const receipts=c.store.listTopic(c.parent).filter(e=>
   e.payload?.phase==='local_resolution_confirmed');
  assert.equal(receipts.length,1);
  assert.equal(receipts[0].payload.local_work_status,'resumed');
  assert.ok(receipts[0].payload.local_resume_receipt_ref);
  assert.ok(receipts[0].payload.local_output_artifact_ref);
  assert.ok(c.run('index','update').data.searchable_public>0);
  const again=await c.settle({resolveCli:async()=>{throw Error('unexpected repeat')}});
  assert.equal(again.settled,0);
  assert.equal(again.reconciled,0);
 }finally{c.cleanup()}
});

test('COP confirmation is refused for a corrupt local reentry receipt',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const result=await c.settle({resolveCli:async({continuation_id,payload})=>{
   const out=c.run('continuation','resolve',continuation_id,
    '--payload-json',JSON.stringify(payload));
   assert.equal(out.status,0,JSON.stringify(out.data));
   const db=c.repo(),row=db.load(c.id);
   row.resolution.return_state.resume_receipt_ref='invented:receipt';
   db.save(row);db.close();
   return {ok:true};
  }});
  assert.equal(result.settled,0);
  assert.equal(result.needs_review,1);
  assert.equal(result.findings[0].status,'local_reentry_receipt_mismatch');
  assert.equal(c.store.listTopic(c.parent).filter(e=>
    e.payload?.phase==='local_resolution_confirmed').length,0);
 }finally{c.cleanup()}
});


test('signed COP fixture: admitted MCP result -> budget settlement -> resident -> real indexer',async()=>{
 const c=setup({seedAccepted:false});
 try{
  const now=new Date('2026-11-17T12:00:00Z');
  const keys=generateKeyPairSync('ed25519');
  const pem=keys.publicKey.export({type:'spki',format:'pem'});
  const mandate='mandate:jhn:john-root',budgetId='budget:'+mandate;
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:mandate,version:'v1',
   principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
   valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',
   scope:{allowed_actions:[RESULT_RETURN_CAPABILITY,'browser.chatgpt.turn'],
    forbidden_actions:[...RESERVED_ACTIONS],
    chatgpt_turn_policy:{max_consecutive_turns:2}},
   max_delegation_depth:1,budget_limits:{max_steps:5}};
  const approval={kind:'cogentia.principal-signature/v1',
    principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),
    key_fingerprint:publicKeyFingerprint(pem),
    signature_base64:sign(null,canonicalProposalBytes(proposal),keys.privateKey)
      .toString('base64')};
  const issued=issueVerifiedJohnRoot({store:c.store,proposal,approval,
    trustedPublicKeyPem:pem,now});
  assert.equal(issued.ok,true,JSON.stringify(issued));
  const ledger=createEventSourcedExecutionBudgetLedger({store:c.store,
    budget_id:budgetId,limits:{max_steps:5},require_authority_grant:true});
  const local=c.repo(),pending=local.load(c.id);local.close();
  const assigned=await preparePublicLegacyJudgmentCps({store:c.store,
    continuation:pending,repositoryRoot:join(c.root,'docs')});
  assert.equal(assigned.ok,true,JSON.stringify(assigned));
  const declaration=c.store.listTopic(c.child).find(e=>
    e.payload?.profile==='cop/continuation')?.payload?.continuation;
  assert.ok(declaration?.claim?.claim_id);
  const verifyIssuer=createOfflineJohnIssuerVerifier({
   trustedPublicKeyPem:pem,now:()=>now});
  const core=createMcpCore({
    COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_JHN_MUTATE:'1',
    COGENTIA_MCP_JHN_TOKEN:'fixture-token',
  },{mcpContinuationResultHost:createCanonicalMcpJudgmentResultHost({
    store:c.store,mandate_ref:mandate,budget_id:budgetId,
    transport_mandate_label:'mandate:chatgpt-corpus-coding',
    verifyIssuer,
    channelPermission:({provider,channel})=>provider==='chatgpt'&&channel==='browser',
    autoProcess:true,
  })});
  const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',
   COGENTIA_MCP_JHN_TOKEN:'fixture-token'},{
    headers:{authorization:'Bearer fixture-token'},
    meta:{'cogentia.actor':'agent:jhn',
     'cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
  const step_result={protocol:'cogentia.step_result/v1',
    continuation_id:declaration.continuation_id,
    challenge:declaration.correlation.challenge,status:'answered',
    result:{answer:JSON.stringify({decision:'source',reason}),
      packet_status:'completed'}};
  const submission={protocol:'cop.continuation-result-submit/v0',
    continuation_id:declaration.continuation_id,attempt_id:declaration.attempt_id,
    execution_binding_ref:declaration.execution_binding_ref,
    continuation_version:'1',idempotency_key:'fixture:cpkt010:mcp-return',
    result_digest:hashPayload(step_result),step_result};
  const first=await core.callTool('cogentia_continuation_result_submit',submission,{auth});
  assert.equal(first.ok,true,JSON.stringify(first));
  assert.equal(first.continuation_status,'returned',JSON.stringify(first));
  assert.equal(ledger.snapshot().settled.max_steps,1);
  const retry=await core.callTool('cogentia_continuation_result_submit',submission,{auth});
  assert.equal(retry.duplicate,true);
  assert.equal(ledger.snapshot().settled.max_steps,1);
  const joins=await reconcilePacketParentContinuations(c.store);
  assert.ok(joins.notified>=1,JSON.stringify(joins));
  const r=await c.settle({resolveCli:async({continuation_id,payload})=>{
    const out=c.run('continuation','resolve',continuation_id,
      '--payload-json',JSON.stringify(payload));
    return {ok:out.data.ok===true};
  }});
  assert.equal(r.settled,1,JSON.stringify(r));
  assert.equal(c.run('index','update').data.partial,false);
  const confirmation=c.store.listTopic(c.parent).find(e=>
    e.payload?.phase==='local_resolution_confirmed');
  assert.equal(confirmation.payload.local_work_status,'resumed');
  assert.ok(confirmation.payload.local_resume_receipt_ref);
  assert.equal(c.store.auditCommitments().ok,true);
 }finally{c.cleanup()}
});

test('an unaccepted COP return cannot confirm locally resumed work',async()=>{
 const c=setup({seedAccepted:false});
 try{
  const record=payload=>{
   const r=c.store.append({topic_id:c.child,event_type:'cop.event/v1',
     actor_id:'cop:fixture',subject_ref:c.child,epistemic_status:'observed',
     idempotency_key:'unaccepted:'+payload.profile+':'+(payload.phase||'declaration'),
     payload});
   assert.equal(r.ok,true);
   return r.event.idempotency_key;
  };
  record({profile:'cop/continuation',continuation:{
   continuation_id:c.child.slice(13),provider:'chatgpt',channel:'browser',
   state:{assignment_ref:c.p.task_ref,question:c.p.question}}});
  assert.equal(linkPacketChild(c.store,{parent_ref:c.parent,child_ref:c.child}).ok,true);
  assert.equal(registerParentJoin(c.store,{parent_ref:c.parent,
   join_id:'public-document-role-judgment',mode:'all'}).ok,true);
  const ref=record({profile:'cop.continuation-result/v1',phase:'returned',
   candidate_result:{status:'answered',result:{
    answer:JSON.stringify({decision:'source',reason}),packet_status:'completed'}}});
  const localReturn=c.run('continuation','resolve',c.id,'--payload-json',JSON.stringify({
   continuation_id:c.id,decision:'source',reason,cps_child_ref:c.child,
   cps_return_receipt_ref:ref,source_digest:c.p.source_digest,
  }));
  assert.equal(localReturn.status,0,JSON.stringify(localReturn.data));
  assert.equal(localReturn.data.reentry.status,'resumed');
  const reconcile=await c.settle();
  assert.equal(reconcile.settled,0);
  assert.equal(reconcile.reconciled,0);
  assert.equal(reconcile.needs_review,1);
  assert.equal(reconcile.findings[0].status,'legacy_resolved_cop_acceptance_not_verified');
  assert.equal(c.store.listTopic(c.parent).filter(x=>
   x.payload?.phase==='local_resolution_confirmed').length,0);
 }finally{c.cleanup()}
});


test('H4: imported local packet is NOT authorized by source-locality COP credentials',async()=>{
 const c=setup({seedAccepted:false});
 const destination=mkdtempSync(join(tmpdir(),'cpkt010-new-locality-'));
 let second=null;
 try{
  mkdirSync(join(destination,'docs'));
  copyFileSync(join(c.root,'docs','public.md'),
   join(destination,'docs','public.md'));
  writeFileSync(join(destination,'.cogentia.json'),JSON.stringify({repos:[{
   name:'cogentia',path:'docs',branch:'main',kind:'public',
  }]}));
  execFileSync('git',['-C',join(destination,'docs'),'init','-q','-b','main']);
  execFileSync('git',['-C',join(destination,'docs'),'add','public.md']);
  execFileSync('git',['-C',join(destination,'docs'),'-c','user.email=robot@local.invalid',
   '-c','user.name=Test','commit','-qm','same public source']);
  execFileSync('git',['-C',join(destination,'docs'),'update-ref',
   'refs/remotes/origin/main','HEAD']);
  const origin=c.repo(),snapshot=origin.snapshot(c.id);origin.close();
  const dbPath=join(destination,'continuations.sqlite');
  const primitive=createPrimitiveContinuationStore(dbPath);
  const copied=primitive.importSnapshot(snapshot,{scope:'imported:test-locality'});
  assert.equal(copied.ok,true);
  primitive.close();
  const imported=createContinuationSqliteRepository({
   registryRoot:destination,dbPath});
  const document=imported.load(c.id);
  assert.equal(document.context.source_sha256,
   c.p.source_digest);
  imported.close();
  second=createSqliteCopEventStore(join(destination,'cop.sqlite'));
  const denied=await preparePublicLegacyJudgmentCps({
   store:second,continuation:document,
   repositoryRoot:join(destination,'docs')});
  assert.equal(denied.ok,false);
  assert.equal(denied.status,'signed_chatgpt_turn_mandate_required');
  assert.equal(second.replay().length,0,
   'source-locality claim and budget are not inherited');
  assert.equal(c.store.replay().length,0,'original COP store is untouched');
  // A second trusted issuer and independent budget authorize only this
  // destination. The former locale supplies no mandate, session or token.
  const now=new Date('2026-11-17T12:00:00Z');
  const freshKeys=generateKeyPairSync('ed25519');
  const freshPem=freshKeys.publicKey.export({type:'spki',format:'pem'});
  const mandate='mandate:jhn:john-root',budgetId='budget:'+mandate;
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:mandate,version:'v1',
   principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
   valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',
   scope:{allowed_actions:[RESULT_RETURN_CAPABILITY,'browser.chatgpt.turn'],
    forbidden_actions:[...RESERVED_ACTIONS],
    chatgpt_turn_policy:{max_consecutive_turns:2}},
   max_delegation_depth:1,budget_limits:{max_steps:2}};
  const approval={kind:'cogentia.principal-signature/v1',
    principal_ref:'principal:jhn',payload_hash:proposalHash(proposal),
    key_fingerprint:publicKeyFingerprint(freshPem),
    signature_base64:sign(null,canonicalProposalBytes(proposal),
      freshKeys.privateKey).toString('base64')};
  assert.equal(issueVerifiedJohnRoot({store:second,proposal,approval,
    trustedPublicKeyPem:freshPem,now}).ok,true);
  const assigned=await preparePublicLegacyJudgmentCps({
   store:second,continuation:document,repositoryRoot:join(destination,'docs')});
  assert.equal(assigned.ok,true,JSON.stringify(assigned));
  const budget=createEventSourcedExecutionBudgetLedger({store:second,
   budget_id:budgetId,limits:{max_steps:2},require_authority_grant:true});
  assert.equal(budget.snapshot().reserved.max_steps,1);
  const declared=second.listTopic(c.child).find(e=>
    e.payload?.profile==='cop/continuation')?.payload?.continuation;
  assert.ok(declared?.claim?.claim_id);
  const core=createMcpCore({
    COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_JHN_MUTATE:'1',
    COGENTIA_MCP_JHN_TOKEN:'destination-token',
  },{mcpContinuationResultHost:createCanonicalMcpJudgmentResultHost({
    store:second,mandate_ref:mandate,budget_id:budgetId,
    transport_mandate_label:'mandate:chatgpt-corpus-coding',
    verifyIssuer:createOfflineJohnIssuerVerifier({
     trustedPublicKeyPem:freshPem,now:()=>now}),
    channelPermission:({provider,channel})=>provider==='chatgpt'&&channel==='browser',
    autoProcess:true,
  })});
  const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',
   COGENTIA_MCP_JHN_TOKEN:'destination-token'},{
    headers:{authorization:'Bearer destination-token'},
    meta:{'cogentia.actor':'agent:jhn',
     'cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
  const step_result={protocol:'cogentia.step_result/v1',
    continuation_id:declared.continuation_id,
    challenge:declared.correlation.challenge,status:'answered',
    result:{answer:JSON.stringify({decision:'source',reason}),
      packet_status:'completed'}};
  const submission={protocol:'cop.continuation-result-submit/v0',
    continuation_id:declared.continuation_id,attempt_id:declared.attempt_id,
    execution_binding_ref:declared.execution_binding_ref,
    continuation_version:'1',idempotency_key:'fixture:destination:mcp-return',
    result_digest:hashPayload(step_result),step_result};
  const completed=await core.callTool('cogentia_continuation_result_submit',
    submission,{auth});
  assert.equal(completed.ok,true,JSON.stringify(completed));
  assert.equal(budget.snapshot().settled.max_steps,1);
  assert.ok((await reconcilePacketParentContinuations(second)).notified>=1);
  const destEnv={...c.env,COGENTIA_REGISTRY:join(destination,'.cogentia.json'),
   COGENTIA_CONTINUATIONS_DB:dbPath,COGENTIA_DATA_DIR:join(destination,'data')};
  for(const key of ['OPENAI_API_KEY','MISTRAL_API_KEY','MAGISTRAL_API_KEY'])
   delete destEnv[key];
  const runDestination=(...args)=>{
   const out=spawnSync(process.execPath,[cli,...args,'--json'],{
    env:destEnv,encoding:'utf8',timeout:25000});
   return {status:out.status,data:JSON.parse(out.stdout||'{}')};
  };
  const resumed=await runResidentPublicLegacyJudgmentSettlement({
   store:second,registryRoot:destination,sourceRoot:join(destination,'docs'),
   localDbPath:dbPath,resolveCli:async({continuation_id,payload})=>{
    const out=runDestination('continuation','resolve',continuation_id,
     '--payload-json',JSON.stringify(payload));
    return {ok:out.status===0&&out.data.ok===true};
   }});
  assert.equal(resumed.settled,1,JSON.stringify(resumed));
  assert.equal(runDestination('index','update').data.partial,false);
  assert.equal(second.auditCommitments().ok,true);
  const original=c.repo();
  assert.equal(original.load(c.id).status,'active','origin work remains unchanged');
  original.close();
 }finally{second?.close();c.cleanup();
  rmSync(destination,{recursive:true,force:true})}
});


test('real accepted historical COP judgment can backfill ONE legacy handler and resume, without re-sending',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const local=c.repo(),record=local.load(c.id);
  // Same legacy schema emitted before H1 existed. Keep original CPS proof.
  record.status='resolved';
  delete record.resumption_target;
  delete record.context.source_sha256;
  record.resolution={decision:'source',reason,
   payload:{continuation_id:c.id,decision:'source',reason,
    cps_child_ref:c.child,cps_return_receipt_ref:'returned:cpkt010',
    source_digest:c.p.source_digest},
   return_state:{result_available:true,delivered:false}};
  record.history.push({event:'resolved'});
  local.save(record);
  local.close();
  const append=c.store.append({topic_id:c.parent,event_type:'cop.event/v1',
   actor_id:'cop:fixture',subject_ref:c.parent,
   idempotency_key:'legacy:historic-settled',epistemic_status:'observed',
   causal_refs:['returned:cpkt010'],
   payload:{profile:'cogentia.legacy-continuation-settlement/v1',
    phase:'local_resolution_confirmed',continuation_id:c.id,decision:'source',
    source_digest:c.p.source_digest,source_return_receipt_ref:'returned:cpkt010',
    local_work_status:'resolved'}});
  assert.equal(append.ok,true);
  const args={store:c.store,continuation_id:c.id,
    repoRoots:{cogentia:join(c.root,'docs')}};
  const reader=c.repo();
  try{
   const preview=inspectAcceptedLegacyPublicIndex({...args,local:reader});
   assert.equal(preview.ok,true,JSON.stringify(preview));
   assert.equal(preview.status,'eligible_for_backfill');
   const bound=bindAcceptedLegacyPublicIndex({...args,local:reader});
   assert.equal(bound.status,'bound_ready_for_reentry');
   assert.equal(bindAcceptedLegacyPublicIndex({...args,local:reader}).duplicate,true);
   const notYet=recordAcceptedLegacyPublicReentry({...args,local:reader});
   assert.equal(notYet.ok,false,'no COP receipt before actual handler execution');
   assert.equal(notYet.status,'local_reentry_pending');
   const done=c.run('continuation','reenter',c.id);
   assert.equal(done.status,0,JSON.stringify(done.data));
   assert.equal(done.data.reentry.status,'resumed');
   const observed=recordAcceptedLegacyPublicReentry({...args,local:reader});
   assert.equal(observed.ok,true,JSON.stringify(observed));
   assert.equal(recordAcceptedLegacyPublicReentry({...args,local:reader}).duplicate,true);
   const auto=await c.settle();
   assert.equal(auto.needs_review,0,JSON.stringify(auto));
   assert.equal(auto.settled,0);
   assert.equal(c.run('index','update').data.partial,false);
   const historical=c.store.listTopic(c.parent).find(e=>
    e.idempotency_key==='legacy:historic-settled');
   assert.equal(historical.payload.local_work_status,'resolved',
    'historical COP receipt MUST remain unchanged');
   const addendum=c.store.eventByIdempotency(observed.receipt_ref);
   assert.equal(addendum.payload.local_work_status,'resumed');
   assert.ok(addendum.parent_event_ids.includes('legacy:historic-settled'));
   const fractalog=c.store.eventByIdempotency(observed.fractalog_receipt_ref);
   assert.ok(fractalog);
   assert.equal(fractalog.payload.schema,'fractalog.act-record/v1');
   assert.equal(fractalog.payload.trace.local_resume_receipt_ref,
     addendum.payload.local_resume_receipt_ref);
   assert.equal(fractalog.payload.effect.provider_effects,0);
   assert.equal(c.store.replay().filter(e=>
    e.event_type==='fractalog.act-record/v1').length,1);
   assert.equal(c.store.auditCommitments().ok,true);
  }finally{reader.close()}
 }finally{c.cleanup()}
});

test('legacy handler backfill refuses a historical result without COP settlement',async()=>{
 const c=setup();
 try{
  assert.ok((await reconcilePacketParentContinuations(c.store)).notified>0);
  const local=c.repo(),record=local.load(c.id);
  record.status='resolved';
  delete record.resumption_target;
  delete record.context.source_sha256;
  record.resolution={decision:'source',reason,
    payload:{cps_child_ref:c.child,cps_return_receipt_ref:'returned:cpkt010',
      source_digest:c.p.source_digest},return_state:{result_available:true,delivered:false}};
  local.save(record);
  const result=bindAcceptedLegacyPublicIndex({store:c.store,local,continuation_id:c.id,
    repoRoots:{cogentia:join(c.root,'docs')}});
  assert.equal(result.status,'canonical_legacy_settlement_not_verified');
  assert.equal(local.load(c.id).resumption_target,undefined);
  local.close();
 }finally{c.cleanup()}
});
