#!/usr/bin/env node
// Local smoke: mint one COP EXPOSE grant, run through live broker, prove replay denial.
import net from 'node:net';
process.env.COGENTIA_SEA_STORE_PATH ||= '/var/lib/cogentia/side-effect-authorization.json';
const {prepareHostProcessRun}=await import('../lib/host-process-prepare.js');
const {mintSideEffectGrantFromPrepared}=await import('../lib/side-effect-authorization.js');
const script='id -u; sudo -n id -u';
const actor='agent:cop-super-smoke',principal='principal:operator-smoke',mandate='mandate:cop-super-smoke';
const target='node:fracta2',provider='unix-process';
const prepared=prepareHostProcessRun({command:script,target,provider,execution_mode:'super'});
const grant=mintSideEffectGrantFromPrepared(prepared,{
  actor,principal,mandate_ref:mandate,confirm:prepared.payload_hash
});
const socket='/run/cogentia-super/broker.sock';
function run(){
  return new Promise((resolve,reject)=>{
    const conn=net.createConnection(socket);let buffer='';
    conn.setTimeout(10000,()=>conn.destroy(new Error('broker_timeout')));
    conn.on('connect',()=>conn.write(JSON.stringify({op:'run',execution_mode:'super',
      authorization_id:grant.authorization_id,script,actor,principal,mandate,target,provider})+'\n'));
    conn.on('data',chunk=>{buffer+=chunk;});
    conn.on('end',()=>{try{resolve(JSON.parse(buffer));}catch(e){reject(e);}});
    conn.on('error',reject);
  });
}
const first=await run(),second=await run();
console.log(JSON.stringify({first:{ok:first.ok,stdout:first.stdout,authority_id:first.authority_id},
  replay:{ok:second.ok,error:second.error}},null,2));
if(!first.ok||first.stdout!=='1001\n0\n'||second.error!=='cop_authorization_denied')process.exitCode=1;
