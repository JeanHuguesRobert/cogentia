/** Cogentia #299: classify independent principal identity evidence.
 * Authentication is not mandate authority. Never accept agent-supplied flags.
 * Verifier MUST be trusted server-side and validate issuer, audience, expiry,
 * authenticated user and channel. No execution or grant is issued here.
 */
export async function resolvePrincipalTrust({evidence,verifier,now=new Date()}={}){
  const deny=error=>({ok:false,error,principal_ref:null});
  if(!evidence||!['ssh-session','tailscale-peer','mcp-oauth'].includes(evidence.channel))return deny('unsupported_authentication_channel');
  if(typeof verifier!=='function')return deny('trusted_verifier_unavailable');
  let verified;
  try{verified=await verifier(evidence);}catch{return deny('identity_verification_failed');}
  if(!verified||verified.verified!==true||verified.channel!==evidence.channel
    ||verified.principal_ref!=='principal:jhn'
    ||typeof verified.issuer!=='string'||!verified.issuer
    ||typeof verified.audience!=='string'||verified.audience!=='cogentia:principal-issuer')
    return deny('principal_identity_unverified');
  const expires=Date.parse(verified.expires_at);
  if(!Number.isFinite(expires)||expires<=+new Date(now))return deny('principal_session_expired');
  return {ok:true,principal_ref:verified.principal_ref,issuer:verified.issuer,
    channel:verified.channel,expires_at:verified.expires_at,
    // The caller must still verify the exact mandate and reserve budget in COP.
    grants_mandate_authority:false};
}
