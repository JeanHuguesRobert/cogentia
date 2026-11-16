import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';import{join}from'node:path';
import {createHash} from'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {projectParentJoin} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {previewPublicLegacyJudgment,preparePublicLegacyJudgmentCps}
  from './legacy-public-judgment-cps.js';
const legacy={id:'ctn_public_doc_001',kind:'index.document_role_judgment',status:'active',
 subject:{repo:'cogentia',path:'docs/example.md'},
 expected_response:{required:['decision','reason'],allowed_decisions:['index','skip','needs_more_context']}};
const env=()=>{const root=mkdtempSync(join(tmpdir(),'cps-public-legacy-'));
 mkdirSync(join(root,'docs'));writeFileSync(join(root,'docs/example.md'),'# Public documentation\nA useful library guide.');return root;};

test('public judgment produces a bounded self-contained prompt; rejects private or stale sources',()=>{
 const root=env();try{
  const p=previewPublicLegacyJudgment({continuation:legacy,repositoryRoot:root,requirePublishedSource:false});
  assert.equal(p.ok,true);assert.match(p.question,/Public documentation/);
  assert.equal(previewPublicLegacyJudgment({continuation:legacy,
    repositoryRoot:root}).ok,false,'unpublished fixture must never be sent to a model');
  assert.ok(p.question.length<4500);assert.ok(p.source_digest.length===64);
  assert.equal(previewPublicLegacyJudgment({continuation:{...legacy,status:'resolved'},repositoryRoot:root,requirePublishedSource:false}).ok,false);
  assert.equal(previewPublicLegacyJudgment({continuation:{...legacy,subject:{repo:'private',path:'docs/example.md'}},repositoryRoot:root,requirePublishedSource:false}).ok,false);
  assert.equal(previewPublicLegacyJudgment({continuation:{...legacy,subject:{repo:'cogentia',path:'../private.md'}},repositoryRoot:root,requirePublishedSource:false}).ok,false);
  symlinkSync('/etc/passwd',join(root,'docs/leak.md'));
  assert.equal(previewPublicLegacyJudgment({continuation:{...legacy,subject:{repo:'cogentia',path:'docs/leak.md'}},repositoryRoot:root,requirePublishedSource:false}).ok,false);
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('one authorized declaration links legacy parent to its CPS child; duplicate does not double the lineage',async()=>{
 const root=env(),store=createSqliteCopEventStore(':memory:');try{
  const prepare=async({store,task_ref})=>{
   const id='ctn_chatgpt_browser_'+createHash('sha256').update(task_ref).digest('hex').slice(0,32);
   const key='test:cps:declared:'+id;const prev=store.eventByIdempotency(key);
   if(prev)return {ok:true,duplicate:true,continuation_id:id,declaration_receipt_ref:key};
   const appended=store.append({topic_id:'continuation:'+id,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:'continuation:'+id,epistemic_status:'observed',
    idempotency_key:key,payload:{profile:'cop/continuation',
      continuation:{continuation_id:id}}});assert.equal(appended.ok,true);
   return {ok:true,duplicate:false,continuation_id:id,declaration_receipt_ref:key};
  };
  const one=await preparePublicLegacyJudgmentCps({store,continuation:legacy,repositoryRoot:root,prepare,requirePublishedSource:false});
  assert.equal(one.ok,true);assert.equal(one.duplicate,false);
  const p=projectParentJoin(store,{parent_ref:one.legacy_parent_ref,join_id:'public-document-role-judgment'});
  assert.equal(p.ok,true);assert.equal(p.ready,false);
  assert.deepEqual(p.children.map(c=>c.child_ref),[one.cps_child_ref]);
  const two=await preparePublicLegacyJudgmentCps({store,continuation:legacy,repositoryRoot:root,prepare,requirePublishedSource:false});
  assert.equal(two.ok,true);assert.equal(two.duplicate,true);
  assert.equal(store.listTopic(one.legacy_parent_ref).filter(e=>e.payload?.phase==='child_linked').length,1);
  assert.equal(store.auditCommitments().ok,true);
 }finally{store.close();rmSync(root,{recursive:true,force:true})}
});
