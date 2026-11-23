import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {installReconcileHooks,contentForHook,MARKER} from './ops/git-install-reconcile-hooks.js';
const git=(cwd,...args)=>{
 const r=spawnSync('git',args,{cwd,encoding:'utf8',timeout:18000});
 if(r.status!==0)throw Error(args.join(' ')+' -> '+r.stderr);
 return r.stdout.trim();
};
test('hooks install only where absent, then reject stale remote pushes without corrupting commits',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-hooks-test-'));
 try{
  const origin=path.join(dir,'bare.git'),a=path.join(dir,'alpha'),b=path.join(dir,'beta');
  git(dir,'init','--bare',origin);git(dir,'clone',origin,a);
  git(a,'config','user.name','Fixture');git(a,'config','user.email','fixture@example.invalid');
  git(a,'checkout','-b','main');await writeFile(path.join(a,'readme.md'),'original\n');
  git(a,'add','readme.md');git(a,'commit','-m','initial');git(a,'push','-u','origin','main');
  git(dir,'clone','--branch','main',origin,b);
  git(b,'config','user.name','Fixture');git(b,'config','user.email','fixture@example.invalid');
  const plan=await installReconcileHooks({repo:a});
  assert.equal(plan.results[0].status,'WOULD_INSTALL');
  const installed=await installReconcileHooks({repo:a,apply:true});
  assert.deepEqual(installed.results.map(x=>x.status),['INSTALLED','INSTALLED']);
  assert.deepEqual((await installReconcileHooks({repo:a,apply:true})).results.map(x=>x.status),
   ['ALREADY_INSTALLED','ALREADY_INSTALLED']);
  const f=path.join(a,'.git','hooks','pre-commit');
  assert.match(await readFile(f,'utf8'),/Cogentia incremental reconciliation/);
  await writeFile(path.join(a,'local.md'),'my packet\n');git(a,'add','local.md');
  // Hook pre-commit fetches, classifies, and permits this scoped commit.
  git(a,'commit','-m','local packet');
  await writeFile(path.join(b,'readme.md'),'other actor\n');
  git(b,'commit','-am','remote actor');git(b,'push','origin','main');
  const push=spawnSync('git',['push','origin','main'],{cwd:a,encoding:'utf8',timeout:20000});
  assert.notEqual(push.status,0);
  assert.match(push.stderr+push.stdout,/RECONCILIATION_REQUIRED/);
  assert.equal(git(a,'log','-1','--format=%s'),'local packet');
  assert.equal(await readFile(path.join(a,'local.md'),'utf8'),'my packet\n');
  assert.equal(git(b,'log','-1','--format=%s'),'remote actor');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('existing custom hooks are never overwritten',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-hooks-preserve-'));
 try{
  git(dir,'init');const dest=path.join(dir,'.git','hooks','pre-commit');
  await writeFile(dest,'#!/bin/sh\nexit 0\n',{mode:0o755});
  const r=await installReconcileHooks({repo:dir,apply:true});
  assert.equal(r.results[0].status,'EXISTING_HOOK_NOT_TOUCHED');
  assert.equal(r.results[1].status,'INSTALLED');
  assert.equal(await readFile(dest,'utf8'),'#!/bin/sh\nexit 0\n');
 }finally{await rm(dir,{recursive:true,force:true})}
});
