/**
 * Compose independently signed effect approval with existing Inseme COP
 * mandate and execution-budget controls. No shell execution. Root-owned
 * grant materialization is a separate protected issuer stage.
 */
import {verifySignedEffectApproval} from '../super/principal-effect-issuer.mjs';
import {evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
const deny=error=>({ok:false,error,grant:null});
export function admitSignedSuperEffect({store,proposal,signature,trustedPublicKey,now,verifiedSignature,issuerVerified=false}={}){
 // Caller assertion cannot enroll an issuer; root-owned caller must provide a
 // store whose own control plane has already verified its ownership/trust.
 if(issuerVerified!==true)return deny('trusted_issuer_context_required');
 if(!store?.append||!store?.listTopic||!store?.replay)return deny('canonical_cop_store_required');
 const proof=verifySignedEffectApproval({proposal,signature,trustedPublicKey,now,verifySignature:verifiedSignature});
 if(!proof.ok)return deny(proof.error);
 const {mandate_ref,mandate_version,principal_ref,actor_ref,effect,budget_reservation_id}=proposal;
 const check=evaluateMandate(store,{mandate_ref,version_pin:mandate_version,expected_principal_ref:principal_ref,expected_actor_ref:actor_ref,capability:effect.action_class,at_time:now});
 if(!check.granted)return deny(check.error||'canonical_mandate_denied');
 const budgetId='budget:'+mandate_ref;
 const events=store.listTopic('execution-budget:'+budgetId);
 if(!events.some(x=>x.event_type==='ExecutionBudgetGrant'&&x.payload?.mandate_ref===mandate_ref))return deny('funded_budget_missing');
 const reserved=events.filter(x=>x.event_type==='ExecutionBudgetReservation'&&x.payload?.reservation?.reservation_id===budget_reservation_id);
 if(reserved.length!==1||reserved[0]?.payload?.reservation?.status!=='reserved')return deny('canonical_reservation_missing');
 // For live issuance, caller must check reservation not settled/released at
 // the canonical ledger projection and atomically claim it before dispatch.
 // This function deliberately does not return an executable grant.
 return {ok:true,admitted:true,proof,mandate_ref,mandate_version,budget_reservation_id,
   effect,grant:null,requires_atomic_claim:true,requires_root_store_issuance:true};
}
