#!/usr/bin/env node
/** Offline-only auth tests. Synthetic secrets; no WhatsApp network/account. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openSQLiteAuthStore } from './lib/agent-jhn-whatsapp/sqlite-auth-store.js';
import { BufferJSON, proto } from '@whiskeysockets/baileys';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jhn-baileys-sqlite-'));
try {
 const file=path.join(tmp,'auth','state.sqlite');
 assert.throws(()=>openSQLiteAuthStore(file),/missing/);
 const store=openSQLiteAuthStore(file,{create:true});
 assert.equal(store.hasCredentials(),false);
 assert.equal(fs.statSync(path.dirname(file)).mode&0o777,0o700);
 assert.equal(fs.statSync(file).mode&0o777,0o600);
 assert.rejects(store.saveCreds(),/missing/);
 const sample={ registered:true,nextPreKeyId:101,firstUnuploadedPreKeyId:95, noiseKey:{private:Buffer.from([0,1,2]),public:new Uint8Array([3,4,5])}};
 store.importCredentials(sample);
 await store.saveCreds();
 await store.state.keys.set({'pre-key':{'12':{public:Buffer.from([1]),private:new Uint8Array([2,3])},'13':{public:Buffer.from([4])}},'session':{'abc':Buffer.from([6,7]),'foo:bar/baz':Buffer.from([9])},'app-state-sync-key':{'x':{keyData:Buffer.from([8])}}});
 const keys=await store.state.keys.get('pre-key',['12','13','14']);
 assert.deepEqual([...keys['12'].private],[2,3]);
 assert.equal(keys['14'],null);
 const app=await store.state.keys.get('app-state-sync-key',['x']);
 assert.ok(app.x instanceof proto.Message.AppStateSyncKeyData);
 assert.equal((await store.state.keys.get('session',['abc'])).abc.length,2);
 assert.deepEqual(store.counts().map(x=>x.count),[1,2,2]);
 assert.equal((await store.state.keys.get('session',['foo:bar/baz']))['foo:bar/baz'][0],9);
 await store.state.keys.set({'pre-key':{'12':null}});
 assert.equal((await store.state.keys.get('pre-key',['12']))['12'],null);
 assert.equal(store.integrityCheck(),true);
 store.close();
 const reopened=openSQLiteAuthStore(file);
 assert.equal(reopened.state.creds.registered,true);
 assert.equal(reopened.state.creds.nextPreKeyId,101);
 assert.deepEqual([...reopened.state.creds.noiseKey.private],[0,1,2]);
 assert.equal((await reopened.state.keys.get('pre-key',['13']))['13'].public[0],4);
 assert.equal(reopened.integrityCheck(),true);
 await assert.rejects(async()=>{await reopened.state.keys.set({'unsupported':{'a':1}})},/unknown/);
 assert.equal(reopened.integrityCheck(),true);
 reopened.close();
 const broken=path.join(tmp,'auth','broken.sqlite');fs.writeFileSync(broken,'not sqlite');
 assert.throws(()=>openSQLiteAuthStore(broken),/database|not a database|malformed/i);
 console.log('PASS sqlite auth: private permissions, fail-closed, typed binary, protobuf, persistence, atomic rollback, deletion, integrity');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
