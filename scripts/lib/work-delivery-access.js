/** Independent, read-only entitlement for a completed work delivery (#342).
 * Reuses the OAuth issuer/subject mapping. Operator-managed bindings are
 * explicit about the exact delivery destination; no inferred Twin, account
 * or commissioner. No bearer token or provider subject is stored in a job.
 */
import {isVerifiedMcpOAuthToken,verifyMcpOAuthToken} from './mcp-oauth-token.js';
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

/** Supabase native OAuth profile. OIDC scopes are not Cogentia permissions.
 * A signed client_id plus explicit operator-maintained delivery entitlement
 * is required, in addition to an exact resource audience. No fallback to
 * the project's generic "authenticated" audience or ordinary login token.
 */
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const supabaseDeliveryTokens=new WeakSet();
export function isSupabaseWorkDeliveryToken(token){
 return !!token&&typeof token==='object'&&supabaseDeliveryTokens.has(token);
}
function httpsResource(v){
 try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search&&u.pathname!=='/'}
 catch{return false}
}
export async function verifySupabaseWorkDeliveryToken(token,{issuer,audience,jwksUrl,fetch,nowMs}={}){
 if(!httpsResource(issuer)||!httpsResource(audience)||!issuer.endsWith('/auth/v1')||
    audience===issuer||jwksUrl!==issuer+'/.well-known/jwks.json')
   throw Error('supabase_delivery_resource_not_configured');
 const verified=await verifyMcpOAuthToken(token,{issuer,audience,jwksUrl,fetch,nowMs,requiredScopes:[]});
 const c=verified.claims;
 // Exact single audience, not a general multi-resource credential.
 if(!(c.aud===audience||(Array.isArray(c.aud)&&c.aud.length===1&&c.aud[0]===audience))||
    c.role!=='authenticated'||c.is_anonymous!==false||!uuid(c.sub)||!uuid(c.client_id))
   throw Error('supabase_oauth_client_identity_required');
 supabaseDeliveryTokens.add(verified);
 return verified;
}

export function createSupabaseWorkDeliveryResolver({issuer,audience,bindingsJson,now=()=>Date.now()}={}){
 return ({oauthPrincipal,contract})=>{
   if(!isSupabaseWorkDeliveryToken(oauthPrincipal)||oauthPrincipal.issuer!==issuer||
      oauthPrincipal.audience!==audience||!Number.isFinite(+now())||
      oauthPrincipal.claims.exp*1000<=+now()||
      contract?.schema!=='cogentia.work-commissioning/v1'||
      contract.delivery?.mode!=='retrieve_by_reference'||contract.delivery.visibility!=='public')
     return false;
   const identity=resolveOAuthIdentity(oauthPrincipal,bindingsJson);
   if(!identity||identity.principal!==contract.principal_ref)return false;
   let bindings;try{bindings=JSON.parse(bindingsJson)}catch{return false}
   const binding=bindings.find(b=>b?.issuer===identity.issuer&&
      b.subject===identity.subject&&b.principal===identity.principal);
   return Array.isArray(binding?.work_delivery)&&binding.work_delivery.some(d=>
      d?.client_id===oauthPrincipal.claims.client_id&&
      d.recipient_ref===contract.delivery.recipient_ref&&
      d.destination_ref===contract.delivery.destination_ref&&d.visibility==='public'&&
      Object.hasOwn(d,'provider_account_ref')&&d.provider_account_ref===contract.delivery.provider_account_ref&&
      Object.hasOwn(d,'subject_ref')&&d.subject_ref===contract.subject_ref&&
      Object.hasOwn(d,'twin_ref')&&d.twin_ref===contract.twin_ref);
 };
}
