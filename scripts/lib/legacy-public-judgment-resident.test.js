import test from 'node:test';import assert from 'node:assert/strict';
import{mkdtempSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
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
