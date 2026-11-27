#!/usr/bin/env node
/**
 * Real disposable Chromium or Firefox, actual Core adapter and gateway, fixture transport peer.
 * No personal profile or production endpoints. Never disables the sandbox.
 * Run explicitly: node scripts/check-browser-worker-context-reality.js [--firefox|--chromium]
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createServer as createHttpsServer} from 'node:https';
import {createHostedBrowserCapabilities} from './lib/hosted-browser-capabilities.js';
import {selectBidiFile} from './lib/browser-bidi-native.js';
import {createBrowserFileUploadCapability} from './lib/browser-file-upload.js';
import {runJohnRequest} from './lib/john-run.js';
import {proveBrowserComposition} from './fixtures/browser-multimcp-reality.mjs';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {WebSocket as Ws} from 'ws';
import {createNavigationGateway} from './ops/navigation-assistant-gateway.js';
import {openBidiSession} from './lib/navigation-assistant/bidi-session.js';
import {createBidiNavigationProvider} from './lib/navigation-assistant/bidi-provider.js';
import {createGatewaySession} from './lib/navigation-assistant/gateway-session.js';
import {compileUidStructure,projectElementTarget,callUidFormFill} from './lib/browser-element-target.js';
import {executeBidiFrameEvaluate} from './lib/browser-frame-bidi-evaluate.js';
import {compileNonSecretFormFill} from './lib/browser-form-script.js';
import {bindBrowserWorkerContext} from './lib/browser-worker-context.js';

const engine=process.argv[2]==='--firefox'?'firefox':'chromium';
if(process.argv.length>3||(process.argv[2]&&!['--firefox','--chromium'].includes(process.argv[2])))
 throw Error('usage: check-browser-worker-context-reality.js [--firefox|--chromium]');
const dir=await mkdtemp(join(tmpdir(),'cogentia-worker-reality-'));
const runtime=await readFile(new URL('./fixtures/browser-worker-probe.js',import.meta.url));
const stdlib=await readFile(new URL('../browser-stdlib/navigation.js',import.meta.url),'utf8');
const html=`<!doctype html><meta charset="utf-8"><title>Worker fixture</title><input id="uid-target"><iframe srcdoc="&lt;input id=uid-target&gt;"></iframe>
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
let server,frameServer,browser,exited,exitInfo,gate,peer,managedPeer,session,bidi,stderr='';
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
 const firefox=engine==='firefox';
 // A fixture-only CA in the disposable Firefox NSS profile; no certificate
 // bypass, trust-store or browser settings change outside this directory.
 let makeServer=createServer;
 if(firefox){
  const key=join(dir,'fixture-key.pem'),cert=join(dir,'fixture-cert.pem'),ca=join(dir,'ca.pem'),caKey=join(dir,'ca-key.pem'),csr=join(dir,'fixture.csr'),ext=join(dir,'fixture.ext');
  function local(command,args){
   const result=spawnSync(command,args,{encoding:'utf8',timeout:5000});
   if(result.status!==0)throw Error('fixture_tls_setup_failed:'+command);
  }
  local('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=Cogentia fixture CA',
   '-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign','-keyout',caKey,'-out',ca]);
  local('openssl',['req','-new','-newkey','rsa:2048','-nodes','-subj','/CN=127.0.0.1','-keyout',key,'-out',csr]);
  await writeFile(ext,'basicConstraints=critical,CA:FALSE\nsubjectAltName=IP:127.0.0.1\nextendedKeyUsage=serverAuth\nkeyUsage=critical,digitalSignature,keyEncipherment\n');
  local('openssl',['x509','-req','-in',csr,'-CA',ca,'-CAkey',caKey,'-CAcreateserial','-days','1','-extfile',ext,'-out',cert]);
  local('certutil',['-N','--empty-password','-d','sql:'+dir]);
  local('certutil',['-A','-d','sql:'+dir,'-n','Cogentia disposable fixture','-t','CT,,','-i',ca]);
  const tls={key:await readFile(key),cert:await readFile(cert)};
  makeServer=handler=>createHttpsServer(tls,handler);
 }
 const scheme=firefox?'https':'http';
 frameServer=makeServer((req,res)=>{
  if(req.url==='/frame'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<!doctype html><input id="uid-target" value="frame-original">')}
  else{res.writeHead(404);res.end()}
 });
 await new Promise((resolve,reject)=>{frameServer.once('error',reject);frameServer.listen(0,'127.0.0.1',resolve)});
 const frameOrigin=scheme+'://127.0.0.1:'+frameServer.address().port;
 const frameUrl=frameOrigin+'/frame';
 server=makeServer((req,res)=>{
  if(req.url==='/worker.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(runtime)}
  else if(req.url==='/probe'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html+'<iframe id="cross" src="'+frameUrl+'"></iframe>')}
  else{res.writeHead(404);res.end()}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const expectedUrl=scheme+'://127.0.0.1:'+server.address().port+'/probe';
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
  bidi=await openBidiSession('ws://127.0.0.1:'+port+'/session');
  version='Firefox/'+bidi.capabilities.browserVersion;
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
 // UID registry tests use the actual standard library in both document
 // realms, not a provider-supplied ID or a mock DOM.
 const inject=tab=>evaluate(tab,stdlib);
 const getUid=tab=>evaluate(tab,'__cogentiaNavigationAssistant.elementIdentity.elementUid(document.querySelector("#uid-target"))');
 const resolves=(tab,uid)=>evaluate(tab,`!!__cogentiaNavigationAssistant.elementIdentity.resolveElementUid(${JSON.stringify(uid)})`);
 await inject(tabs.get(41));await inject(tabs.get(42));
 const uid=await getUid(tabs.get(41));
 assert.equal(typeof uid,'string');
 assert.equal(await getUid(tabs.get(41)),uid);
 await inject(tabs.get(41));
 assert.equal(await getUid(tabs.get(41)),uid,'reinjection preserves registry');
 assert.notEqual(await getUid(tabs.get(42)),uid);
 assert.equal(await resolves(tabs.get(42),uid),false);
 const frameUid=await evaluate(tabs.get(41),`(() => {
  const frame=document.querySelector('iframe').contentWindow;
  frame.eval(${JSON.stringify(stdlib)});
  const registry=frame.__cogentiaNavigationAssistant.elementIdentity;
  if(registry.resolveElementUid(${JSON.stringify(uid)})!==null)throw Error('cross_frame_uid');
  return registry.elementUid(frame.document.querySelector('#uid-target'));
 })()`);
 assert.notEqual(frameUid,uid);
 assert.equal(await resolves(tabs.get(41),frameUid),false);
 const replacementUid=await evaluate(tabs.get(41),`(() => {
  const registry=__cogentiaNavigationAssistant.elementIdentity;
  const node=registry.resolveElementUid(${JSON.stringify(uid)});
  const replacement=node.cloneNode(true);
  node.replaceWith(replacement);
  if(registry.resolveElementUid(${JSON.stringify(uid)})!==null)throw Error('stale_uid_retargeted');
  return registry.elementUid(replacement);
 })()`);
 assert.notEqual(replacementUid,uid);
 assert.equal(await resolves(tabs.get(41),replacementUid),true);
 const reinsertedUid=await evaluate(tabs.get(41),`(() => {
  const registry=__cogentiaNavigationAssistant.elementIdentity;
  const node=registry.resolveElementUid(${JSON.stringify(replacementUid)});
  node.remove();
  if(registry.resolveElementUid(${JSON.stringify(replacementUid)})!==null)throw Error('removed_uid_resolved');
  document.body.append(node);
  return registry.elementUid(node);
 })()`);
 assert.notEqual(reinsertedUid,replacementUid);
 assert.equal(await resolves(tabs.get(41),replacementUid),false);
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
 // Exercise the existing compiled non-secret form recipe through the real
 // gateway/lease and engine. Loopback HTTP is accepted only by the fixture,
 // never by the hosted capability or COP gate.
 async function observeTarget(){
  const reply=await session.call('page.evaluate',{browser_instance_id:browserId,tabId:41,
    expectedUrl,code:compileUidStructure(expectedUrl)});
  assert.equal(reply.tab.id,41);assert.equal(reply.tab.url,expectedUrl);
  const target=projectElementTarget(reply.value,0,browserId,41);
  assert.ok(target);return target;
 }
 const fill=(target,text)=>callUidFormFill({session,target,expectedUrl,
  code:compileNonSecretFormFill({elementTarget:target,text,expectedUrl,allowLoopbackFixture:true})});
 const observed=await observeTarget();
 assert.equal(observed.uid,reinsertedUid);
 const filled=await fill(observed,'Corte — été');
 assert.equal(filled.ok,true);assert.equal(filled.submitted,false);assert.equal(filled.uid,observed.uid);
 assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'Corte — été');
 assert.equal(await evaluate(tabs.get(42),'document.querySelector("#uid-target").value'),'');
 await evaluate(tabs.get(41),`(() => {
  const el=document.querySelector('#uid-target'),clone=el.cloneNode(true);
  clone.value='unchanged';el.replaceWith(clone);
  globalThis.inputEvents=0;clone.addEventListener('input',()=>inputEvents++);
 })()`);
 const stale=await fill(observed,'must not be inserted');
 assert.deepEqual(stale,{ok:false,reason:'element_uid_stale'});
 assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'unchanged');
 assert.equal(await evaluate(tabs.get(41),'inputEvents'),0);
 const fresh=await observeTarget();
 assert.notEqual(fresh.uid,observed.uid);
 // A new assistant session must not invalidate a live document identity.
 session.close();session=await createGatewaySession(base+'/assistant');
 assert.equal((await fill(fresh,'new session')).ok,true);
 assert.equal(await evaluate(tabs.get(41),'inputEvents'),1);
 // The BiDi-specific frame transport uses the real context tree and realm,
 // while the DOM recipes and target receipt stay engine-independent.
 let crossOriginUid=false;
 if(firefox){
  const send=(method,params)=>bidi.call(method,params);
  const rootContext=tabs.get(41).context;
  const tree=await send('browsingContext.getTree',{root:rootContext});
  const frame=tree.contexts[0].children.find(c=>c.url===frameUrl);
  assert.ok(frame);
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#cross").contentDocument===null'),true);
  const frameEval=(scriptForUrl,options={})=>session.withTabLease(browserId,41,()=>executeBidiFrameEvaluate({
   send,rootContext,expectedUrl,frameId:frame.context,expectedOrigin:frameOrigin,scriptForUrl,...options}));
  const obs=await frameEval(compileUidStructure);
  const frameTarget=projectElementTarget(obs.value,0,browserId,41,frame.context);
  assert.ok(frameTarget);assert.notEqual(frameTarget.uid,fresh.uid);
  const frameFill=(target,text)=>frameEval(url=>compileNonSecretFormFill({
   elementTarget:target,expectedUrl:url,text,allowLoopbackFixture:true}));
  const done=await frameFill(frameTarget,'Dans la frame');
  assert.equal(done.value.ok,true);assert.equal(done.realm,obs.realm);
  assert.equal(await evaluate({context:frame.context},'document.querySelector("#uid-target").value'),'Dans la frame');
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'new session');
  const other=(await send('browsingContext.getTree',{root:tabs.get(42).context})).contexts[0].children.find(c=>c.url===frameUrl);
  await assert.rejects(()=>frameEval(compileUidStructure,{frameId:other.context}),/bidi_frame_not_unique_or_missing/);
  await assert.rejects(()=>frameEval(compileUidStructure,{expectedOrigin:new URL(expectedUrl).origin}),/bidi_frame_origin_mismatch/);
  await evaluate({context:frame.context},`(() => {
    const old=document.querySelector('#uid-target'),clone=old.cloneNode(true);
    clone.value='frame-unchanged';old.replaceWith(clone);
    globalThis.inputEvents=0;clone.addEventListener('input',()=>inputEvents++);
  })()`);
  assert.deepEqual((await frameFill(frameTarget,'stale')).value,{ok:false,reason:'element_uid_stale'});
  assert.equal(await evaluate({context:frame.context},'inputEvents'),0);
  assert.equal(await evaluate({context:frame.context},'document.querySelector("#uid-target").value'),'frame-unchanged');
  const second=await frameEval(compileUidStructure);
  const newer=projectElementTarget(second.value,0,browserId,41,frame.context);
  await send('browsingContext.reload',{context:frame.context,wait:'complete'});
  const after=await frameEval(compileUidStructure);
  assert.notEqual(after.realm,second.realm);
  assert.deepEqual((await frameFill(newer,'old document')).value,{ok:false,reason:'document_epoch_changed'});
  assert.equal(await evaluate({context:frame.context},'document.querySelector("#uid-target").value'),'frame-original');
  crossOriginUid=true;
 }
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
 await inject(tabs.get(41));
 assert.notEqual(await getUid(tabs.get(41)),reinsertedUid);
 assert.equal(await resolves(tabs.get(41),reinsertedUid),false);
 assert.deepEqual(await fill(fresh,'wrong epoch'),{ok:false,reason:'document_epoch_changed'});
 assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'');
 assert.deepEqual(await invoke('snapshot'),waiting);
 assert.equal((await invoke('step',[{type:'resume',increment:5}])).lastResult.value,16);
 await invoke('assign',[{id:'task-2',program:'demo'}]);
 assert.equal((await invoke('step')).locals.started,2);
 assert.equal((await invoke('step',[{type:'resume',increment:2}])).lastResult.value,3);
 let managedProvider=false;
 if(firefox){
  // The reusable provider, unlike the fixture peer above, discovers and maps
  // every root itself and advertises the exact supported gateway methods.
  const provider=createBidiNavigationProvider({session:bidi,instancePrefix:'reality-firefox'});
  const scope={browser_instance_id:provider.browserId};
  managedPeer=await provider.attachGateway(base+'/extension');
  const instances=await session.call('browser.instances');
  assert.deepEqual(instances.browsers.find(b=>b.browser_instance_id===provider.browserId)?.provider,provider.metadata);
  const list=await session.call('tabs.list',scope);
  const candidates=list.tabs.filter(t=>t.url===expectedUrl);
  assert.equal(candidates.length,2);
  const worker=bindBrowserWorkerContext({session,browserId:provider.browserId,expectedUrl,workerId:id});
  const located=await worker.locate();
  const managedTab=located.tabId;
  const managedSnapshot=await worker.invoke({tabId:managedTab,method:'snapshot'});
  assert.equal(managedSnapshot.lastResult.value,3);
  const query={...scope,tabId:managedTab,expectedUrl,code:compileUidStructure(expectedUrl)};
  const observed=await session.call('page.evaluate',query);
  const target=projectElementTarget(observed.value,0,provider.browserId,managedTab);
  assert.ok(target);
  const fillManaged=text=>callUidFormFill({session,target,expectedUrl,
   code:compileNonSecretFormFill({elementTarget:target,expectedUrl,text,allowLoopbackFixture:true})});
  assert.equal((await fillManaged('managed provider')).ok,true);
  await assert.rejects(()=>session.call('page.evaluate',{...query,tabId:undefined}));
  await assert.rejects(()=>session.call('page.evaluate',{...query,expectedUrl:expectedUrl+'?wrong'}));
  await assert.rejects(()=>session.call('page.form.fill',{...scope,tabId:managedTab}),e=>e.code===-32601);
  // Gateway peer reconnect, not engine session reconnect: same instance,
  // stable numeric tabs, same document-local identity.
  await managedPeer.close();
  await assert.rejects(()=>session.call('tabs.list',scope),e=>e.code===-32020);
  managedPeer=await provider.attachGateway(base+'/extension');
  assert.equal((await worker.locate()).tabId,managedTab);
  assert.equal((await fillManaged('after provider reconnect')).ok,true);
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'after provider reconnect');
  const caps=createHostedBrowserCapabilities({gateway:base+'/assistant'});
  const inspect=caps.find(c=>c.name==='browser.hosted.inspect');
  const form=caps.find(c=>c.name==='browser.form.fill');
  const selected={browser_instance_id:provider.browserId,tab_id:managedTab,expected_url:expectedUrl};
  const tree=await inspect.execute({...selected,action:'frame_tree'});
  const frame=tree.frame_tree.frames.find(f=>!f.is_top_level&&f.origin===frameOrigin);
  assert.ok(frame);
  const observation=await inspect.execute({...selected,action:'frame_structure',
   frame_id:frame.frame_id,expected_frame_origin:frameOrigin,include_element_identity:true});
  const frameTarget=observation.fields[0].element_target;
  assert.ok(frameTarget);
  const args={...selected,element_target:frameTarget,expected_frame_origin:frameOrigin,text:'Hosted — Corse'};
  const request={version:'john.request.v1',request_id:'bidi-form-reality',principal:{id:'principal:jhn'},
   mandate:{id:'mandate:jhn:form-assist',version:'v1'},budget:{id:'budget:fixture'},
   execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,max_elapsed_ms:15000,max_external_effects:0,max_internal_effects:1},
   exposure:'bounded',capability:'browser.form.fill',input:{prompt:'Fill a fixture field',arguments:args},
   handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:['browser.form.fill']}};
  const opts={capabilities:[form],allowedCapabilities:['browser.form.fill'],maxInternalEffects:1,requiredEvents:false};
  const beforeDeny=await evaluate({context:frame.frame_id},'document.querySelector("#uid-target").value');
  const denied=await runJohnRequest(request,opts);
  assert.equal(denied.some(e=>e.type==='john.tool.receipt'),false);
  assert.equal(await evaluate({context:frame.frame_id},'document.querySelector("#uid-target").value'),beforeDeny);
  const granted=await runJohnRequest({...request,request_id:'bidi-form-reality-approved'},
   {...opts,approvedBoundedOnceCapability:'browser.form.fill'});
  assert.equal(granted.some(e=>e.type==='john.run.completed'),true);
  assert.equal(granted.find(e=>e.type==='john.accounting.settled')?.data?.internal_effects,1);
  assert.equal(granted.find(e=>e.type==='john.accounting.settled')?.data?.external_effects,0);
  assert.ok(!JSON.stringify(granted).includes(args.text));
  assert.equal(await evaluate({context:frame.frame_id},'document.querySelector("#uid-target").value'),args.text);
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'after provider reconnect');
  await assert.rejects(()=>form.execute({...args,browser_instance_id:'not-the-provider'}),e=>e.code==='BROWSER_ELEMENT_TARGET_INVALID');
  await assert.rejects(()=>form.execute({...args,expected_frame_origin:new URL(expectedUrl).origin}));
  await evaluate({context:frame.frame_id},`(() => {const el=document.querySelector('#uid-target');const next=el.cloneNode(true);next.value='untouched';el.replaceWith(next)})()`);
  await assert.rejects(()=>form.execute(args),e=>e.code==='BROWSER_ELEMENT_TARGET_STALE');
  assert.equal(await evaluate({context:frame.frame_id},'document.querySelector("#uid-target").value'),'untouched');
  const renewed=await inspect.execute({...selected,action:'frame_structure',frame_id:frame.frame_id,
   expected_frame_origin:frameOrigin,include_element_identity:true});
  const composition=await proveBrowserComposition({dir,caps,request:{...request,input:{...request.input,
   arguments:{...args,element_target:renewed.fields[0].element_target,text:'Alan COP — Corse'}}},
   readValue:()=>evaluate({context:frame.frame_id},'document.querySelector("#uid-target").value')});
  assert.equal(composition.calls,3);
  const top=await inspect.execute({...selected,action:'structure',include_element_identity:true});
  const topTarget=top.fields[0].element_target;
  assert.ok(topTarget);
  assert.equal((await form.execute({...selected,element_target:topTarget,text:'Hosted top'})).ok,true);
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'Hosted top');

  // New navigation and event paths use the existing semantic interaction
  // capability and existing gateway subscription, not direct fixture commands.
  const interact=caps.find(c=>c.name==='browser.hosted.interact');
  await evaluate(tabs.get(41),`(() => {const el=document.querySelector('#uid-target');el.focus();el.setSelectionRange(0,el.value.length);globalThis.nativeEvents=[];el.addEventListener('input',e=>nativeEvents.push(e.isTrusted))})()`);
  const nativeArgs={...selected,action:'insert_text',text:'Corte été — à'};
  const native=await interact.execute(nativeArgs);
  assert.equal(native.insertedLength,nativeArgs.text.length);
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),nativeArgs.text);
  const events=await evaluate(tabs.get(41),'nativeEvents');
  assert.ok(events.length>0&&events.every(Boolean));
  assert.equal(await evaluate(tabs.get(42),'document.querySelector("#uid-target").value'),'');
  await assert.rejects(()=>interact.execute({...nativeArgs,text:'bad\n'}));
  await assert.rejects(()=>interact.execute({...nativeArgs,text:'\uE007'}));
  await assert.rejects(()=>interact.execute({...nativeArgs,expected_url:expectedUrl+'?wrong'}));
  await evaluate(tabs.get(41),`(() => {const e=document.createElement('input');e.type='password';e.id='secret';document.body.append(e);e.focus()})()`);
  await assert.rejects(()=>interact.execute(nativeArgs));
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#secret").value'),'');
  await evaluate(tabs.get(41),`(() => {
   const first=document.querySelector('#uid-target'),second=document.createElement('input');
   second.id='redirect-focus';document.body.append(second);
   first.value='';first.focus();first.addEventListener('input',()=>second.focus(),{once:true});
  })()`);
  await assert.rejects(()=>interact.execute({...nativeArgs,text:'AB'}));
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#uid-target").value'),'A');
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#redirect-focus").value'),'');
  await evaluate(tabs.get(41),`(() => {for(let i=0;i<2;i++){const e=document.createElement('input');e.type='file';e.id='file-'+i;document.body.append(e);e.addEventListener('change',()=>globalThis.fileChanges=(globalThis.fileChanges||0)+1)}})()`);
  // Separate local backend test. The production upload mandate names
  // fracta2-hosted only; no gateway file path primitive is registered.
  const asset=join(dir,'sample.txt');await writeFile(asset,'synthetic upload fixture');
  const upload=createBrowserFileUploadCapability({allowedRoots:[dir],
   selectFile:({tabId,expectedUrl,fileIndex,file})=>{
    assert.equal(tabId,managedTab);
    return session.withTabLease(provider.browserId,tabId,()=>selectBidiFile({
     send:bidi.call,context:tabs.get(41).context,expectedUrl,fileIndex,file}));
   }});
  const uploadArgs={tab_id:managedTab,expected_url:expectedUrl,file_index:1,file_path:asset};
  const selectedFile=await upload.execute(uploadArgs);
  assert.equal(selectedFile.file_selected,true);
  assert.equal(selectedFile.browser_verified_bytes,24);
  assert.equal(selectedFile.upload_completion,'unverified');
  assert.equal(selectedFile.submitted,false);
  assert.ok(!JSON.stringify(selectedFile).includes(asset));
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#file-0").files.length'),0);
  assert.equal(await evaluate(tabs.get(41),'document.querySelector("#file-1").files[0].text()'),'synthetic upload fixture');
  assert.equal(await evaluate(tabs.get(41),'fileChanges'),1);
  await assert.rejects(()=>upload.execute({...uploadArgs,expected_url:expectedUrl+'?wrong'}));
  await evaluate(tabs.get(41),'document.querySelector("#file-0").disabled=true');
  await assert.rejects(()=>upload.execute({...uploadArgs,file_index:0}));
  assert.equal(await evaluate(tabs.get(41),'fileChanges'),1);
  const observer=await createGatewaySession(base+'/assistant');
  const otherObserver=await createGatewaySession(base+'/assistant');
  const notifications=[],otherNotifications=[];
  try{
   observer.onEvent(e=>notifications.push(e));
   otherObserver.onEvent(e=>otherNotifications.push(e));
   const methods=['page.navigationStarted','page.navigationCompleted','page.tabRemoved'];
   await observer.call('events.subscribe',{...scope,methods});
   await otherObserver.call('events.subscribe',{...scope,methods,tabIds:[managedTab]});
   const opened=await interact.execute({action:'open',...scope,url:expectedUrl,active:false});
   const openedId=opened.tab.id;
   assert.equal(opened.tab.url,expectedUrl);assert.notEqual(openedId,managedTab);
   assert.equal((await interact.execute({action:'activate',...scope,tab_id:openedId,expected_url:expectedUrl})).tab.id,openedId);
   await assert.rejects(()=>interact.execute({action:'close',...scope,tab_id:openedId,expected_url:expectedUrl+'?wrong'}));
   await session.withTabLease(provider.browserId,openedId,async()=>{
    await assert.rejects(()=>interact.execute({action:'close',...scope,tab_id:openedId,expected_url:expectedUrl}),
     e=>e.code===-32026);
   });
   assert.equal((await interact.execute({action:'close',...scope,tab_id:openedId,expected_url:expectedUrl})).closedTabId,openedId);
   for(let i=0;i<100;i++){
    if(methods.every(m=>notifications.some(e=>e.method===m&&(e.params.tabId??e.params.tab?.id)===openedId)))break;
    await delay(20);
   }
   for(const method of methods)assert.ok(notifications.some(e=>e.method===method&&
    (e.params.tabId??e.params.tab?.id)===openedId&&e.params.browser_instance_id===provider.browserId),method);
   assert.equal(otherNotifications.length,0);
   assert.ok(!(await session.call('tabs.list',scope)).tabs.some(t=>t.id===openedId));
   await assert.rejects(()=>interact.execute({action:'activate',...scope,tab_id:openedId,expected_url:expectedUrl}));
  }finally{observer.close();otherObserver.close()}
  const extra=await bidi.call('browsingContext.create',{type:'tab'});
  await bidi.call('browsingContext.navigate',{context:extra.context,url:expectedUrl,wait:'complete'});
  const more=await session.call('tabs.list',scope);
  const oldIds=new Set(list.tabs.map(t=>t.id));
  const added=more.tabs.find(t=>!oldIds.has(t.id));assert.ok(added);
  await bidi.call('browsingContext.close',{context:extra.context});
  assert.ok(!(await session.call('tabs.list',scope)).tabs.some(t=>t.id===added.id));
  const another=await bidi.call('browsingContext.create',{type:'tab'});
  const afterClose=await session.call('tabs.list',scope);
  assert.ok(afterClose.tabs.some(t=>t.id>added.id));
  await assert.rejects(()=>session.call('page.evaluate',{...query,tabId:added.id}));
  await bidi.call('browsingContext.close',{context:another.context});
  // Losing the engine connection retires the provider, not merely its gateway
  // socket. A new engine session must use a different instance identity.
  const gone=new Promise(resolve=>managedPeer.onClose(resolve));
  bidi.close();await gone;
  await assert.rejects(()=>provider.attachGateway(base+'/extension'),/bidi_provider_busy_or_closed/);
  await assert.rejects(()=>session.call('tabs.list',scope),e=>e.code===-32020);
  managedProvider=true;
 }
 console.log(JSON.stringify({ok:true,browser:version,engine,actual_chromium:engine==='chromium',actual_firefox:engine==='firefox',actual_gateway:true,
  extension:engine==='firefox'?'fixture_bidi_peer':'fixture_cdp_peer',actual_inventory:true,uid_registry:true,uid_reinjection:true,uid_replacement_rejected:true,uid_document_isolation:true,uid_reload_invalidated:true,uid_fill:true,uid_stale_no_input:true,uid_reconnect:true,cross_origin_uid:crossOriginUid,managed_bidi_provider:managedProvider,hosted_frame_uid:managedProvider,john_bounded_fixture:managedProvider,multimcp_cop_fixture:managedProvider,managed_navigation_events:managedProvider,managed_native_text:managedProvider,local_bidi_file_selection:managedProvider,engine_disconnect_retired_provider:managedProvider,distinct_workers:true,rediscovery:true,checkpoint_reload:true,reused_worker:true,
  sandbox_disabled:false,personal_browser_used:false}));
}catch(e){
 console.error(JSON.stringify({ok:false,reason:e.message,code:e.code||null,engine,browser_exit:exitInfo||null,browser_stderr:stderr,
  sandbox_disabled:false,personal_browser_used:false}));process.exitCode=1;
}finally{
 session?.close();peer?.close();await managedPeer?.close();await gate?.close();bidi?.close();
 if(browser?.pid&&!exitInfo){
  try{process.kill(-browser.pid,'SIGTERM')}catch{}
  await Promise.race([exited,delay(2500)]);
  if(!exitInfo){try{process.kill(-browser.pid,'SIGKILL')}catch{};await Promise.race([exited,delay(1000)])}
 }
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}
 if(frameServer){frameServer.closeAllConnections();await new Promise(r=>frameServer.close(r))}
 await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 console.log(JSON.stringify({cleanup:true,temporary_profile_removed:true,browser_exit:exitInfo||null}));
}
