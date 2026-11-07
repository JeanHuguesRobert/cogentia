/** Explicit, separately signed form-assistance COP effect gate. */
import {readFileSync} from 'node:fs';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {createFormAssistIssuerVerifier} from './john-form-assist-issuance.js';
import {FORM_ASSIST_MANDATE,FORM_ASSIST_CAPABILITY} from './john-form-assist-mandate.js';
import {sshFingerprint} from './john-sshsig-approval.js';
const FINGERPRINT='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const fail=error=>({ok:false,executed:false,error});
function exactHttpsOrigin(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&!u.username&&!u.password;}
 catch{return false;}
}
export async function executeJohnCanonicalForm({store,authorizedKeysPath,auth,request,run,issuerFingerprint=FINGERPRINT}={}){
 const b=request?.execution_budget,args=request?.input?.arguments;
 if(!request||request.capability!==FORM_ASSIST_CAPABILITY||request.exposure!=='bounded'||
   request.handler?.kind!=='capability_once_bounded'||
   request.handler.allowed_capabilities?.length!==1||
   request.handler.allowed_capabilities[0]!==FORM_ASSIST_CAPABILITY||
   !Number.isInteger(b?.max_steps)||b.max_steps<1||b.max_steps>8||
   b.max_tool_calls!==1||b.max_internal_effects!==1||b.max_external_effects!==0||
   typeof run!=='function'||!/^[-\w:.]{1,120}$/.test(String(request.request_id||''))||
   !args||!['expected_url,field_index,tab_id,text',
    'expected_frame_origin,expected_url,field_index,frame_id,tab_id,text'].includes(Object.keys(args).sort().join(','))||
   (args.frame_id!==undefined && (!/^[A-Za-z0-9_-]{1,160}$/.test(args.frame_id)||
     !exactHttpsOrigin(args.expected_frame_origin)))||
   !Number.isInteger(args.tab_id)||args.tab_id<1||
   !Number.isInteger(args.field_index)||args.field_index<0||args.field_index>79||
   typeof args.expected_url!=='string'||!args.expected_url.startsWith('https://')||
   typeof args.text!=='string'||args.text.length<1||args.text.length>2048)
   return fail('canonical_form_envelope_invalid');
 let trustedKey;
 try{trustedKey=readFileSync(authorizedKeysPath,'utf8').split('\n').find(line=>{
   try{return sshFingerprint(line)===issuerFingerprint}catch{return false}
 });}catch{return fail('trusted_form_issuer_missing')}
 if(!trustedKey)return fail('trusted_form_issuer_missing');
 const verifyIssuer=createFormAssistIssuerVerifier({trustedSshPublicKey:trustedKey,expectedFingerprint:issuerFingerprint});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+FORM_ASSIST_MANDATE,limits:{max_steps:512},require_authority_grant:true});
 const pre=assessJohnCopAuthority({store,auth,mandate_ref:FORM_ASSIST_MANDATE,version_pin:'v1',capability:FORM_ASSIST_CAPABILITY,ledger,verifyIssuer,transport_mandate_label:'mandate:chatgpt-corpus-coding'});
 if(!pre.preflight_ok)return fail(pre.error||'canonical_form_preflight_denied');
 const reserved=ledger.reserve({idempotency_key:'john-form:'+request.request_id,expected_version:ledger.snapshot().version,demand:{max_steps:b.max_steps}});
 if(!reserved.ok)return fail(reserved.error||'canonical_form_reservation_failed');
 if(reserved.duplicate)return fail('canonical_form_request_duplicate');
 let events,error;try{events=await run()}catch(e){error=e}
 const settlement=Array.isArray(events)?events.find(e=>e.type==='john.accounting.settled')?.data:null;
 const steps=Number.isInteger(settlement?.observed_steps)&&settlement.observed_steps>=0&&settlement.observed_steps<=b.max_steps?settlement.observed_steps:b.max_steps;
 const recorded=ledger.settle({reservation_id:reserved.reservation.reservation_id,expected_version:ledger.snapshot().version,usage:{max_steps:steps}});
 if(!recorded.ok)return {ok:false,executed:true,error:'form_settlement_unknown',reservation_id:reserved.reservation.reservation_id};
 if(error||!settlement||!events.some(x=>x.type==='john.run.completed')||
   !events.some(x=>x.type==='john.tool.receipt'))return {ok:false,executed:true,error:'form_result_not_confirmed',settled_steps:steps};
 return {ok:true,executed:true,events,settled_steps:steps,canonical_mandate_ref:FORM_ASSIST_MANDATE};
}
