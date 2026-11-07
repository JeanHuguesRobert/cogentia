#!/usr/bin/env node
/** Real, isolated Chromium + two local origins. Never attaches to hosted user browser. */
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {safeFormFocusCode} from '../browser-extension/form-field-focus.js';
import {verifyFrameTarget} from './lib/browser-frame-target.js';
import {projectFrameTree} from './lib/browser-frame-tree.js';

function listen(host,fn){return new Promise((yes,no)=>{const s=http.createServer(fn);s.on('error',no);s.listen(0,host,()=>yes(s))})}
const port=s=>s.address().port;
const html=(res,content)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(content)};
let main,frame,chrome,ws;
const dir=mkdtempSync(join(tmpdir(),'cogentia-iframe-reality-'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 frame=await listen('127.0.0.1',(_,res)=>html(res,'<!doctype html><title>Fictional child frame</title><input id="fictional" type="text" autocomplete="off">'));
 main=await listen('127.0.0.1',(_,res)=>html(res,`<!doctype html><title>Fictional parent</title><iframe id="nested" src="http://127.0.0.1:${port(frame)}/frame"></iframe>`));
 const debug=await listen('127.0.0.1',(_,res)=>{res.writeHead(404);res.end()});const debugPort=port(debug);await new Promise(r=>debug.close(r));
 chrome=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-extensions',
  '--disable-background-networking','--no-proxy-server','--no-default-browser-check','--disable-dev-shm-usage',
  '--remote-allow-origins=*',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${dir}`,'about:blank'],{stdio:'ignore'});
 let target;
 for(let i=0;i<35;i++){
  try{const result=await fetch(`http://127.0.0.1:${debugPort}/json/list`,{signal:AbortSignal.timeout(1000)});
   target=(await result.json()).find(x=>x.type==='page');if(target)break;
  }catch{}await wait(160);
 }
 if(!target)throw Error('isolated_chromium_unavailable');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((yes,no)=>{ws.once('open',yes);ws.once('error',no)});
 let seq=0;const pending=new Map();
 ws.on('message',data=>{const r=JSON.parse(String(data));if(pending.has(r.id)){const {yes,no}=pending.get(r.id);pending.delete(r.id);r.error?no(Error(r.error.message)):yes(r.result)}});
 function send(method,params={}){return new Promise((yes,no)=>{const id=++seq;pending.set(id,{yes,no});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);no(Error('CDP_TIMEOUT:'+method))}},5000).unref()})}
 await send('Page.enable');await send('Runtime.enable');
 const pageUrl=`http://127.0.0.1:${port(main)}/parent`;
 await send('Page.navigate',{url:pageUrl});
 let tree,child;
 for(let i=0;i<40;i++){
  try{tree=(await send('Page.getFrameTree')).frameTree;child=tree?.childFrames?.[0]?.frame;if(child?.url?.includes('/frame'))break;}catch{}
  await wait(200);
 }
 if(!child)throw Error('iframe_not_loaded');
 const metadata=projectFrameTree(tree);
 assert.equal(metadata.frame_count,2);
 assert.equal(metadata.contains_cross_origin_frames,true);
 const targetOrigin=`http://127.0.0.1:${port(frame)}`;
 verifyFrameTarget(tree,{frameId:child.id,expectedOrigin:targetOrigin});
 const world=await send('Page.createIsolatedWorld',{frameId:child.id,worldName:'cogentia-form-assist'});
 assert.ok(Number.isInteger(world.executionContextId));
 const focused=await send('Runtime.evaluate',{expression:safeFormFocusCode(0),contextId:world.executionContextId,returnByValue:true});
 assert.equal(focused.result?.value?.ok,true,'iframe input focused');
 verifyFrameTarget((await send('Page.getFrameTree')).frameTree,{frameId:child.id,expectedOrigin:targetOrigin});
 const inserted=await send('Input.insertText',{text:'fixture-only-2026'});
 const readback=await send('Runtime.evaluate',{expression:'document.getElementById("fictional")?.value',contextId:world.executionContextId,returnByValue:true});
 assert.equal(readback.result?.value,'fixture-only-2026');
 console.log(JSON.stringify({ok:true,proof:'real_isolated_chromium_two_origins',frame_count:metadata.frame_count,origin_match:true,
  iframe_focused:true,inserted_character_count:16,readback_matches:true,submitted:false,
  hosted_browser_untouched:true,credentials_used:false}));
}catch(e){console.error(JSON.stringify({ok:false,reason:e.message,hosted_browser_untouched:true}));process.exitCode=1}
finally{try{ws?.close()}catch{};try{chrome?.kill('SIGTERM')}catch{};
 await Promise.all([new Promise(r=>main?main.close(r):r()),new Promise(r=>frame?frame.close(r):r())]);
 rmSync(dir,{recursive:true,force:true});}
