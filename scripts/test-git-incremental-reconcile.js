import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {gitCmd,reconcileGitEvent} from './lib/git-incremental-reconcile.js';

async function fixture(){
 const home=await mkdtemp(path.join(tmpdir(),'cogentia-incremental-git-'));
 const bare=path.join(home,'origin.git'),a=path.join(home,'A'),b=path.join(home,'B');
 gitCmd(home,['init','--bare',bare]);
 gitCmd(home,['clone',bare,a]);
 gitCmd(a,['config','user.name','Fixture A']);gitCmd(a,['config','user.email','a@fixture.invalid']);
 gitCmd(a,['checkout','-b','main']);
 await writeFile(path.join(a,'shared.txt'),'TOP\nmiddle\nBOTTOM\n');
 await writeFile(path.join(a,'independent.txt'),'base\n');
 gitCmd(a,['add','shared.txt','independent.txt']);
 gitCmd(a,['commit','-m','initial']);
 gitCmd(a,['push','--set-upstream','origin','main']);
 gitCmd(home,['clone','--branch','main',bare,b]);
 gitCmd(b,['config','user.name','Fixture B']);gitCmd(b,['config','user.email','b@fixture.invalid']);
 return {home,bare,a,b,cleanup:()=>rm(home,{recursive:true,force:true})};
}
test('scoped commit accepts independent WIP while push detects stale branch; start ff reconciles safely',async()=>{
 const f=await fixture();
 try{
  await writeFile(path.join(f.a,'independent.txt'),'local work\n');
  gitCmd(f.a,['add','independent.txt']);
  await writeFile(path.join(f.b,'shared.txt'),'TOP\nmiddle\nUPDATED REMOTE\n');
  gitCmd(f.b,['commit','-am','remote shared']);
  gitCmd(f.b,['push','origin','main']);
  const pre=await reconcileGitEvent({repo:f.a,phase:'commit'});
  assert.equal(pre.status,'INDEPENDENT_WIP');assert.deepEqual(pre.scope,['independent.txt']);
  assert.equal(pre.independent_dirty_count,0);
  const push=await reconcileGitEvent({repo:f.a,phase:'push'});
  assert.equal(push.status,'RECONCILIATION_REQUIRED');
  assert.equal(push.behind,1);
  const before=gitCmd(f.a,['rev-parse','HEAD']);
  const current=await reconcileGitEvent({repo:f.a,phase:'start',apply:true});
  assert.equal(current.status,'RECONCILED');assert.equal(current.applied,true);
  assert.notEqual(gitCmd(f.a,['rev-parse','HEAD']),before);
  assert.equal(await readFile(path.join(f.a,'independent.txt'),'utf8'),'local work\n');
  assert.equal(await readFile(path.join(f.a,'shared.txt'),'utf8'),'TOP\nmiddle\nUPDATED REMOTE\n');
 }finally{await f.cleanup()}
});
test('same-file conflict identifies packet arbitration without modifying staged work',async()=>{
 const f=await fixture();
 try{
  await writeFile(path.join(f.a,'shared.txt'),'TOP\nLOCAL\nBOTTOM\n');
  gitCmd(f.a,['add','shared.txt']);
  await writeFile(path.join(f.b,'shared.txt'),'TOP\nREMOTE\nBOTTOM\n');
  gitCmd(f.b,['commit','-am','remote shared edit']);
  gitCmd(f.b,['push','origin','main']);
  const pre=await reconcileGitEvent({repo:f.a,phase:'commit'});
  assert.equal(pre.status,'ARBITRATION_REQUIRED');
  assert.equal(pre.overlap.length,1);assert.equal(pre.overlap[0].reason,'three_way_conflict');
  assert.equal(await readFile(path.join(f.a,'shared.txt'),'utf8'),'TOP\nLOCAL\nBOTTOM\n');
  const after=await reconcileGitEvent({repo:f.a,phase:'start',apply:true});
  assert.equal(after.applied,false);
 }finally{await f.cleanup()}
});
test('non-overlapping same-file changes are mergeable, but staged index remains untouched',async()=>{
 const f=await fixture();
 try{
  await writeFile(path.join(f.a,'shared.txt'),'LOCAL\nmiddle\nBOTTOM\n');
  gitCmd(f.a,['add','shared.txt']);
  await writeFile(path.join(f.b,'shared.txt'),'TOP\nmiddle\nREMOTE\n');
  gitCmd(f.b,['commit','-am','remote other region']);
  gitCmd(f.b,['push','origin','main']);
  const pre=await reconcileGitEvent({repo:f.a,phase:'commit'});
  assert.equal(pre.status,'AUTO_RECONCILABLE');
  assert.equal(pre.overlap[0].reason,'clean_three_way_preview');
  assert.equal(gitCmd(f.a,['show',':shared.txt']),'LOCAL\nmiddle\nBOTTOM');
  assert.equal(await readFile(path.join(f.a,'shared.txt'),'utf8'),'LOCAL\nmiddle\nBOTTOM\n');
 }finally{await f.cleanup()}
});
test('locally diverged history blocks push, independent target commit stays possible',async()=>{
 const f=await fixture();
 try{
  await writeFile(path.join(f.a,'local-only.txt'),'local\n');
  gitCmd(f.a,['add','local-only.txt']);gitCmd(f.a,['commit','-m','local checkpoint']);
  await writeFile(path.join(f.b,'shared.txt'),'TOP\nmiddle\nREMOTE\n');
  gitCmd(f.b,['commit','-am','remote checkpoint']);gitCmd(f.b,['push','origin','main']);
  await writeFile(path.join(f.a,'local-next.txt'),'next\n');gitCmd(f.a,['add','local-next.txt']);
  const stage=await reconcileGitEvent({repo:f.a,phase:'commit'});
  assert.equal(stage.status,'INDEPENDENT_WIP');
  assert.equal(stage.ahead,1);assert.equal(stage.behind,1);
  const push=await reconcileGitEvent({repo:f.a,phase:'push'});
  assert.equal(push.status,'RECONCILIATION_REQUIRED');
  const start=await reconcileGitEvent({repo:f.a,phase:'start',apply:true});
  assert.equal(start.applied,false);
 }finally{await f.cleanup()}
});
test('remote tracking, offline checks and restricted task paths are explicit',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(()=>reconcileGitEvent({repo:f.a,paths:['../private'],fetch:false}),/INVALID_TASK_PATH/);
  await assert.rejects(()=>reconcileGitEvent({repo:f.a,phase:'delete'}),/INVALID_RECONCILE_PHASE/);
  const zero=await reconcileGitEvent({repo:f.a,phase:'commit',fetch:false});
  assert.equal(zero.status,'NO_SCOPE');
 }finally{await f.cleanup()}
});
