#!/usr/bin/env node
/** Non-authoritative transport for the root broker. No key, sudo or grant mint. */
import fs from 'node:fs';
import net from 'node:net';
const SOCKET='/run/cogentia-super/broker.sock';
export function buildIssuerRequest(argv){
 const [op,a,b]=argv;
 if(op==='enroll'||op==='issue'){
  if(!a||!b)return null;
  return {op,proposal:JSON.parse(fs.readFileSync(a,'utf8')),
   signature:fs.readFileSync(b,'utf8')};
 }
 if(op==='restart_mcp'){if(argv.length!==1)return null;return {op:'restart_mcp'};}
 if(op==='reconcile'){
  if(!a||b)return null;return {op,authorization_id:a};
 }
 if(op==='prepare'){
  if(!a||!b)return null;
  return {op,command:a,recovery_ref:b};
 }
 if(op==='run'){
  if(!a||!b)return null;
  const proposal=JSON.parse(fs.readFileSync(b,'utf8'));
  const effect=proposal.effect;
  if(!effect||proposal.kind!=='cogentia.super-effect-proposal/v1')return null;
  return {op,authorization_id:a,execution_mode:'super',script:effect.command,
    actor:proposal.actor_ref,principal:proposal.principal_ref,mandate:proposal.mandate_ref,
    target:effect.target,provider:effect.provider,timeout_ms:effect.timeout_ms};
 }
 return null;
}
export function sendIssuerRequest(request,{socket=SOCKET,timeout_ms=25000}={}){
 if(!request||JSON.stringify(request).length>60000)return Promise.resolve({ok:false,error:'invalid_request'});
 return new Promise(resolve=>{
  const conn=net.createConnection(socket);let body='',done=false;
  const finish=r=>{if(done)return;done=true;conn.destroy();resolve(r);};
  conn.setTimeout(timeout_ms,()=>finish({ok:false,error:'issuer_transport_timeout'}));
  conn.on('connect',()=>conn.write(JSON.stringify(request)+'\n'));
  conn.on('data',part=>{body+=part.toString();if(body.length>600000)return finish({ok:false,error:'issuer_response_too_large'});
   const n=body.indexOf('\n');if(n>=0){try{finish(JSON.parse(body.slice(0,n)));}catch{finish({ok:false,error:'invalid_broker_response'});}}
  });
  conn.on('end',()=>finish({ok:false,error:'issuer_connection_closed'}));
  conn.on('error',e=>finish({ok:false,error:e.code||'issuer_transport_error'}));
 });
}
if(process.argv[1]&&import.meta.url==='file://'+process.argv[1]){
 try{
  const request=buildIssuerRequest(process.argv.slice(2));
  if(!request){process.stderr.write('usage: client enroll PROPOSAL SIG | prepare COMMAND RECOVERY_REF | issue PROPOSAL SIG | run AUTH_ID SIGNED_PROPOSAL\n');process.exitCode=2;}
  else{const answer=await sendIssuerRequest(request);process.stdout.write(JSON.stringify(answer)+'\n');if(!answer.ok)process.exitCode=1;}
 }catch{process.stderr.write('issuer_request_invalid\n');process.exitCode=2;}
}
