import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {cadencedRepoSync,repoSyncCadenceDecision} from './lib/repo-sync-cadence.js';

const hour=3600000,day=24*hour;
test('cadence checks once per 24h and preserves cached reconciliation blocks',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-cadence-test-'));
 try{
  const file=path.join(dir,'state.json');
  let called=0;
  const run=async()=>{called++;return{status:'completed_with_blocks',evidence:{
   summary:{repos:21,ok:10,dirty:10,skipped:1,failed:0},
   health:{status:'attention_required',blocked_count:1,blocked:[{repo:'cogentia',status:'fetched_dirty_skip_pull',ahead:1,behind:35}]}
  }}};
  const a=await cadencedRepoSync({run,now:0,stateFile:file});
  assert.equal(a.status,'completed_with_blocks');assert.equal(called,1);
  const cached=await cadencedRepoSync({run,now:hour,stateFile:file});
  assert.equal(cached.status,'deferred_by_cadence');assert.equal(cached.evidence.cached,true);
  assert.equal(cached.evidence.health.blocked_count,1);
  assert.equal(cached.evidence.checked_at,'1970-01-01T00:00:00.000Z');
  assert.equal(called,1);
  const state=await readFile(file,'utf8');
  assert.doesNotMatch(state,/token|secret|private URL/i);
  assert.equal((JSON.parse(state)).summary.dirty,10);
  const third=await cadencedRepoSync({run,now:day,stateFile:file});
  assert.equal(third.status,'completed_with_blocks');assert.equal(called,2);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('failed periodic fetch retries after 2h; forcing or scope change bypasses cadence',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-cadence-fail-'));
 try{
  const file=path.join(dir,'state.json');let count=0;
  const run=async()=>{count++;return {status:'failed',evidence:null,error:'do not persist secret password'}};
  await cadencedRepoSync({run,stateFile:file,now:1});
  assert.equal((await cadencedRepoSync({run,stateFile:file,now:hour})).status,'deferred_by_cadence');
  assert.equal(count,1);
  const cached=await cadencedRepoSync({run,stateFile:file,now:hour+1});
  assert.equal(cached.evidence.last_status,'failed');
  await cadencedRepoSync({run,stateFile:file,now:2*hour+1});
  assert.equal(count,2);
  await cadencedRepoSync({run,stateFile:file,now:2*hour+2,force:true});
  assert.equal(count,3);
  await cadencedRepoSync({run,stateFile:file,now:2*hour+3,scope:'one'});
  assert.equal(count,4);
  assert.doesNotMatch(await readFile(file,'utf8'),/secret password/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('cadence rejects invalid future state and distinguishes manual bypass',()=>{
 assert.equal(repoSyncCadenceDecision(null).due,true);
 const state={schema:'cogentia.repo_sync_cadence.v1',scope:'all',include_private:false,
   checked_at:'2100-01-01T00:00:00.000Z',status:'completed'};
 assert.equal(repoSyncCadenceDecision(state,{now:0}).reason,'invalid_timestamp');
 assert.equal(repoSyncCadenceDecision(state,{force:true}).reason,'explicit');
});
