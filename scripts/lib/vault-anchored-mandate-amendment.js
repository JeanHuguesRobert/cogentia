/**
 * Production-composition seam for a versioned COP mandate amendment. The
 * Principal's Supabase identity is verified via the JHN instance binding.
 * A *separate, trusted* asynchronous verifier must check and consume a fresh,
 * single-use, exact-proposal human approval (e.g. OAuth step-up challenge).
 * Supabase service role / MCP bearer / agent utterance is NOT such an issuer.
 *
 * No HTTP, MCP or CLI API is exported by this module. The real issuer and
 * immutable approval UI must be wired in a distinct trusted process before
 * operational activation; this library has no defaults or permissive mode.
 */
import {amendMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {mandateProposalHash} from './cop-proposal-digest.js';
export {mandateProposalHash} from './cop-proposal-digest.js';
const fail=error=>({ok:false,error});

export function createVaultAnchoredMandateAmendment({preflight,store,verifyExactApproval}={}) {
  return Object.freeze({
    async amend({session,mandate,approval}={}) {
      if(typeof preflight?.inspect!=='function')return fail('principal_binding_preflight_unavailable');
      let identity;
      try{identity=await preflight.inspect({session});}
      catch{return fail('principal_identity_unverified');}
      if(identity?.ok!==true||identity?.principal_ref!=='principal:jhn'||identity?.authenticated!==true)
        return fail(identity?.reason || 'principal_identity_unverified');
      if(typeof verifyExactApproval!=='function')return fail('trusted_approval_verifier_unavailable');
      // Extract the canonical COP proposal with the kernel's actual
      // validate/version/revocation rules. The first call refuses approval
      // and cannot append an event; it is the draft/EXPOSE phase.
      let proposal;
      let draft;
      try {
        draft=amendMandate(store,{...mandate,approval},{
          verifyPrincipalApproval:generated=>{proposal=generated;return {verified:false};}
        });
      } catch{return fail('mandate_preparation_failed');}
      if(!proposal)return draft?.ok?fail('unexpected_draft_mutation'):draft;
      if(draft?.ok || draft?.error!=='principal_approval_unverified')return fail('mandate_preparation_inconsistent');
      const payload_hash=mandateProposalHash(proposal);
      let evidence;
      try {
        evidence=await verifyExactApproval({session,proposal,payload_hash,presented:approval});
      } catch{return fail('principal_approval_unverified');}
      if(!evidence||evidence.verified!==true||evidence.principal_ref!=='principal:jhn'||
          evidence.payload_hash!==payload_hash||evidence.single_use!==true||
          evidence.consumed!==true||typeof evidence.evidence_ref!=='string'||!evidence.evidence_ref)
        return fail('principal_approval_unverified');
      // Revalidate the same proposal at commit time. A concurrent amendment,
      // revocation, changed version/scope or expiry invalidates the approval.
      try {
        return amendMandate(store,{...mandate,approval},{
          verifyPrincipalApproval:current=>mandateProposalHash(current)===payload_hash
            ? {verified:true,principal_ref:'principal:jhn',evidence_ref:evidence.evidence_ref,
               scheme:evidence.scheme||'independent_exact_approval'}
            : {verified:false}
        });
      }catch{return fail('mandate_commit_failed');}
    }
  });
}
