import test from 'node:test';import assert from 'node:assert/strict';
import{mkdtempSync,rmSync,mkdirSync,writeFileSync}from'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {linkPacketChild,registerParentJoin,reconcilePacketParentContinuations} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {previewPublicLegacyJudgment} from './legacy-public-judgment-cps.js';import{join}from'node:path';import{tmpdir}from'node:os';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {runResidentPublicLegacyJudgmentSettlement} from './legacy-public-judgment-resident.js';

test('empty CPS backlog does not invent legacy assignments or write a separate queue',async()=>{
 const d=mkdtempSync(join(tmpdir(),'resident-public-cps-'));
 const s=createSqliteCopEventStore(':memory:');try{
  const r=await runResidentPublicLegacyJudgmentSettlement({store:s,registryRoot:d,
    sourceRoot:d,localDbPath:join(d,'local.sqlite')});
  assert.equal(r.ok,true);assert.equal(r.settled,0);
  assert.equal(r.declared_legacy_assignments,0);
  assert.equal(s.replay().length,0);
 }finally{s.close();rmSync(d,{recursive:true,force:true})}
});

test('unreturned legacy CPS declaration is not treated as an accepted judgment',async()=>{
 const d=mkdtempSync(join(tmpdir(),'resident-public-cps-'));
 const s=createSqliteCopEventStore(':memory:');try{
  const id='ctn_chatgpt_browser_test001';
  assert.equal(s.append({topic_id:'continuation:'+id,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:'continuation:'+id,
    idempotency_key:'declare:test',epistemic_status:'observed',
    payload:{profile:'cop/continuation',continuation:{continuation_id:id,
      provider:'chatgpt',channel:'browser',state:{assignment_ref:'legacy:ctn_unreturned_123'}}}}).ok,true);
  const r=await runResidentPublicLegacyJudgmentSettlement({store:s,registryRoot:d,
    sourceRoot:d,localDbPath:join(d,'local.sqlite')});
  assert.equal(r.settled,0);assert.equal(r.needs_review,1);
  assert.equal(r.findings[0].status,'local_source_absent');
 }finally{s.close();rmSync(d,{recursive:true,force:true})}
});


test('resident ONA cycle automatically settles exactly one accepted public judgment and never replays after process restart',async()=>{
 const root=mkdtempSync(join(tmpdir(),'ona-public-autoclose-'));
 const localFile=join(root,'continuations.sqlite'),copFile=join(root,'journal.sqlite');
 const legacyId='ctn_resident_auto_194';
 try{
  mkdirSync(join(root,'docs'));
  writeFileSync(join(root,'docs','public.md'),'# Public indexable handbook\nA stable source.\n');
  execFileSync('git',['-C',root,'init','-q','-b','main']);
  execFileSync('git',['-C',root,'add','docs/public.md']);
  execFileSync('git',['-C',root,'-c','user.email=robot@local.invalid',
   '-c','user.name=Fixture','commit','-qm','public fixture']);
  execFileSync('git',['-C',root,'update-ref','refs/remotes/origin/main','HEAD']);
  const original={id:legacyId,continuation_id:legacyId,status:'active',
    kind:'index.document_role_judgment',subject:{repo:'cogentia',path:'docs/public.md'},
    expected_response:{required:['decision','reason'],
      allowed_decisions:['index','source','needs_more_context']},
    history:[{event:'emitted'}],resolution:null};
  const local=createContinuationSqliteRepository({registryRoot:root,dbPath:localFile});
  assert.equal(local.save(structuredClone(original)).ok,true);local.close();
  let store=createSqliteCopEventStore(copFile);
  const p=previewPublicLegacyJudgment({continuation:original,repositoryRoot:root});
  assert.equal(p.ok,true);
  const child=p.child_ref,parent=p.parent_ref;
  assert.equal(store.append({topic_id:child,event_type:'cop.event/v1',
    actor_id:'cop:fixture',subject_ref:child,epistemic_status:'observed',
    idempotency_key:'declared:autoclose',payload:{profile:'cop/continuation',
      continuation:{continuation_id:child.slice(13),provider:'chatgpt',
        channel:'browser',state:{assignment_ref:p.task_ref,question:p.question}}}}).ok,true);
  assert.equal(linkPacketChild(store,{parent_ref:parent,child_ref:child}).ok,true);
  assert.equal(registerParentJoin(store,{parent_ref:parent,
    join_id:'public-document-role-judgment',mode:'all'}).ok,true);
  for(const [key,payload] of [
    ['returned:auto',{profile:'cop.continuation-result/v1',phase:'returned',
      candidate_result:{status:'answered',result:{
        answer:JSON.stringify({decision:'index',reason:'Published public handbook useful in the test index.'}),
        packet_status:'completed'}}}],
    ['accepted:auto',{profile:'cop.continuation-result/v1',phase:'accepted'}],
    ['handler:auto',{profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
      parent_packet_status:'completed'}]]){
    assert.equal(store.append({topic_id:child,event_type:'cop.event/v1',
      actor_id:'cop:fixture',subject_ref:child,epistemic_status:'observed',
      idempotency_key:key,payload}).ok,true);
  }
  assert.equal((await reconcilePacketParentContinuations(store)).notified>0,true);
  let writers=0;
  const resolveCli=async({continuation_id,payload})=>{
    writers++;
    const db=createContinuationSqliteRepository({registryRoot:root,dbPath:localFile});
    try{
      const updated=db.load(continuation_id);
      assert.equal(updated.status,'active');
      updated.status='resolved';updated.resolution={decision:payload.decision,
        reason:payload.reason,payload};updated.history.push({event:'resolved'});
      db.save(updated);return {ok:true};
    }finally{db.close()}
  };
  const first=await runResidentPublicLegacyJudgmentSettlement({store,
    registryRoot:root,sourceRoot:root,localDbPath:localFile,resolveCli});
  assert.equal(first.settled,1,JSON.stringify(first));assert.equal(writers,1);
  assert.equal(store.listTopic(parent).filter(e=>
    e.payload?.phase==='local_resolution_confirmed').length,1);
  store.close();store=createSqliteCopEventStore(copFile);
  const next=await runResidentPublicLegacyJudgmentSettlement({store,
    registryRoot:root,sourceRoot:root,localDbPath:localFile,resolveCli});
  assert.equal(next.settled,0);assert.equal(writers,1);
  assert.equal(store.auditCommitments().ok,true);
  const final=createContinuationSqliteRepository({registryRoot:root,dbPath:localFile});
  try{assert.equal(final.load(legacyId).status,'resolved')}
  finally{final.close()}
  store.close();
 }finally{rmSync(root,{recursive:true,force:true})}
});
