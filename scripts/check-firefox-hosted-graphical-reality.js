#!/usr/bin/env node
/** Disposable KasmVNC + graphical Firefox + standalone provider CLI.
 * No existing display, profile, gateway, credentials or system service touched.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createNetServer} from 'node:net';
import {createServer as createHttpServer} from 'node:http';
import https from 'node:https';
import {WebSocket,WebSocketServer} from 'ws';
import {setTimeout as delay} from 'node:timers/promises';
import {createNavigationGateway} from './ops/navigation-assistant-gateway.js';
import {createGatewaySession} from './lib/navigation-assistant/gateway-session.js';
import {createHostedBrowserCapabilities} from './lib/hosted-browser-capabilities.js';
const dir=await mkdtemp(join(tmpdir(),'cogentia-graphical-firefox-'));
let gateway,assistant,server;
const children=[];
const isolatedEnv={...process.env,HOME:dir,XDG_CONFIG_HOME:join(dir,'config'),
 XDG_CACHE_HOME:join(dir,'cache'),XDG_DATA_HOME:join(dir,'data')};
for(const key of ['DISPLAY','XAUTHORITY','MOZ_HEADLESS','WAYLAND_DISPLAY','DBUS_SESSION_BUS_ADDRESS','XDG_RUNTIME_DIR'])
 delete isolatedEnv[key];
isolatedEnv.MOZ_ENABLE_WAYLAND='0';
function run(cmd,args,options={}){
 const child=spawn(cmd,args,{detached:true,stdio:['ignore','pipe','pipe'],env:isolatedEnv,...options});
 const entry={child,out:'',err:'',exit:null};
 child.stdout.on('data',b=>entry.out=(entry.out+b).slice(-16000));
 child.stderr.on('data',b=>entry.err=(entry.err+b).slice(-16000));
 entry.done=new Promise(resolve=>{
  child.once('exit',(code,signal)=>{entry.exit={code,signal};resolve()});
  child.once('error',e=>{entry.exit={error:e.code};resolve()});
 });
 children.push(entry);return entry;
}
async function stop(entry){
 if(!entry.exit){try{process.kill(-entry.child.pid,'SIGTERM')}catch{}
  await Promise.race([entry.done,delay(15000)]);
  if(!entry.exit){try{process.kill(-entry.child.pid,'SIGKILL')}catch{};await entry.done}
 }
}
function local(cmd,args,options={}){
 const r=spawnSync(cmd,args,{encoding:'utf8',timeout:5000,env:isolatedEnv,...options});
 if(r.status!==0)throw Error('fixture_command_failed:'+cmd);
 return r.stdout;
}
async function until(fn,label,entry){
 for(let i=0;i<150;i++){
  if(entry?.exit)throw Error(label+'_exited');
  const value=await fn();if(value)return value;await delay(100);
 }
 throw Error(label+'_timeout');
}
async function freePort(){
 const s=createNetServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r)});
 const port=s.address().port;await new Promise(r=>s.close(r));return port;
}
function httpStatus(port,cert,auth){
 return new Promise((resolve,reject)=>{
  const req=https.request({host:'127.0.0.1',port,path:'/',method:'GET',ca:cert,agent:false,headers:{Connection:'close'},
   ...(auth?{auth}:{}),timeout:2000},res=>{res.resume();resolve(res.statusCode)});
  req.once('error',reject);req.once('timeout',()=>req.destroy(Error('https_timeout')));req.end();
 });
}
function vncHandshake(port,cert,auth){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket('wss://127.0.0.1:'+port+'/websockify','binary',{
   ca:cert,handshakeTimeout:3000,origin:'https://127.0.0.1:'+port,
   ...(auth?{headers:{Authorization:'Basic '+Buffer.from(auth).toString('base64')}}:{})
  });
  let buffer=Buffer.alloc(0),done=false;
  const finish=(error,value)=>{
   if(done)return;done=true;clearTimeout(timer);ws.terminate();
   error?reject(error):resolve(value);
  };
  const timer=setTimeout(()=>finish(Error('vnc_websocket_timeout')),5000);
  ws.on('unexpected-response',(_req,res)=>{res.resume();finish(null,{httpStatus:res.statusCode})});
  ws.on('error',()=>finish(Error('vnc_websocket_failed')));
  ws.on('close',()=>finish(Error('vnc_websocket_closed')));
  ws.on('message',raw=>{
   buffer=Buffer.concat([buffer,Buffer.from(raw)]);
   if(buffer.length>=12){
    const banner=buffer.subarray(0,12).toString('ascii');
    if(!/^RFB 00[3-9]\.00[0-9]\n$/.test(banner))return finish(Error('vnc_rfb_banner_invalid'));
    finish(null,{rfb:true});
   }
  });
 });
}
try{
 // Let X server choose an unused display (-displayfd) rather than killing
 // or claiming an existing workspace display. X11 authentication is private.
 const xauth=join(dir,'Xauthority'),passwd=join(dir,'kasmpasswd'),key=join(dir,'key.pem'),cert=join(dir,'cert.pem');
 const password=randomBytes(12).toString('hex');
 await writeFile(xauth,'',{mode:0o600});
 local('xauth',['-f',xauth,'add',':99','MIT-MAGIC-COOKIE-1',randomBytes(16).toString('hex')]);
 // Install the same cookie for the chosen display after displayfd reports it.
 local('kasmvncpasswd',['-u','fixture','-w',passwd],{input:password+'\n'+password+'\n'});
 local('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=127.0.0.1',
  '-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert]);
 const port=await freePort();
 const xvnc=run('/usr/bin/Xvnc',['-displayfd','1','-geometry','1024x768','-depth','24',
  '-nolisten','tcp','-auth',xauth,'-interface','127.0.0.1','-websocketPort',String(port),
  '-KasmPasswordFile',passwd,'-httpd','/usr/share/kasmvnc/www','-sslOnly','-cert',cert,'-key',key]);
 const display=await until(()=>xvnc.out.match(/^(\d+)\s*$/m)?.[1],'x_display',xvnc);
 const cookie=local('xauth',['-f',xauth,'list']).trim().split(/\s+/).at(-1);
 local('xauth',['-f',xauth,'add',':'+display,'MIT-MAGIC-COOKIE-1',cookie]);
 const env={...isolatedEnv,DISPLAY:':'+display,XAUTHORITY:xauth};
 const pem=await readFile(cert);
 await until(async()=>{try{return await httpStatus(port,pem)===401}catch{return false}},'vnc_auth',xvnc);
 assert.equal(await httpStatus(port,pem,'fixture:'+password),200);
 const noAuth=await vncHandshake(port,pem);
 assert.equal(noAuth.httpStatus,401);
 const vnc=await vncHandshake(port,pem,'fixture:'+password);
 assert.equal(vnc.rfb,true);
 const listeners=local('ss',['-H','-ltn','sport','=',':'+port]).trim();
 assert.ok(listeners.includes('127.0.0.1:'+port));
 assert.ok(!listeners.includes('0.0.0.0:'+port)&&!listeners.includes('[::]:'+port));
 run('/usr/bin/openbox',[],{env});
 const profile=join(dir,'profile');
 await mkdir(profile,{mode:0o700});
 server=createHttpServer((req,res)=>{
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
  res.end('<!doctype html><title>Graphical Firefox reality</title><input id="probe">');
 });
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 const url='http://127.0.0.1:'+server.address().port+'/';
 const firefox=run(process.env.FIREFOX_BIN||'/usr/lib/firefox/firefox',
  ['--no-remote','--profile',profile,'--remote-debugging-port','0','about:blank'],{env});
 const bidiPort=await until(()=>firefox.err.match(/WebDriver BiDi listening on ws:\/\/127\.0\.0\.1:(\d+)/)?.[1],'bidi',firefox);
 gateway=createNavigationGateway({instance:'graphical-firefox-fixture'});
 await gateway.listen(0,['127.0.0.1']);
 const base='ws://127.0.0.1:'+gateway._bound[0].address().port;
 const provider=run(process.execPath,['scripts/ops/navigation-assistant-bidi.js','--bidi-endpoint',
  'ws://127.0.0.1:'+bidiPort+'/session','--gateway',base+'/extension','--instance-prefix','graphical-firefox']);
 const registration=await until(()=>{try{return JSON.parse(provider.out.trim())}catch{return null}},'provider',provider);
 assert.equal(registration.status,'registered');
 const scope={browser_instance_id:registration.browser_instance_id};
 assistant=await createGatewaySession(base+'/assistant');
 const listed=await assistant.call('browser.instances');
 assert.ok(listed.browsers.some(b=>b.browser_instance_id===scope.browser_instance_id&&b.provider.engine==='firefox'));
 const caps=createHostedBrowserCapabilities({gateway:base+'/assistant'});
 const interact=caps.find(c=>c.name==='browser.hosted.interact'),inspect=caps.find(c=>c.name==='browser.hosted.inspect');
 const opened=await interact.execute({action:'open',...scope,url});
 const observed=await inspect.execute({action:'structure',...scope,tab_id:opened.tab.id});
 assert.ok(observed.fields.some(f=>f.type==='text'));
 const windows=await until(()=>{const s=local('xwininfo',['-root','-tree'],{env});return s.includes('Graphical Firefox reality')?s:null},'visible_window',firefox);
 assert.match(windows,/Firefox/i);
 // Stop the provider first; verify retirement from gateway without closing Firefox.
 await stop(provider);
 await until(async()=>!(await assistant.call('browser.instances')).browsers.some(b=>b.browser_instance_id===scope.browser_instance_id),'retired_provider');
 assert.equal(firefox.exit,null);
 await stop(firefox);
 // The owner-facing companion is separately exercised, including preflight
 // against the old gateway protocol before any profile or browser creation.
 const managedProfile=join(dir,'managed-profile');
 const legacy=new WebSocketServer({host:'127.0.0.1',port:0});
 await new Promise((r,j)=>{legacy.once('listening',r);legacy.once('error',j)});
 try{
  legacy.on('connection',ws=>ws.on('message',raw=>{
   const message=JSON.parse(String(raw));
   ws.send(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{browsers:[]}}));
  }));
  const refused=run(process.execPath,['scripts/ops/navigation-assistant-firefox.js',
   '--profile-dir',managedProfile,'--gateway','ws://127.0.0.1:'+legacy.address().port+'/extension'],{env});
  await refused.done;
  assert.equal(refused.exit.code,1);assert.match(refused.err,/managed_gateway_upgrade_required/);
  await assert.rejects(()=>lstat(managedProfile),e=>e.code==='ENOENT');
 }finally{for(const ws of legacy.clients)ws.terminate();await new Promise(r=>legacy.close(r))}
 const managedArgs=['scripts/ops/navigation-assistant-firefox.js','--profile-dir',managedProfile,'--gateway',base+'/extension'];
 const registered=entry=>until(()=>{try{return JSON.parse(entry.out.split('\n')[0])}catch{return null}},'companion',entry);
 const launch=async(reuse=false)=>{
  const proc=run(process.execPath,[...managedArgs,...(reuse?['--reuse-managed-profile']:[])],{env});
  const reg=await registered(proc);assert.equal(reg.status,'registered');
  return {proc,reg,scope:{browser_instance_id:reg.browser_instance_id}};
 };
 let first=await launch();
 const firstTab=(await interact.execute({action:'open',...first.scope,url})).tab;
 const evaluate=async(instance,tab,code)=>assistant.call('page.evaluate',{browser_instance_id:instance,tabId:tab.id,expectedUrl:url,code});
 assert.equal((await evaluate(first.reg.browser_instance_id,firstTab,"localStorage.setItem('fixture-marker','preserved');localStorage.getItem('fixture-marker')")).value,'preserved');
 // Concurrent launch/reuse must fail before starting another browser.
 const conflict=run(process.execPath,[...managedArgs,'--reuse-managed-profile'],{env});
 await conflict.done;assert.equal(conflict.exit.code,1);
 await stop(first.proc);
 assert.equal(first.proc.exit.code,0);
 await assert.rejects(()=>lstat(managedProfile+'.launch-lock'),e=>e.code==='ENOENT');
 assert.equal((await lstat(managedProfile)).isDirectory(),true);
 await until(async()=>!(await assistant.call('browser.instances')).browsers.some(b=>b.browser_instance_id===first.reg.browser_instance_id),'first_companion_retired');
 const second=await launch(true);
 assert.notEqual(second.reg.browser_instance_id,first.reg.browser_instance_id);
 const secondTab=(await interact.execute({action:'open',...second.scope,url})).tab;
 assert.equal((await evaluate(second.reg.browser_instance_id,secondTab,"localStorage.getItem('fixture-marker')")).value,'preserved');
 await until(()=>local('xwininfo',['-root','-tree'],{env}).includes('Graphical Firefox reality'),'companion_window',second.proc);
 assistant.close();assistant=null;
 await gateway.close();gateway=null;
 await until(()=>second.proc.out.includes('"browser_preserved":true'),'companion_disconnect',second.proc);
 assert.equal(second.proc.exit,null);
 assert.ok(local('xwininfo',['-root','-tree'],{env}).includes('Graphical Firefox reality'));
 await stop(second.proc);
 assert.equal(second.proc.exit.code,0);
 await assert.rejects(()=>lstat(managedProfile+'.launch-lock'),e=>e.code==='ENOENT');
 console.log(JSON.stringify({ok:true,graphical_firefox:true,kasmvnc_https_auth_challenge:true,kasmvnc_authenticated_http:true,kasmvnc_authenticated_rfb_banner:true,kasmvnc_unauthenticated_websocket_refused:true,
  loopback_listener:true,x_window_observed:true,standalone_provider_cli:true,hosted_inspect:true,provider_retired:true,firefox_survives_provider_stop:true,managed_companion:true,legacy_preflight_refusal:true,profile_lock_conflict_refused:true,profile_persistence:true,fresh_instance_after_restart:true,browser_preserved_on_gateway_loss:true,existing_workspace_used:false}));
}catch(e){
 console.error(JSON.stringify({ok:false,reason:e.message,children:children.map(c=>({command:c.child.spawnfile,exit:c.exit,stderr:c.err.slice(-1600)}))}));
 process.exitCode=1;
}finally{
 assistant?.close();
 for(const entry of [...children].reverse())await stop(entry);
 await gateway?.close();
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}
 await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 console.log(JSON.stringify({cleanup:true,temporary_profile_removed:true,temporary_credentials_removed:true}));
}
