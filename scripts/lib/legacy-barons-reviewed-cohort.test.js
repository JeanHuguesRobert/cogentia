import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {previewPublicLegacyJudgment} from './legacy-public-judgment-cps.js';
import {inspectAutoPublicLegacyJudgment,autoAssignPublicLegacyJudgment,
  PUBLIC_COHORT_POLICIES} from './legacy-public-judgment-auto-assign.js';
import {runResidentPublicLegacyJudgmentSettlement} from './legacy-public-judgment-resident.js';
import {reconcilePacketParentContinuations} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {quarantineUncertainBrowserDelivery,inspectQuarantinedBrowserDelivery}
  from './chatgpt-cps-delivery-quarantine.js';
import {projectPacketTemperature}from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import{runChatgptCpsResidentCycle}from '../ops/ona-chatgpt-cps-reconcile.mjs';

const PATHS=PUBLIC_COHORT_POLICIES.baronsReviewed.paths;
const record=(id,path,repo='barons-Mariani')=>({id,status:'active',
 kind:'index.document_role_judgment',subject:{repo,path},
 expected_response:{format:'json',required:['decision','reason'],
 allowed_decisions:['index','skip','source','needs_more_context']},
 created_at:'2026-11-16T15:00:00Z',history:[{event:'emitted'}],resolution:null});
const content=(publicFlag=true)=>'---\ntitle: "Public editorial document"\n'+
  (publicFlag?'visibility: "public"\n':'visibility: "private"\n')+
  'document_role: "project"\n---\n# Public editorial content\nNo sensitive details.\n';
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'barons-reviewed-cohort-'));
 for(const path of [...PATHS,'projects/school/unreviewed-private.md']){
   mkdirSync(join(root,path.substring(0,path.lastIndexOf('/'))),{recursive:true});
   writeFileSync(join(root,path),content(!path.endsWith('unreviewed-private.md')));
 }
 execFileSync('git',['-C',root,'init','-q','-b','main']);
 execFileSync('git',['-C',root,'add','.']);
 execFileSync('git',['-C',root,'-c','user.email=test@local.invalid',
   '-c','user.name=Test','commit','-qm','published public documents']);
 execFileSync('git',['-C',root,'update-ref','refs/remotes/origin/main','HEAD']);
 const localFile=join(root,'continuations.sqlite');
 const rows=[...PATHS.map((p,i)=>record('ctn_reviewed_'+(i+1),p)),
   record('ctn_reviewed_private','projects/school/unreviewed-private.md')];
 const local=createContinuationSqliteRepository({registryRoot:root,dbPath:localFile});
 for(const row of rows)assert.equal(local.save(row).ok,true);
 local.close();
 const journal=join(root,'cop.sqlite'),store=createSqliteCopEventStore(journal);
 const admit=async()=>({granted:true,provider_permitted:true,budget_admitted:true,
   authorization_ref:'mandate:test',provider_permission_receipt_ref:'provider:test',
   budget_authorization_ref:'budget:test'});
 const prepare=async({store,task_ref,question})=>{
   const id='ctn_chatgpt_browser_'+createHash('sha256').update(task_ref).digest('hex').slice(0,32);
   const key='continuation:'+id+':declared';
   const receipt=store.append({topic_id:'continuation:'+id,event_type:'cop.event/v1',
     actor_id:'cop:test',subject_ref:'continuation:'+id,epistemic_status:'observed',
     idempotency_key:key,payload:{profile:'cop/continuation',continuation:{
       continuation_id:id,provider:'chatgpt',channel:'browser',
       state:{assignment_ref:task_ref,question}}}});
   if(!receipt.ok)throw Error('cannot create test declaration');
   return {ok:true,continuation_id:id,declaration_receipt_ref:key};
 };
 const kwargs={store,registryRoot:root,sourceRoot:root,localDbPath:localFile,
   cohort:'baronsReviewed',enabled:true,admit,prepare};
 return {root,rows,store,localFile,journal,kwargs,admit,prepare,
   run:(extra={})=>autoAssignPublicLegacyJudgment({...kwargs,...extra}),
   close:()=>{store.close();rmSync(root,{recursive:true,force:true})}};
}
const append=(store,topic,id,payload)=>store.append({topic_id:topic,
 event_type:'cop.event/v1',actor_id:'cop:test',subject_ref:topic,
 epistemic_status:'observed',idempotency_key:id,payload});

async function returnAndSettle(f,result,decision='index'){
 const child='continuation:'+result.cps_child_id,parent='continuation:'+result.legacy_id;
 assert.equal(append(f.store,child,'returned:'+result.legacy_id,{
   profile:'cop.continuation-result/v1',phase:'returned',candidate_result:{
     status:'answered',result:{packet_status:'completed',answer:JSON.stringify({
       decision,reason:'Verified public editorial document, suitable for indexing.'})}}}).ok,true);
 assert.equal(append(f.store,child,'accepted:'+result.legacy_id,{
   profile:'cop.continuation-result/v1',phase:'accepted'}).ok,true);
 assert.equal(append(f.store,child,'completed:'+result.legacy_id,{
   profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
   parent_packet_status:'completed'}).ok,true);
 const reconcile=await reconcilePacketParentContinuations(f.store);
 assert.equal(reconcile.ok,true);
 let casCount=0;
 const settlement=await runResidentPublicLegacyJudgmentSettlement({store:f.store,
   registryRoot:f.root,sourceRoot:'/srv/cogentia/repos/cogentia',
   baronsSourceRoot:f.root,localDbPath:f.localFile,max_steps:1,
   resolveCli:async({continuation_id,payload})=>{
     assert.equal(continuation_id,result.legacy_id);
     casCount++;
     const local=createContinuationSqliteRepository({registryRoot:f.root,
       dbPath:f.localFile});
     try{
       const row=local.load(continuation_id);
       row.status='resolved';row.resolution={decision:payload.decision,
         reason:payload.reason,payload};
       assert.equal(local.save(row).ok,true);
       return {ok:true};
     }finally{local.close()}
   }});
 assert.equal(settlement.settled,1,JSON.stringify(settlement));
 assert.equal(casCount,1);
 assert.equal(f.store.listTopic(parent).filter(e=>
   e.payload?.phase==='local_resolution_confirmed').length,1);
}

test('reviewed Barons policy is an exact three-file allowlist; visibility and publication required',()=>{
 const f=fixture();try{
   assert.deepEqual(PATHS,[
     'projects/school/README.md',
     'projects/school/editorial-architecture.md',
     'projects/1755/magazine/2026-10-09-une-cote-pour-la-constitution.md']);
   const r=inspectAutoPublicLegacyJudgment({store:f.store,localRecords:f.rows,
     cohort:'baronsReviewed',sourceRoot:f.root});
   assert.equal(r.status,'candidate_ready');assert.equal(r.source_path,PATHS[0]);
   const privacy=previewPublicLegacyJudgment({continuation:f.rows[3],
     publicRepo:'barons-Mariani',repositoryRoot:f.root});
   assert.equal(privacy.status,'explicit_public_frontmatter_required');
   const foreign=previewPublicLegacyJudgment({continuation:f.rows[0],
     publicRepo:'cogentia',repositoryRoot:f.root});
   assert.equal(foreign.ok,false);
   assert.equal(f.store.replay().length,0);
 }finally{f.close()}
});

test('unpublished Barons draft and unreviewed public path must never be auto-assigned',async()=>{
 const f=fixture();try{
   writeFileSync(join(f.root,PATHS[0]),content()+'\nUnpublished local draft.\n');
   const preview=inspectAutoPublicLegacyJudgment({store:f.store,localRecords:f.rows,
     cohort:'baronsReviewed',sourceRoot:f.root});
   assert.equal(preview.source_path,PATHS[1]);
   // A new public file outside the reviewed policy is not a candidate.
   const extraPath='projects/school/other-public.md';
   writeFileSync(join(f.root,extraPath),content());
   const extra=record('ctn_unreviewed_public',extraPath);
   const x=inspectAutoPublicLegacyJudgment({store:f.store,
     localRecords:[extra],cohort:'baronsReviewed',sourceRoot:f.root});
   assert.equal(x.status,'no_public_candidate');
 }finally{f.close()}
});

test('three independently admitted public judgments settle sequentially and never replay',async()=>{
 const f=fixture();try{
   for(let i=0;i<3;i++){
     const current=await f.run();
     assert.equal(current.status,'assigned_pending_judgment',JSON.stringify(current));
     assert.equal(current.legacy_id,'ctn_reviewed_'+(i+1));
     const blocked=await f.run();
     assert.equal(blocked.assigned,0);
     assert.equal(blocked.status,'browser_turn_in_flight');
     await returnAndSettle(f,current,i===2?'source':'index');
   }
   const finished=await f.run();
   assert.equal(finished.status,'cohort_exhausted');
   assert.equal(finished.assigned,0);
   assert.equal(f.store.replay().filter(e=>e.payload?.profile===
     'cogentia.legacy-public-auto-assignment/v1'&&
     e.payload?.cohort_id===PUBLIC_COHORT_POLICIES.baronsReviewed.id).length,3);
   assert.equal(f.store.auditCommitments().ok,true);
   const again=await f.run();assert.equal(again.status,'cohort_exhausted');
 }finally{f.close()}
});


test('one quarantined uncertain CPS child does not starve two independent reviewed judgments',async()=>{
 const f=fixture();try{
  const first=await f.run();
  assert.equal(first.legacy_id,'ctn_reviewed_1');
  const child='continuation:'+first.cps_child_id;
  assert.equal(append(f.store,child,
    'chatgpt-browser:'+first.cps_child_id+':first-dispatch-intent',{
      profile:'cop.continuation-browser-dispatch/v1',phase:'intent_committed',
      continuation_id:first.cps_child_id}).ok,true);
  assert.equal((await f.run()).status,'browser_turn_in_flight');
  const q=quarantineUncertainBrowserDelivery(f.store,{
    continuation_id:first.cps_child_id,
    transition_id:'park-first-uncertain-without-redelivery'});
  assert.equal(q.ok,true,JSON.stringify(q));
  assert.equal(projectPacketTemperature(f.store,{packet_ref:'continuation:'+first.legacy_id}).runnable,false);
  assert.equal(projectPacketTemperature(f.store,{packet_ref:child}).runnable,false);
  assert.equal(q.retry_authorized,false);
  // The previously blocked ONA worker must become healthy without any
  // attempted retry of the first browser continuation.
  const cycle=await runChatgptCpsResidentCycle({store:f.store,
    reconcile:async()=>({ok:true,steps_completed:0,pending_count:0,needs_reconciliation:0}),
    env:{COGENTIA_CPS_BROWSER_DISPATCH_ENABLED:'1'}});
  assert.equal(cycle.ok,true,JSON.stringify(cycle));
  assert.equal(cycle.assigned_needs_reconciliation,0);
  assert.equal(cycle.pending_assigned,0);
  const second=await f.run();
  assert.equal(second.legacy_id,'ctn_reviewed_2',JSON.stringify(second));
  assert.equal((await f.run()).status,'browser_turn_in_flight');
  await returnAndSettle(f,second);
  const third=await f.run();
  assert.equal(third.legacy_id,'ctn_reviewed_3',JSON.stringify(third));
  await returnAndSettle(f,third,'source');
  const finished=await f.run();
  assert.equal(finished.status,'cohort_exhausted');
  assert.equal(f.store.listTopic(child).filter(e=>
    e.payload?.phase==='ui_click_dispatched_not_model_result').length,0);
  assert.equal(f.store.listTopic(child).filter(e=>
    e.payload?.phase==='intent_committed').length,1);
  const local=createContinuationSqliteRepository({registryRoot:f.root,dbPath:f.localFile});
  try{
    assert.equal(local.load(first.legacy_id).status,'active');
    assert.equal(local.load(second.legacy_id).status,'resolved');
    assert.equal(local.load(third.legacy_id).status,'resolved');
  }finally{local.close()}
  assert.equal(append(f.store,child,'late-observed:'+first.cps_child_id,{
    profile:'cop.continuation-result/v1',phase:'returned'}).ok,true);
  const cold=inspectQuarantinedBrowserDelivery(f.store,first.cps_child_id);
  assert.equal(cold.late_return_observed,true);
  assert.equal(projectPacketTemperature(f.store,{packet_ref:child}).runnable,false);
  assert.equal(f.store.auditCommitments().ok,true);
 }finally{f.close()}
});
