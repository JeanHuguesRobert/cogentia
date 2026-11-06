/** #299: read-only canonical COP authority preflight, not an issuer or executor.
 * Request assertions cannot substitute for server-resolved caller identity.
 */
import { evaluateMandate, resolveMandate } from '../../../inseme/packages/cop-core/src/governed-act.js';
import { isResolvedCallerAuth } from './cogentia-mcp-auth.js';
const deny = error => ({ ok:false, admitted:false, error, reservation:null });
export function assessJohnCopAuthority({store,auth,mandate_ref,version_pin,capability,ledger,verifyIssuer,require_budget=true,at_time,transport_mandate_label=null}={}) {
  if (!isResolvedCallerAuth(auth) || auth.auth!=='jhn' || auth.allowMutate!==true)
    return deny('authenticated_jhn_caller_required');
  if (auth.principal_ref!=='principal:jhn' || !auth.actor || !auth.actor.startsWith('agent:jhn'))
    return deny('principal_actor_binding_required');
  if (!mandate_ref || !capability) return deny('mandate_and_capability_required');
  if (!version_pin) return deny('mandate_version_pin_required');
  if (auth.mandate_ref!==(transport_mandate_label || mandate_ref)) return deny('mandate_transport_mismatch');
  if (!store || typeof store.replay!=='function' || typeof store.listTopic!=='function')
    return deny('canonical_authority_store_unavailable');
  const mandate=resolveMandate(store,mandate_ref);
  if (!mandate || typeof verifyIssuer!=='function')
    return deny('issuer_provenance_unverified');
  // A metadata flag inside the same store would be forgeable by its writer.
  // Trust an independently configured verifier, not mandate contents.
  let issuerProof;
  try {issuerProof=verifyIssuer({mandate,mandate_ref,store});}
  catch {return deny('issuer_provenance_unverified');}
  if (issuerProof?.verified!==true || issuerProof?.principal_ref!==auth.principal_ref
      || issuerProof?.mandate_ref!==mandate_ref)
    return deny('issuer_provenance_unverified');
  let grant;
  try {grant=evaluateMandate(store,{mandate_ref,version_pin,expected_principal_ref:auth.principal_ref,expected_actor_ref:'agent:jhn',capability,...(at_time?{at_time}:{})});}
  catch {return deny('canonical_evaluation_failed');}
  if (grant?.granted!==true) return deny(grant?.error||'mandate_refused');
  if (grant.principal_ref!==auth.principal_ref || grant.logical_agent_ref!=='agent:jhn')
    return deny('canonical_identity_mismatch');
  if (require_budget) {
    if (!ledger || typeof ledger.snapshot!=='function')return deny('canonical_budget_unavailable');
    let snapshot;
    try {snapshot=ledger.snapshot();}catch {return deny('canonical_budget_unavailable');}
    if (!snapshot?.has_grant || snapshot.mandate_ref!==mandate_ref)
      return deny('canonical_budget_not_funded');
  }
  // A successful authority preflight alone MUST NOT be interpreted as an
  // executable grant: actual budget reservation and effect gate are separate.
  return {ok:true,admitted:false,preflight_ok:true,authorized_to_execute:false,grant,reservation:null,requires_reservation_before_effect:true};
}
