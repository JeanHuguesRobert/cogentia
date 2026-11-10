#!/usr/bin/env node
/** Offline import parity / failure tests; entirely synthetic data. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BufferJSON } from '@whiskeysockets/baileys';
import { importOfflineAuth } from './ops/import-baileys-multifile-to-sqlite.js';
import { openSQLiteAuthStore } from './lib/agent-jhn-whatsapp/sqlite-auth-store.js';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jhn-baileys-import-'));
try {
 const source=path.join(tmp,'legacy');fs.mkdirSync(source,{mode:0o700});
 const creds={registered:false, nextPreKeyId:123,firstUnuploadedPreKeyId:100,noiseKey:{public:Buffer.from([1]),private:Buffer.from([2])},signedIdentityKey:{public:Buffer.from([3]),private:Buffer.from([4])}};
 const write=(name,value)=>fs.writeFileSync(path.join(source,name),JSON.stringify(value,BufferJSON.replacer));
 write('creds.json',creds);
 write('pre-key-42.json',{public:Buffer.from([9]),private:Buffer.from([8])});
 write('session-a-b__c.json',Buffer.from([5,6]));
 write('app-state-sync-key-test.json',{keyData:Buffer.from([7])});
 const dest=path.join(tmp,'sqlite','state.sqlite');
 const receipt=await importOfflineAuth({source,target:dest,batchSize:1,requireOffline:false});
 assert.equal(receipt.total,3);
 const db=openSQLiteAuthStore(dest);
 assert.equal(db.state.creds.registered,false);
 assert.equal(db.state.creds.nextPreKeyId,123);
 assert.deepEqual([...db.state.creds.noiseKey.private],[2]);
 assert.deepEqual([...((await db.state.keys.get('pre-key',['42']))['42'].private)],[8]);
 assert.deepEqual([...((await db.state.keys.get('session',['a:b/c']))['a:b/c'])],[5,6]);
 assert.equal((await db.state.keys.get('app-state-sync-key',['test'])).test.keyData[0],7);
 assert.equal(db.integrityCheck(),true);
 db.close();
 await assert.rejects(importOfflineAuth({source,target:dest,requireOffline:false}),/already exists/);
 write('unknown-entry.json',{safe:'dummy'});
 await assert.rejects(importOfflineAuth({source,target:path.join(tmp,'bad','state.sqlite'),requireOffline:false}),/unknown key type/);
 console.log('PASS offline importer: exact keys, types, credentials, paths, counts, integrity, refusing overwrite and unknown entries');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
