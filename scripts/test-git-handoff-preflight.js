import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./ops/git-handoff-preflight.js',import.meta.url));
function run(cmd,args,cwd){
 const r=spawnSync(cmd,args,{cwd,encoding:'utf8'});
 if(r.status!==0)throw Error(cmd+': '+r.stderr);
 return r.stdout.trim();
}
test('preflight distinguishes current, local work and unpushed commit without writing',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'git-handoff-test-'));
 try{
  const remote=path.join(dir,'remote.git'),repo=path.join(dir,'repo');
  run('git',['init','--bare',remote],dir);
  run('git',['init','-b','main',repo],dir);
  run('git',['config','user.name','Fixture'],repo);
  run('git',['config','user.email','fixture@example.invalid'],repo);
  run('git',['remote','add','origin',remote],repo);
  await writeFile(path.join(repo,'README.md'),'initial\n');
  run('git',['add','README.md'],repo);
  run('git',['commit','-m','first'],repo);
  run('git',['push','-u','origin','main'],repo);
  const check=()=>JSON.parse(run(process.execPath,[script,'--repo',repo,'--json'],repo));
  assert.equal(check().state,'CURRENT');
  await writeFile(path.join(repo,'llms.txt'),'local projection');
  await writeFile(path.join(repo,'plan.md'),'unique local work');
  let s=check();
  assert.equal(s.state,'LOCAL_WIP');
  assert.equal(s.generated_count,1);
  assert.equal(s.dirty_count,2);
  run('git',['add','plan.md'],repo);
  run('git',['commit','-m','wip: test'],repo);
  s=check();
  assert.equal(s.state,'LOCAL_COMMITS_AND_WIP');
  assert.equal(s.ahead,1);
  assert.equal(s.behind,0);
  assert.equal(s.changed.find(x=>x.path==='llms.txt').generated,true);
  await writeFile(path.join(repo,'README.md'),'tracked but dirty\n');
  s=check();
  assert.equal(s.changed.find(x=>x.path==='README.md').code,' M');
  assert.equal(run('git',['status','--porcelain'],repo).split('\n').length,2);
  // Another host publishes a change to a file being edited locally.
  const other=path.join(dir,'other');
  run('git',['clone','--branch','main',remote,other],dir);
  run('git',['config','user.name','Remote Fixture'],other);
  run('git',['config','user.email','remote@example.invalid'],other);
  await writeFile(path.join(other,'README.md'),'remote concurrent change\n');
  run('git',['add','README.md'],other);
  run('git',['commit','-m','remote: concurrent README update'],other);
  run('git',['push','origin','main'],other);
  const checkCheckpoint=()=>JSON.parse(run(process.execPath,[script,'--repo',repo,'--phase','checkpoint','--json'],repo));
  s=checkCheckpoint();
  assert.equal(s.state,'DIVERGED');
  assert.equal(s.phase,'checkpoint');
  assert.equal(s.ahead,1);
  assert.equal(s.behind,1);
  assert.deepEqual(s.local_remote_overlap_paths,['README.md']);
  assert.deepEqual(s.remote_changed_paths,['README.md']);
  assert.match(s.incoming_commits[0],/remote: concurrent README update/);
  assert.equal(run('git',['status','--porcelain'],repo).split('\n').length,2);
  assert.equal(run('git',['log','-1','--format=%s'],repo),'wip: test');
 } finally {await rm(dir,{recursive:true,force:true})}
});
