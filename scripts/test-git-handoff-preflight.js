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
 } finally {await rm(dir,{recursive:true,force:true})}
});
