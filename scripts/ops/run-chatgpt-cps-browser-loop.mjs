#!/usr/bin/env node
/**
 * Three-turn bounded Reality Test through the signed John browser capability.
 * No direct CDP/browser automation, no API model substitutions, no daemon.
 * `--status` is read-only and never accesses credentials. `--run` requires
 * local JHN MCP authentication via process env (never printed).
 */
import {spawnSync} from 'node:child_process';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {evaluateMandate,resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {runChatgptCpsBrowserLoop} from '../lib/chatgpt-cps-browser-loop.js';
import {canRecoverChatgptFailedDraft} from '../lib/browser-chatgpt-turn.js';
const DB='/var/lib/cogentia/cop/john-root-v1.sqlite';
const MANDATE='mandate:jhn:john-root';
const LOCAL_MCP='http://127.0.0.1:8791/mcp';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const output=(status,data={})=>console.log(JSON.stringify({status,...data}));
const safeFailure=x=>typeof x==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(x)?x:'unspecified_failure';
const argv=process.argv.slice(2);
if(argv.length===1&&argv[0]==='--status'){
 const store=createSqliteCopEventStore(DB);
 try{
   const mandate=resolveMandate(store,MANDATE);
   const budget=createEventSourcedExecutionBudgetLedger({store,
     budget_id:'budget:'+MANDATE,require_authority_grant:true}).snapshot();
   const allowed=mandate?evaluateMandate(store,{mandate_ref:MANDATE,
     version_pin:mandate.version,expected_principal_ref:'principal:jhn',
     expected_actor_ref:'agent:jhn',capability:'browser.chatgpt.turn'}):{granted:false};
   output('inspected',{mode:'read_only',mandate_version:mandate?.version||null,
     browser_scope:allowed.granted===true,available_steps:budget.available.max_steps||0,
     mcp_token_present:!!process.env.COGENTIA_MCP_JHN_TOKEN});
 }finally{store.close()}
}else if(argv.length===4&&argv[0]==='--run'&&argv[1]==='--tab-id'&&
    /^\d+$/.test(argv[2])&&argv[3]==='--three-turns'){
 const tabId=Number(argv[2]);
 const token=process.env.COGENTIA_MCP_JHN_TOKEN;
 if(!Number.isSafeInteger(tabId)||tabId<=0||!token){
   output('blocked',{reason:'valid_tab_and_private_authenticated_jhn_mcp_token_required'});
   process.exitCode=2;
 }else{
   const store=createSqliteCopEventStore(DB);
   let nonce=0,returnedCount=0;
   const requestId=kind=>`jhn-cps-loop-${kind}-${Date.now()}-${++nonce}`;
   const johnRequest=(action,argumentsValue,request_id)=>({
     version:'john.request.v1',request_id,
     principal:{id:'principal:jhn'},
     mandate:{id:'mandate:chatgpt-corpus-coding',version:'1'},
     budget:{id:'budget:'+MANDATE},
     capability:'browser.chatgpt.turn',exposure:'bounded',
     execution_budget:{max_steps:3,max_tool_calls:1,max_subagents:0,
       max_external_effects:0,max_internal_effects:1,max_elapsed_ms:30000},
     handler:{id:'governed.step_reasoner',kind:'governed_reasoner',
       allowed_capabilities:['browser.chatgpt.turn']},
     input:{prompt:action==='submit'?argumentsValue.prompt:'Observe the stable composer; no new prompt.',
       arguments:argumentsValue},
   });
   async function john(action,args){
     const request_id=requestId(action);
     const result=await fetch(LOCAL_MCP,{method:'POST',signal:AbortSignal.timeout(35000),
       headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,
         'X-Cogentia-Actor':'agent:jhn',
         'X-Cogentia-Mandate':'mandate:chatgpt-corpus-coding'},
       body:JSON.stringify({jsonrpc:'2.0',id:request_id,method:'tools/call',
         params:{name:'cogentia_john_run',arguments:{request:johnRequest(action,args,request_id)}}})});
     if(!result.ok)throw Error('mcp_http_'+result.status);
     const rpc=await result.json();
     if(rpc.error)throw Error('mcp_rpc_error_'+(Number.isSafeInteger(rpc.error.code)?Math.abs(rpc.error.code):'unknown'));
     const projected=rpc.result?.structuredContent||
       (typeof rpc.result?.content?.[0]?.text==='string'
         ?JSON.parse(rpc.result.content[0].text):rpc.result)||{};
     if(projected.ok!==true||projected.data?.ok!==true)
       return {ok:false,failure:safeFailure(projected.data?.failure?.code||projected.error_class||'john_denied'),
         cause:safeFailure(projected.data?.failure?.cause||'unspecified_failure'),
         request_id};
     let observation;
     try{observation=JSON.parse(projected.data.text||'{}')}
     catch{return {ok:false,failure:'john_observation_unparseable',request_id}}
     return {ok:true,observation,request_id,
       canonical:projected.data.canonical_accounting||null};
   }
   const ready=async()=>{
     for(let count=0;count<5;count++){
       const r=await john('status',{action:'status',tab_id:tabId});
       if(r.ok&&r.observation.stable_composer===true&&
         r.observation.composer_blank===true&&
         r.observation.generating===false)return true;
       await sleep(1200);
     }
     return false;
   };
   const parent='packet:jhn:browser-cps-three-turn-reality';
   try{
     const result=await runChatgptCpsBrowserLoop({max_turns:3,
       next:async({step})=>{
         if(step===3||returnedCount===3)return {completed:true};
         const mandate=resolveMandate(store,MANDATE);
         const allowed=mandate?evaluateMandate(store,{mandate_ref:MANDATE,
           version_pin:mandate.version,expected_principal_ref:'principal:jhn',
           expected_actor_ref:'agent:jhn',capability:'browser.chatgpt.turn'}):{granted:false};
         const budget=createEventSourcedExecutionBudgetLedger({store,
           budget_id:'budget:'+MANDATE,require_authority_grant:true}).snapshot();
         if(allowed.granted!==true||!Number.isInteger(budget.available.max_steps)||
           budget.available.max_steps<5)return {blocked:true};
         return {ready:await ready(),allowed:true,
           parent_packet_ref:parent,action_id:'self-test-return-mcp'};
       },
       prepare:async()=>{
         // Preparation reads COP state but never uses transport credentials.
         // Do not needlessly inherit the JHN bearer into this child process.
         const {COGENTIA_MCP_JHN_TOKEN:_transportSecret,...safeEnv}=process.env;
         const child=spawnSync(process.execPath,
           [new URL('./prepare-chatgpt-browser-cps-turn.mjs',import.meta.url).pathname,
             '--prepare'],{encoding:'utf8',timeout:15000,env:safeEnv});
         if(child.status!==0)throw Error('canonical_prepare_failed');
         const v=JSON.parse(child.stdout);
         if(v.ok!==true||!v.continuation_id||!v.packet_ref)throw Error('invalid_canonical_preparation');
         return v;
       },
       dispatch:async({prepared})=>{
         let d;
         try{d=await john('submit',{action:'submit',tab_id:tabId,prompt:prepared.prompt});}
         catch(error){
           output('dispatch_exception',{
             stage:'john_browser_turn',continuation_id:prepared.continuation_id,
             failure:safeFailure(String(error?.message||'transport_failure')),
             sent_unconfirmed:true,
           });
           return {ok:false,submitted:false,failure:'transport_failure'};
         }
         const sent=d.ok===true&&d.observation.submitted===true&&
           d.observation.delivery_state==='ui_click_dispatched_not_model_result';
         if(!sent)output('dispatch_rejected',{
           request_id:d.request_id||null,
           failure:safeFailure(d.failure||'delivery_unconfirmed'),
           cause:safeFailure(d.cause||'unspecified_failure'),
           stage:'john_browser_turn',
           continuation_id:prepared.continuation_id,
           sent_unconfirmed:true,
         });
         return {ok:sent,submitted:sent,
           failure:safeFailure(d.failure||'delivery_unconfirmed'),
           execution_receipt_ref:sent?'john:'+d.request_id:null};
       },
       observeReturn:async({prepared})=>{
         const topic='continuation:'+prepared.continuation_id;
         let recoveryAttempted=false;
         for(let wait=0;wait<65;wait++){
           const e=store.listTopic(topic);
           const returned=e.find(x=>x.payload?.profile==='cop.continuation-result/v1'&&
             x.payload.phase==='returned'&&x.payload.continuation_id===prepared.continuation_id);
           const evaluated=e.find(x=>x.payload?.profile==='cop.continuation-dispatch/v1'&&
             x.payload.phase==='handler_completed'&&x.payload.continuation_id===prepared.continuation_id);
           if(returned&&evaluated){
             returnedCount++;
             return {ok:true,continuation_id:prepared.continuation_id,
               returned_receipt_ref:returned.idempotency_key,
               handler_receipt_ref:evaluated.idempotency_key};
           }
           // A confirmed browser-side failure is different from an
           // ambiguous click. Recover only the SAME bound, unsent draft,
           // once, and only if the canonical MCP return is still absent.
           if(!recoveryAttempted && wait>=3 && wait%3===0){
             let observation=null;
             try{observation=await john('status',{
               action:'status',tab_id:tabId,
               expected_continuation_id:prepared.continuation_id});}
             catch{/* observability failure is not authority to retry */}
             if(observation?.ok===true&&
                canRecoverChatgptFailedDraft(observation.observation)){
               recoveryAttempted=true; // Fence even on transport ambiguity.
               if(!store.listTopic(topic).some(x=>
                    x.payload?.profile==='cop.continuation-result/v1'&&
                    x.payload.phase==='returned')){
                 let recovered=null;
                 try{recovered=await john('send_draft',{
                   action:'send_draft',tab_id:tabId,
                   expected_continuation_id:prepared.continuation_id});}
                 catch{/* never replay after an ambiguous second click */}
                 output('bound_draft_recovery',{
                   continuation_id:prepared.continuation_id,
                   outcome:recovered?.ok===true&&recovered.observation?.submitted===true
                     ?'click_dispatched_awaiting_mcp_return':'needs_reconciliation',
                   recovery_attempts:1,
                 });
               }
             }
           }
           await sleep(1500);
         }
         return {ok:false,reason:'canonical_return_timeout'};
       },
     });
     output('finished',{ok:result.ok,reason:result.status,
       completed_turns:returnedCount,
       trace:result.trace.map(t=>({continuation_id:t.continuation_id,stage:t.stage})),
       note:'A real return requires both durable MCP and COPScheduler receipts.'});
     if(!result.ok)process.exitCode=1;
   }catch(error){output('blocked',{reason:String(error?.message||'unknown_error')});process.exitCode=1}
   finally{store.close()}
 }
}else{
 output('usage',{commands:['--status','--run --tab-id N --three-turns'],
   note:'--run is a bounded live browser test; never use it without explicit Principal authority and provider review.'});
 process.exitCode=2;
}
