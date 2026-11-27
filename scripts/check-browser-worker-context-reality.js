#!/usr/bin/env node
/**
 * Real disposable Chromium or Firefox, actual Core adapter and gateway, fixture transport peer.
 * No personal profile or production endpoints. Never disables the sandbox.
 * Run explicitly: node scripts/check-browser-worker-context-reality.js [--firefox|--chromium]
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {WebSocket as Ws} from 'ws';
import {createNavigationGateway} from './ops/navigation-assistant-gateway.js';
import {createGatewaySession} from './lib/navigation-assistant/gateway-session.js';
import {bindBrowserWorkerContext} from './lib/browser-worker-context.js';

const engine=process.argv[2]==='--firefox'?'firefox':'chromium';
if(process.argv.length>3||(process.argv[2]&&!['--firefox','--chromium'].includes(process.argv[2])))
 throw Error('usage: check-browser-worker-context-reality.js [--firefox|--chromium]');
const dir=await mkdtemp(join(tmpdir(),'cogentia-worker-reality-'));
const runtime=await readFile(new URL('./fixtures/browser-worker-probe.js',import.meta.url));
const html=`<!doctype html><meta charset="utf-8"><title>Worker fixture</title>
<script src="/worker.js"></script><script>
const host={
 load:()=>JSON.parse(sessionStorage.getItem('worker')||'null'),
 save:s=>sessionStorage.setItem('worker',JSON.stringify(s))
};
globalThis.worker=createWorker({id:host.load()?.id||crypto.randomUUID(),host,programs:{
 demo({pc,locals,workerLocals,event}){
  if(pc===0){locals.count=(locals.count||0)+1;workerLocals.started=(workerLocals.started||0)+1;return {status:'waiting',pc:1}}
  if(pc===1&&event?.type==='resume')return {status:'done',value:locals.count+event.increment};
  return {status:'waiting',pc:1};
 }
}});
</script>`;
let server,browser,exited,exitInfo,gate,peer,session,bidi,stderr='';
const tabs=new Map();
const browserId='worker-reality-fixture';
async function json(url,options={}){
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(2500)});
 if(!response.ok)throw Error('fixture_http_'+response.status);
 return response.json();
}
async function cdp(tab,method,params={}){
 const ws=new Ws(tab.webSocketDebuggerUrl);
 try{
  return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('cdp_timeout:'+method)),4000);
   const finish=(error,value)=>{clearTimeout(timer);error?reject(error):resolve(value)};
   ws.once('error',e=>finish(e));
   ws.once('open',()=>ws.send(JSON.stringify({id:1,method,params})));
   ws.on('message',raw=>{
    const msg=JSON.parse(String(raw));if(msg.id!==1)return;
    finish(msg.error?Error(msg.error.message):null,msg.result);
   });
  });
 }finally{ws.terminate()}
}
// Fixture-only transport: no live browser/session discovery or authority.
function bidiConnection(url){
 const ws=new Ws(url,{handshakeTimeout:4000});let id=0;const pending=new Map();
 const ready=new Promise((resolve,reject)=>{
  ws.once('open',resolve);ws.once('error',reject);
 });
 ws.on('message',raw=>{
  const msg=JSON.parse(String(raw)),job=pending.get(msg.id);
  if(!job)return;
  pending.delete(msg.id);clearTimeout(job.timer);
  if(msg.type==='error')job.reject(Error(msg.error+':'+msg.message));
  else job.resolve(msg.result);
 });
 const disconnected=()=>{for(const job of pending.values()){clearTimeout(job.timer);job.reject(Error('bidi_disconnected'))}pending.clear()};
 ws.on('close',disconnected);ws.on('error',disconnected);
 return {
  async call(method,params={}){
   await ready;
   if(ws.readyState!==Ws.OPEN)throw Error('bidi_disconnected');
   const callId=++id;
   return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(callId);reject(Error('bidi_timeout:'+method))},4000);
    pending.set(callId,{resolve,reject,timer});
    ws.send(JSON.stringify({id:callId,method,params}));
   });
  },
  close(){ws.terminate()}
 };
}
async function evaluate(tab,expression){
 if(engine==='firefox'){
  // The common fixture only exchanges JSON values. Preserve undefined as null,
  // and let BiDi report evaluation exceptions rather than pretending success.
  const result=await bidi.call('script.evaluate',{
   expression:`Promise.resolve((0,eval)(${JSON.stringify(expression)})).then(v=>JSON.stringify(v??null))`,
   target:{context:tab.context},awaitPromise:true
  });
  if(result.type!=='success'||result.result?.type!=='string')throw Error('fixture_page_evaluation_failed');
  return JSON.parse(result.result.value);
 }
 const result=await cdp(tab,'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error('fixture_page_evaluation_failed');
 return result.result?.value??null;
}
async function reload(tab){
 if(engine==='firefox')await bidi.call('browsingContext.reload',{context:tab.context,wait:'complete'});
 else await cdp(tab,'Page.reload');
}

try{
 server=createServer((req,res)=>{
  if(req.url==='/worker.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(runtime)}
  else if(req.url==='/probe'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)}
  else{res.writeHead(404);res.end()}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const expectedUrl='http://127.0.0.1:'+server.address().port+'/probe';
 const firefox=engine==='firefox';
 browser=spawn(firefox?(process.env.FIREFOX_BIN||'/usr/lib/firefox/firefox'):(process.env.CHROMIUM_BIN||'/usr/bin/chromium'),
  firefox?['--headless','--no-remote','--profile',dir,'--remote-debugging-port','0','about:blank']:[
  '--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
  '--user-data-dir='+dir,'--no-first-run','--no-default-browser-check','--disable-extensions',
  '--disable-background-networking','--disable-sync','about:blank'
 ],{detached:true,stdio:['ignore','ignore','pipe']});
 browser.stderr.on('data',d=>{stderr=(stderr+d).slice(-8000)});
 exited=new Promise(resolve=>{
  browser.once('exit',(code,signal)=>{exitInfo={code,signal};resolve()});
  browser.once('error',e=>{exitInfo={error:e.code};resolve()});
 });
 let port,version;
 for(let i=0;i<100;i++){
  if(exitInfo)throw Error(engine+'_launch_failed');
  if(firefox){
   const match=stderr.match(/WebDriver BiDi listening on ws:\/\/127\.0\.0\.1:(\d+)/);
   if(match){port=Number(match[1]);break}
  }else{
   try{port=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break}catch{}
  }
  await delay(100);
 }
 if(!port)throw Error(engine+'_debug_endpoint_unavailable');
 const debugBase='http://127.0.0.1:'+port;
 if(firefox){
  bidi=bidiConnection('ws://127.0.0.1:'+port+'/session');
  const started=await bidi.call('session.new',{capabilities:{alwaysMatch:{}}});
  version='Firefox/'+started.capabilities.browserVersion;
 }else version=(await json(debugBase+'/json/version')).Browser;
 for(const tabId of [41,42]){
  let tab;
  if(firefox){
   tab=await bidi.call('browsingContext.create',{type:'tab'});
   await bidi.call('browsingContext.navigate',{context:tab.context,url:expectedUrl,wait:'complete'});
  }else tab=await json(debugBase+'/json/new?'+encodeURIComponent(expectedUrl),{method:'PUT'});
  tabs.set(tabId,tab);
  let ready=false;
  for(let i=0;i<40;i++){
   try{ready=Boolean(await evaluate(tab,'globalThis.worker?.id'));if(ready)break}catch{}
   await delay(100);
  }
  assert.equal(ready,true,'fixture worker loaded');
 }
 // Inventory is obtained from the real engine; numeric gateway IDs are
 // fixture-local bindings to actual CDP targets or BiDi browsing contexts.
 async function inventory(){
  const real=firefox?(await bidi.call('browsingContext.getTree',{maxDepth:0})).contexts
   :await json(debugBase+'/json/list');
  const result=[];
  for(const [id,tab] of [...tabs.entries()].reverse()){
   const matches=real.filter(t=>firefox?t.context===tab.context:t.id===tab.id&&t.type==='page');
   assert.equal(matches.length,1,'fixture tab must exist uniquely in engine inventory');
   result.push({id,url:matches[0].url,title:matches[0].title||'fixture'});
  }
  return result;
 }
 assert.deepEqual((await inventory()).map(t=>[t.id,t.url]),[[42,expectedUrl],[41,expectedUrl]]);
 const id=await evaluate(tabs.get(41),'worker.id');
 assert.notEqual(id,await evaluate(tabs.get(42),'worker.id'));
 gate=createNavigationGateway({instance:'worker-reality-fixture'});
 await gate.listen(0,['127.0.0.1']);
 const base='ws://127.0.0.1:'+gate._bound[0].address().port;
 peer=new Ws(base+'/extension');
 await new Promise((resolve,reject)=>{peer.once('open',resolve);peer.once('error',reject)});
 peer.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.register',params:{browser_instance_id:browserId}}));
 await new Promise(resolve=>peer.once('message',resolve));
 peer.on('message',async raw=>{
  const req=JSON.parse(String(raw));
  const reply=result=>peer.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result}));
  try{
   if(req.method==='tabs.list'){
    return reply({tabs:await inventory()});
   }
   if(req.method!=='page.evaluate'||req.params.expectedUrl!==expectedUrl||!tabs.has(req.params.tabId))
    throw Error('fixture_target_mismatch');
   const tab=tabs.get(req.params.tabId);
   if(await evaluate(tab,'location.href')!==expectedUrl)throw Error('fixture_target_changed');
   const value=await evaluate(tab,req.params.code);
   reply({value,tab:{id:req.params.tabId,url:expectedUrl}});
  }catch{peer.send(JSON.stringify({jsonrpc:'2.0',id:req.id,error:{code:-32002,message:'fixture_evaluation_failed'}}))}
 });
 session=await createGatewaySession(base+'/assistant');
 const worker=bindBrowserWorkerContext({session,browserId,expectedUrl,workerId:id});
 const locator=await worker.locate();
 assert.equal(locator.tabId,41);
 const invoke=(method,args=[])=>worker.invoke({tabId:locator.tabId,method,args});
 await invoke('assign',[{id:'task-1',program:'demo',locals:{count:10}}]);
 const waiting=await invoke('step');
 assert.equal(waiting.task.status,'waiting');assert.equal(waiting.task.locals.count,11);
 assert.deepEqual(await invoke('step'),waiting);
 assert.equal((await evaluate(tabs.get(42),'worker.snapshot()')).task,null);
 await evaluate(tabs.get(41),'globalThis.transientMarker=true');
 await reload(tabs.get(41));
 let restored=false;
 for(let i=0;i<40;i++){
  await delay(100);
  try{restored=await evaluate(tabs.get(41),'!!globalThis.worker&&!globalThis.transientMarker');if(restored)break}catch{}
 }
 assert.equal(restored,true);
 assert.deepEqual(await invoke('snapshot'),waiting);
 assert.equal((await invoke('step',[{type:'resume',increment:5}])).lastResult.value,16);
 await invoke('assign',[{id:'task-2',program:'demo'}]);
 assert.equal((await invoke('step')).locals.started,2);
 assert.equal((await invoke('step',[{type:'resume',increment:2}])).lastResult.value,3);
 console.log(JSON.stringify({ok:true,browser:version,engine,actual_chromium:engine==='chromium',actual_firefox:engine==='firefox',actual_gateway:true,
  extension:engine==='firefox'?'fixture_bidi_peer':'fixture_cdp_peer',actual_inventory:true,distinct_workers:true,rediscovery:true,checkpoint_reload:true,reused_worker:true,
  sandbox_disabled:false,personal_browser_used:false}));
}catch(e){
 console.error(JSON.stringify({ok:false,reason:e.message,engine,browser_exit:exitInfo||null,browser_stderr:stderr,
  sandbox_disabled:false,personal_browser_used:false}));process.exitCode=1;
}finally{
 session?.close();peer?.close();await gate?.close();bidi?.close();
 if(browser?.pid&&!exitInfo){
  try{process.kill(-browser.pid,'SIGTERM')}catch{}
  await Promise.race([exited,delay(2500)]);
  if(!exitInfo){try{process.kill(-browser.pid,'SIGKILL')}catch{};await Promise.race([exited,delay(1000)])}
 }
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}
 await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 console.log(JSON.stringify({cleanup:true,temporary_profile_removed:true,browser_exit:exitInfo||null}));
}
