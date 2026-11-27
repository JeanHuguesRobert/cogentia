#!/usr/bin/env node
/** Verify an extracted, prepared gateway release in ordinary Unix context.
 * Use only the checked bundle, not an arbitrary untrusted archive. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createGatewaySession} from './lib/navigation-assistant/gateway-session.js';
const [directory,...extra]=process.argv.slice(2);
if(!directory||extra.length||process.getuid()===0)throw Error('usage: node scripts/check-navigation-gateway-release.js EXTRACTED_RELEASE');
const root=resolve(directory),manifest=JSON.parse(await readFile(join(root,'RELEASE.json'),'utf8'));
const entry=join(root,'scripts/ops/navigation-assistant-gateway.js');
assert.equal(await readFile(join(root,'REVISION'),'utf8'),manifest.revision+'\n');
assert.equal(createHash('sha256').update(await readFile(entry)).digest('hex'),manifest.entry_sha256);
const require=createRequire(join(root,'package.json'));
assert.equal(require('ws/package.json').version,manifest.ws.version);
const {WebSocket}=require('ws');
const {createNavigationGateway}=await import(pathToFileURL(entry).href);
let gate,assistant,peers=[];
async function start(){
 gate=createNavigationGateway({instance:'release-fixture'});await gate.listen(0,['127.0.0.1']);
 const port=gate._bound[0].address().port,base='ws://127.0.0.1:'+port;
 assistant=await createGatewaySession(base+'/assistant');
 return {port,base};
}
async function register(base,id,provider){
 const ws=new WebSocket(base+'/extension');peers.push(ws);
 await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
 const ack=new Promise((r,j)=>{
  const timeout=setTimeout(()=>j(Error('register_timeout')),3000);
  ws.on('message',raw=>{const msg=JSON.parse(String(raw));if(msg.id===1){clearTimeout(timeout);r(msg)}});
 });
 ws.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.register',params:{browser_instance_id:id,...(provider?{provider}:{})}}));
 assert.equal((await ack).result.registered,true);
 let count=0;
 ws.on('message',raw=>{
  const msg=JSON.parse(String(raw));if(msg.method==='tabs.list'){
   count++;ws.send(JSON.stringify({jsonrpc:'2.0',id:msg.id,result:{tabs:[{id:1,url:'https://example.invalid/'+id}]}}));
  }
 });
 return ()=>count;
}
const provider={engine:'firefox',transport:'bidi',methods:['tabs.list','page.evaluate']};
try{
 let {port,base}=await start();
 const legacy=await register(base,'legacy');
 const managed=await register(base,'managed',provider);
 assert.equal((await assistant.call('browser.instances')).managed_provider_registration,1);
 assert.equal((await assistant.call('tabs.list',{browser_instance_id:'legacy'})).tabs[0].id,1);
 assert.equal(legacy(),1);assert.equal(managed(),0);
 await assistant.call('tabs.list',{browser_instance_id:'managed'});
 assert.equal(managed(),1);
 await assistant.call('tabs.lease.acquire',{browser_instance_id:'legacy',tabId:1});
 const status=await fetch('http://127.0.0.1:'+port+'/health').then(r=>r.json());
 assert.equal(status.active_leases,1);assert.equal(status.pending_requests,0);assert.equal(status.registered_instances,2);
 assistant.close();await gate.close();peers=[];
 ({port,base}=await start());
 assert.equal((await fetch('http://127.0.0.1:'+port+'/health').then(r=>r.json())).active_leases,0);
 const legacyAgain=await register(base,'legacy'),managedAgain=await register(base,'managed',provider);
 assert.equal(legacyAgain(),0);assert.equal(managedAgain(),0);
 await assistant.call('tabs.list',{browser_instance_id:'legacy'});
 assert.equal(legacyAgain(),1);assert.equal(managedAgain(),0);
 console.log(JSON.stringify({ok:true,revision:manifest.revision,ws:manifest.ws.version,legacy_routing:true,managed_routing:true,health_counters:true,reconnect_fixture:true,no_replay:true,production:false}));
}finally{assistant?.close();for(const p of peers)p.terminate();await gate?.close()}
