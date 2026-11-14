import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {syncExistingRoot} from './ops/git-sync-clean-repos.js';
const run=(cwd,...args)=>{
 const p=spawnSync('git',args,{cwd,encoding:'utf8'});
 if(p.status!==0)throw Error(p.stderr);
 return p.stdout.trim();
};
test('sync advances only a clean, non-diverged canonical checkout; never overwrites WIP',async()=>{
 const base=await mkdtemp(path.join(tmpdir(),'cogentia-sync-'));
 try {
  const origin=path.join(base,'remote.git'),source=path.join(base,'source'),root=path.join(base,'repos'),clean=path.join(root,'clean'),dirty=path.join(root,'dirty'),ahead=path.join(root,'ahead');
  await mkdir(root);
  run(base,'init','--bare',origin);
  run(base,'clone',origin,source);
  run(source,'config','user.name','Fixture');
  run(source,'config','user.email','fixture@example.invalid');
  run(source,'checkout','-b','main');
  await writeFile(path.join(source,'file.md'),'one\n');
  run(source,'add','file.md');run(source,'commit','-m','first');run(source,'push','-u','origin','main');
  for(const d of [clean,dirty,ahead]) {
    run(root,'clone','--branch','main',origin,d);
    run(d,'config','user.name','Fixture');run(d,'config','user.email','fixture@example.invalid');
  }
  await writeFile(path.join(dirty,'file.md'),'uncommitted WIP\n');
  await writeFile(path.join(ahead,'own.md'),'new local commit\n');
  run(ahead,'add','own.md');run(ahead,'commit','-m','wip: not published');
  await writeFile(path.join(source,'file.md'),'two\n');
  run(source,'add','file.md');run(source,'commit','-m','second');run(source,'push');
  // A symlinked checkout must not be silently skipped from a root-wide
  // freshness scan. This is the actual Fracta2 layout for two repos.
  await symlink(clean,path.join(root,'clean-alias'),'dir');
  const initial=run(clean,'rev-parse','HEAD');
  const dry=await syncExistingRoot(root);
  assert.equal(dry.results.find(x=>x.repo==='clean').status,'DRY_RUN');
  assert.equal(dry.results.find(x=>x.repo==='clean-alias').status,'DRY_RUN');
  assert.equal(run(clean,'rev-parse','HEAD'),initial);
  const applied=await syncExistingRoot(root,{apply:true});
  assert.equal(applied.results.find(x=>x.repo==='clean').status,'FAST_FORWARDED');
  assert.ok(['FAST_FORWARDED','CURRENT'].includes(
    applied.results.find(x=>x.repo==='clean-alias').status));
  assert.equal(applied.results.find(x=>x.repo==='dirty').status,'SKIP_DIRTY');
  assert.equal(applied.results.find(x=>x.repo==='ahead').status,'SKIP_DIVERGED');
  assert.equal(run(clean,'rev-parse','HEAD'),run(source,'rev-parse','HEAD'));
  assert.match(run(dirty,'status','--porcelain'), /file.md/);
  assert.equal(run(ahead,'log','-1','--format=%s'),'wip: not published');
  assert.equal((await syncExistingRoot(root,{apply:true})).results.find(x=>x.repo==='clean').status,'CURRENT');
 }finally {await rm(base,{recursive:true,force:true})}
});
