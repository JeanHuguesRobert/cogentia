#!/usr/bin/env node
/** Loopback-only Magistral upstream. Canonical ONA worker delivers the request. */
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {prepareAssignedChatgptCpsContinuation} from '../lib/chatgpt-cps-assignment.js';
import {createChatgptOpenAiBridge,inspectCanonicalChatgptResult} from '../lib/chatgpt-openai-cps-bridge.mjs';
import {createChatgptOpenAiCpsHttpServer} from '../lib/chatgpt-openai-cps-http.mjs';

const key=process.env.COGENTIA_BROWSER_CHAT_PROVIDER_KEY||process.env.COGENTIA_API_KEY||'';
if(key.length<16)throw Error('COGENTIA_BROWSER_CHAT_PROVIDER_KEY or COGENTIA_API_KEY required');
const port=Number(process.env.COGENTIA_BROWSER_CHAT_PORT||8898);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_provider_port');
const db=process.env.COGENTIA_COP_STORE||'/var/lib/cogentia/cop/john-root-v1.sqlite';
const store=createSqliteCopEventStore(db);
const complete=createChatgptOpenAiBridge({
  providerKey:key,
  assign:args=>prepareAssignedChatgptCpsContinuation({store,...args}),
  inspect:continuation_id=>inspectCanonicalChatgptResult(store,continuation_id),
});
const server=createChatgptOpenAiCpsHttpServer({complete,key});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({
  status:'listening',service:'chatgpt-browser-cps-provider',host:'127.0.0.1',port,
  delivery:'external_canonical_ona_worker',
})));
function close(){server.close(()=>{store.close();process.exit(0)});}
process.on('SIGINT',close);process.on('SIGTERM',close);
