#!/usr/bin/env node
/** Read-only route discovery; never mints a grant or attempts privileged run. */
import {readFileSync} from 'node:fs';
import net from 'node:net';
import {decideFractaExecutionRoute} from '../lib/fracta-execution-route.js';
const status=readFileSync('/proc/self/status','utf8');
const no_new_privs=/^NoNewPrivs:\s*1$/m.test(status);
const normal={reachable:true,identity:process.getuid?.(),no_new_privs};
let broker={reachable:false};
try{
 const response=await new Promise((resolve,reject)=>{
  const sock=net.createConnection('/run/cogentia-super/broker.sock');let data='';
  sock.setTimeout(1500,()=>sock.destroy(Error('broker_timeout')));
  sock.on('connect',()=>sock.write('{"op":"status"}\n'));
  sock.on('data',chunk=>data+=chunk);
  sock.on('end',()=>resolve(JSON.parse(data.trim())));
  sock.on('error',reject);
 });
 broker={reachable:response?.error==='unsupported_operation',safe_probe_result:response?.error||'unknown'};
}catch(e){broker={reachable:false,reason:e.code||'broker_unreachable'}}
const route=decideFractaExecutionRoute({requires_root:true,normal,super_broker:broker});
console.log(JSON.stringify({normal,super_broker:broker,authority:{issuer_verified:false,payload_bound:false,budget_reserved:false},decision:route}));
