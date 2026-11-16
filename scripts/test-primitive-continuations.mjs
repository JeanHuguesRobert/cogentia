import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrimitiveContinuationStore} from './lib/primitive-continuations.mjs';

const withStores=async fn=>{
  const dir=mkdtempSync(join(tmpdir(),'primitive-continuations-'));
  const db=createPrimitiveContinuationStore(join(dir,'a.sqlite'));
  try{await fn(db,dir)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
};

test('primitive continuation requires no COP, mandate, network or remote daemon',()=>withStores(async db=>{
  const c=db.create({id:'ctn:a',body:{step:1},scope:'worker:1'});
  assert.equal(c.ok,true);assert.equal(c.row.revision,0);
  assert.equal(db.events('ctn:a').length,1);
  assert.equal(db.create({id:'ctn:a',body:{step:1},scope:'worker:1'}).existing,true);
  assert.equal(db.create({id:'ctn:a',body:{step:2},scope:'worker:1'}).code,'continuation_identity_conflict');
  const a=db.compareAndSwap('ctn:a',0,{body:{step:2},status:'suspended'});
  assert.equal(a.ok,true);assert.equal(a.row.revision,1);
  assert.equal(db.compareAndSwap('ctn:a',0,{body:{step:'lost'}}).code,'revision_conflict');
  assert.deepEqual(db.get('ctn:a').body,{step:2});
  assert.equal(db.events('ctn:a').length,2);
}));

test('same scope prevents conflicting active execution without global lock',()=>withStores(async (db,dir)=>{
  const a=db.create({id:'c1',scope:'browser:chatgpt',status:'queued'});
  const b=db.create({id:'c2',scope:'browser:chatgpt',status:'queued'});
  const db2=createPrimitiveContinuationStore(join(dir,'a.sqlite'));
  try{
    assert.equal(db.claim(a.row.id).ok,true);
    assert.equal(db2.claim(b.row.id).code,'resource_busy');
    assert.equal(db.compareAndSwap('c1',1,{status:'done'}).ok,true);
    assert.equal(db2.claim('c2').ok,true);
  }finally{db2.close()}
}));

test('memoized subresults reject a slot reused with different dependencies',()=>withStores(async db=>{
  db.create({id:'work:slot'});
  assert.equal(db.remember('work:slot','read-a','sha-input',{a:2}).existing,false);
  assert.deepEqual(db.remember('work:slot','read-a','sha-input',{a:3}).result,{a:2});
  assert.equal(db.remember('work:slot','read-a','other-input',{a:3}).code,'slot_input_conflict');
}));

test('snapshot imports keep identity, revision, cache and checksum',()=>withStores(async (source,dir)=>{
  source.create({id:'work:migrate',body:{source:'fracta2'},scope:'fractanet'});
  source.remember('work:migrate','read','v1',{answer:42});
  source.compareAndSwap('work:migrate',0,{body:{source:'fracta2',next:'a'},status:'parked'});
  const snap=source.snapshot('work:migrate');
  assert.equal(snap.continuation.revision,1);
  const receiver=createPrimitiveContinuationStore(join(dir,'b.sqlite'));
  try{
    assert.equal(receiver.importSnapshot(snap).ok,true);
    assert.equal(receiver.importSnapshot(snap).existing,true);
    assert.equal(receiver.get('work:migrate').revision,1);
    assert.equal(receiver.remember('work:migrate','read','v1',{answer:3}).result.answer,42);
    assert.equal(receiver.compareAndSwap('work:migrate',1,{status:'suspended'}).ok,true);
    assert.equal(receiver.importSnapshot(snap).code,'snapshot_conflict');
    assert.throws(()=>receiver.importSnapshot({...snap,sha256:'0'.repeat(64)}),/checksum/);
  }finally{receiver.close()}
}));

test('independent work in distinct scopes advances concurrently and reconciles by revision',()=>withStores(async db=>{
  db.create({id:'work:A',scope:'worker:a'});
  db.create({id:'work:B',scope:'worker:b'});
  assert.equal(db.claim('work:A').ok,true);
  assert.equal(db.claim('work:B').ok,true);
  const baseline=db.get('work:A');
  db.compareAndSwap('work:A',baseline.revision,{status:'suspended',body:{value:'A'}});
  assert.equal(db.compareAndSwap('work:A',baseline.revision,{status:'suspended',body:{value:'B'}}).code,'revision_conflict');
  const latest=db.get('work:A');
  assert.equal(db.compareAndSwap('work:A',latest.revision,{body:{value:['A','B']},verb:'reconcile'}).ok,true);
  assert.equal(db.get('work:A').body.value.length,2);
  assert.equal(db.events('work:A').at(-1).verb,'reconcile');
}));
