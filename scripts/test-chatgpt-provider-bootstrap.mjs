import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

async function unusedPort(){
  const socket=createServer();
  await new Promise(r=>socket.listen(0,'127.0.0.1',r));
  const port=socket.address().port;
  await new Promise(r=>socket.close(r));
  return port;
}
const fixture=`
let submitted=false;
export async function createBrowserAction({adapter}){
  if(adapter!=='chatgpt-browser')throw Error('wrong_adapter');
  return async(action)=>{
    if(action==='ensure_tab')return {ok:true,observation:{tab_id:42}};
    if(action==='status')return {ok:true,observation:{
      stable_composer:true,composer_blank:true,generating:false}};
    if(action==='submit'){
      submitted=true;
      return {ok:true,observation:{submitted:true,
        delivery_state:'ui_click_dispatched_not_model_result'}};
    }
    if(action==='observe')return {ok:true,observation:submitted
      ?{assistant_count:2,last_answer:'No Cogentia required',generating:false,stable_composer:true}
      :{assistant_count:1,last_answer:'Previous answer'}};
    throw Error('unsupported_action');
  };
}
`;

test('standalone provider boots with injected browser action, no John token or MCP',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'standalone-browser-'));
  const module=join(dir,'fake-browser.mjs');
  writeFileSync(module,fixture);
  const port=await unusedPort();
  const child=spawn(process.execPath,[join(import.meta.dirname,'ops','serve-chatgpt-openai-provider.mjs')],{
    env:{...process.env,CHATGPT_BROWSER_ACTION_MODULE:module,
      COGENTIA_MCP_JHN_TOKEN:'',COGENTIA_API_KEY:'',
      COGENTIA_BROWSER_CHAT_PROVIDER_KEY:'fake-provider-api-key-minimum-16',
      COGENTIA_BROWSER_CHAT_STATE_DB:join(dir,'state.sqlite'),
      COGENTIA_BROWSER_CHAT_PORT:String(port)},
    stdio:['ignore','pipe','pipe']});
  let stderr='';
  child.stderr.on('data',data=>{stderr+=data.toString()});
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('provider_boot_timeout: '+stderr)),6500);
      child.stdout.on('data',data=>{
        if(data.toString().includes('"status":"listening"')){
          clearTimeout(timer);resolve();
        }
      });
      child.once('exit',code=>{clearTimeout(timer);reject(Error('provider_exited_'+code+': '+stderr))});
    });
    const headers={'Authorization':'Bearer fake-provider-api-key-minimum-16',
      'Content-Type':'application/json','X-Client-Request-Id':'noncop-bootstrap'};
    const response=await fetch('http://127.0.0.1:'+port+'/v1/chat/completions',{
      method:'POST',headers,signal:AbortSignal.timeout(10000),
      body:JSON.stringify({model:'chatgpt-browser',
        messages:[{role:'user',content:'hello'}]})});
    assert.equal(response.status,200);
    assert.equal((await response.json()).choices[0].message.content,'No Cogentia required');
  }finally{
    child.kill('SIGTERM');
    await Promise.race([once(child,'exit').catch(()=>{}),
      new Promise(resolve=>setTimeout(resolve,1500))]);
    if(child.exitCode===null)child.kill('SIGKILL');
    rmSync(dir,{recursive:true,force:true});
  }
});
