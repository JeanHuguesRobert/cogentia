#!/usr/bin/env node
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createNavigationGateway } from './ops/navigation-assistant-gateway.js';
import { createGatewaySession } from './lib/navigation-assistant/gateway-session.js';
import { createHostedBrowserCapabilities } from './lib/hosted-browser-capabilities.js';
const gateway=createNavigationGateway({instance:'john-session-test'});
await gateway.listen(0,['127.0.0.1']);
const port=gateway._bound[0].address().port;
const endpoint=`ws://127.0.0.1:${port}/assistant`;
let extension,first,second;
try {
 extension=new WebSocket(`ws://127.0.0.1:${port}/extension`);
 await new Promise((resolve,reject)=>{extension.once('open',resolve);extension.once('error',reject)});
 extension.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'test-browser'}}));
 extension.on('message',data=>{
   const request=JSON.parse(data.toString());
   if(request.method==='tabs.list') extension.send(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{tabs:[{id:51,title:'Safe sample',url:'https://example.org/fictional',active:false}]}}));
 });
 first=await createGatewaySession(endpoint,{WebSocketClass:WebSocket,timeoutMs:2000});
 second=await createGatewaySession(endpoint,{WebSocketClass:WebSocket,timeoutMs:2000});
 const caps=createHostedBrowserCapabilities({gateway:endpoint,timeoutMs:2000});
 const inspect=caps.find(x=>x.name==='browser.hosted.inspect');
 const evalCap=caps.find(x=>x.name==='browser.hosted.evaluate');
 assert.ok(inspect.inputSchema.properties.tab_id);
 assert.ok(evalCap.inputSchema.required.includes('tab_id'));
 await assert.rejects(()=>inspect.execute({action:'context'}),e=>e.code==='BROWSER_TAB_ID_INVALID');
 await assert.rejects(()=>evalCap.execute({code:'1+1'}),e=>e.code==='BROWSER_TAB_ID_INVALID');
 const inventory=await caps.find(x=>x.name==='browser.navigation.instances').execute();
 assert.equal(inventory.browsers[0].browser_instance_id,'test-browser');
 await first.call('tabs.lease.acquire',{browser_instance_id:'test-browser',tabId:51,ttlMs:2000});
 await assert.rejects(()=>second.call('page.evaluate',{browser_instance_id:'test-browser',code:'1'}),e=>e.code===-32027);
 await assert.rejects(()=>second.call('page.evaluate',{browser_instance_id:'test-browser',tabId:51,code:'1'}),e=>e.code===-32026);
 await assert.rejects(()=>caps.find(x=>x.name==='browser.navigation.coordination').execute({browser_instance_id:'test-browser',tab_id:51}),e=>e.code===-32026);
 await first.call('tabs.lease.release',{browser_instance_id:'test-browser',tabId:51});
 const probe=await caps.find(x=>x.name==='browser.navigation.coordination').execute({browser_instance_id:'test-browser',tab_id:51});
 assert.equal(probe.acquired,true);
 assert.equal(probe.released_on_completion,true);
 const metadata=await caps.find(x=>x.name==='browser.navigation.coordination').execute({browser_instance_id:'test-browser',tab_id:51,action:'tab_metadata'});
 assert.equal(metadata.tab.url,'https://example.org');
 assert.equal(metadata.tab.title,'Safe sample');
 await first.withTabLease('test-browser',52,async()=>{
   await assert.rejects(()=>second.call('tabs.close',{browser_instance_id:'test-browser',tabId:52}),e=>e.code===-32026);
 });
 const free=await second.call('tabs.lease.acquire',{browser_instance_id:'test-browser',tabId:52,ttlMs:2000});
 assert.equal(free.acquired,true);
 console.log('navigation John session, inventory, lease enforcement: ok');
} finally {first?.close();second?.close();extension?.close();await gateway.close()}
