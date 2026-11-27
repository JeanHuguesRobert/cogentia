#!/usr/bin/env node
/** Explicit opt-in synthetic dogfooding of one managed live Firefox.
 * No personal content, existing-tab evaluation, navigation or closure.
 * No credential, certificate or profile modification. Does not exercise COP
 * admission; this is a browser transport/capability integration check.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createGatewaySession} from './lib/navigation-assistant/gateway-session.js';
import {createHostedBrowserCapabilities} from './lib/hosted-browser-capabilities.js';
const [instance,opt,...extra]=process.argv.slice(2);
if(!/^hosted-firefox-[a-f0-9-]{36}$/.test(instance||'')||opt!=='--synthetic-live-test'||extra.length){
 console.error('Usage: node scripts/check-firefox-bidi-production.js INSTANCE --synthetic-live-test');
 process.exit(2);
}
const gateway='ws://127.0.0.1:8776/assistant',scope={browser_instance_id:instance};
const path='/byx-reality-'+randomUUID();
let hits=0,tab,session,url,closed=false,stage='inventory';
const server=createServer((req,res)=>{
 const match=req.url===path;
 if(match)hits++;
 res.writeHead(match?200:404,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(match?'<!doctype html><title>Cogentia BYX reality</title><h1>Cogentia BYX reality</h1><input id="probe" value="synthetic"><button type="button">Test</button>':'');
});
const caps=createHostedBrowserCapabilities({gateway});
const call=(name,args)=>caps.find(c=>c.name===name).execute(args);
const pass=name=>console.log(JSON.stringify({pass:name}));
try{
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 url='http://127.0.0.1:'+server.address().port+path;
 session=await createGatewaySession(gateway,{timeoutMs:8000});
 const before=(await session.call('browser.instances')).browsers;
 assert.equal(before.find(b=>b.browser_instance_id===instance)?.provider?.engine,'firefox');
 const base=(await session.call('tabs.list',scope)).tabs.map(t=>t.id);
 pass(stage);
 stage='open';
 tab=(await call('browser.hosted.interact',{action:'open',...scope,url,active:false})).tab;
 assert.equal(tab.url,url);assert.ok(!base.includes(tab.id));assert.ok(hits>0);pass(stage);
 await session.withTabLease(instance,tab.id,async peer=>{
  const args={...scope,tabId:tab.id,expectedUrl:url};
  stage='frame_tree';const tree=await peer.call('page.frameTree',args);assert.ok(tree.frame_tree);pass(stage);
  stage='constant_evaluation';assert.equal((await peer.call('page.evaluate',{...args,code:'1'})).value,1);pass(stage);
  stage='exact_url_evaluation';
  const result=await peer.call('page.evaluate',{...args,code:"({title:document.title,field:document.querySelector('#probe').value})"});
  assert.deepEqual(result.value,{title:'Cogentia BYX reality',field:'synthetic'});pass(stage);
  stage='wrong_url_refusal';await assert.rejects(peer.call('page.evaluate',{...args,expectedUrl:url+'-wrong',code:'1'}));pass(stage);
  stage='lease_isolation';const other=await createGatewaySession(gateway);
  try{await assert.rejects(other.call('page.evaluate',{...args,code:'1'}),e=>e.code===-32026)}
  finally{other.close()}pass(stage);
 });
 // Semantic read-only recipes are tested only on the new fixture tab.
 stage='structure';const observed=await call('browser.hosted.inspect',{action:'structure',...scope,tab_id:tab.id});
 assert.ok(observed.fields.some(f=>f.type==='text'));pass(stage);
 stage='context';const context=await call('browser.hosted.inspect',{action:'context',...scope,tab_id:tab.id,max_chars:100});
 assert.equal(context.title,'Cogentia BYX reality');pass(stage);
 stage='close';const ended=await call('browser.hosted.interact',{action:'close',...scope,tab_id:tab.id,expected_url:url});
 assert.equal(ended.closedTabId,tab.id);closed=true;pass(stage);
 stage='preservation';const after=(await session.call('tabs.list',scope)).tabs.map(t=>t.id);
 assert.ok(!after.includes(tab.id)&&base.every(id=>after.includes(id)));
 const registered=(await session.call('browser.instances')).browsers;
 assert.ok(before.filter(b=>b.registered).every(b=>registered.some(a=>a.browser_instance_id===b.browser_instance_id)));
 pass(stage);
 console.log(JSON.stringify({ok:true,live_byx:true,canonical_john_execution:false}));
}catch(e){
 console.error(JSON.stringify({ok:false,failed_stage:stage,code:e.code??null,
  diagnostic:typeof e.message==='string'&&/^BiDi (browser request failed|evaluation failed: [a-z_]+)$/.test(e.message)?e.message:'operation_unconfirmed'}));
 process.exitCode=1;
}finally{
 if(tab&&!closed&&tab.url===url){
  try{const r=await call('browser.hosted.interact',{action:'close',...scope,tab_id:tab.id,expected_url:url});console.log(JSON.stringify({cleanup:r.closedTabId===tab.id}))}
  catch{console.error(JSON.stringify({cleanup_unconfirmed:true,tab_id:tab.id}));process.exitCode=1}
 }
 session?.close();server.closeAllConnections();await new Promise(r=>server.close(r));
}
