#!/usr/bin/env node
// COP is the sole authority; this broker consumes canonical effect grants.
import fs from 'node:fs';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {hostname} from 'node:os';
import {fileURLToPath} from 'node:url';
const socket=process.env.COGENTIA_SUPER_SOCKET||'/run/cogentia-super/broker.sock';
const store=process.env.COGENTIA_SEA_STORE_PATH||'/var/lib/cogentia-super/authorizations.json';
const audit=process.env.COGENTIA_SUPER_AUDIT||'/var/lib/cogentia-super/audit.jsonl';
const localNode=process.env.COGENTIA_SUPER_NODE_ID||'node:fracta2';
const sha=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const stable=v=>v==null?'null':typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?
  '['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
const fail=error=>({ok:false,error});
const log=v=>fs.appendFileSync(audit,JSON.stringify({...v,at:new Date().toISOString()})+'\n',{mode:0o600});
export function executionArguments(script,euid=process.getuid?.()){
  return euid===0?['sudo',['-n','-u','ubuntu','--','/bin/sh','-c',script]]:['/bin/sh',['-c',script]];
}
export function effectHash(r){
  return sha(stable({capability:'host.process.run',target:r.target,command:r.script,
    args:[],timeout_ms:r.timeout_ms??null,execution_mode:'super',provider:r.provider}));
}
/** Never trust a root execution grant writable by the unprivileged script actor.
 * The root-owned state directory is an issuer boundary, not a second mandate.
 * Permission checks are deliberately performed before every reservation.
 */
export function trustedSuperStore(pathname, trustedUid=0){
  try{
    const file=fs.lstatSync(pathname),parent=fs.lstatSync(pathname.slice(0,pathname.lastIndexOf('/')));
    return file.isFile()&&!file.isSymbolicLink()&&file.uid===trustedUid&&(file.mode&0o077)===0
      &&parent.isDirectory()&&!parent.isSymbolicLink()&&parent.uid===trustedUid&&(parent.mode&0o022)===0;
  }catch{return false;}
}
export function reserveCopAuthorization(r){
  if(process.getuid?.()===0 && !trustedSuperStore(store))return null;
  const data=JSON.parse(fs.readFileSync(store,'utf8'));
  const g=data?.grants?.[r.authorization_id];
  if(!g||g.action_class!=='host.process.run'||g.status!=='granted'||g.single_use!==true
    ||g.consumed_at||!g.expires_at||Date.parse(g.expires_at)<=Date.now()
    ||g.actor!==r.actor||g.principal!==r.principal||g.mandate_ref!==r.mandate
    ||!(r.target===localNode || (localNode==='node:fracta2' && r.target==='resource://fracta2'))
    ||g.target?.node!==r.target||g.payload_hash!==effectHash(r)
    ||!['principal','verified_mission'].includes(g.authority_origin))return null;
  g.consumed_at=new Date().toISOString();
  const stat=fs.statSync(store),tmp=store+'.'+process.pid+'.'+randomUUID()+'.tmp';
  try{
    fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});
    if(process.getuid?.()===0)fs.chownSync(tmp,stat.uid,stat.gid);
    fs.renameSync(tmp,store);
  }finally{try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')throw e;}}
  log({event:'cop_reserve',authorization_id:g.authorization_id,payload_hash:g.payload_hash});
  return {authorization_id:g.authorization_id,mandate:g.mandate_ref,payload_hash:g.payload_hash};
}
function execute(script,timeout){
  return new Promise(resolve=>{
    const [bin,args]=executionArguments(script);
    let timedOut=false,timer,child;
    child=execFile('setsid',[bin,...args],{timeout:0,maxBuffer:262144,encoding:'utf8'},(e,stdout,stderr)=>{
      clearTimeout(timer);
      if(e?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER')kill();
      resolve({ok:!e&&!timedOut,exit_code:typeof e?.code==='number'?e.code:e?null:0,
        timeout:timedOut,output_truncated:e?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
        stdout,stderr,error:e?.message||null});
    });
    const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}};
    timer=setTimeout(()=>{timedOut=true;kill();},timeout);
  });
}
export async function handle(r){
  if(r?.op!=='run')return fail('unsupported_operation');
  if(r.execution_mode!=='super')return fail('explicit_super_required');
  if(typeof r.script!=='string'||!r.script.trim()||Buffer.byteLength(r.script)>32768)return fail('invalid_script');
  if(!Number.isInteger(r.timeout_ms??120000)||(r.timeout_ms??120000)<1||(r.timeout_ms??120000)>120000)return fail('invalid_timeout');
  if(!r.authorization_id||!r.actor||!r.principal||!r.mandate||!r.target||!r.provider)return fail('cop_context_required');
  let permit;
  try{permit=reserveCopAuthorization(r);}catch(e){log({event:'cop_error',reason:e.code||'store_error'});return fail('cop_store_unavailable');}
  if(!permit){log({event:'cop_denied',authorization_id:r.authorization_id});return fail('cop_authorization_denied');}
  const result=await execute(r.script,r.timeout_ms??120000);
  log({event:'effect_result',authorization_id:permit.authorization_id,
    payload_hash:permit.payload_hash,ok:result.ok,exit_code:result.exit_code,timeout:result.timeout});
  return {...result,authority_id:permit.authorization_id,mandate:permit.mandate,
    payload_hash:permit.payload_hash,node:hostname(),cop_reserved:true};
}
async function serve(){
  if(process.getuid?.()!==0)throw Error('broker requires root');
  fs.mkdirSync(socket.slice(0,socket.lastIndexOf('/')),{recursive:true});
  try{fs.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
  const server=net.createServer(conn=>{
    let body='',answered=false;
    conn.setTimeout(150000,()=>conn.destroy());
    conn.on('data',async chunk=>{
      if(answered)return;
      body+=chunk.toString('utf8');
      if(body.length>65536){answered=true;conn.end(JSON.stringify(fail('request_too_large'))+'\n');return;}
      const index=body.indexOf('\n');
      if(index<0)return;answered=true;
      let response;
      try{response=await handle(JSON.parse(body.slice(0,index)));}
      catch(e){response=fail('broker_error');log({event:'error',reason:e.code||'unexpected'});}
      conn.end(JSON.stringify(response)+'\n');
    });
    conn.on('error',()=>{});
  });
  server.listen(socket,()=>{
    fs.chownSync(socket,0,process.getgid());
    fs.chmodSync(socket,0o660);
    process.stdout.write('broker listening '+socket+'\n');
  });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
  if(process.argv[2]==='serve')await serve();
  else{console.error('usage: broker.mjs serve (COP is sole authority)');process.exitCode=2;}
}
