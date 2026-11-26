#!/usr/bin/env node
/**
 * Real disposable Chromium, actual Core adapter and gateway, fixture CDP peer.
 * No personal profile or production endpoints. Never disables the sandbox.
 * Run explicitly: node scripts/check-browser-worker-context-reality.js
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
let server,chrome,exited,exitInfo,gate,peer,session,stderr='';
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
async function evaluate(tab,expression){
 const result=await cdp(tab,'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error('fixture_page_evaluation_failed');
 return result.result?.value??null;
}
try{
 server=createServer((req,res)=>{
  if(req.url==='/worker.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(runtime)}
  else if(req.url==='/probe'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)}
  else{res.writeHead(404);res.end()}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const expectedUrl='http://127.0.0.1:'+server.address().port+'/probe';
 chrome=spawn(process.env.CHROMIUM_BIN||'/usr/bin/chromium',[
  '--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
  '--user-data-dir='+dir,'--no-first-run','--no-default-browser-check','--disable-extensions',
  '--disable-background-networking','--disable-sync','about:blank'
 ],{detached:true,stdio:['ignore','ignore','pipe']});
 chrome.stderr.on('data',d=>{stderr=(stderr+d).slice(-2000)});
 exited=new Promise(resolve=>{
  chrome.once('exit',(code,signal)=>{exitInfo={code,signal};resolve()});
  chrome.once('error',e=>{exitInfo={error:e.code};resolve()});
 });
 let port;
 for(let i=0;i<60;i++){
  if(exitInfo)throw Error('chromium_launch_failed');
  try{port=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break}catch{}
  await delay(100);
 }
 if(!port)throw Error('chromium_debug_endpoint_unavailable');
 const cdpBase='http://127.0.0.1:'+port;
 const version=await json(cdpBase+'/json/version');
 for(const tabId of [41,42]){
  const tab=await json(cdpBase+'/json/new?'+encodeURIComponent(expectedUrl),{method:'PUT'});
  tabs.set(tabId,tab);
  let ready=false;
  for(let i=0;i<40;i++){
   try{ready=Boolean(await evaluate(tab,'globalThis.worker?.id'));if(ready)break}catch{}
   await delay(100);
  }
  assert.equal(ready,true,'fixture worker loaded');
 }
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
    return reply({tabs:[...tabs.keys()].reverse().map(id=>({id,url:expectedUrl,title:'fixture'}))});
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
 await cdp(tabs.get(41),'Page.reload');
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
 console.log(JSON.stringify({ok:true,browser:version.Browser,actual_chromium:true,actual_gateway:true,
  extension:'fixture_cdp_peer',distinct_workers:true,rediscovery:true,checkpoint_reload:true,reused_worker:true,
  sandbox_disabled:false,personal_browser_used:false}));
}catch(e){
 console.error(JSON.stringify({ok:false,reason:e.message,chromium_exit:exitInfo||null,chromium_stderr:stderr,
  sandbox_disabled:false,personal_browser_used:false}));process.exitCode=1;
}finally{
 session?.close();peer?.close();await gate?.close();
 if(chrome?.pid&&!exitInfo){
  try{process.kill(-chrome.pid,'SIGTERM')}catch{}
  await Promise.race([exited,delay(2500)]);
  if(!exitInfo){try{process.kill(-chrome.pid,'SIGKILL')}catch{};await Promise.race([exited,delay(1000)])}
 }
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}
 await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 console.log(JSON.stringify({cleanup:true,temporary_profile_removed:true,chromium_exit:exitInfo||null}));
}
