/** #299: optional offline signature verifier for the existing root mandate.
 * Trust is anchored by a server-pinned public key, never event metadata alone.
 * No rights are issued or inferred from mere possession of this function.
 */
import {ROOT_MANDATE_KIND,publicKeyFingerprint,verifyJohnRootApproval} from './john-root-mandate.js';
export function createOfflineJohnIssuerVerifier({trustedPublicKeyPem,now=()=>new Date()}={}) {
 if(!trustedPublicKeyPem)throw Error('trusted_issuer_key_missing');
 const fingerprint=publicKeyFingerprint(trustedPublicKeyPem);
 return function verifyIssuer({mandate,mandate_ref}={}) {
  const refuse=()=>({verified:false,principal_ref:null,mandate_ref:null});
  if(!mandate||!mandate_ref||mandate.mandate_id!==mandate_ref||!mandate.scope||!mandate.metadata)return refuse();
  const {budget_ceiling,...scope}=mandate.scope;
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:mandate.mandate_id,version:mandate.version,
    principal_ref:mandate.principal_ref,logical_agent_ref:mandate.logical_agent_ref,
    valid_from:mandate.valid_from,valid_until:mandate.valid_until,
    scope,max_delegation_depth:mandate.metadata.max_delegation_depth,budget_limits:budget_ceiling};
  const approval={kind:'cogentia.principal-signature/v1',principal_ref:mandate.principal_ref,
    payload_hash:mandate.metadata.proposal_hash,key_fingerprint:mandate.metadata.issuer_fingerprint,
    signature_base64:mandate.metadata.signature_base64};
  if(approval.key_fingerprint!==fingerprint)return refuse();
  const result=verifyJohnRootApproval({proposal,approval,trustedPublicKeyPem,now:now()});
  return result.ok ? {verified:true,principal_ref:mandate.principal_ref,mandate_ref,issuer_fingerprint:fingerprint}:refuse();
 };
}
