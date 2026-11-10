#!/usr/bin/env node
/**
 * Offline import of Baileys MultiFileAuthState into a candidate SQLite DB.
 * NEVER use on a running auth directory: a coherent key+credential snapshot
 * cannot be guaranteed while the Signal state is changing.
 * No cryptographic contents or JIDs are printed.
 *
 * Usage: node scripts/ops/import-baileys-multifile-to-sqlite.js
 *   --source /path/to/offline/auth-copy --target /path/to/new/private.sqlite
 *   --offline-confirmed
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { BufferJSON } from '@whiskeysockets/baileys';
import { openSQLiteAuthStore } from '../lib/agent-jhn-whatsapp/sqlite-auth-store.js';

const TYPES = [
  'app-state-sync-version','app-state-sync-key','sender-key-memory',
  'identity-key','lid-mapping','device-list','sender-key',
  'session','pre-key','tctoken',
];

export async function importOfflineAuth({ source, target, batchSize = 250, requireOffline = true }) {
  const src=path.resolve(source), dst=path.resolve(target);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory() || fs.lstatSync(src).isSymbolicLink()) throw new Error('source must be a real directory');
  if (fs.existsSync(dst) || fs.existsSync(`${dst}-wal`) || fs.existsSync(`${dst}-shm`)) throw new Error('candidate already exists, refusing overwrite');
  if (dst.startsWith(src + path.sep)) throw new Error('target must be outside source directory');
  if (requireOffline) {
    // Conservative: cannot validate an external copy's provenance automatically.
    // Block if the live service is known to be active, even with an offline copy.
    const { spawnSync } = await import('node:child_process');
    const r=spawnSync('systemctl',['is-active','--quiet','agent-john-whatsapp.service'], {stdio:'ignore'});
    if (r.status===0) throw new Error('WhatsApp service active: stop service or use synthetic test fixture');
    if (r.error && r.error.code!=='ENOENT') throw r.error;
  }
  const files=await fsp.opendir(src);
  const credsFile=path.join(src,'creds.json');
  if (!fs.existsSync(credsFile)) throw new Error('missing source credentials');
  const originalStat=await fsp.stat(credsFile);
  const creds=JSON.parse(await fsp.readFile(credsFile,'utf8'), BufferJSON.reviver);
  if (!creds.signedIdentityKey || !creds.noiseKey || !creds.nextPreKeyId) throw new Error('incomplete source credentials');
  let db; const counts=Object.fromEntries(TYPES.map(t=>[t,0]));
  let batch={};let inBatch=0;
  async function flush() {
    if (!inBatch) return;
    await db.state.keys.set(batch);
    batch={};inBatch=0;
  }
  try {
    db=openSQLiteAuthStore(dst,{create:true});
    for await (const entry of files) {
      if (entry.name==='creds.json') continue;
      if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith('.json')) throw new Error('unexpected auth entry, import aborted');
      const type=TYPES.find(t=>entry.name.startsWith(t+'-'));
      if (!type) throw new Error('unknown key type in source, import aborted');
      const id=entry.name.slice(type.length+1,-5);
      if (!id || id==='.' || id==='..') throw new Error('invalid key ID');
      // JSON parse throws on corruption; never interpret corruption as a missing key.
      const value=JSON.parse(await fsp.readFile(path.join(src,entry.name),'utf8'),BufferJSON.reviver);
      if (value==null) throw new Error('null key in source (cannot restore)');
      (batch[type]??={})[id]=value;
      inBatch++;counts[type]++;
      if (inBatch>=batchSize) await flush();
    }
    await flush();
    const observed=Object.fromEntries(db.counts().map(({type,count})=>[type,count]));
    for (const [type,count] of Object.entries(counts)) if ((observed[type]||0)!==count) throw new Error('import count mismatch');
    const afterStat=await fsp.stat(credsFile);
    if (originalStat.size!==afterStat.size || originalStat.mtimeMs!==afterStat.mtimeMs) throw new Error('source credentials changed during import');
    db.importCredentials(creds); // last, so incomplete databases cannot be activated
    db.checkpoint();
    if (!db.integrityCheck()) throw new Error('sqlite integrity check failed');
    return {ok:true,total:Object.values(counts).reduce((a,b)=>a+b,0),counts};
  } catch(error) {
    // Leave a partial candidate as forensic evidence; never activate it.
    throw error;
  } finally { db?.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args=process.argv.slice(2);
  const get=k=>args[args.indexOf(k)+1];
  if (!args.includes('--offline-confirmed') || !args.includes('--source') || !args.includes('--target')) {
    console.error('Requires --offline-confirmed --source PATH --target PATH (candidate only, service must be inactive)');
    process.exitCode=2;
  } else {
    try {
      const receipt=await importOfflineAuth({source:get('--source'),target:get('--target')});
      console.log(JSON.stringify({event:'baileys_sqlite_candidate_import',...receipt}));
    } catch(e) { console.error('candidate_import_failed:',e.message);process.exitCode=1; }
  }
}
