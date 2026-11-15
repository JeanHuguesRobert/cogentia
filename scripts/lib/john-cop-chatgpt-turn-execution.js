/**
 * Canonical, mandate-scoped ChatGPT turn execution, reusing the existing
 * independently signed John root, versioned COP scope and execution ledger.
 * This is NOT authorized by a model tool claim or by a browser session.
 */
import {readFileSync} from 'node:fs';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {validateChatgptTurnRequest} from './browser-chatgpt-turn.js';
const REF='mandate:jhn:john-root';
const KEY_FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const refuse=error=>({ok:false,executed:false,error});

export async function executeJohnCanonicalChatgptTurn({
 store,authorizedKeysPath,auth,request,run,verifyIssuer:providedVerifier,
}={}){
 const b=request?.execution_budget;
 if(!request||auth?.actor!=='agent:jhn'||request.capability!=='browser.chatgpt.turn'||
   request.exposure!=='bounded'||request.handler?.kind!=='governed_reasoner'||
   request.handler.allowed_capabilities?.length!==1||
   request.handler.allowed_capabilities[0]!=='browser.chatgpt.turn'||
   !Number.isInteger(b?.max_steps)||b.max_steps<1||b.max_steps>4||
   b.max_tool_calls!==1||(b.max_external_effects||0)!==0||
   b.max_internal_effects!==1||(b.max_subagents||0)!==0||
   !Number.isInteger(b.max_elapsed_ms)||b.max_elapsed_ms>30000||
   typeof run!=='function'||!/^[-\w:.]{1,120}$/.test(request.request_id||''))
   return refuse('canonical_chatgpt_envelope_invalid');
 const args=request.input?.arguments;
 const v=validateChatgptTurnRequest(args);
 if(!v.ok)return refuse(v.error);
 let verifyIssuer=providedVerifier;
 if(!verifyIssuer){
   let key;
   try{key=readFileSync(authorizedKeysPath,'utf8').split('\n').find(x=>{
     try{return sshFingerprint(x)===KEY_FP;}catch{return false}
   });}catch{return refuse('trusted_issuer_key_unavailable')}
   if(!key)return refuse('trusted_issuer_key_unavailable');
   verifyIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,expectedSshFingerprint:KEY_FP});
 }
 const current=resolveMandate(store,REF);
 if(!current?.version)return refuse('canonical_chatgpt_mandate_missing');
 const policy=current.scope?.chatgpt_turn_policy;
 if(policy?.origin!=='https://chatgpt.com'||
   policy.browser_instance_id!=='fracta2-hosted'||
   !Array.isArray(policy.operations)||
   !policy.operations.includes(args.action==='submit'?'submit_prompt':'observe_result')||
   policy.require_cop_result_receipt!==true)
   return refuse('canonical_chatgpt_policy_not_signed');
 const ledger=createEventSourcedExecutionBudgetLedger({
   store,budget_id:'budget:'+REF,require_authority_grant:true});
 const admission=assessJohnCopAuthority({
   store,auth,mandate_ref:REF,version_pin:current.version,
   capability:'browser.chatgpt.turn',ledger,verifyIssuer,
   transport_mandate_label:'mandate:chatgpt-corpus-coding'});
 if(!admission.preflight_ok)return refuse(admission.error||'chatgpt_authority_denied');
 const reserve=ledger.reserve({idempotency_key:'chatgpt-turn:'+request.request_id,
   expected_version:ledger.snapshot().version,demand:{max_steps:b.max_steps}});
 if(!reserve.ok||reserve.duplicate)return refuse(reserve.error||'chatgpt_duplicate_request');
 let events,error;
 try{events=await run()}catch(e){error=e}
 const accounting=Array.isArray(events)?events.find(x=>x.type==='john.accounting.settled')?.data:null;
 const observed=Number.isInteger(accounting?.observed_steps)&&accounting.observed_steps>=0
   ?Math.min(accounting.observed_steps,b.max_steps):b.max_steps;
 const settled=ledger.settle({reservation_id:reserve.reservation.reservation_id,
   expected_version:ledger.snapshot().version,usage:{max_steps:observed}});
 if(!settled.ok)return {ok:false,executed:true,error:'chatgpt_settlement_unconfirmed'};
 if(error||!Array.isArray(events)||!accounting)
   return {ok:false,executed:true,error:'chatgpt_execution_receipt_unconfirmed'};
 const complete=events.find(x=>x.type==='john.run.completed');
 if(!complete)return {ok:false,executed:true,error:'chatgpt_turn_failed',events};
 return {ok:true,executed:true,events,settled_steps:observed,
   canonical_mandate_ref:REF};
}
