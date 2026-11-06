#!/usr/bin/env node
/** One bounded real browser-inventory check through opt-in MCP route. */
import {createMcpCore} from './lib/cogentia-mcp-core.js';
const token='fixture-one-shot',capability='browser.navigation.instances';
const core=createMcpCore({COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:token,
 COGENTIA_DAEMON_URL:'http://127.0.0.1:8790',COGENTIA_JHN_HOSTED_BROWSER_ENABLED:'1',
 COGENTIA_JHN_CANONICAL_READ_ENABLED:'1',
 COGENTIA_JHN_CANONICAL_STORE_PATH:'/var/lib/cogentia/cop/john-root-v1.sqlite',
 COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS:'/home/ubuntu/.ssh/authorized_keys'});
const request_id='john-root-mcp-fixture-20261106';
const request={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'cogentia_john_run',
 _meta:{'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'},
 arguments:{request_id,prompt:'List browser instances only',capability,exposure:'read_only',max_steps:4,max_tool_calls:1,max_elapsed_ms:10000}}};
const result=await core.handleJsonRpc(request,{headers:{authorization:'Bearer '+token}});
const data=result?.result?.structuredContent?.data;
const e=data?.events||[];
const summary={ok:data?.ok===true,status:data?.status,code:data?.failure?.code||null,
 canonical_accounting:data?.canonical_accounting||null,
 receipt:e.some(x=>x.type==='john.tool.receipt'),completed:e.some(x=>x.type==='john.run.completed'),
 canonical_read_only:true};
console.log(JSON.stringify(summary));
if(!summary.ok||!summary.receipt||!summary.completed||!summary.canonical_accounting)process.exitCode=1;
