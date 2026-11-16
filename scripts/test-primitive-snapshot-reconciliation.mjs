import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {createPrimitiveContinuationStore} from './lib/primitive-continuations.mjs';

async function pair(fn){
  const dir=mkdtempSync(join(tmpdir(),'cps-reconcile-'));
  const first=createPrimitiveContinuationStore(join(dir,'fracta2.sqlite'));
  const second=createPrimitiveContinuationStore(join(dir,'thinkpad.sqlite'));
  try{await fn(first,second)}finally{
    first.close();second.close();rmSync(dir,{recursive:true,force:true});
  }
}

test('remote causal successor advances ORIGINAL store and reuses cache',()=>pair(async(a,b)=>{
  const id='ctn_crossnode_reconcile';
  a.create({id,kind:'pure-job',scope:'fracta2',status:'queued',body:{step:0}});
  a.remember(id,'expensive','input-v1',{value:42});
  a.compareAndSwap(id,0,{status:'parked',body:{step:1},verb:'park'});
  const outbound=a.snapshot(id);
  assert.equal(b.importSnapshot(outbound,{scope:'thinkpad'}).ok,true);
  assert.deepEqual(b.remember(id,'expensive','input-v1',{value:999}).result,{value:42});
  b.compareAndSwap(id,1,{status:'suspended',body:{step:2},verb:'resume'});
  const returned=b.snapshot(id);
  const advanced=a.reconcileSnapshot(returned,{scope:'fracta2'});
  assert.equal(advanced.ok,true);
  assert.equal(advanced.advanced,true);
  assert.equal(a.get(id).revision,2);
  assert.equal(a.get(id).scope,'fracta2');
  assert.deepEqual(a.get(id).body,{step:2});
  assert.equal(a.events(id).length,3);
  assert.equal(a.snapshot(id).slots.length,1);
  assert.equal(a.remember(id,'expensive','input-v1',{value:123}).result.value,42);
  const repeat=a.reconcileSnapshot(returned,{scope:'fracta2'});
  assert.equal(repeat.ok,true);
  assert.equal(repeat.existing,true);
  assert.equal(repeat.merged_slots,0);
  assert.equal(a.reconcileSnapshot(outbound).code,'stale_snapshot');
}));

test('competing revisions retain divergent branch without overwriting live state',()=>pair(async(a,b)=>{
  const id='ctn_parallel_fork';
  a.create({id,scope:'fracta2',body:{step:0}});
  const base=a.snapshot(id);
  assert.equal(b.importSnapshot(base,{scope:'thinkpad'}).ok,true);
  a.compareAndSwap(id,0,{body:{winner:'A'},status:'suspended',verb:'resolve-local'});
  b.compareAndSwap(id,0,{body:{winner:'B'},status:'suspended',verb:'resolve-remote'});
  const competing=b.snapshot(id);
  const conflict=a.reconcileSnapshot(competing,{scope:'fracta2'});
  assert.equal(conflict.ok,false);
  assert.equal(conflict.code,'causal_divergence');
  assert.equal(conflict.preserved,true);
  assert.deepEqual(a.get(id).body,{winner:'A'});
  const evidence=a.sources(id);
  assert.equal(evidence.length,1);
  assert.equal(evidence[0].payload.sha256,competing.sha256);
  assert.equal(a.reconcileSnapshot(competing).already_preserved,true);
  assert.equal(a.sources(id).length,1);
}));

test('same-version incompatible memo slot is retained as alternative, not overwritten',()=>pair(async(a,b)=>{
  const id='ctn_memo_conflict';
  a.create({id,scope:'fracta2',body:{x:1}});
  assert.equal(b.importSnapshot(a.snapshot(id),{scope:'thinkpad'}).ok,true);
  a.remember(id,'lookup','input-a',{answer:1});
  b.remember(id,'lookup','input-b',{answer:2});
  const result=a.reconcileSnapshot(b.snapshot(id));
  assert.equal(result.code,'memo_slot_conflict');
  assert.equal(result.preserved,true);
  assert.equal(a.remember(id,'lookup','input-a',{answer:9}).result.answer,1);
}));

test('identity mismatch and invalid checksum never silently advance work',()=>pair(async(a,b)=>{
  const id='ctn_identity_test';
  a.create({id,scope:'fracta2',body:{step:0}});
  const snapshot=a.snapshot(id);
  assert.throws(()=>a.reconcileSnapshot({...snapshot,sha256:'0'.repeat(64)}),/checksum/);
  assert.equal(a.reconcileSnapshot(snapshot,{scope:'different'}).code,'local_scope_mismatch');
  assert.equal(a.get(id).revision,0);
}));

test('local CLI exports, imports and reconciles without changing transport policy',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cps-cli-test-'));
  const a=join(dir,'a.sqlite'),b=join(dir,'b.sqlite');
  const exportA=join(dir,'outbound.json'),exportB=join(dir,'return.json');
  const cli=join(import.meta.dirname,'ops','continuation-snapshot-local.mjs');
  const run=(action,...args)=>{
    const r=spawnSync(process.execPath,[cli,action,...args],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
    return JSON.parse(r.stdout);
  };
  try{
    const source=createPrimitiveContinuationStore(a);
    source.create({id:'ctn_cli_smoke',scope:'fracta2',body:{step:0}});
    source.remember('ctn_cli_smoke','compute','input:1',{answer:42});
    source.compareAndSwap('ctn_cli_smoke',0,
      {status:'parked',body:{step:1},verb:'park'});
    source.close();
    assert.equal(run('export','--db',a,'--id','ctn_cli_smoke',
      '--out',exportA).revision,1);
    assert.equal(run('import','--db',b,'--in',exportA,
      '--scope','thinkpad').ok,true);
    const remote=createPrimitiveContinuationStore(b);
    assert.equal(remote.compareAndSwap('ctn_cli_smoke',1,
      {status:'suspended',body:{step:2},verb:'resume'}).ok,true);
    remote.close();
    assert.equal(run('export','--db',b,'--id','ctn_cli_smoke',
      '--out',exportB).revision,2);
    assert.equal(run('reconcile','--db',a,'--in',exportB,
      '--scope','fracta2').advanced,true);
    assert.equal(run('reconcile','--db',a,'--in',exportB,
      '--scope','fracta2').existing,true);
    const result=createPrimitiveContinuationStore(a);
    try{
      assert.equal(result.get('ctn_cli_smoke').revision,2);
      assert.equal(result.remember('ctn_cli_smoke','compute',
        'input:1',{answer:0}).result.answer,42);
    }finally{result.close()}
    const forbidden=spawnSync(process.execPath,[cli,'export','--db',a,
      '--id','ctn_cli_smoke','--out',exportA],{encoding:'utf8'});
    assert.notEqual(forbidden.status,0,'existing output must never be overwritten');
  }finally{rmSync(dir,{recursive:true,force:true})}
});
