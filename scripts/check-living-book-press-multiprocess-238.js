#!/usr/bin/env node
/**
 * Reality Test #238: actual independent Node processes, lock crash and fail-closed.
 * No production copies; temporary isolated registry.
 */
import assert from 'node:assert/strict';
import {spawnSync, spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LivingBookRegistry} from './lib/living-book-press/registry.js';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'press-process-fbf-'));
const worker=path.join(root,'worker.mjs');
const registryURL=new URL('./lib/living-book-press/registry.js',import.meta.url).href;
const book='test-book', edition='2026-10-17-demo';
const program=`import {LivingBookRegistry} from ${JSON.stringify(registryURL)};
const r=new LivingBookRegistry({storageDir:process.argv[2]});
if(process.argv[3]==='crash') { 
  r._withLock(()=>{process.stdout.write('LOCKED\\n');process.kill(process.pid,'SIGKILL');});
} else {
  const row=r.reserveCopy(next=>{
    const copy_id=next('test-book','2026-10-17-demo','TB');
    return {copy_id,book_id:'test-book',edition_id:'2026-10-17-demo',status:'RESERVED'};
  });
  process.stdout.write(row.copy_id+'\\n');
}`;
fs.writeFileSync(worker,program);
try {
  const jobs=Array.from({length:8},()=>new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[worker,root,'issue'],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    proc.stdout.on('data',d=>stdout+=d);
    proc.stderr.on('data',d=>stderr+=d);
    proc.on('error',reject);
    proc.on('close',code=>code===0?resolve(stdout.trim()):reject(new Error(stderr||'worker exit '+code)));
  }));
  const ids=await Promise.all(jobs);
  assert.equal(new Set(ids).size,ids.length,'real worker processes must have distinct IDs');
  assert.equal(new LivingBookRegistry({storageDir:root}).listRecords().length,ids.length);
  const crashed=spawnSync(process.execPath,[worker,root,'crash'],{encoding:'utf8'});
  assert.ok(crashed.signal==='SIGKILL' || crashed.status!==0,'worker was interrupted');
  // SQLite releases an interrupted process's transaction automatically.
  assert.equal(fs.existsSync(path.join(root,'.living-book-registry.lock')), false);
  const recovered=spawnSync(process.execPath,[worker,root,'issue'],{encoding:'utf8'});
  assert.equal(recovered.status,0, 'issuer must recover automatically after SIGKILL: '+recovered.stderr);
  assert.ok(!ids.includes(recovered.stdout.trim()), 'post-crash ID must be unique');
  assert.equal(new LivingBookRegistry({storageDir:root}).listRecords().length,ids.length+1);
  console.log('PASS: eight independent processes, SIGKILL automatic recovery, no lost issued records');
} finally {fs.rmSync(root,{recursive:true,force:true});}
