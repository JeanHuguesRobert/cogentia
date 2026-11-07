#!/usr/bin/env node
/** Independent Chromium fixture, fake gateway, real CDP transport. No personal browser. */
import https from 'node:https';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import assert from 'node:assert/strict';import {WebSocket} from 'ws';
import {createNavigationGateway} from './ops/navigation-assistant-gateway.js';
import {createHostedFrameTransport} from './lib/browser-frame-cdp-transport.js';
import {createHostedBrowserCapabilities} from './lib/hosted-browser-capabilities.js';
import {executeFrameEvaluate} from './lib/browser-frame-evaluate.js';
import {SAFE_DOM_STRUCTURE_CODE} from './lib/browser-safe-dom-structure.js';
import {compileNonSecretFormFill} from './lib/browser-form-script.js';
const dir=mkdtempSync(join(tmpdir(),'cogentia-frame-transport-'));
let main,frame,chrome,gate,ext;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const assertPort=s=>s.address().port;
try{
 const key=join(dir,'key.pem'),cert=join(dir,'cert.pem');
 const openssl=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-keyout',key,'-out',cert,'-nodes',
  '-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
 if(openssl.status!==0)throw Error('fixture_certificate_generation_failed');
 const tls={key:readFileSync(key),cert:readFileSync(cert)};
 const listen=(fn,host='127.0.0.1')=>new Promise((yes,no)=>{const s=https.createServer(tls,fn);s.once('error',no);s.listen(0,host,()=>yes(s))});
 const html=(res,text)=>{res.writeHead(200,{'content-type':'text/html'});res.end(text)};
 frame=await listen((req,res)=>html(res,'<!doctype html><title>isolated frame</title><input type="text" id="fake" autocomplete="off">'),'::');
 main=await listen((req,res)=>html(res,`<!doctype html><title>isolated parent</title><iframe src="https://localhost:${assertPort(frame)}/inside"></iframe>`));
 const probe=await new Promise((yes,no)=>{const s=https.createServer(tls,(req,res)=>res.end());s.listen(0,'127.0.0.1',()=>yes(s));s.once('error',no)});
 const unused=assertPort(probe);await new Promise(r=>probe.close(r));
 const expectedUrl=`https://127.0.0.1:${assertPort(main)}/main`;
 const childOrigin=`https://localhost:${assertPort(frame)}`;
 chrome=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-extensions',
  '--disable-background-networking','--no-proxy-server','--no-default-browser-check','--disable-dev-shm-usage',
  '--ignore-certificate-errors','--host-resolver-rules=MAP localhost 127.0.0.1','--remote-allow-origins=*',`--remote-debugging-port=${unused}`,
  `--user-data-dir=${dir}/profile`,expectedUrl],{stdio:'ignore'});
 let cdpTarget;
 for(let i=0;i<45;i++){
  try{const response=await fetch(`http://127.0.0.1:${unused}/json/list`,{signal:AbortSignal.timeout(1200)});
   cdpTarget=(await response.json()).find(t=>t.type==='page'&&t.url===expectedUrl);if(cdpTarget)break;
  }catch{}await wait(160);
 }
 if(!cdpTarget)throw Error('isolated_target_missing');
 await wait(750);
 gate=createNavigationGateway({instance:'frame-transport-fixture'});
 await gate.listen(0,['127.0.0.1']);
 const port=gate._bound[0].address().port,base=`ws://127.0.0.1:${port}`;
 ext=new WebSocket(base+'/extension');await new Promise((yes,no)=>{ext.once('open',yes);ext.once('error',no)});
 ext.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'fixture-browser'}}));
 ext.on('message',async raw=>{
  const req=JSON.parse(String(raw));
  if(req.method==='tabs.list')ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,
    result:{tabs:[{id:42,url:expectedUrl,title:'fixture'}]}}));
  if(req.method==='page.evaluate'){
   if(req.params.tabId!==42||req.params.expectedUrl!==expectedUrl)throw Error('fixture_tab_binding_mismatch');
   const client=new WebSocket(cdpTarget.webSocketDebuggerUrl);
   try{
    await new Promise((yes,no)=>{client.once('open',yes);client.once('error',no)});
    const rpc=new Promise((yes,no)=>{client.on('message',m=>{const data=JSON.parse(String(m));
      if(data.id===1)data.error?no(Error('CDP fixture exception')):yes(data.result)});});
    client.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:req.params.code,returnByValue:true}}));
    const value=(await rpc).result?.value;
    ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{value,tab:{id:42,url:expectedUrl}}}));
   }finally{client.close()}
  }
 });
 const transport=createHostedFrameTransport({gateway:base+'/assistant',browserInstanceId:'fixture-browser',
  cdpHttpEndpoint:`http://127.0.0.1:${unused}/`,timeoutMs:9000});
 let childFrame,lastTree;
 for(let i=0;i<30;i++){
  childFrame=await transport.withFrame({tabId:42,expectedUrl,operation:async({frameTree,discoverFrames})=>{lastTree=frameTree;const found=frameTree.childFrames?.[0]?.frame; if(found)return found;const related=await discoverFrames();return related.length===1?{id:related[0].frameId,url:related[0].url}:null}});
  if(childFrame?.url?.includes('/inside'))break;
  await wait(150);
 }
 if(!childFrame)throw Error('child_frame_missing');
 // Reject a mismatched URL and an unrelated OOPIF origin before any script.
 await assert.rejects(()=>transport.withFrame({tabId:42,expectedUrl:'https://other.example',
   operation:()=>{throw Error('must-not-run')}}),e=>e.code==='FRAME_CDP_TAB_CHANGED');
 await assert.rejects(()=>transport.withFrame({tabId:42,expectedUrl,frameId:childFrame.id,
   expectedOrigin:'https://other.example',operation:()=>{throw Error('must-not-run')}}),
   e=>e.code==='FRAME_CDP_OOPIF_TARGET_MISSING_OR_AMBIGUOUS');
 let metadata;
 try{
  metadata=await transport.withFrame({tabId:42,expectedUrl,frameId:childFrame.id,
   expectedOrigin:childOrigin,operation:({send})=>executeFrameEvaluate({send,frameId:childFrame.id,
     expectedOrigin:childOrigin,script:SAFE_DOM_STRUCTURE_CODE})});
 }catch(e){
  if(e.code==='FRAME_CDP_COMMAND_FAILED'){
   console.log(JSON.stringify({ok:false,reason:'cross_process_frame_requires_cdp_session',
     transport_browser_reachable:true,top_url_binding:true,hosted_browser_untouched:true}));
   process.exitCode=2;
  }else throw e;
 }
 if(metadata){
  assert.equal(metadata.value?.fields?.[0]?.type,'text','metadata='+JSON.stringify({fields:metadata.value?.fields,forms:metadata.value?.forms}));
  const capabilities=createHostedBrowserCapabilities({gateway:base+'/assistant',browserInstanceId:'fixture-browser',
    frameTransport:transport,timeoutMs:9000});
  const inspect=capabilities.find(c=>c.name==='browser.hosted.inspect');
  const formFill=capabilities.find(c=>c.name==='browser.form.fill');
  const frameList=await inspect.execute({action:'frame_tree',tab_id:42,expected_url:expectedUrl});
  assert.equal(frameList.oopif_frames?.length,1);
  assert.equal(frameList.oopif_frames[0].frame_id,childFrame.id);
  const scoped=await inspect.execute({action:'frame_structure',tab_id:42,expected_url:expectedUrl,
    frame_id:childFrame.id,expected_frame_origin:childOrigin});
  assert.equal(scoped.fields[0].type,'text');
  const fill=await formFill.execute({tab_id:42,expected_url:expectedUrl,frame_id:childFrame.id,
    expected_frame_origin:childOrigin,field_index:0,text:'fixture-only-2026'});
  assert.equal(fill.ok,true);
  assert.equal(fill.inserted_length,17);
  assert.doesNotMatch(JSON.stringify(fill),/fixture-only-2026/);
  console.log(JSON.stringify({ok:true,proof:'real_cdp_gateway_bound_frame',frame_origin_checked:true,semantic_capabilities_checked:true,oopif:true,
    fields_metadata_only:true,script_sent_from_core:true,inserted_characters:17,
    negative_target_checks:true,no_extension_changes:true,hosted_browser_untouched:true}));
 }
}catch(e){console.error(JSON.stringify({ok:false,error:e.code||null,detail:e.message,hosted_browser_untouched:true}));process.exitCode=1}
finally{try{ext?.close()}catch{};try{await gate?.close()}catch{};
 try{chrome?.kill('SIGTERM');if(chrome?.pid)await new Promise(r=>{if(chrome.exitCode!==null||chrome.signalCode!==null)r();else{chrome.once('exit',r);setTimeout(r,1600)}})}catch{};
 await Promise.all([new Promise(r=>main?main.close(r):r()),new Promise(r=>frame?frame.close(r):r())]);
 try{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:150})}catch{}}
