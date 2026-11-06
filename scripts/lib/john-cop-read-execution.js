/** #299: explicit COP read vertical, independently verified, atomically budgeted. */
import {readFileSync} from 'node:fs';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {createJohnTransportMandateMap} from './john-transport-mandate-map.js';
const REF='mandate:jhn:john-root';
const FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const ALLOWED=['browser.hosted.inspect','browser.navigation.instances'];
const deny=error=>({ok:false,executed:false,error});
export async function executeJohnCanonicalRead({store,authorizedKeysPath,auth,request,run}={}){
 const b=request?.execution_budget;
 if(!request||!ALLOWED.includes(request.capability)||request.exposure!=='read_only'||
   request.handler?.kind!=='capability_once'||request.handler.allowed_capabilities?.length!==1||
   request.handler.allowed_capabilities[0]!==request.capability||
   !Number.isInteger(b?.max_steps)||b.max_steps<1||b.max_steps>8||b.max_tool_calls!==1||
   (b.max_external_effects||0)!==0||(b.max_internal_effects||0)!==0||
   typeof run!=='function'||typeof request.request_id!=='string'||
   !/^[-\w:.]{1,120}$/.test(request.request_id))return deny('canonical_read_envelope_invalid');
 let key;try{key=readFileSync(authorizedKeysPath,'utf8').split('\n').find(x=>{
   try{return sshFingerprint(x)===FP;}catch{return false;}
 });}catch{return deny('trusted_issuer_key_unavailable');}
 if(!key)return deny('trusted_issuer_key_unavailable');
 const verifyIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,expectedSshFingerprint:FP});
 const map=createJohnTransportMandateMap({transport_label:'mandate:chatgpt-corpus-coding',mandate_ref:REF,version_pin:'v1',allowed_read_capabilities:ALLOWED,verifyIssuer});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+REF,limits:{max_steps:2048},require_authority_grant:true});
 const pre=map.inspect({auth,store,ledger,capability:request.capability});
 if(!pre.preflight_ok)return deny(pre.error||'canonical_read_denied');
 const reserve=ledger.reserve({idempotency_key:'john-read:'+request.request_id,expected_version:ledger.snapshot().version,demand:{max_steps:b.max_steps}});
 if(!reserve.ok)return deny(reserve.error||'canonical_reservation_failed');
 if(reserve.duplicate)return deny('canonical_request_already_reserved');
 let events,error;try{events=await run();}catch(e){error=e;}
 const accounting=Array.isArray(events)?events.find(x=>x.type==='john.accounting.settled')?.data:null;
 const steps=Number.isInteger(accounting?.observed_steps)&&accounting.observed_steps>=0&&accounting.observed_steps<=b.max_steps?accounting.observed_steps:b.max_steps;
 const settlement=ledger.settle({reservation_id:reserve.reservation.reservation_id,expected_version:ledger.snapshot().version,usage:{max_steps:steps}});
 if(!settlement.ok)return {ok:false,executed:true,error:'canonical_settlement_unconfirmed',reservation_id:reserve.reservation.reservation_id};
 if(error||!Array.isArray(events)||!events.some(x=>x.type==='john.run.completed')||!accounting)return {ok:false,executed:true,error:'canonical_execution_receipt_unconfirmed',settled_steps:steps};
 return {ok:true,executed:true,events,settled_steps:steps,canonical_mandate_ref:REF};
}
