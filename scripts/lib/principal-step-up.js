/** #299: trusted-server verifier for a Principal's human-confirmed OAuth step-up.
 * The issuer MUST contractually emit cogentia_approval and amr:user_presence
 * only after independent human review of the displayed exact transaction.
 * A normal ChatGPT MCP bearer is never sufficient.
 */
import {verifyMcpOAuthToken} from './mcp-oauth-token.js';
import {resolveOAuthIdentity} from './mcp-oauth-identity.js';
export function createPrincipalStepUpVerifier({issuer,audience,jwksUrl,bindingsJson,fetch,nowMs=()=>Date.now()}={}){
  if(!issuer||!audience||!jwksUrl||!bindingsJson)throw Error('step_up_issuer_not_configured');
  return async function verifyHumanConfirmation({approvalProof,challenge_id,payload_hash,action_class,issued_at,session}={}){
    if(!session?.ok||session.principal_ref!=='principal:jhn'||session.channel!=='mcp-oauth'||session.issuer!==issuer)
      return false;
    try {
      const token=await verifyMcpOAuthToken(approvalProof,{
        issuer,audience,jwksUrl,fetch,nowMs:nowMs(),
        requiredScopes:['cogentia.principal.approve'],
        approvalBinding:{challenge_id,payload_hash,action_class,issued_at}
      });
      const principal=resolveOAuthIdentity({...token,verified:true},bindingsJson);
      return principal?.principal==='principal:jhn';
    }catch{return false;}
  };
}
