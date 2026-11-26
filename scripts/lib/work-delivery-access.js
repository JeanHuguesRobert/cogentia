/** Independent, read-only entitlement for a completed work delivery (#342).
 * Reuses the OAuth issuer/subject mapping. Operator-managed bindings are
 * explicit about the exact delivery destination; no inferred Twin, account
 * or commissioner. No bearer token or provider subject is stored in a job.
 */
import {isVerifiedMcpOAuthToken} from './mcp-oauth-token.js';
import {resolveOAuthIdentity} from './mcp-oauth-identity.js';

export function createOAuthWorkDeliveryResolver({bindingsJson,now=()=>Date.now()}={}){
 return ({oauthPrincipal,contract})=>{
   if(!isVerifiedMcpOAuthToken(oauthPrincipal)||
      !Number.isFinite(+now())||oauthPrincipal.claims.exp*1000<=+now()||
      !oauthPrincipal.scopes.includes('cogentia.private.read')||
      !oauthPrincipal.scopes.includes('cogentia.work.retrieve')||
      contract?.schema!=='cogentia.work-commissioning/v1'||
      contract.delivery?.mode!=='retrieve_by_reference'||
      contract.delivery.visibility!=='public')return false;
   const identity=resolveOAuthIdentity(oauthPrincipal,bindingsJson);
   if(!identity||identity.principal!==contract.principal_ref)return false;
   let bindings;try{bindings=JSON.parse(bindingsJson)}catch{return false}
   const binding=bindings.find(b=>b?.issuer===identity.issuer&&
      b.subject===identity.subject&&b.principal===identity.principal);
   return Array.isArray(binding?.work_delivery)&&binding.work_delivery.some(d=>
      d?.recipient_ref===contract.delivery.recipient_ref&&
      d.destination_ref===contract.delivery.destination_ref&&
      d.visibility===contract.delivery.visibility&&
      Object.hasOwn(d,'provider_account_ref')&&
      d.provider_account_ref===contract.delivery.provider_account_ref&&
      Object.hasOwn(d,'subject_ref')&&d.subject_ref===contract.subject_ref&&
      Object.hasOwn(d,'twin_ref')&&d.twin_ref===contract.twin_ref);
 };
}
