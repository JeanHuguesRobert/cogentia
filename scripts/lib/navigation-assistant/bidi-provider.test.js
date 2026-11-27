import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket,WebSocketServer} from 'ws';
import {openBidiSession} from './bidi-session.js';
import {createBidiNavigationProvider} from './bidi-provider.js';
import {createNavigationGateway} from '../../ops/navigation-assistant-gateway.js';
import {createGatewaySession} from './gateway-session.js';

test('managed BiDi session correlates commands, rejects pending calls on disconnect without replay',async()=>{
 const server=new WebSocketServer({host:'127.0.0.1',port:0});
 await new Promise(resolve=>server.once('listening',resolve));
 let peer,session,commands=0;
 server.on('connection',ws=>{
  peer=ws;
  ws.on('message',raw=>{
   const req=JSON.parse(String(raw));commands++;
   if(req.method==='wait')return;
   const result=req.method==='session.new'?{sessionId:'test',capabilities:{browserName:'firefox'}}:{method:req.method};
   ws.send(JSON.stringify({type:'success',id:req.id,result}));
  });
 });
 try{
  await assert.rejects(()=>openBidiSession('ws://example.org:1234/session'),/bidi_endpoint_invalid/);
  session=await openBidiSession('ws://127.0.0.1:'+server.address().port+'/session');
  assert.deepEqual(await Promise.all([session.call('one'),session.call('two')]),[{method:'one'},{method:'two'}]);
  const waiting=session.call('wait');
  const rejected=assert.rejects(waiting,/bidi_disconnected/);
  const closed=new Promise(resolve=>session.onClose(resolve));
  peer.terminate();await rejected;await closed;
  assert.equal(session.closed,true);
  await assert.rejects(()=>session.call('no-replay'),/bidi_disconnected/);
  assert.ok(commands<=4);
 }finally{session?.close();peer?.terminate();await new Promise(resolve=>server.close(resolve))}
});
test('provider discovery, explicit tab/instance, lease, stable IDs, method refusal and legacy compatibility',async()=>{
 const gate=createNavigationGateway({instance:'bidi-provider-fixture'});
 await gate.listen(0,['127.0.0.1']);
 const base='ws://127.0.0.1:'+gate._bound[0].address().port;
 const url='https://fixture.example/';
 let roots=[{context:'a',url},{context:'b',url}],closed=false,dispatches=0;
 const listeners=new Set();
 const engine={
  get closed(){return closed},
  onClose(fn){listeners.add(fn);return ()=>listeners.delete(fn)},
  async call(method,params){
   if(method==='browsingContext.getTree')return {contexts:roots};
   if(method==='script.getRealms')return {realms:[{realm:'r-'+params.context,context:params.context}]};
   assert.equal(method,'script.evaluate');
   if(params.target.context)return {type:'success',realm:'r-'+params.target.context,result:{value:url}};
   dispatches++;
   return {type:'success',realm:params.target.realm,result:{type:'string',value:JSON.stringify(params.target.realm)}};
  }
 };
 let peer,assistant,other,legacy;
 try{
  const provider=createBidiNavigationProvider({session:engine});
  const scope={browser_instance_id:provider.browserId};
  assert.notEqual(createBidiNavigationProvider({session:engine}).browserId,provider.browserId);
  peer=await provider.attachGateway(base+'/extension');
  assistant=await createGatewaySession(base+'/assistant');
  other=await createGatewaySession(base+'/assistant');
  assert.deepEqual((await assistant.call('browser.instances')).browsers,[{...scope,registered:true,provider:provider.metadata}]);
  await assert.rejects(()=>assistant.call('tabs.list'),e=>e.code===-32602);
  const list=(await assistant.call('tabs.list',scope)).tabs;
  const tabId=list[0].id;
  roots.reverse();
  assert.equal((await assistant.call('tabs.list',scope)).tabs[1].id,tabId);
  const req={...scope,tabId,expectedUrl:url,code:'true'};
  await assistant.withTabLease(provider.browserId,tabId,async owner=>{
   await assert.rejects(()=>other.call('page.evaluate',req),e=>e.code===-32026);
   assert.equal((await owner.call('page.evaluate',req)).value,'r-a');
  });
  await assert.rejects(()=>assistant.call('page.evaluate',{...req,tabId:undefined}));
  await assert.rejects(()=>assistant.call('page.evaluate',{...req,expectedUrl:url+'wrong'}));
  await assert.rejects(()=>assistant.call('page.form.fill',req),e=>e.code===-32601);
  assert.equal(dispatches,1);
  await peer.close();
  peer=await provider.attachGateway(base+'/extension');
  assert.equal((await assistant.call('tabs.list',scope)).tabs[1].id,tabId);
  roots=roots.filter(r=>r.context!=='a');
  await assistant.call('tabs.list',scope);
  roots.push({context:'c',url});
  const added=(await assistant.call('tabs.list',scope)).tabs[1].id;
  assert.ok(added>Math.max(...list.map(t=>t.id)));
  await assert.rejects(()=>assistant.call('page.evaluate',req));
  legacy=new WebSocket(base+'/extension');
  await new Promise((resolve,reject)=>{legacy.once('open',resolve);legacy.once('error',reject)});
  legacy.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.register',params:{browser_instance_id:'legacy'}}));
  await new Promise(resolve=>legacy.once('message',resolve));
  legacy.on('message',raw=>{
   const r=JSON.parse(String(raw));legacy.send(JSON.stringify({jsonrpc:'2.0',id:r.id,result:{legacy:true}}));
  });
  assert.deepEqual(await assistant.call('tabs.close',{browser_instance_id:'legacy',tabId:1}),{legacy:true});
  assert.deepEqual((await assistant.call('browser.instances')).browsers.find(b=>b.browser_instance_id==='legacy'),
   {browser_instance_id:'legacy',registered:true});
  const gone=new Promise(resolve=>peer.onClose(resolve));
  closed=true;for(const fn of listeners)fn();await gone;
  await assert.rejects(()=>provider.attachGateway(base+'/extension'));
  await assert.rejects(()=>assistant.call('tabs.list',scope),e=>e.code===-32020);
 }finally{assistant?.close();other?.close();legacy?.terminate();await peer?.close();await gate.close()}
});
