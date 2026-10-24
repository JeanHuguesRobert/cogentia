#!/usr/bin/env node
// Regression test for corpus-velocity #267. No network or external dependencies.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'corpus-velocity.js');
const exec=(cwd,cmd,args,env={})=>execFileSync(cmd,args,{cwd,env:{...process.env,...env},encoding:'utf8'});
test('monthly Git snapshots separate source code, generated output and not-yet-created repositories',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'corpus-velocity-test-'));
 try{
  const root=path.join(temp,'repos'),work=path.join(root,'sample');
  fs.mkdirSync(work,{recursive:true});
  exec(work,'git',['init','-q']);
  exec(work,'git',['config','user.email','test@example.org']);
  exec(work,'git',['config','user.name','Corpus Test']);
  fs.writeFileSync(path.join(work,'README.md'),'# sample\n');
  fs.writeFileSync(path.join(work,'main.js'),'console.log(1);\n');
  fs.mkdirSync(path.join(work,'generated'));
  fs.writeFileSync(path.join(work,'generated','autogen.js'),'console.log(999);\n');
  exec(work,'git',['add','.']);
  exec(work,'git',['commit','-qm','initial'],{GIT_AUTHOR_DATE:'2026-09-15T12:00:00Z',GIT_COMMITTER_DATE:'2026-09-15T12:00:00Z'});
  fs.writeFileSync(path.join(work,'extra.py'),'print(2)\n');
  exec(work,'git',['add','.']);
  exec(work,'git',['commit','-qm','october'],{GIT_AUTHOR_DATE:'2026-10-12T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-12T12:00:00Z'});
  const reg=path.join(temp,'repos.json'),out=path.join(temp,'out');
  fs.writeFileSync(reg,JSON.stringify({repos:[
   {name:'example/sample',path:'sample',visibility:'public',include:true},
   {name:'example/private',path:'private',visibility:'private',include:false},
   {name:'example/missing',path:'missing',visibility:'public',include:true}
  ]}));
  exec(temp,'node',[script,'--registry',reg,'--root',root,'--from','2026-08','--to','2026-10','--out',out]);
  const data=JSON.parse(fs.readFileSync(path.join(out,'corpus-velocity.json'),'utf8'));
  assert.equal(data.status,'partial');
  assert.equal(data.rows.length,3);
  const [aug,sep,oct]=data.rows;
  assert.equal(aug.status,'not_yet_created');
  assert.equal(aug.files,0);
  assert.equal(sep.files,3);
  assert.equal(sep.code_files,1);
  assert.equal(sep.excluded_files,1);
  assert.equal(oct.code_files,2);
  assert.equal(oct.by_language.js,1);
  assert.equal(oct.by_language.py,1);
  assert(data.warnings.some(x=>x.repo==='example/private'&&x.status==='excluded_by_registry'));
  assert(data.warnings.some(x=>x.repo==='example/missing'&&x.status==='missing_local_clone'));
  const csv=fs.readFileSync(path.join(out,'corpus-velocity.csv'),'utf8');
  assert(csv.includes('2026-09'));
  assert(csv.includes('2026-10'));
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
