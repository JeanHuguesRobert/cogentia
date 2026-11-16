import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {projectProductionWorkFrontier,inspectHostProductionWorkFrontier}
  from './production-work-frontier.js';

test('legacy active docs are not automatically executable just because they have a resume command',()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const records=[{id:'ctn_active_old',status:'active',kind:'index.document_role_judgment',
    resume:{command:'node scripts/cogentia.js continuation resolve ctn_active_old <result.json>'}},
    {id:'ctn_done_old',status:'resolved',kind:'semantic-search'}];
  const p=projectProductionWorkFrontier({store:s,localRecords:records});
  assert.equal(p.ok,true);assert.equal(p.local.total,2);
  assert.equal(p.local.by_blocker.no_executable_handler_contract,1);
  assert.equal(p.generic_runnable,0);assert.equal(p.external_effects,0);
  assert.equal(s.replay().length,0,'projection must not write events');
 }finally{s.close()}
});

test('declared handler without current provider and mandate remains only a placement candidate',()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const rec={id:'ctn_ready_candidate',status:'active',kind:'diagnostic',
    packet_ref:'packet:diagnostic-candidate',resumeTo:'capability:diagnose',
    required_capabilities:['diagnostics.read']};
  const p=projectProductionWorkFrontier({store:s,localRecords:[rec]});
  assert.equal(p.generic_runnable,0);
  assert.equal(p.local.candidates_needing_admission,1);
  assert.equal(p.local.by_blocker.requires_live_handler_and_mandate_admission,1);
  assert.equal(s.replay().length,0);
 }finally{s.close()}
});

test('canonical CPS assigned records are not copied into the generic queue',()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const id='ctn_assigned_discovery_reality',topic='continuation:'+id;
  assert.equal(s.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:test',subject_ref:topic,epistemic_status:'observed',
    idempotency_key:'declare-frontier',payload:{profile:'cop/continuation',
      continuation:{continuation_id:id,lifecycle:'suspended',packet_ref:'packet:'+id,
        provider:'chatgpt',channel:'browser'}}}).ok,true);
  const n=s.replay().length;
  const p=projectProductionWorkFrontier({store:s,localRecords:[]});
  assert.equal(p.cop.declared,1);assert.equal(p.generic_runnable,0);
  assert.equal(s.replay().length,n);
 }finally{s.close()}
});

test('missing host database does not create an empty database and disguise it as a backlog',()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  const r=inspectHostProductionWorkFrontier({store:s,
    registryRoot:'/tmp/no-such-production-corpus-root-7e5d5a9e7f'});
  assert.equal(r.status,'host_local_continuation_store_missing');
 }finally{s.close()}
});
