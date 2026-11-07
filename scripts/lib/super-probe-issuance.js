/** Single-use, independently signed test authority: canonical reserve before root broker grant.
 * Never used by the normal MCP token or an agent-origin grant.
 */
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {prepareHostProcessRun} from './host-process-prepare.js';
import {verifySuperProbeApproval,SUPER_PROBE_MANDATE} from './super-probe-approval.js';
import {proposalHash} from './john-root-mandate.js';

export function issueSignedSuperProbe({store,proposal,signature,trustedPublicKey,expectedFingerprint,now,issueRootGrant}={}){
 const refuse=error=>({ok:false,error});
 const proof=verifySuperProbeApproval({proposal,signature,trustedPublicKey,expectedFingerprint,now});
 if(!proof.ok)return refuse(proof.error);
 if(typeof issueRootGrant!=='function'||!store||typeof store.appendBatch!=='function'||typeof store.listTopic!=='function')
  return refuse('trusted_issuer_context_required');
 const ref=SUPER_PROBE_MANDATE,budgetRef='budget:'+ref;
 if(store.listTopic('mandate:'+ref).length||store.listTopic('execution-budget:'+budgetRef).length)
  return refuse('super_probe_already_issued');
 const prepared=prepareHostProcessRun({command:proposal.effect.command,target:proposal.effect.target,
   provider:proposal.effect.provider,execution_mode:proposal.effect.execution_mode,
   timeout_ms:proposal.effect.timeout_ms});
 if(prepared.payload_hash!==proposal.effect.payload_hash)return refuse('super_probe_effect_hash_mismatch');
 const staged=createMemoryCopEventStore();
 recordMandateDeclaration(staged,{mandate_id:ref,version:'v1',principal_ref:proposal.principal_ref,
   logical_agent_ref:proposal.actor_ref,valid_from:proposal.valid_from,valid_until:proposal.valid_until,
   scope:{allowed_actions:['host.process.run'],execution_mode:'super',target:'node:fracta2',
     effect_hash:proposal.effect.payload_hash,budget_ceiling:proposal.budget_limits},
   metadata:{issuer_fingerprint:proof.issuer_fingerprint,proposal_hash:proof.proposal_hash,
     signature_namespace:'cogentia-super-probe-v1',signature,one_use:true}});
 recordExecutionBudgetGrant(staged,{budget_id:budgetRef,mandate_ref:ref,
   principal_ref:proposal.principal_ref,limits:proposal.budget_limits});
 const appended=store.appendBatch(staged.replay(),{maxBatchSize:2});
 if(!appended?.ok||appended.results?.some(x=>x.duplicate))return refuse('canonical_probe_issuance_failed');
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:budgetRef,
   limits:proposal.budget_limits,require_authority_grant:true});
 const reservation=ledger.reserve({idempotency_key:'signed-super-probe:'+proposalHash(proposal),
   expected_version:ledger.snapshot().version,demand:{max_steps:1}});
 if(!reservation.ok||reservation.duplicate)return refuse('canonical_probe_reservation_failed');
 // The callback must be ROOT-owned and must verify root store protection.
 // The signed approval does not give this module authority to write the root store.
 let grant;
 try {grant=issueRootGrant({prepared,principal:proposal.principal_ref,actor:proposal.actor_ref,
   mandate_ref:ref,budget_reservation_id:reservation.reservation.reservation_id,
   authority_origin:'principal'});}
 catch {return {ok:false,error:'root_grant_issuance_failed',reservation_id:reservation.reservation.reservation_id};}
 if(!grant?.authorization_id||grant.payload_hash!==proposal.effect.payload_hash||
   grant.authority_origin!=='principal'||grant.mandate_ref!==ref||grant.single_use!==true)
  return {ok:false,error:'root_grant_receipt_invalid',reservation_id:reservation.reservation.reservation_id};
 return {ok:true,mandate_ref:ref,authorization_id:grant.authorization_id,
   payload_hash:grant.payload_hash,reservation_id:reservation.reservation.reservation_id,
   event_ids:appended.results.map(x=>x.event.event_id)};
}
