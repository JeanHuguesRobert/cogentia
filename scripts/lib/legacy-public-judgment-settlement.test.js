import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {linkPacketChild,registerParentJoin,reconcilePacketParentContinuations}
 from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {changePacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {inspectPublicLegacyJudgmentResult,settlePublicLegacyJudgment}
 from './legacy-public-judgment-settlement.js';
import {previewPublicLegacyJudgment} from './legacy-public-judgment-cps.js';
const R={id:'ctn_real_public_role',kind:'index.document_role_judgment',status:'active',
 subject:{repo:'cogentia',path:'docs/test.md'},expected_response:{
 allowed_decisions:['index','skip','source','needs_more_context'],required:['decision','reason']}};
const id='ctn_chatgpt_browser_'+createHash('sha256').update('legacy:'+R.id).digest('hex').slice(0,32),child='continuation:'+id,parent='continuation:'+R.id;
const event=(topic,key,payload)=>({topic_id:topic,event_type:'cop.event/v1',
 actor_id:'cop:test',subject_ref:topic,epistemic_status:'observed',
 idempotency_key:key,payload});
function fixture(){const root=mkdtempSync(join(tmpdir(),'legacy-settle-'));
 mkdirSync(join(root,'docs'));writeFileSync(join(root,'docs/test.md'),'# Published indexable guide\n');
 const s=createSqliteCopEventStore(':memory:'),preview=previewPublicLegacyJudgment({
  continuation:R,repositoryRoot:root,requirePublishedSource:false});
 assert.equal(preview.ok,true);
 assert.equal(s.append(event(child,'declare-source',{
  profile:'cop/continuation',continuation:{continuation_id:id,
   state:{assignment_ref:'legacy:'+R.id,question:preview.question}}})).ok,true);
 assert.equal(linkPacketChild(s,{parent_ref:parent,child_ref:child}).ok,true);
 assert.equal(registerParentJoin(s,{parent_ref:parent,join_id:'public-document-role-judgment',
   mode:'all'}).ok,true);
 return {root,s};
}
async function finish(s,answer='{"decision":"index","reason":"Document public très utile à la recherche et à la navigation."}'){
 assert.equal(s.append(event(child,'candidate:returned',{
  profile:'cop.continuation-result/v1',phase:'returned',candidate_result:{
   status:'answered',result:{answer,packet_status:'completed'}}})).ok,true);
 assert.equal(s.append(event(child,'candidate:accepted',{
  profile:'cop.continuation-result/v1',phase:'accepted'})).ok,true);
 assert.equal(s.append(event(child,'handler:completed',{
  profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
  parent_packet_status:'completed'})).ok,true);
 const p=await reconcilePacketParentContinuations(s);assert.ok(p.notified>=1);
}

test('CPS accepted result progresses the actual legacy continuation only after evidence/schema verification',async()=>{
 const {root,s}=fixture();try{
  let applied=0;
  const pending=inspectPublicLegacyJudgmentResult({store:s,continuation:R,
    repositoryRoot:root,requirePublishedSource:false});
  assert.equal(pending.status,'waiting_for_model_result');
  await finish(s);
  const p=inspectPublicLegacyJudgmentResult({store:s,continuation:R,
    repositoryRoot:root,requirePublishedSource:false});
  assert.equal(p.ready,true);assert.equal(p.decision,'index');
  const out=await settlePublicLegacyJudgment({store:s,continuation:R,
    repositoryRoot:root,requirePublishedSource:false,apply:async x=>{
      applied++;assert.equal(x.continuation_id,R.id);
      assert.equal(x.payload.cps_return_receipt_ref,'candidate:returned');
      assert.equal(x.decision,'index');return {ok:true};}});
  assert.equal(out.status,'legacy_resolved');assert.equal(applied,1);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close();rmSync(root,{recursive:true,force:true})}
});

test('cold parent cannot accept a settlement although child is completed',async()=>{
 const {root,s}=fixture();try{await finish(s);
  assert.equal(changePacketTemperature(s,{packet_ref:parent,
    temperature:'parked',transition_id:'park-while-result-awaits'}).ok,true);
  const out=await settlePublicLegacyJudgment({store:s,continuation:R,repositoryRoot:root,
    requirePublishedSource:false,apply:async()=>{throw Error('must not settle while parked')}});
  assert.equal(out.status,'parent_temperature_deferred');
 }finally{s.close();rmSync(root,{recursive:true,force:true})}
});

test('unstructured or incomplete LLM response is not silently accepted as a document role',async()=>{
 const {root,s}=fixture();try{await finish(s,'not-a-JSON-object');
  const out=inspectPublicLegacyJudgmentResult({store:s,continuation:R,
    repositoryRoot:root,requirePublishedSource:false});
  assert.equal(out.status,'judgment_answer_not_json');
 }finally{s.close();rmSync(root,{recursive:true,force:true})}
});
