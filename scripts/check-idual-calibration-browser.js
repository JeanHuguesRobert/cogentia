#!/usr/bin/env node
// Real Chromium test against a synthetic MCP Apps host; not a ChatGPT host acceptance test.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const content=await fs.readFile(path.join(repo,'mcp-apps/idual-calibration/index.html'));
assert.equal(content.toString().split('<!doctype html>').length,2,'SDK bundle must not inject template into JS');
const executable=process.env.CHROMIUM_BIN||'/usr/bin/chromium';
const harness=`<!doctype html><meta charset="utf-8"><div id="result">WAIT</div>
<iframe id="app" src="/mcp-apps/idual-calibration/index.html"></iframe>
<script>
let initialized=false,responded=false;const box=document.getElementById('result');
window.addEventListener('message',e=>{
 if(e.source!==document.getElementById('app').contentWindow)return;
 const d=e.data;if(!d||d.jsonrpc!=='2.0')return;
 if(d.method==='ui/initialize'){
  e.source.postMessage({jsonrpc:'2.0',id:d.id,result:{
   protocolVersion:'2026-01-26',
   hostInfo:{name:'synthetic-cogentia-test-host',version:'1.0.0'},
   hostCapabilities:{},hostContext:{theme:'light',displayMode:'inline'}
  }},'*');
 }
 if(d.method==='ui/notifications/initialized'){
  initialized=true;
  setTimeout(()=>document.getElementById('app').contentDocument.getElementById('red').click(),80);
 }
 if(d.method==='ui/message'){
  responded=true;
  const ok=JSON.stringify(d.params).includes('idual.command.request.v1');
  box.textContent=(initialized&&ok?'PASS:SDK_HANDSHAKE_AND_MESSAGE':'FAIL:PAYLOAD');
  e.source.postMessage({jsonrpc:'2.0',id:d.id,result:{}},'*');
 }
});
setTimeout(()=>{if(!responded)box.textContent='FAIL:TIMEOUT_initialized='+initialized},4500);
</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/test') {res.writeHead(200,{'Content-Type':'text/html'});res.end(harness);return;}
 if(req.url==='/mcp-apps/idual-calibration/index.html'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(content);return;
 }
 res.writeHead(404);res.end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const port=server.address().port;
 const child=spawn(executable,[
  '--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--virtual-time-budget=6500','--dump-dom',`http://127.0.0.1:${port}/test`
 ],{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',data=>{stdout+=data.toString();});
 child.stderr.on('data',data=>{stderr+=data.toString();});
 const timer=setTimeout(()=>child.kill('SIGKILL'),20000);
 const code=await new Promise(resolve=>child.on('close',resolve));
 clearTimeout(timer);
 assert.equal(code,0,'Chromium exited with error '+stderr.slice(-400));
 assert.match(stdout,/<div id="result">PASS:SDK_HANDSHAKE_AND_MESSAGE<\/div>/);
 console.log('iDual MCP App Chromium host simulator: SDK initialize + red button message PASS');
}finally{await new Promise(r=>server.close(r));}
