import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile} from 'node:fs/promises';
import {cleanSyncHealth,declaredSyncHealth} from './lib/repo-sync-health.js';
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
  assert.equal(applied.health.status,'attention_required');
  assert.ok(applied.health.blocked.some(x=>x.repo==='dirty'&&x.status==='SKIP_DIRTY'));
  assert.ok(applied.health.blocked.some(x=>x.repo==='ahead'&&x.status==='SKIP_DIVERGED'));
  assert.ok(applied.health.blocked.every(x=>Object.keys(x).sort().join(',')==='ahead,behind,repo,status'));
  const receiptFile=path.join(base,'git-clean-sync-latest.json');
  const issued=spawnSync(process.execPath,['ops/git-sync-clean-repos.js',
    '--root',root,'--apply','--receipt',receiptFile,'--json'],{
    cwd:path.dirname(new URL(import.meta.url).pathname),encoding:'utf8'});
  assert.equal(issued.status,0,issued.stderr);
  const receipt=JSON.parse(await readFile(receiptFile,'utf8'));
  assert.equal(receipt.schema,'cogentia.repo_sync_receipt.v1');
  assert.equal(receipt.health.status,'attention_required');
  assert.ok(receipt.health.blocked.some(x=>x.repo==='dirty'));
  assert.match(receipt.checked_at,/^\d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(JSON.stringify(receipt),/uncommitted WIP|fixture@example.invalid/);
  assert.equal(run(clean,'rev-parse','HEAD'),run(source,'rev-parse','HEAD'));
  assert.match(run(dirty,'status','--porcelain'), /file.md/);
  assert.equal(run(ahead,'log','-1','--format=%s'),'wip: not published');
  assert.equal((await syncExistingRoot(root,{apply:true})).results.find(x=>x.repo==='clean').status,'CURRENT');
 }finally {await rm(base,{recursive:true,force:true})}
});


test('health receipts distinguish blocked clean-sync states and redact raw Git errors',()=>{
  const summary=cleanSyncHealth([
    {repo:'clean',status:'CURRENT'},
    {repo:'work',status:'SKIP_DIRTY',error:'secret://never-store'},
    {repo:'broken',status:'ERROR',error:'private remote URL and token'},
    {repo:'fork',status:'SKIP_DIVERGED',ahead:3,behind:4},
  ]);
  assert.equal(summary.status,'attention_required');
  assert.equal(summary.blocked_count,3);
  assert.deepEqual(summary.blocked.map(x=>x.status),['SKIP_DIRTY','ERROR','SKIP_DIVERGED']);
  assert.doesNotMatch(JSON.stringify(summary),/secret|token|remote URL/);
  const sleep=declaredSyncHealth([
    {repo:'alpha',action:'synced',ok:true},
    {repo:'beta',action:'fetched_dirty_skip_pull',ok:true},
    {repo:'gamma',action:'pull_ff_only_failed',ok:false},
    {repo:'private',action:'skip_private',ok:true},
  ]);
  assert.equal(sleep.blocked_count,2);
  assert.deepEqual(sleep.blocked.map(x=>x.repo),['beta','gamma']);
});
