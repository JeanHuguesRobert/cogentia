#!/usr/bin/env node
/** Minimal local ChatGPT provider. Authentication/permission lives upstream
 * in the pre-existing governed browser transport, not in this provider.
 */
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createChatgptLocalStore} from '../lib/chatgpt-openai-local-store.mjs';
import {createChatgptOpenAiBridge} from '../lib/chatgpt-openai-cps-bridge.mjs';
import {createChatgptOpenAiCpsHttpServer} from '../lib/chatgpt-openai-cps-http.mjs';
import {createGovernedJohnBrowserAction} from '../lib/chatgpt-cps-john-dispatch.js';
import {createChatgptBrowserTurnRunner} from '../lib/chatgpt-openai-browser-runner.mjs';

const key=process.env.COGENTIA_BROWSER_CHAT_PROVIDER_KEY||
  process.env.COGENTIA_API_KEY||'';
const token=process.env.COGENTIA_MCP_JHN_TOKEN||'';
if(key.length<16||!token)throw Error('existing_local_provider_auth_and_browser_transport_required');
const port=Number(process.env.COGENTIA_BROWSER_CHAT_PORT||8898);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_provider_port');
const statePath=process.env.COGENTIA_BROWSER_CHAT_STATE_DB||
  join(homedir(),'.local','state','cogentia','chatgpt-browser-provider.sqlite');
const store=createChatgptLocalStore(statePath);
const invoke=createGovernedJohnBrowserAction({token});
const runTurn=createChatgptBrowserTurnRunner({invoke});
const complete=createChatgptOpenAiBridge({store,runTurn});
const server=createChatgptOpenAiCpsHttpServer({complete,key,localStatus:id=>store.get(id)});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({
  status:'listening',service:'chatgpt-browser-openai-provider',host:'127.0.0.1',
  port,state:'local',transport:'existing_governed_browser_turn',
})));
function close(){server.close(()=>{store.close();process.exit(0)});}
process.on('SIGINT',close);process.on('SIGTERM',close);
