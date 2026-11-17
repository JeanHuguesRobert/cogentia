import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {createPrimitiveContinuationStore} from './primitive-continuations.mjs';
import {PUBLIC_INDEX_REENTRY_HANDLER} from './public-index-judgment-reentry.mjs';

const cli=resolve('scripts/cogentia.js');
const sample=['---','title: Public document','visibility: public','---',
 '# Public document','## Content','This is a meaningful paragraph for indexing.',''].join('\n');
const reason='Verified public reference suitable for searchable indexing';
function setup(){
 const root=mkdtempSync(join(tmpdir(),'cpkt010-integration-'));
 mkdirSync(join(root,'documents'));
 writeFileSync(join(root,'documents','public.md'),sample);
 writeFileSync(join(root,'.cogentia.json'),JSON.stringify({repos:[{
  name:'cogentia',path:'documents',branch:'main',kind:'public',
 }]}));
 const env={...process.env,COGENTIA_REGISTRY:join(root,'.cogentia.json'),
   COGENTIA_CONTINUATIONS_DB:join(root,'continuations.sqlite'),
   COGENTIA_DATA_DIR:join(root,'index-data')};
 function run(...args){
  const out=spawnSync(process.execPath,[cli,...args,'--json'],{
    env,encoding:'utf8',timeout:30000});
  let data;
  try{data=JSON.parse(out.stdout)}catch{
   throw Error('CLI JSON failure: '+out.status+' '+out.stdout+' '+out.stderr);
  }
  return {status:out.status,stdout:out.stdout,stderr:out.stderr,data};
 }
 const index=run('index','rebuild');
 assert.equal(index.status,0,JSON.stringify(index.data));
 assert.equal(index.data.partial,true,'actual indexer must be waiting on Judgment');
 const id=index.data.continuations?.[0]?.id;
 assert.match(id,/^ctn_/);
 const repo=()=>createContinuationSqliteRepository({registryRoot:root,
   dbPath:env.COGENTIA_CONTINUATIONS_DB});
 return {root,env,id,run,repo,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}

test('H0/H1: actual indexer suspends, validated Judgment resumes real chunking exactly once',()=>{
 const c=setup();
 try{
  const before=c.repo();
  const raw=before.load(c.id);
  assert.equal(raw.status,'active');
  assert.equal(raw.resumption_target.handler_ref,PUBLIC_INDEX_REENTRY_HANDLER);
  assert.equal(before.snapshot(c.id).slots.length,0,'no computed artifact before Judgment');
  before.close();
  const done=c.run('continuation','resolve',c.id,'--decision','source','--reason',reason);
  assert.equal(done.status,0,done.stdout);
  assert.equal(done.data.reentry.status,'resumed');
  assert.ok(done.data.reentry.artifact.chunk_count>=1);
  assert.equal(done.data.reentry.artifact.index_eligible,true);
  const again=c.run('continuation','reenter',c.id);
  assert.equal(again.data.reentry.status,'already_resumed');
  const duplicate=c.run('continuation','resolve',c.id,'--decision','source','--reason',reason);
  assert.equal(duplicate.status,0);
  assert.equal(duplicate.data.reentry.status,'already_resumed');
  const repo=c.repo(),snap=repo.snapshot(c.id),resolved=repo.load(c.id);
  assert.equal(snap.slots.length,1);
  assert.equal(resolved.resolution.return_state.delivered,true);
  assert.equal(resolved.history.filter(x=>x.event==='reentered').length,1);
  assert.equal(snap.slots[0].result.chunk_count,done.data.reentry.artifact.chunk_count);
  repo.close();
  const actualIndex=c.run('index','update');
  assert.equal(actualIndex.status,0,actualIndex.stdout);
  assert.equal(actualIndex.data.partial,false,'original indexer should proceed after the accepted Judgment');
  assert.ok(actualIndex.data.chunks>=1);
  assert.ok(actualIndex.data.searchable_public>=1);
  assert.equal(actualIndex.data.resumed_index_judgments.applied,1);
  assert.equal(actualIndex.data.continuations.length,0,'no redundant Judgment request');
  assert.throws(()=>c.run('continuation','resolve',c.id,
   '--decision','archive','--reason','Conflicting judgment'),
   /continuation_result_conflict/);
  const conflicting=c.repo();
  const preserved=conflicting.sources(c.id).filter(x=>
   x.source_ref.startsWith('competing-judgment:sha256:'));
  assert.equal(preserved.length,1,'divergent answer must survive in original SQLite');
  assert.equal(preserved[0].payload.status,'reconciliation_required');
  conflicting.close();
 }finally{c.cleanup()}
});

test('H1: crash after durable resolution, before consumer: fresh process reenters',()=>{
 const c=setup();
 try{
  const repo=c.repo(),row=repo.load(c.id);
  row.status='resolved';
  row.resolution={decision:'source',reason,payload:{},resolved_at:new Date().toISOString(),
   return_state:{result_available:true,delivered:false,
    result_ref:'continuation:'+c.id+'/resolution'}};
  row.history.push({event:'resolved',at:new Date().toISOString()});
  repo.save(row);
  assert.equal(repo.snapshot(c.id).slots.length,0);
  repo.close();
  const recovered=c.run('continuation','reenter',c.id);
  assert.equal(recovered.status,0,recovered.stdout);
  assert.equal(recovered.data.reentry.status,'resumed');
  const persisted=c.repo();
  assert.equal(persisted.snapshot(c.id).slots.length,1);
  persisted.close();
 }finally{c.cleanup()}
});

test('H1: unavailable handler fails closed, source changes refuse replay',()=>{
 const c=setup();
 try{
  const db=c.repo(),obj=db.load(c.id);
  obj.resumption_target.handler_ref='handler:unavailable';
  db.save(obj);db.close();
  const denied=c.run('continuation','resolve',c.id,'--decision','source','--reason',reason);
  assert.equal(denied.status,1);
  assert.equal(denied.data.reentry.status,'unavailable_reentry_handler');
  const changed=c.run('continuation','reenter',c.id);
  assert.equal(changed.data.reentry.status,'unavailable_reentry_handler');
 }finally{c.cleanup()}
 const d=setup();
 try{
  writeFileSync(join(d.root,'documents','public.md'),sample+'\nAnother edition');
  const changed=d.run('continuation','resolve',d.id,'--decision','source','--reason',reason);
  assert.equal(changed.status,1);
  assert.equal(changed.data.reentry.status,'source_version_conflict');
  const db=d.repo();
  assert.equal(db.snapshot(d.id).slots.length,0);
  db.close();
 }finally{d.cleanup()}
});

test('H1: uncertain Judgment emits a followup continuation, not a completed index artifact',()=>{
 const c=setup();
 try{
  const r=c.run('continuation','resolve',c.id,'--decision','needs_more_context',
    '--reason','Classification needs a reliable source to decide');
  assert.equal(r.status,0,r.stdout);
  assert.equal(r.data.reentry.artifact.status,'awaiting_additional_judgment');
  assert.ok(r.data.reentry.artifact.followup_ref);
  const repo=c.repo(),parent=repo.load(c.id);
  assert.equal(parent.resolution.return_state.resumed,true);
  const descendants=repo.list().filter(x=>x.context?.parent_continuation_ref==='continuation:'+c.id);
  assert.equal(descendants.length,1);
  assert.equal(descendants[0].status,'active');
  assert.equal(descendants[0].resumption_target.handler_ref,PUBLIC_INDEX_REENTRY_HANDLER);
  repo.close();
  const again=c.run('continuation','reenter',c.id);
  assert.equal(again.status,0);
  const check=c.repo();
  assert.equal(check.list().filter(x=>x.context?.parent_continuation_ref==='continuation:'+c.id).length,1);
  check.close();
 }finally{c.cleanup()}
});

test('H2: two clearly labelled fixture interpreters satisfy one provider-neutral return contract',()=>{
 const results=[];
 for(const provider of ['magistral-api-fixture','chatgpt-cps-fixture']){
  const c=setup();
  try{
   const r=c.run('continuation','resolve',c.id,'--payload-json',
    JSON.stringify({decision:'source',reason,provenance:{provider,fixture:true}}));
   assert.equal(r.status,0,r.stdout);
   assert.equal(r.data.reentry.status,'resumed');
   results.push({provider,profile:r.data.reentry.artifact.profile,
    chunks:r.data.reentry.artifact.chunk_hashes,indexable:r.data.reentry.artifact.index_eligible});
  }finally{c.cleanup()}
 }
 assert.equal(results[0].profile,results[1].profile);
 assert.deepEqual(results[0].chunks,results[1].chunks);
 assert.equal(results[0].indexable,true);
 assert.notEqual(results[0].provider,results[1].provider);
});

test('H4: verified primitive snapshot migrates to a new independent SQLite locality and reenters',()=>{
 const c=setup();
 const target=mkdtempSync(join(tmpdir(),'cpkt010-import-'));
 try{
  const src=c.repo(),obj=src.load(c.id);
  obj.status='resolved';
  obj.resolution={decision:'source',reason,payload:{provenance:{provider:'old-fixture'}},
    return_state:{result_available:true,delivered:false},resolved_at:new Date().toISOString()};
  obj.history.push({event:'resolved',at:new Date().toISOString()});
  src.save(obj);
  const portable=src.snapshot(c.id);
  assert.equal(portable.slots.length,0);
  src.close();
  mkdirSync(join(target,'documents'));
  copyFileSync(join(c.root,'documents','public.md'),join(target,'documents','public.md'));
  writeFileSync(join(target,'.cogentia.json'),JSON.stringify({
   repos:[{name:'cogentia',path:'documents',branch:'main',kind:'public'}]}));
  const db=join(target,'imported.sqlite');
  const imported=createPrimitiveContinuationStore(db);
  const accepted=imported.importSnapshot(portable,{scope:'registry:independent-locality'});
  assert.equal(accepted.ok,true);
  assert.equal(imported.snapshot(c.id).continuation.scope,'registry:independent-locality');
  imported.close();
  const env={...c.env,COGENTIA_REGISTRY:join(target,'.cogentia.json'),
   COGENTIA_CONTINUATIONS_DB:db,COGENTIA_DATA_DIR:join(target,'index-data')};
  const out=spawnSync(process.execPath,[cli,'continuation','reenter',c.id,'--json'],{
   encoding:'utf8',env,timeout:30000});
  assert.equal(out.status,0,out.stdout+'\n'+out.stderr);
  const r=JSON.parse(out.stdout);
  assert.equal(r.reentry.status,'resumed');
  assert.ok(r.reentry.artifact.chunk_count>0);
  const dest=createContinuationSqliteRepository({registryRoot:target,dbPath:db});
  assert.equal(dest.snapshot(c.id).slots.length,1);
  dest.close();
  const origin=c.repo();
  assert.equal(origin.snapshot(c.id).slots.length,0,'origin left unchanged');
  origin.close();
 }finally{c.cleanup();rmSync(target,{recursive:true,force:true})}
});


test('H4: suspended packet crosses locality, former provider absent, alternate human fixture answers',()=>{
 const c=setup();
 const target=mkdtempSync(join(tmpdir(),'cpkt010-no-provider-'));
 try{
  const original=c.repo(),packet=original.snapshot(c.id); original.close();
  mkdirSync(join(target,'documents'));
  copyFileSync(join(c.root,'documents','public.md'),join(target,'documents','public.md'));
  writeFileSync(join(target,'.cogentia.json'),JSON.stringify({
    repos:[{name:'cogentia',path:'documents',kind:'public',branch:'main'}]}));
  const db=join(target,'state.sqlite');
  const imported=createPrimitiveContinuationStore(db);
  assert.equal(imported.importSnapshot(packet,{scope:'new-fractanode'}).ok,true);
  imported.close();
  const env={...c.env,COGENTIA_REGISTRY:join(target,'.cogentia.json'),
   COGENTIA_CONTINUATIONS_DB:db,COGENTIA_DATA_DIR:join(target,'index-data')};
  // No provider token, session, original process or network request is present.
  for (const key of ['OPENAI_API_KEY','MISTRAL_API_KEY','MAGISTRAL_API_KEY'])delete env[key];
  const out=spawnSync(process.execPath,[cli,'continuation','resolve',c.id,
    '--payload-json',JSON.stringify({decision:'source',reason,
      provenance:{provider:'human-copy-fixture',fixture:true}}),'--json'],{
      encoding:'utf8',env,timeout:30000});
  assert.equal(out.status,0,out.stdout+'\n'+out.stderr);
  const returned=JSON.parse(out.stdout);
  assert.equal(returned.reentry.status,'resumed');
  assert.equal(returned.reentry.artifact.index_eligible,true);
  const originalAgain=c.repo();
  assert.equal(originalAgain.load(c.id).status,'active','former locality retains own state');
  originalAgain.close();
 }finally{c.cleanup();rmSync(target,{recursive:true,force:true})}
});


test('H1: concurrent conflicting Judgment returns use SQLite CAS and retain losing evidence',async()=>{
 const c=setup();
 try{
  const run=decision=>new Promise((done,reject)=>{
   const cmd=spawn(process.execPath,[cli,'continuation','resolve',c.id,
    '--decision',decision,'--reason',reason,'--json'],{env:c.env,stdio:['ignore','pipe','pipe']});
   let stdout='',stderr='';
   cmd.stdout.on('data',v=>{stdout+=v});
   cmd.stderr.on('data',v=>{stderr+=v});
   cmd.on('error',reject);
   cmd.on('close',code=>{
    let parsed;
    try{parsed=JSON.parse(stdout.trim()||stderr.slice(stderr.indexOf('{')))}catch{return reject(Error('non-json CLI result: '+stdout+' '+stderr))}
    done({code,parsed});
   });
  });
  const results=await Promise.all([run('source'),run('archive')]);
  assert.equal(results.filter(r=>r.code===0).length,1,JSON.stringify(results));
  assert.equal(results.filter(r=>r.code!==0).length,1,JSON.stringify(results));
  const db=c.repo(),winner=db.load(c.id),losses=db.sources(c.id)
    .filter(x=>x.source_ref.startsWith('competing-judgment:'));
  assert.ok(['source','archive'].includes(winner.resolution.decision));
  assert.equal(losses.length,1,'losing candidate is causally retained in local snapshot');
  assert.notEqual(losses[0].payload.competing_result.decision,winner.resolution.decision);
  assert.equal(db.snapshot(c.id).slots.length,1);
  db.close();
 }finally{c.cleanup()}
});

test('H1: identical competing Judgment returns are assimilated once',async()=>{
 const c=setup();
 try{
  const result=()=>new Promise((ok,fail)=>{
   const p=spawn(process.execPath,[cli,'continuation','resolve',c.id,
    '--decision','source','--reason',reason,'--json'],{env:c.env});
   let data='';p.stdout.on('data',x=>data+=x);
   p.on('error',fail);p.on('close',status=>{
    try{ok({status,data:JSON.parse(data)})}catch(e){fail(e)}
   });
  });
  const both=await Promise.all([result(),result()]);
  assert.deepEqual(both.map(x=>x.status),[0,0]);
  const db=c.repo();
  assert.equal(db.snapshot(c.id).slots.length,1);
  assert.equal(db.load(c.id).history.filter(x=>x.event==='reentered').length,1);
  assert.equal(db.sources(c.id).filter(x=>x.source_ref.startsWith('competing-judgment:')).length,0);
  db.close();
 }finally{c.cleanup()}
});


test('H1: visibility-only public verdict never fabricates a source role',()=>{
 const c=setup();
 try{
  const r=c.run('continuation','resolve',c.id,'--decision','public',
   '--reason','Visibility confirmed public, document role not established');
  assert.equal(r.status,0,r.stdout);
  assert.equal(r.data.reentry.artifact.status,'awaiting_additional_judgment');
  const db=c.repo(),child=db.list().find(x=>x.context?.parent_continuation_ref==='continuation:'+c.id);
  assert.ok(child);
  assert.equal(child.expected_response.allowed_decisions.includes('public'),false);
  db.close();
  const i=c.run('index','update');
  assert.equal(i.status,0);
  assert.equal(i.data.partial,true);
  assert.equal(i.data.chunks,0);
 }finally{c.cleanup()}
});


test('H1: updated document version cannot reuse an active stale Judgment',()=>{
 const c=setup();
 try{
  writeFileSync(join(c.root,'documents','public.md'),sample+'\n## Subsequent version');
  const second=c.run('index','update');
  assert.equal(second.status,0,second.stdout);
  assert.equal(second.data.partial,true);
  assert.equal(second.data.continuations.length,1);
  const replacement=second.data.continuations[0].id;
  assert.notEqual(replacement,c.id);
  const db=c.repo();
  const first=db.load(c.id),next=db.load(replacement);
  assert.equal(first.status,'active');
  assert.equal(next.status,'active');
  assert.notEqual(first.context.source_sha256,next.context.source_sha256);
  db.close();
 }finally{c.cleanup()}
});
