#!/usr/bin/env node
// Separate privileged executor. Install a ROOT-OWNED copy; never execute the
// repository checkout as root. The authorization store is root-owned.
import fs from 'node:fs';
import net from 'node:net';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {hostname} from 'node:os';
import {fileURLToPath} from 'node:url';
const state=process.env.COGENTIA_SUPER_STATE || '/var/lib/cogentia-super';
const socket=process.env.COGENTIA_SUPER_SOCKET || '/run/cogentia-super/broker.sock';
const db=state+'/mandates.json';
const audit=state+'/audit.jsonl';
const fail=(error)=>({ok:false,error});
const hash=(s)=>crypto.createHash('sha256').update(s).digest('hex');
function ensureState(){fs.mkdirSync(state,{recursive:true,mode:0o700});fs.chmodSync(state,0o700);}
function read(){ensureState();try{return JSON.parse(fs.readFileSync(db,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
function save(value){const tmp=db+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value),{mode:0o600,flag:'wx'});fs.renameSync(tmp,db);}
function log(v){fs.appendFileSync(audit,JSON.stringify({...v,at:new Date().toISOString()})+'\n',{mode:0o600});}
function issue({actor,mandate,ttl=15,uses=5}={}){
  if(!actor||!mandate||!Number.isInteger(ttl)||ttl<1||ttl>1440||!Number.isInteger(uses)||uses<1||uses>1000)throw Error('invalid grant');
  const id=crypto.randomUUID(),secret=crypto.randomBytes(32).toString('hex');
  const all=read();all[id]={actor,mandate,token_hash:hash(secret),expires:Date.now()+ttl*60000,remaining:uses,revoked:false};save(all);
  log({event:'grant',id,actor,mandate,ttl,uses});
  return {id,secret,actor,mandate,expires:new Date(all[id].expires).toISOString(),remaining:uses};
}
function verify(r,consume=false){
  const all=read(),g=all[r.id];
  if(!g||g.revoked||g.expires<=Date.now()||g.remaining<=0)return null;
  if(typeof r.secret!=='string'||!/^[a-f0-9]{64}$/.test(r.secret))return null;
  const a=Buffer.from(hash(r.secret),'hex'),b=Buffer.from(g.token_hash,'hex');
  if(!crypto.timingSafeEqual(a,b)||r.actor!==g.actor||r.mandate!==g.mandate)return null;
  if(consume){g.remaining--;save(all);log({event:'reserve',id:r.id,actor:g.actor,mandate:g.mandate,remaining:g.remaining,script_hash:hash(r.script)});}
  return {id:r.id,actor:g.actor,mandate:g.mandate,remaining:g.remaining};
}
// The broker itself is root to hold the mandate store. A governed script
// starts as ubuntu; privilege escalation inside that script is *explicit*
// through sudo, mirroring a regular administrator SSH session.
export function executionArguments(script, euid=process.getuid?.()) {
  return euid === 0
    ? ['sudo', ['-n', '-u', 'ubuntu', '--', '/bin/sh', '-c', script]]
    : ['/bin/sh', ['-c', script]]; // unprivileged unit-test only
}
function execute(script,timeout=120000){
  return new Promise(resolve=>{
    let timedOut=false,child,timer;
    const [binary, launchArgs]=executionArguments(script);
    child=execFile('setsid',[binary,...launchArgs],{timeout:0,maxBuffer:262144,encoding:'utf8'},(e,stdout,stderr)=>{
      clearTimeout(timer);
      if(e?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER'){try{process.kill(-child.pid,'SIGKILL');}catch{}}
      resolve({ok:!e&&!timedOut,exit_code:typeof e?.code==='number'?e.code:e?null:0,timeout:timedOut,
        output_truncated:e?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER',stdout,stderr,error:e?.message||null});
    });
    const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}};
    timer=setTimeout(()=>{timedOut=true;kill();},timeout);
  });
}
async function handle(r){
  if(r.op==='check'){const g=verify(r);return g?{ok:true,authority:g}:fail('mandate_denied');}
  if(r.op!=='run')return fail('unsupported_operation');
  if(r.execution_mode!=='super')return fail('explicit_super_required');
  if(typeof r.script!=='string'||!r.script.trim()||Buffer.byteLength(r.script)>32768)return fail('invalid_script');
  if(!Number.isInteger(r.timeout_ms??120000)||(r.timeout_ms??120000)<1||(r.timeout_ms??120000)>120000)return fail('invalid_timeout');
  const g=verify(r,true);if(!g){log({event:'deny',id:r.id||null});return fail('mandate_denied');}
  const result=await execute(r.script,r.timeout_ms??120000);
  log({event:'result',id:r.id,script_hash:hash(r.script),ok:result.ok,exit_code:result.exit_code,timeout:result.timeout});
  return {...result,authority_id:g.id,mandate:g.mandate,node:hostname()};
}
async function serve(){
  if(process.getuid?.()!==0)throw Error('broker requires root');
  ensureState();
  fs.mkdirSync(socket.slice(0,socket.lastIndexOf('/')),{recursive:true});
  try{fs.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
  const server=net.createServer(conn=>{
    let data='',answered=false;
    conn.setTimeout(150000,()=>conn.destroy());
    conn.on('data',async chunk=>{
      if(answered)return;data+=chunk.toString('utf8');
      if(data.length>65536){answered=true;conn.end(JSON.stringify(fail('request_too_large'))+'\n');return;}
      const i=data.indexOf('\n');if(i<0)return;answered=true;
      let result;
      try{result=await handle(JSON.parse(data.slice(0,i)));}catch(e){result=fail('broker_internal_error');log({event:'error',message:String(e.message).slice(0,120)});}
      conn.end(JSON.stringify(result)+'\n');
    });
    conn.on('error',()=>{});
  });
  server.listen(socket,()=>{
    // Installer owns the directory/socket group; avoid world access.
    // Socket permissions are an OS boundary; no arbitrary client on the host.
    fs.chownSync(socket,0,process.getgid());
    fs.chmodSync(socket,0o660);
    process.stdout.write('broker listening '+socket+'\n');
  });
}
export {issue,verify,handle,read,save,hash};
if(process.argv[1] && fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
const [action,...args]=process.argv.slice(2);
if(action==='serve')await serve();
else if(action==='grant'){
  if(process.getuid?.()!==0)throw Error('root required');
  console.log(JSON.stringify(issue({actor:args[0],mandate:args[1],ttl:Number(args[2]||15),uses:Number(args[3]||5)})));
}else if(action==='revoke'){
  if(process.getuid?.()!==0)throw Error('root required');
  const all=read();if(!all[args[0]])throw Error('unknown mandate');
  all[args[0]].revoked=true;save(all);log({event:'revoke',id:args[0]});console.log('revoked '+args[0]);
}else if(action==='list'){
  const all=read();console.log(JSON.stringify(Object.entries(all).map(([id,g])=>({id,actor:g.actor,mandate:g.mandate,expires:new Date(g.expires).toISOString(),remaining:g.remaining,revoked:g.revoked})),null,2));
}else{console.error('usage: broker.mjs serve | grant ACTOR MANDATE TTL_MIN USES | revoke ID | list');process.exitCode=2;}

}
