/** #299 — Offline-signed Principal approval for a prospective John root mandate.
 * Never trust an MCP credential or conversational approval as an issuer proof.
 * The public key must be pinned by a separately controlled authority operator.
 */
import {createHash,createPublicKey,verify} from 'node:crypto';
import {stableSerialize} from './side-effect-authorization.js';

export const ROOT_MANDATE_KIND='cogentia.john-root-mandate-proposal/v1';
export const RESERVED_ACTIONS=Object.freeze([
  'communication.send','gmail.send','whatsapp.send','publish','legal.commit',
  'financial.commit','payment.execute','formal.submit','representation.act',
  'third_party.disclose','sensitive.disclose','private.disclose',
  'purchase.execute','security.credentials.change','irreversible.delete'
]);
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const refuse=error=>({ok:false,error});
export function canonicalProposalBytes(proposal){return Buffer.from(stableSerialize(proposal),'utf8');}
export function proposalHash(proposal){return sha(canonicalProposalBytes(proposal));}
export function publicKeyFingerprint(pem){
  return sha(createPublicKey(pem).export({type:'spki',format:'der'}));
}
export function verifyJohnRootApproval({proposal,approval,trustedPublicKeyPem,now=new Date()}={}){
  if(!proposal||proposal.kind!==ROOT_MANDATE_KIND||proposal.mandate_id!=='mandate:jhn:john-root'
    ||proposal.principal_ref!=='principal:jhn'||proposal.logical_agent_ref!=='agent:jhn'
    ||proposal.version!=='v1')return refuse('unexpected_mandate_identity');
  const scope=proposal.scope;
  if(!scope||!Array.isArray(scope.allowed_actions)||!scope.allowed_actions.length
    ||scope.allowed_actions.some(a=>typeof a!=='string'||a.includes('*')))
    return refuse('scope_missing_or_wildcard');
  if(!Array.isArray(scope.forbidden_actions)||RESERVED_ACTIONS.some(a=>!scope.forbidden_actions.includes(a)))
    return refuse('reserved_acts_not_prohibited');
  if(scope.allowed_actions.some(a=>scope.forbidden_actions.includes(a)))
    return refuse('scope_allow_deny_conflict');
  if(!Number.isSafeInteger(proposal.max_delegation_depth)||proposal.max_delegation_depth<0)
    return refuse('delegation_depth_invalid');
  if(!proposal.budget_limits||!Object.keys(proposal.budget_limits).length
    ||Object.values(proposal.budget_limits).some(v=>!Number.isSafeInteger(v)||v<0))
    return refuse('budget_limits_invalid');
  const from=Date.parse(proposal.valid_from),until=Date.parse(proposal.valid_until),t=+new Date(now);
  if(!Number.isFinite(from)||!Number.isFinite(until)||from>=until||t<from||t>=until)
    return refuse('mandate_outside_validity');
  if(!trustedPublicKeyPem)return refuse('trusted_issuer_key_missing');
  let fingerprint;
  try{fingerprint=publicKeyFingerprint(trustedPublicKeyPem);}catch{return refuse('trusted_issuer_key_invalid');}
  if(!approval||approval.kind!=='cogentia.principal-signature/v1'||approval.principal_ref!==proposal.principal_ref
    ||approval.payload_hash!==proposalHash(proposal)||approval.key_fingerprint!==fingerprint)
    return refuse('approval_binding_mismatch');
  try{
    const raw=Buffer.from(approval.signature_base64,'base64');
    if(raw.length!==64||!verify(null,canonicalProposalBytes(proposal),trustedPublicKeyPem,raw))
      return refuse('signature_invalid');
  }catch{return refuse('signature_invalid');}
  return {ok:true,proposal_hash:proposalHash(proposal),issuer_fingerprint:fingerprint};
}
