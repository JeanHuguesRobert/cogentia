#!/usr/bin/env node
/**
 * Create a NEW, unpaired, private Baileys SQLite identity. Requires re-pairing.
 * Explicitly NEVER imports old auth; refuses to touch an existing database.
 * No account, network traffic or messages are involved.
 */
import path from 'node:path';
import fs from 'node:fs';
import { initAuthCreds } from '@whiskeysockets/baileys';
import { openSQLiteAuthStore } from '../lib/agent-jhn-whatsapp/sqlite-auth-store.js';

export function initFreshSQLiteAuth(file) {
  const resolved = path.resolve(file);
  if (fs.existsSync(resolved) || fs.existsSync(`${resolved}-wal`) || fs.existsSync(`${resolved}-shm`)) {
    throw new Error('refusing to overwrite existing auth database');
  }
  const store = openSQLiteAuthStore(resolved,{create:true});
  try {
    const creds=initAuthCreds();
    store.importCredentials(creds);
    store.checkpoint();
    if (!store.integrityCheck()) throw new Error('new authentication store integrity failed');
    return {ok:true,backend:'sqlite',paired:false,requires_pairing:true};
  } finally {store.close();}
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args=process.argv.slice(2);
  const position=args.indexOf('--target');
  if (!args.includes('--fresh-unpaired') || position<0 || !args[position+1]) {
    console.error('usage: init-baileys-sqlite-fresh.js --fresh-unpaired --target /private/path/state.sqlite');
    process.exitCode=2;
  } else {
    try {console.log(JSON.stringify(initFreshSQLiteAuth(args[position+1])));}
    catch(error) {console.error('fresh_init_failed:',error.message);process.exitCode=1;}
  }
}
