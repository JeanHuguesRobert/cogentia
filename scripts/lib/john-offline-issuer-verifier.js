/** #299: optional offline signature verifier for the existing root mandate.
 * Trust is anchored by a server-pinned public key, never event metadata alone.
 * No rights are issued or inferred from mere possession of this function.
 */
import {ROOT_MANDATE_KIND,publicKeyFingerprint,verifyJohnRootApproval} from './john-root-mandate.js';
import {verifyRootSshsig} from './john-sshsig-approval.js';
import {verifyJohnAmendmentProof} from './john-mandate-amendment-proof.js';
export function createOfflineJohnIssuerVerifier({trustedPublicKeyPem,trustedSshPublicKey,expectedSshFingerprint,now=()=>new Date()}={}) {
 if(!trustedPublicKeyPem&&!trustedSshPublicKey)throw Error('trusted_issuer_key_missing');
 const fingerprint=trustedPublicKeyPem?publicKeyFingerprint(trustedPublicKeyPem):expectedSshFingerprint;
 return function verifyIssuer({mandate,mandate_ref,store}={}) {
  const refuse=()=>({verified:false,principal_ref:null,mandate_ref:null});
  if(!mandate||!mandate_ref||mandate.mandate_id!==mandate_ref||!mandate.scope||!mandate.metadata)return refuse();
  if (mandate.version !== 'v1') {
   // The current declaration is not trusted merely because it is in COP.
   // Verify an uninterrupted lineage down to a signed v1 root.
   if (!store || typeof store.replay !== 'function') return refuse();
   const versions=store.replay().filter(e=>
     e.payload?.kind==='MandateDeclaration' &&
     e.payload?.mandate_id===mandate_ref);
   if (versions.length<2 || versions.at(-1)?.payload?.version!==mandate.version ||
       JSON.stringify(versions.at(-1)?.payload)!==JSON.stringify(mandate))
     return refuse();
   const root=versions[0].payload;
   if (root.version!=='v1')return refuse();
   const rootProof=createOfflineJohnIssuerVerifier({
     trustedPublicKeyPem,trustedSshPublicKey,expectedSshFingerprint,now
   })({mandate:root,mandate_ref});
   if(rootProof.verified!==true)return refuse();
   for(let i=1;i<versions.length;i++){
     const prior=versions[i-1],current=versions[i];
     const p=current.payload, previous=prior.payload;
     const a=p.metadata?.amendment;
     if(!a || a.previous_event_id!==prior.event_id ||
         a.previous_version!==previous.version ||
         p.version!=='v'+(Number(previous.version.slice(1))+1) ||
         p.principal_ref!==previous.principal_ref ||
         p.logical_agent_ref!==previous.logical_agent_ref)return refuse();
     const proposal={
       kind:'cop.mandate-amendment.proposal/v1',
       mandate_ref,previous_version:previous.version,new_version:p.version,
       previous_event_id:prior.event_id,
       principal_ref:p.principal_ref,logical_agent_ref:p.logical_agent_ref,
       scope:p.scope,valid_from:p.valid_from,valid_until:p.valid_until,
       reason:a.reason
     };
     const proof=verifyJohnAmendmentProof({
       proposal,proof:a.approval_proof,trustedPublicKeyPem,
       trustedSshPublicKey,expectedSshFingerprint,now:now()
     });
     if(!proof.verified || a.approval_evidence_ref!==proof.evidence_ref ||
         a.approval_scheme!==proof.scheme)return refuse();
   }
   return {verified:true,principal_ref:mandate.principal_ref,
     mandate_ref,issuer_fingerprint:fingerprint};
  }
  const {budget_ceiling,...scope}=mandate.scope;
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:mandate.mandate_id,version:mandate.version,
    principal_ref:mandate.principal_ref,logical_agent_ref:mandate.logical_agent_ref,
    valid_from:mandate.valid_from,valid_until:mandate.valid_until,
    scope,max_delegation_depth:mandate.metadata.max_delegation_depth,budget_limits:budget_ceiling};
  const approval={kind:'cogentia.principal-signature/v1',principal_ref:mandate.principal_ref,
    payload_hash:mandate.metadata.proposal_hash,key_fingerprint:mandate.metadata.issuer_fingerprint,
    signature_base64:mandate.metadata.signature_base64};
  const sshsig=mandate.metadata.signature_scheme==='sshsig';
  if(sshsig){approval.kind='cogentia.principal-sshsig/v1';approval.key_fingerprint=mandate.metadata.issuer_fingerprint;approval.signature=mandate.metadata.signature;}
  if(approval.key_fingerprint!==fingerprint)return refuse();
  const result=sshsig?verifyRootSshsig({proposal,approval,trustedPublicKey:trustedSshPublicKey,expectedFingerprint:expectedSshFingerprint,now:now()}):verifyJohnRootApproval({proposal,approval,trustedPublicKeyPem,now:now()});
  return result.ok ? {verified:true,principal_ref:mandate.principal_ref,mandate_ref,issuer_fingerprint:fingerprint}:refuse();
 };
}
