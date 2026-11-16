import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {changePacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {inspectAutoPublicLegacyJudgment,autoAssignPublicLegacyJudgment}
  from './legacy-public-judgment-auto-assign.js';

function fixture(){
 const root=mkdtempSync(join(tmpdir(),'legacy-auto-cohort-'));
 for(const dir of ['skills/alpha','patterns/beta','scripts/fixtures'])
   mkdirSync(join(root,dir),{recursive:true});
 writeFileSync(join(root,'skills/alpha/SKILL.md'),'# Public alpha skill\nPublished usage guide.\n');
 writeFileSync(join(root,'patterns/beta/PATTERN.md'),'# Public beta pattern\nPublished reference.\n');
 writeFileSync(join(root,'scripts/fixtures/case.md'),'# Do not promote fixture\n');
 execFileSync('git',['-C',root,'init','-q','-b','main']);
 execFileSync('git',['-C',root,'add','.']);
 execFileSync('git',['-C',root,'-c','user.email=test@local.invalid',
   '-c','user.name=Fixture','commit','-qm','published content']);
 execFileSync('git',['-C',root,'update-ref','refs/remotes/origin/main','HEAD']);
 const legacyFile=join(root,'local.sqlite');
 const local=createContinuationSqliteRepository({registryRoot:root,dbPath:legacyFile});
 const record=(id,path,repo='cogentia')=>({id,status:'active',
   kind:'index.document_role_judgment',subject:{repo,path},
   expected_response:{required:['decision','reason'],
     allowed_decisions:['index','source','needs_more_context']},
   created_at:'2026-11-16T12:00:00Z',history:[{event:'emitted'}]});
 const records=[record('ctn_auto_alpha_1','skills/alpha/SKILL.md'),
   record('ctn_auto_beta_2','patterns/beta/PATTERN.md'),
   record('ctn_auto_fixture_3','scripts/fixtures/case.md'),
   record('ctn_auto_secret_4','skills/alpha/SKILL.md','private')];
 for(const rec of records)local.save(rec);
 local.close();
 const journal=join(root,'journal.sqlite');
 const store=createSqliteCopEventStore(journal);
 const admit=async()=>({granted:true,provider_permitted:true,budget_admitted:true,
   authorization_ref:'mandate:test',provider_permission_receipt_ref:'permission:test',
   budget_authorization_ref:'budget:test'});
 const prepare=async({store,task_ref})=>{
  const id='ctn_chatgpt_browser_'+createHash('sha256').update(task_ref).digest('hex').slice(0,32);
  const key='continuation:'+id+':declared';
  if(store.eventByIdempotency(key))return {ok:true,duplicate:true,
    continuation_id:id,declaration_receipt_ref:key};
  const e=store.append({topic_id:'continuation:'+id,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:'continuation:'+id,
    idempotency_key:key,epistemic_status:'observed',
    payload:{profile:'cop/continuation',continuation:{
      continuation_id:id,provider:'chatgpt',channel:'browser',
      state:{assignment_ref:task_ref}}}});
  if(!e.ok)return {ok:false};
  return {ok:true,duplicate:false,continuation_id:id,declaration_receipt_ref:key};
 };
 return {root,store,journal,legacyFile,records,admit,prepare,
  run:(extras={})=>autoAssignPublicLegacyJudgment({store,registryRoot:root,
    localDbPath:legacyFile,sourceRoot:root,admit,prepare,enabled:true,...extras}),
  close:()=>{store.close();rmSync(root,{recursive:true,force:true})}};
}

test('preview finds only published public non-fixture documents without creating events',()=>{
 const f=fixture();try{
  const first=inspectAutoPublicLegacyJudgment({store:f.store,localRecords:f.records,
    sourceRoot:f.root});
  assert.equal(first.legacy_id,'ctn_auto_alpha_1');
  assert.equal(first.status,'candidate_ready');
  assert.equal(f.store.replay().length,0);
  writeFileSync(join(f.root,'skills/alpha/SKILL.md'),'# Secret uncommitted draft\n');
  const second=inspectAutoPublicLegacyJudgment({store:f.store,
    localRecords:f.records,sourceRoot:f.root});
  assert.equal(second.legacy_id,'ctn_auto_beta_2');
  assert.equal(f.store.replay().length,0);
 }finally{f.close()}
});

test('without an independent mandate/provider/budget preflight no work is reserved',async()=>{
 const f=fixture();try{
  for(const partial of [{granted:false},{granted:true,provider_permitted:true,
    budget_admitted:false}]){
   const r=await f.run({admit:async()=>partial});
   assert.equal(r.assigned,0);assert.equal(r.status,'provider_or_budget_not_admitted');
  }
  assert.equal(f.store.replay().length,0);
 }finally{f.close()}
});

test('two-slot cohort: one unresolved at a time, no reallocation after restart',async()=>{
 const f=fixture();try{
  let first=await f.run();
  assert.equal(first.status,'assigned_pending_judgment',JSON.stringify(first));
  assert.equal(first.legacy_id,'ctn_auto_alpha_1');
  assert.equal(f.store.replay().filter(e=>
    e.payload?.profile==='cogentia.legacy-public-auto-assignment/v1').length,1);
  const blocked=await f.run();
  assert.equal(blocked.status,'browser_turn_in_flight');
  assert.equal(blocked.assigned,0);
  // Simulate a fully accepted child and a canonical receipt for the
  // separate CAS writer. The scheduler is never authorized to invent one.
  const child='continuation:'+first.cps_child_id;
  assert.equal(f.store.append({topic_id:child,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:child,epistemic_status:'observed',
    idempotency_key:'returned:first',payload:{profile:'cop.continuation-result/v1',
      phase:'returned'}}).ok,true);
  const parent='continuation:'+first.legacy_id;
  assert.equal(f.store.append({topic_id:parent,event_type:'cop.event/v1',
    actor_id:'cop:cas',subject_ref:parent,epistemic_status:'observed',
    idempotency_key:'resolved:first',payload:{
      profile:'cogentia.legacy-continuation-settlement/v1',
      phase:'local_resolution_confirmed'}}).ok,true);
  const second=await f.run();
  assert.equal(second.status,'assigned_pending_judgment',JSON.stringify(second));
  assert.equal(second.legacy_id,'ctn_auto_beta_2');
  const reopened=createSqliteCopEventStore(f.journal);
  const final=await autoAssignPublicLegacyJudgment({store:reopened,
    registryRoot:f.root,localDbPath:f.legacyFile,sourceRoot:f.root,
    admit:f.admit,prepare:f.prepare,enabled:true});
  assert.equal(final.status,'browser_turn_in_flight');assert.equal(final.assigned,0);
  const child2='continuation:'+second.cps_child_id;
  assert.equal(reopened.append({topic_id:child2,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:child2,epistemic_status:'observed',
    idempotency_key:'returned:second',payload:{profile:'cop.continuation-result/v1',
      phase:'returned'}}).ok,true);
  assert.equal(reopened.append({topic_id:'continuation:'+second.legacy_id,
    event_type:'cop.event/v1',actor_id:'cop:cas',
    subject_ref:'continuation:'+second.legacy_id,epistemic_status:'observed',
    idempotency_key:'resolved:second',payload:{
      profile:'cogentia.legacy-continuation-settlement/v1',
      phase:'local_resolution_confirmed'}}).ok,true);
  const complete=await autoAssignPublicLegacyJudgment({store:reopened,
    registryRoot:f.root,localDbPath:f.legacyFile,sourceRoot:f.root,
    admit:f.admit,prepare:f.prepare,enabled:true});
  assert.equal(complete.status,'cohort_exhausted');assert.equal(complete.assigned,0);
  assert.equal(f.store.replay().filter(e=>
    e.payload?.profile==='cogentia.legacy-public-auto-assignment/v1').length,2);
  assert.equal(reopened.auditCommitments().ok,true);
  reopened.close();
 }finally{f.close()}
});

test('ambiguous CPS prepare failure leaves durable selection intent and halts cohort',async()=>{
 const f=fixture();try{
  const result=await f.run({prepare:async()=>({ok:false,status:'provider_unavailable'})});
  assert.equal(result.status,'assignment_needs_reconciliation');
  assert.equal(result.assigned,0);
  const repeated=await f.run();
  assert.equal(repeated.status,'selection_intent_needs_reconciliation');
  assert.equal(repeated.assigned,0);
  assert.equal(f.store.replay().filter(e=>
    e.payload?.profile==='cogentia.legacy-public-auto-assignment/v1').length,1);
 }finally{f.close()}
});


test('production default preparer is bound; without real signed mandate fails closed',async()=>{
 const f=fixture();try{
  const result=await f.run({prepare:undefined});
  assert.equal(result.ok,false);
  assert.equal(result.status,'assignment_needs_reconciliation');
  assert.equal(f.store.replay().filter(e=>e.payload?.profile===
    'cogentia.legacy-public-auto-assignment/v1').length,1);
  assert.equal(f.store.replay().filter(e=>e.payload?.profile==='cop/continuation').length,0);
 }finally{f.close()}
});


test('simultaneous ONA tick candidates race to one durable selection intent',async()=>{
 const f=fixture();try{
  const admit=async()=>{await Promise.resolve();return f.admit()};
  const results=await Promise.all([f.run({admit}),f.run({admit})]);
  assert.equal(results.filter(x=>x.assigned===1).length,1,JSON.stringify(results));
  assert.equal(results.filter(x=>x.assigned===0).length,1);
  assert.equal(f.store.replay().filter(x=>
    x.payload?.profile==='cogentia.legacy-public-auto-assignment/v1').length,1);
  assert.equal(f.store.auditCommitments().ok,true);
 }finally{f.close()}
});

test('a parked parent is excluded from autonomous assignment, without being resumed',async()=>{
 const f=fixture();try{
  assert.equal(changePacketTemperature(f.store,{
    packet_ref:'continuation:ctn_auto_alpha_1',temperature:'parked',
    transition_id:'park-alpha-before-automatic-selection'}).ok,true);
  const preview=inspectAutoPublicLegacyJudgment({store:f.store,
    localRecords:f.records,sourceRoot:f.root});
  assert.equal(preview.status,'candidate_ready');
  assert.equal(preview.legacy_id,'ctn_auto_beta_2');
  const r=await f.run();
  assert.equal(r.legacy_id,'ctn_auto_beta_2');
  assert.equal(f.store.eventByIdempotency('public-legacy-auto-assignment:v1:ctn_auto_alpha_1'),null);
  assert.equal(f.store.auditCommitments().ok,true);
 }finally{f.close()}
});
