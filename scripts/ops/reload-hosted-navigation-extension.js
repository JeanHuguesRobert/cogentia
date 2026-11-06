#!/usr/bin/env node
/** Reload ONLY the unpacked Cogentia extension, retaining Chromium sessions. */
import WebSocket from 'ws';
const endpoint='http://127.0.0.1:9223/json/list';
const expected=process.env.COGENTIA_EXPECTED_EXTENSION_VERSION||'1.0.18';
async function versionTarget(){
 const targets=await (await fetch(endpoint,{signal:AbortSignal.timeout(3000)})).json();
 for(const t of targets.filter(x=>x.type==='service_worker'&&x.url?.startsWith('chrome-extension://'))){
  try{const info=await evaluate(t.webSocketDebuggerUrl,'({name:chrome.runtime.getManifest().name,version:chrome.runtime.getManifest().version})');
   if(info?.name==='Cogentia Navigation Assistant')return {target:t,version:info.version};}catch{}
 }
 return null;
}
function evaluate(url,expression){return new Promise((resolve,reject)=>{
 const ws=new WebSocket(url);const timer=setTimeout(()=>{ws.close();reject(Error('cdp_timeout'))},2500);
 const done=(error,value)=>{clearTimeout(timer);try{ws.close()}catch{};error?reject(error):resolve(value)};
 ws.on('open',()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}})));
 ws.on('message',raw=>{const obj=JSON.parse(String(raw));if(obj.id===1)done(obj.error?Error('cdp_rejected'):null,obj.result?.result?.value)});
 ws.on('error',e=>done(e));
});}
const found=await versionTarget();
if(!found)throw Error('Cogentia hosted extension target unavailable');
console.log(JSON.stringify({extension:'Cogentia Navigation Assistant',loaded_version:found.version}));
if(process.argv.includes('--reload')){
 try{await evaluate(found.target.webSocketDebuggerUrl,'chrome.runtime.reload(); "reload_requested"');}catch(e){if(e.message!=='cdp_timeout')console.log('reload_disconnected='+e.message)}
 let version=null;
 for(let attempt=0;attempt<12;attempt++){
  await new Promise(resolve=>setTimeout(resolve,500));
  try{version=(await versionTarget())?.version||null;if(version===expected)break;}catch{}
 }
 console.log(JSON.stringify({reloaded_version:version,success:version===expected}));
 if(version!==expected)process.exitCode=1;
}
