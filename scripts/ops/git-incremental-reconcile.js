#!/usr/bin/env node
// Packet: Cogentia #344. Event-driven preflight and optional safe FF on start.
import {reconcileGitEvent} from '../lib/git-incremental-reconcile.js';
import path from 'node:path';
const args=process.argv.slice(2);
function option(name){const i=args.indexOf(name);return i===-1?null:args[i+1]}
try{
 const phase=option('--phase')||'commit';
 const repo=path.resolve(option('--repo')||process.cwd());
 const paths=[];
 for(let i=0;i<args.length;i++)if(args[i]==='--path')paths.push(args[++i]);
 const result=await reconcileGitEvent({repo,phase,remote:option('--remote')||'origin',
  paths:paths.length?paths:undefined,fetch:!args.includes('--no-fetch'),apply:args.includes('--apply'),
  packetRef:option('--packet')||process.env.COGENTIA_PACKET_REF||null});
 if(args.includes('--json'))console.log(JSON.stringify(result,null,2));
 else console.log(result.status+' ['+result.branch+']: '+result.action+
  ' (ahead '+(result.ahead??'?')+', behind '+(result.behind??'?')+
  ', overlap '+(result.overlap?.length||0)+')');
 // A local commit is always permissible on independent WIP; a stale push
 // cannot be declared reconciled. Never blindly stage or merge the WIP.
 if(result.status==='ARBITRATION_REQUIRED'||result.status==='AUTO_RECONCILABLE'||
    result.status==='RECONCILIATION_REQUIRED'||
    (result.status==='REMOTE_UNAVAILABLE'&&phase==='push'))
  process.exitCode=1;
}catch(e){
 console.error('git-incremental-reconcile: '+(e.code||e.message));
 process.exitCode=2;
}
