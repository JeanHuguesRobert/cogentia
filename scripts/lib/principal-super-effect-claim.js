/**
 * Atomic COP claim for one independently approved privileged effect.
 * This does not run anything, issue an OS grant or authenticate a person.
 * Must be invoked exclusively by an installed protected Principal issuer.
 */
import {createCopEventEnvelope} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {admitSignedSuperEffect} from './principal-super-effect-admission.js';
const fail=error=>({ok:false,error,grant:null});
export function claimSignedSuperEffect({store,...approval}={}){
 if(!store?.append||!store?.listTopic||!store?.replay)return fail('canonical_cop_store_required');
 // The actual issuer must own the COP store and perform this operation inside
 // its independently verified authority boundary. An agent cannot issue by
 // calling this function with invented claims.
 const admitted=admitSignedSuperEffect({store,...approval});
 if(!admitted.ok)return fail(admitted.error);
 const {proposal_hash}=admitted.proof;
 const topicId=`privileged-issuer:${admitted.budget_reservation_id}`;
 const event=createCopEventEnvelope({
  event_type:'PrivilegedEffectClaim',
  topic:{id:topicId,seq:1},
  epistemic_status:'normative',
  actor_ref:admitted.proof.principal_ref,
  subject_ref:admitted.mandate_ref,
  mandate_ref:admitted.mandate_ref,
  visibility:'restricted',
  idempotency_key:`privileged-issuer:claim:${admitted.budget_reservation_id}`,
  payload:{kind:'PrivilegedEffectClaim',proposal_hash,mandate_version:admitted.mandate_version,
   budget_reservation_id:admitted.budget_reservation_id,effect_hash:admitted.effect.payload_hash,
   verification:'independent_sshsig',status:'claimed_pending_root_grant'},
 });
 const saved=store.append(event);
 if(!saved?.ok||saved.duplicate)return fail(saved?.error||'privileged_effect_already_claimed');
 return {ok:true,phase:'COP_CLAIMED_NOT_ISSUED',event_id:saved.event.event_id,
  proposal_hash,mandate_ref:admitted.mandate_ref,
  mandate_version:admitted.mandate_version,budget_reservation_id:admitted.budget_reservation_id,
  effect_hash:admitted.effect.payload_hash,requires_protected_root_issuance:true,grant:null};
}
