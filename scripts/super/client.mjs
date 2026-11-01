#!/usr/bin/env node
// Administrative diagnostic client. Never put mandate secrets in a command line
// or expose a token to the unrestricted normal Unix shell.
import fs from 'node:fs';
import net from 'node:net';
const socket=process.env.COGENTIA_SUPER_SOCKET||'/run/cogentia-super/broker.sock';
const [op,credentialPath,scriptPath]=process.argv.slice(2);
if(!['check','run'].includes(op)||!credentialPath||op==='run'&&!scriptPath){
  console.error('usage: client.mjs check|run PRIVATE_CREDENTIAL_JSON [SCRIPT_FILE]');
  process.exit(2);
}
const credentials=JSON.parse(fs.readFileSync(credentialPath,'utf8'));
const req={op,...credentials,...(op==='run'?{execution_mode:'super',script:fs.readFileSync(scriptPath,'utf8')}:{}),timeout_ms:120000};
const conn=net.createConnection(socket);
let response='';
conn.on('connect',()=>conn.write(JSON.stringify(req)+'\n'));
conn.on('data',c=>response+=c);
conn.on('end',()=>{try{const r=JSON.parse(response);console.log(JSON.stringify(r,null,2));process.exitCode=r.ok?0:1;}catch{console.error('invalid_broker_response');process.exitCode=1;}});
conn.on('error',e=>{console.error(e.message);process.exitCode=1;});
