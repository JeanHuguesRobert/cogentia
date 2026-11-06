#!/usr/bin/env node
/** Real browser parity test under signed form mandate, local fixture transport. */
import {createHostedBrowserCapabilities} from './lib/hosted-browser-capabilities.js';
import {resolveCallerAuth} from './lib/cogentia-mcp-auth.js';
import {createSqliteCopEventStore} from '../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {executeJohnCanonicalForm} from './lib/john-cop-form-execution.js';
import {runJohnRequest} from './lib/john-run.js';
const cap='browser.form.fill',text='COGENTIA_FBF_CLIENT_SCRIPT_TEXT_01';
const tabId=Number(process.argv[2]),requestId=process.argv[3];
if(!Number.isSafeInteger(tabId)||tabId<1||!/^[-a-zA-Z0-9_:.]{1,120}$/.test(String(requestId||'')))
 throw Error('Usage: node scripts/check-fbf-client-script-browser.js <test_tab_id> <NEW_request_id>');
const request={version:'john.request.v1',request_id:requestId,principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'v1'},budget:{id:'budget:mandate:jhn:form-assist'},execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,max_elapsed_ms:12000,max_external_effects:0,max_internal_effects:1},exposure:'bounded',capability:cap,input:{prompt:'Insert fictitious text only, never submit',arguments:{tab_id:tabId,field_index:0,expected_url:'https://httpbin.org/forms/post',text}},handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:[cap]}};
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_TOKEN:'fbf-local-test-token',COGENTIA_MCP_JHN_MUTATE:'1'},{headers:{authorization:'Bearer fbf-local-test-token','x-cogentia-actor':'agent:jhn','x-cogentia-mandate':'mandate:chatgpt-corpus-coding'}});
const store=createSqliteCopEventStore('/var/lib/cogentia/cop/john-root-v1.sqlite');
try{
 const selected=createHostedBrowserCapabilities({formFillBackend:'client-script'}).filter(c=>c.name===cap);
 const result=await executeJohnCanonicalForm({store,auth,authorizedKeysPath:'/home/ubuntu/.ssh/authorized_keys',request,
  run:()=>runJohnRequest(request,{capabilities:selected,allowedCapabilities:[cap],maxInternalEffects:1,approvedBoundedOnceCapability:cap,requiredEvents:false})});
 const e=result.events||[];const receipt=e.find(x=>x.type==='john.tool.receipt');
 console.log(JSON.stringify({ok:result.ok,error:result.error||null,executed:result.executed,
  settled_steps:result.settled_steps,receipt:receipt?.data?.status||null,
  completed:e.some(x=>x.type==='john.run.completed'),input_length:text.length}));
 if(!result.ok)process.exitCode=1;
}finally{store.close()}
