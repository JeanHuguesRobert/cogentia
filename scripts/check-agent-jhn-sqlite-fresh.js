#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {initFreshSQLiteAuth} from './ops/init-baileys-sqlite-fresh.js';
import {openSQLiteAuthStore} from './lib/agent-jhn-whatsapp/sqlite-auth-store.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'baileys-fresh-test-'));
try {
 const dest=path.join(dir,'private','state.sqlite');
 assert.equal(initFreshSQLiteAuth(dest).requires_pairing,true);
 const state=openSQLiteAuthStore(dest);
 assert.equal(state.state.creds.registered,false);
 assert.ok(state.state.creds.signedIdentityKey);
 assert.ok(state.state.creds.noiseKey);
 assert.equal(state.integrityCheck(),true);
 assert.equal(fs.statSync(path.dirname(dest)).mode&0o777,0o700);
 state.close();
 assert.throws(()=>initFreshSQLiteAuth(dest),/overwrite/);
 console.log('PASS fresh SQLite auth: new unpaired identity, private, no overwrite, no network');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
