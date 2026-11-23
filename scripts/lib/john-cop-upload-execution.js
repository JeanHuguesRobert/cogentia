/**
 * CPKT-2026-011: independently governed external file-selection gate.
 * A browser file input can transmit immediately. Only a current signed
 * canonical mandate, a reserved COP budget and trusted transport grant the
 * one operation. Caller-supplied handler confirmation grants nothing.
 */
import {readFileSync} from 'node:fs';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {BROWSER_UPLOAD_CAPABILITY,BROWSER_UPLOAD_MANDATE,BROWSER_UPLOAD_POLICY} from './jhn-browser-upload-mandate-plan.js';
const KEY_FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const deny=error=>({ok:false,executed:false,error});
const VALID_ID=/^[A-Za-z0-9._:-]{1,120}$/;
export function validateCanonicalUploadRequest(request){
 const b=request?.execution_budget,args=request?.input?.arguments,h=request?.handler;
 if(request?.capability!==BROWSER_UPLOAD_CAPABILITY||request?.exposure!=='consequential'||
   h?.kind!=='governed_reasoner'||h.allowed_capabilities?.length!==1||
   h.allowed_capabilities[0]!==BROWSER_UPLOAD_CAPABILITY||
   (h.confirmed_capabilities!==undefined&&h.confirmed_capabilities.length>0)||
   !Number.isInteger(b?.max_steps)||b.max_steps<2||b.max_steps>4||
   b.max_tool_calls!==1||b.max_external_effects!==1||
   (b.max_internal_effects||0)!==0||(b.max_subagents||0)!==0||
   !Number.isSafeInteger(b.max_elapsed_ms)||b.max_elapsed_ms<100||b.max_elapsed_ms>45000||
   !VALID_ID.test(request.request_id||'')||
   !args||Object.keys(args).sort().join(',')!=='expected_url,file_index,file_path,tab_id'||
   !Number.isSafeInteger(args.tab_id)||args.tab_id<1||
   !Number.isInteger(args.file_index)||args.file_index<0||args.file_index>79||
   typeof args.file_path!=='string'||args.file_path.length<1||args.file_path.length>4096||
   typeof args.expected_url!=='string'||args.expected_url.length>4096)
   return {ok:false,error:'canonical_upload_envelope_invalid'};
 try{
  const url=new URL(args.expected_url);
  if(url.protocol!=='https:'||url.username||url.password||url.hash||
     !url.host)return {ok:false,error:'canonical_upload_target_invalid'};
 }catch{return {ok:false,error:'canonical_upload_target_invalid'}}
 return {ok:true,args};
}
export async function executeJohnCanonicalUpload({
 store,authorizedKeysPath,auth,request,run,verifyIssuer:providedVerifier,
}={}){
 const check=validateCanonicalUploadRequest(request);
 if(!check.ok)return deny(check.error);
 if(typeof run!=='function')return deny('canonical_upload_executor_missing');
 const mandate=resolveMandate(store,BROWSER_UPLOAD_MANDATE);
 if(!mandate?.version||
   !mandate.scope?.allowed_actions?.includes(BROWSER_UPLOAD_CAPABILITY)||
   JSON.stringify(mandate.scope.browser_upload_policy)!==JSON.stringify(BROWSER_UPLOAD_POLICY))
   return deny('canonical_upload_policy_not_signed');
 let verifyIssuer=providedVerifier;
 if(!verifyIssuer){
  let key;
  try{key=readFileSync(authorizedKeysPath,'utf8').split('\n').find(line=>{
    try{return sshFingerprint(line)===KEY_FP}catch{return false}
  })}catch{return deny('trusted_upload_issuer_missing')}
  if(!key)return deny('trusted_upload_issuer_missing');
  verifyIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,expectedSshFingerprint:KEY_FP});
 }
 const ledger=createEventSourcedExecutionBudgetLedger({
  store,budget_id:'budget:'+BROWSER_UPLOAD_MANDATE,require_authority_grant:true});
 const authz=assessJohnCopAuthority({
  store,auth,mandate_ref:BROWSER_UPLOAD_MANDATE,version_pin:mandate.version,
  capability:BROWSER_UPLOAD_CAPABILITY,ledger,verifyIssuer,
  transport_mandate_label:'mandate:chatgpt-corpus-coding'
 });
 if(!authz.preflight_ok)return deny(authz.error||'canonical_upload_authority_denied');
 const reservation=ledger.reserve({
  idempotency_key:'john-browser-upload:'+request.request_id,
  expected_version:ledger.snapshot().version,
  demand:{max_steps:request.execution_budget.max_steps}
 });
 if(!reservation.ok||reservation.duplicate)
   return deny(reservation.duplicate?'canonical_upload_request_duplicate':reservation.error||'canonical_upload_budget_exhausted');
 let events,error;
 try{events=await run()}catch(e){error=e}
 const settled=Array.isArray(events)?events.find(x=>x.type==='john.accounting.settled')?.data:null;
 const steps=Number.isInteger(settled?.observed_steps)&&settled.observed_steps>=0&&
   settled.observed_steps<=request.execution_budget.max_steps
   ?settled.observed_steps:request.execution_budget.max_steps;
 const receipt=ledger.settle({
  reservation_id:reservation.reservation.reservation_id,
  expected_version:ledger.snapshot().version,
  usage:{max_steps:steps}
 });
 if(!receipt.ok)return {ok:false,executed:true,error:'canonical_upload_settlement_unknown'};
 const success=Array.isArray(events)&&events.some(x=>x.type==='john.run.completed')&&
   events.some(x=>x.type==='john.tool.receipt'&&x.data?.capability===BROWSER_UPLOAD_CAPABILITY);
 if(error||!settled||!success||settled.external_effects!==1)
   return {ok:false,executed:true,error:'canonical_upload_execution_not_confirmed',
     settled_steps:steps};
 return {ok:true,executed:true,events,settled_steps:steps,
  canonical_mandate_ref:BROWSER_UPLOAD_MANDATE};
}
