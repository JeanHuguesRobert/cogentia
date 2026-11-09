/**
 * Optional mandate amendment bridge anchored to the existing Supabase instance
 * Principal binding. Uses Inseme's canonical append-only COP amendment; neither
 * Vault possession nor a transport bearer is a human approval.
 *
 * All operational adapters are injected by a trusted server composition.
 * There is no generic MCP mutation endpoint in this module.
 */
import {amendMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
const fail=error=>({ok:false,error});
export function createVaultAnchoredMandateAmendment({preflight,store,verifyExactApproval}={}) {
  return Object.freeze({
    async amend({session,mandate,approval}={}) {
      if(typeof preflight?.inspect!=='function')return fail('principal_binding_preflight_unavailable');
      const identity=await preflight.inspect({session});
      if(identity?.ok!==true||identity?.principal_ref!=='principal:jhn'||identity?.authenticated!==true)
        return fail(identity?.reason || 'principal_identity_unverified');
      if(typeof verifyExactApproval!=='function')return fail('trusted_approval_verifier_unavailable');
      // The trusted verifier must validate Principal session, full canonical
      // proposal bytes, user approval intent and fresh single-use evidence.
      // The COP amendment checks expected version, revocation and event chain.
      const result=amendMandate(store,{...mandate,approval},{
        verifyPrincipalApproval:(proposal,presented)=>{
          try {
            const proof=verifyExactApproval({session,proposal,presented});
            if(!proof||proof.verified!==true||proof.principal_ref!=='principal:jhn'||
               typeof proof.evidence_ref!=='string'||!proof.evidence_ref.trim())return {verified:false};
            return proof;
          }catch{return {verified:false};}
        }
      });
      return result;
    }
  });
}
