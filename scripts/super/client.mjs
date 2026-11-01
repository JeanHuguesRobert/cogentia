#!/usr/bin/env node
// COP grant ID is a reference, not a broker password or parallel credential.
import fs from 'node:fs';
import net from 'node:net';
const socket=process.env.COGENTIA_SUPER_SOCKET||'/run/cogentia-super/broker.sock';
const [authorization_id,scriptPath,actor,principal,mandate,target='node:fracta2',provider='unix-process']=process.argv.slice(2);
if(!authorization_id||!scriptPath||!actor||!principal||!mandate){
  console.error('usage: client.mjs COP_AUTH_ID SCRIPT_FILE ACTOR PRINCIPAL MANDATE [TARGET PROVIDER]');
  process.exit(2);
}
const request={op:'run',execution_mode:'super',authorization_id,actor,principal,mandate,target,provider,
  script:fs.readFileSync(scriptPath,'utf8')};
const connection=net.createConnection(socket);
let response='';
connection.on('connect',()=>connection.write(JSON.stringify(request)+'\n'));
connection.on('data',part=>response+=part);
connection.on('end',()=>{
  try{const result=JSON.parse(response);console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;}
  catch{console.error('invalid_broker_response');process.exitCode=1;}
});
connection.on('error',e=>{console.error(e.message);process.exitCode=1;});
