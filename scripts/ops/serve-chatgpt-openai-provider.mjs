#!/usr/bin/env node
/** ChatGPT browser OpenAI adapter using the generic continuation kernel.
 * One authenticated, local browser action transport is injected at startup.
 * The optional upstream John/COP transport is not a core dependency.
 */
import {homedir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createChatgptLocalStore} from '../lib/chatgpt-openai-local-store.mjs';
import {createChatgptOpenAiBridge} from '../lib/chatgpt-openai-bridge.mjs';
import {createChatgptOpenAiHttpServer} from '../lib/chatgpt-openai-http.mjs';
import {createChatgptBrowserTurnRunner} from '../lib/chatgpt-openai-browser-runner.mjs';

const key=process.env.COGENTIA_BROWSER_CHAT_PROVIDER_KEY||
  process.env.COGENTIA_API_KEY||'';
if(key.length<16)throw Error('local_provider_api_key_required');
const port=Number(process.env.COGENTIA_BROWSER_CHAT_PORT||8898);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_provider_port');
const statePath=process.env.COGENTIA_BROWSER_CHAT_STATE_DB||
  join(homedir(),'.local','state','cogentia','chatgpt-browser-provider.sqlite');

async function selectActionTransport(){
  const localModule=process.env.CHATGPT_BROWSER_ACTION_MODULE||'';
  if(localModule){
    if(!isAbsolute(localModule))throw Error('browser_action_module_must_be_absolute_local_file');
    const mod=await import(pathToFileURL(localModule).href);
    if(typeof mod.createBrowserAction!=='function')
      throw Error('browser_action_module_must_export_createBrowserAction');
    const invoke=await mod.createBrowserAction({adapter:'chatgpt-browser'});
    if(typeof invoke!=='function')throw Error('invalid_browser_action_transport');
    return {invoke,mode:'operator_injected_browser_action'};
  }
  const token=process.env.COGENTIA_MCP_JHN_TOKEN||'';
  if(!token)throw Error('browser_action_module_or_existing_john_token_required');
  // Optional governed adapter: injected only when this route is selected.
  const {createGovernedJohnBrowserAction}=await import('../lib/chatgpt-cps-john-dispatch.js');
  return {invoke:createGovernedJohnBrowserAction({token}),mode:'existing_john_browser_transport'};
}
const {invoke,mode}=await selectActionTransport();
const store=createChatgptLocalStore(statePath);
const runTurn=createChatgptBrowserTurnRunner({invoke});
const complete=createChatgptOpenAiBridge({store,runTurn});
const server=createChatgptOpenAiHttpServer({complete,key,localStatus:id=>store.get(id)});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({
  status:'listening',service:'chatgpt-browser-openai-provider',host:'127.0.0.1',
  port,state:'local_sqlite',transport:mode,
})));
function close(){server.close(()=>{store.close();process.exit(0)});}
process.on('SIGINT',close);process.on('SIGTERM',close);
