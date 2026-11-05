/** #299: use existing MCP OAuth JWT+identity binding as a Principal session.
 * This only authenticates the human, never issues a COP mandate or effect grant.
 * Call ONLY from the trusted HTTP adapter, never accept a client-declared
 * verified principal. Approval scope is distinct from private read/mutate.
 */
import {verifyMcpOAuthToken} from './mcp-oauth-token.js';
import {resolveOAuthIdentity} from './mcp-oauth-identity.js';
import {resolvePrincipalTrust} from './principal-trust-context.js';
const trustedOAuthSessions=new WeakSet();
export function isTrustedOAuthPrincipalSession(value){return !!value&&typeof value==='object'&&trustedOAuthSessions.has(value);}
export async function authenticateOAuthPrincipalSession(token,{issuer,audience,jwksUrl,bindingsJson,fetch,nowMs=Date.now()}={}){
  const fail=error=>({ok:false,error,grants_mandate_authority:false});
  if(!issuer||!audience||!jwksUrl||!bindingsJson)return fail('oauth_principal_not_configured');
  let verified;
  try{
    verified=await verifyMcpOAuthToken(token,{issuer,audience,jwksUrl,requiredScopes:['cogentia.principal.approve'],fetch,nowMs});
  }catch{return fail('oauth_principal_token_denied');}
  const mapping=resolveOAuthIdentity({...verified,verified:true},bindingsJson);
  if(mapping?.principal!=='principal:jhn')return fail('principal_binding_missing');
  const resolved=await resolvePrincipalTrust({
    evidence:{channel:'mcp-oauth'},now:new Date(nowMs),
    verifier:async()=>({verified:true,channel:'mcp-oauth',principal_ref:mapping.principal,
      issuer:mapping.issuer,audience:'cogentia:principal-issuer',
      expires_at:new Date(verified.claims.exp*1000).toISOString()})
  });
  if(resolved.ok){Object.freeze(resolved);trustedOAuthSessions.add(resolved);}
  return resolved;
}
