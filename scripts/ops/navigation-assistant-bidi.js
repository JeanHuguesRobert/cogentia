#!/usr/bin/env node
/** Explicit foreground Firefox provider. No browser launch or profile selection.
 * Connect only to an operator-supplied BiDi endpoint and gateway.
 */
import {openBidiSession} from '../lib/navigation-assistant/bidi-session.js';
import {createBidiNavigationProvider} from '../lib/navigation-assistant/bidi-provider.js';
const args=process.argv.slice(2);
const usage='Usage: node scripts/ops/navigation-assistant-bidi.js --bidi-endpoint ws://127.0.0.1:PORT/session --gateway ws://HOST:PORT/extension [--instance-prefix firefox]';
if(args.includes('--help')){console.log(usage);process.exit(0)}
const values={};
for(let i=0;i<args.length;i+=2){
 const flag=args[i],value=args[i+1];
 if(!['--bidi-endpoint','--gateway','--instance-prefix'].includes(flag)||!value||Object.hasOwn(values,flag)){
  console.error(usage);process.exit(2);
 }
 values[flag]=value;
}
if(!values['--bidi-endpoint']||!values['--gateway']){console.error(usage);process.exit(2)}
let session,peer,stopping=false;
try{
 session=await openBidiSession(values['--bidi-endpoint']);
 const provider=createBidiNavigationProvider({session,instancePrefix:values['--instance-prefix']||'firefox'});
 peer=await provider.attachGateway(values['--gateway']);
 console.log(JSON.stringify({status:'registered',browser_instance_id:provider.browserId,provider:provider.metadata}));
 await new Promise(resolve=>{
  const stop=()=>{stopping=true;resolve()};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  peer.onClose(resolve);
 });
 if(!stopping){console.error(JSON.stringify({status:'disconnected',automatic_replay:false}));process.exitCode=1}
}catch{
 console.error(JSON.stringify({status:'provider_start_failed',automatic_replay:false}));process.exitCode=1;
}finally{await peer?.close();session?.close()}
