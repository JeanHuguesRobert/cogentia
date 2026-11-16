import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrimitiveContinuationStore} from './lib/primitive-continuations.mjs';
import {createContinuationSqliteRepository} from './lib/continuation-sqlite-repository.mjs';

test('operational SQLite continuations preserve versioned read/save without JSON files',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'operational-continuations-'));
  const dbPath=join(tmp,'state.sqlite');
  const first=createContinuationSqliteRepository({registryRoot:tmp,dbPath});
  const second=createContinuationSqliteRepository({registryRoot:tmp,dbPath});
  try{
    const document={id:'ctn_aabbccdd',kind:'external_judgment',status:'active',history:[]};
    assert.equal(first.save(document).created,true);
    const fromSecond=second.load(document.id);
    fromSecond.status='resolved';
    assert.equal(second.save(fromSecond).row.revision,1);
    document.status='cancelled';
    assert.throws(()=>first.save(document),/continuation_revision_conflict/);
    assert.equal(first.load(document.id).status,'resolved');
    assert.equal(first.list().length,1);
    assert.equal(first.snapshot(document.id).continuation.revision,1);
    assert.equal(first.sources(document.id).length,0);
  }finally{first.close();second.close();rmSync(tmp,{recursive:true,force:true})}
});

test('migrated legacy JSON becomes normal versioned operational SQLite state',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'migrated-operational-'));
  const dbPath=join(tmp,'state.sqlite');
  const core=createPrimitiveContinuationStore(dbPath);
  const original={id:'ctn_legacy_2026W47',kind:'cognitive_packet_journey',
    status:'alive',subject:'old'};
  const created=core.create({id:original.id,kind:original.kind,status:original.status,
    scope:'legacy:fracta2',body:{source_format:'json-continuation',original,
      source_basename:'legacy.json'}});
  assert.equal(created.ok,true);
  core.attachSource(original.id,'legacy-json:node:legacy.json','abc',original);
  core.close();
  const repo=createContinuationSqliteRepository({registryRoot:tmp,dbPath});
  try{
    const obj=repo.load(original.id);
    assert.deepEqual(JSON.parse(JSON.stringify(obj)),original);
    obj.status='completed';
    repo.save(obj);
    assert.equal(repo.inspect(original.id).status,'completed');
    assert.equal(repo.inspect(original.id).body.original.status,'completed');
    assert.equal(repo.sources(original.id).length,1);
    assert.equal(repo.sources(original.id)[0].payload.status,'alive');
  }finally{repo.close();rmSync(tmp,{recursive:true,force:true})}
});

test('unversioned duplicate write is rejected rather than merged silently',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'optimistic-continuations-'));
  const repo=createContinuationSqliteRepository({registryRoot:tmp,
    dbPath:join(tmp,'state.sqlite')});
  try{
    const c={id:'ctn_aabbccdd',kind:'task',status:'active'};
    repo.save(c);
    assert.throws(()=>repo.save({...c,status:'resolved'}),/continuation_revision_conflict/);
    assert.equal(repo.load(c.id).status,'active');
  }finally{repo.close();rmSync(tmp,{recursive:true,force:true})}
});
