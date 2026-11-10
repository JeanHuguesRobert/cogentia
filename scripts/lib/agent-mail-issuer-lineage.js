/**
 * Verify a canonical JHN root mandate amendment chain for agent.mail.
 * V1: independently pinned signed root; later versions: the existing
 * Supabase-authenticated exact consent request/approval/consumption ledger.
 * No signature or mandate is minted by this verifier.
 */
import {mandateProposalHash} from './cop-proposal-digest.js';

const DECL='MandateDeclaration';
const is=(e,kind)=>e?.payload?.kind===kind;
const deny=()=>({verified:false});
export function createAgentMailIssuerLineageVerifier({store,verifyRootIssuer}={}) {
  if(!store?.replay||typeof verifyRootIssuer!=='function')throw Error('mail_issuer_lineage_dependencies_missing');
  return function verifyIssuer({mandate,mandate_ref}={}) {
    if(!mandate||!mandate_ref)return deny();
    const all=store.replay();
    const declarations=all.filter(e=>is(e,DECL)&&e.payload?.mandate_id===mandate_ref);
    if(!declarations.length)return deny();
    const first=declarations[0];
    if(first.payload.version!=='v1')return deny();
    const rootProof=verifyRootIssuer({mandate:first.payload,mandate_ref,store});
    if(rootProof?.verified!==true||rootProof.principal_ref!==first.payload.principal_ref||rootProof.mandate_ref!==mandate_ref)return deny();
    for(let i=1;i<declarations.length;i++) {
      const prev=declarations[i-1],next=declarations[i];
      const annotation=next.payload.metadata?.amendment;
      if(!annotation||annotation.previous_event_id!==prev.event_id||
          annotation.previous_version!==prev.payload.version||
          next.payload.version!==`v${i+1}`||
          next.payload.principal_ref!==prev.payload.principal_ref||
          next.payload.logical_agent_ref!==prev.payload.logical_agent_ref||
          annotation.approval_scheme!=='supabase_authenticated_exact_consent_v1')return deny();
      const consumed=all.find(e=>e.event_id===annotation.approval_evidence_ref);
      if(!is(consumed,'PrincipalConsentConsumed'))return deny();
      const topic=consumed.topic?.id;
      const history=all.filter(e=>e.topic?.id===topic);
      const request=history.find(e=>is(e,'PrincipalConsentRequested'));
      const approved=history.find(e=>is(e,'PrincipalConsentApproved'));
      if(history.length!==3||!request||!approved)return deny();
      const proposal=request.payload.proposal;
      if(proposal?.kind!=='cop.mandate-amendment.proposal/v1'||
         proposal.mandate_ref!==mandate_ref||
         proposal.previous_event_id!==prev.event_id||
         proposal.previous_version!==prev.payload.version||
         proposal.new_version!==next.payload.version||
         proposal.principal_ref!==next.payload.principal_ref||
         proposal.logical_agent_ref!==next.payload.logical_agent_ref||
         proposal.valid_from!==next.payload.valid_from||
         proposal.valid_until!==next.payload.valid_until||
         JSON.stringify(proposal.scope)!==JSON.stringify(next.payload.scope)||
         proposal.reason!==annotation.reason)return deny();
      const digest=mandateProposalHash(proposal);
      if(request.payload.payload_hash!==digest||approved.payload.payload_hash!==digest||
         consumed.payload.payload_hash!==digest||
         approved.payload.request_event_id!==request.event_id||
         consumed.payload.request_event_id!==request.event_id||
         consumed.payload.approved_event_id!==approved.event_id||
         approved.payload.channel!=='supabase-auth-session')return deny();
    }
    if(declarations.at(-1).payload.version!==mandate.version||
       JSON.stringify(declarations.at(-1).payload.scope)!==JSON.stringify(mandate.scope))return deny();
    return {verified:true,principal_ref:mandate.principal_ref,mandate_ref,
      lineage_versions:declarations.length,root_fingerprint:rootProof.issuer_fingerprint};
  };
}
