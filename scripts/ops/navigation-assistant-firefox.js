#!/usr/bin/env node
/** Foreground graphical Firefox companion for an explicitly selected X11
 * workspace. Operium owns the service/display/routing lifecycle; this command
 * creates no service, chooses no user, and never launches a default profile.
 */
import {spawn} from 'node:child_process';
import {mkdir,lstat,realpath,readFile,writeFile,rmdir} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createGatewaySession} from '../lib/navigation-assistant/gateway-session.js';
import {openBidiSession} from '../lib/navigation-assistant/bidi-session.js';
import {createBidiNavigationProvider} from '../lib/navigation-assistant/bidi-provider.js';

const usage='Usage: node scripts/ops/navigation-assistant-firefox.js --profile-dir /private/parent/firefox --gateway ws://127.0.0.1:PORT/extension [--reuse-managed-profile] [--reconnect-gateway]';
const marker='.cogentia-managed-firefox-v1';
let browser,engine,peer,lock,childDone,exitInfo,stopRequested=false,stopResolve;
const stopped=new Promise(r=>stopResolve=r);
const signal=()=>{stopRequested=true;stopResolve()};
process.on('SIGINT',signal);process.on('SIGTERM',signal);process.on('SIGHUP',signal);
const fail=code=>{throw Error(code)};
async function privateDirectory(path){
 const info=await lstat(path);
 if(!info.isDirectory()||info.uid!==process.getuid()||(info.mode&0o077)!==0||await realpath(path)!==path)
  fail('managed_profile_private_directory_required');
}
async function cleanupBrowser(){
 if(!browser||exitInfo)return;
 if(engine&&!engine.closed){
  // browser.close may close the socket before its reply; trust the owned
  // child exit, not the command acknowledgement. Let Firefox flush storage.
  void engine.call('browser.close').catch(()=>{});
  await Promise.race([childDone,delay(5000)]);
  if(exitInfo){if(exitInfo.code!==0)process.exitCode=1;return}
 }
 console.error(JSON.stringify({status:'graceful_browser_close_unconfirmed'}));
 process.exitCode=1;
 try{process.kill(-browser.pid,'SIGTERM')}catch{}
 await Promise.race([childDone,delay(3000)]);
 if(!exitInfo){
  try{process.kill(-browser.pid,'SIGKILL')}catch{}
  await Promise.race([childDone,delay(3000)]);
 }
}
try{
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--help'){console.log(usage);process.exit(0)}
 const options={};let reuse=false,reconnect=false;
 while(args.length){
  const flag=args.shift();
  if(flag==='--reuse-managed-profile'&&!reuse){reuse=true;continue}
  if(flag==='--reconnect-gateway'&&!reconnect){reconnect=true;continue}
  if(!['--profile-dir','--gateway'].includes(flag)||Object.hasOwn(options,flag)||!args[0]||args[0].startsWith('--'))
   fail('managed_firefox_arguments_invalid');
  options[flag]=args.shift();
 }
 const profile=options['--profile-dir'];
 if(!profile||profile!==resolve(profile)||!/^[-a-zA-Z0-9_.]+$/.test(basename(profile))||!options['--gateway'])
  fail('managed_firefox_arguments_invalid');
 if(process.getuid()===0||!/^:[0-9]+(?:\.[0-9]+)?$/.test(process.env.DISPLAY||'')||!process.env.XAUTHORITY)
  fail('explicit_unprivileged_x11_workspace_required');
 const endpoint=new URL(options['--gateway']);
 if(endpoint.protocol!=='ws:'||endpoint.hostname!=='127.0.0.1'||!endpoint.port||
  endpoint.pathname!=='/extension'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)
  fail('local_gateway_required');
 // This first check has no browser-side effect, including on old gateways.
 const assistantEndpoint=new URL(endpoint);assistantEndpoint.pathname='/assistant';
 const observer=await createGatewaySession(assistantEndpoint.href,{timeoutMs:3000});
 try{
  const discovery=await observer.call('browser.instances');
  if(discovery.managed_provider_registration!==1)fail('managed_gateway_upgrade_required');
 }finally{observer.close()}
 if(stopRequested)fail('managed_firefox_interrupted');
 await privateDirectory(dirname(profile));
 const candidate=profile+'.launch-lock';
 try{await mkdir(candidate,{mode:0o700})}catch(e){if(e.code==='EEXIST')fail('managed_profile_launch_locked');throw e}
 lock=candidate;
 if(reuse){
  await privateDirectory(profile);
  const mark=profile+'/'+marker,info=await lstat(mark);
  if(!info.isFile()||info.uid!==process.getuid()||(info.mode&0o077)!==0||info.size!==3||
    await readFile(mark,'utf8')!=='v1\n')fail('managed_profile_marker_invalid');
 }else{
  await mkdir(profile,{mode:0o700});
  await writeFile(profile+'/'+marker,'v1\n',{mode:0o600,flag:'wx'});
 }
 if(stopRequested)fail('managed_firefox_interrupted');
 const env={...process.env,MOZ_ENABLE_WAYLAND:'0'};
 delete env.MOZ_HEADLESS;delete env.WAYLAND_DISPLAY;
 browser=spawn('/usr/lib/firefox/firefox',['--no-remote','--profile',profile,'--remote-debugging-port','0','about:blank'],
  {detached:true,env,stdio:['ignore','ignore','pipe']});
 let diagnostics='';
 browser.stderr.on('data',b=>diagnostics=(diagnostics+b).slice(-8192));
 childDone=new Promise(r=>{
  browser.once('exit',(code,signal)=>{exitInfo={code,signal};r()});
  browser.once('error',e=>{exitInfo={error:e.code};r()});
 });
 let port;
 for(let i=0;i<150&&!stopRequested&&!exitInfo;i++){
  const match=diagnostics.match(/WebDriver BiDi listening on ws:\/\/127\.0\.0\.1:(\d+)/);
  if(match){port=Number(match[1]);break}
  await delay(100);
 }
 if(!port||stopRequested||exitInfo)fail('managed_firefox_launch_unconfirmed');
 engine=await openBidiSession('ws://127.0.0.1:'+port+'/session');
 const provider=createBidiNavigationProvider({session:engine,instancePrefix:'hosted-firefox'});
 async function attach(){
  const newPeer=await provider.attachGateway(endpoint.href);
  try{
   const verify=await createGatewaySession(assistantEndpoint.href,{timeoutMs:3000});
   try{
    const entry=(await verify.call('browser.instances')).browsers?.find(b=>b.browser_instance_id===provider.browserId);
    if(!entry?.registered||entry.provider?.engine!=='firefox'||entry.provider.transport!=='bidi'||
      JSON.stringify(entry.provider.methods)!==JSON.stringify(provider.metadata.methods))
     fail('managed_provider_registration_unconfirmed');
   }finally{verify.close()}
   return newPeer;
  }catch(e){await newPeer.close();throw e}
 }
 peer=await attach();
 console.log(JSON.stringify({status:'registered',browser_instance_id:provider.browserId,provider:provider.metadata,firefox_pid:browser.pid}));
 const browserExit=childDone.then(()=> 'browser_exit'),ownerStop=stopped.then(()=> 'owner_stop');
 let reason;
 for(;;){
  const disconnected=new Promise(r=>peer.onClose(()=>r('provider_disconnected')));
  reason=await Promise.race([browserExit,ownerStop,disconnected]);
  if(reason!=='provider_disconnected'||exitInfo||stopRequested)break;
  console.log(JSON.stringify({status:'provider_disconnected',browser_preserved:true,automatic_replay:false}));
  // A gateway failure does not terminate the browser. Opt-in supervised
  // reconnection uses the same live engine, never replays any old request,
  // and stops after a bounded retry window. A lost engine is not adopted.
  let recovered=false;
  if(reconnect&&!engine.closed){
   for(const backoff of [1000,2000,4000,8000,15000,30000]){
    const wait=await Promise.race([delay(backoff,undefined,{ref:false}).then(()=> 'retry'),ownerStop,browserExit]);
    if(wait!=='retry'||stopRequested||exitInfo||engine.closed)break;
    try{
     peer=await attach();
     if(stopRequested||exitInfo){await peer.close();break}
     recovered=true;
     console.log(JSON.stringify({status:'provider_reconnected',browser_instance_id:provider.browserId,
      firefox_pid:browser.pid,automatic_replay:false}));
     break;
    }catch{/* A subsequent attempt must independently prove registration. */}
   }
  }
  if(recovered)continue;
  console.log(JSON.stringify({status:'provider_recovery_suspended',browser_preserved:true,engine_closed:engine.closed}));
  reason=await Promise.race([browserExit,ownerStop]);
  if(reason!=='owner_stop')process.exitCode=1;
  break;
 }
 if(reason==='browser_exit'&&!stopRequested)process.exitCode=exitInfo?.code===0?0:1;
}catch(e){
 console.error(JSON.stringify({status:'managed_firefox_failed',reason:/^[a-z0-9_]+$/.test(e.message)?e.message:(e.code||'operation_failed')}));
 process.exitCode=1;
}finally{
 await peer?.close();
 await cleanupBrowser();engine?.close();
 // Do not remove an uncertain ownership lock or Firefox's own profile locks.
 if(lock&&(!browser||exitInfo))await rmdir(lock).catch(()=>{process.exitCode=1});
}
