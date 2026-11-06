/** #299: atomic issuance adapter over the existing Inseme COP event store.
 * Requires an externally pinned issuer public key and independently protected
 * canonical store. Never call from the ordinary MCP credential by default.
 */
import {verifyJohnRootApproval} from './john-root-mandate.js';
import {verifyRootSshsig} from './john-sshsig-approval.js';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
export function issueVerifiedJohnRoot({store,proposal,approval,trustedPublicKeyPem,trustedSshPublicKey,expectedSshFingerprint,now}={}){
  const sshsig=approval?.kind==='cogentia.principal-sshsig/v1';
  const proof=sshsig ? verifyRootSshsig({proposal,approval,trustedPublicKey:trustedSshPublicKey,expectedFingerprint:expectedSshFingerprint,now}) : verifyJohnRootApproval({proposal,approval,trustedPublicKeyPem,now});
  if(!proof.ok)return {ok:false,error:proof.error};
  // Only canonical, atomic event stores qualify. No local parallel ledger.
  if(!store||typeof store.appendBatch!=='function'||typeof store.listTopic!=='function'||typeof store.replay!=='function')
    return {ok:false,error:'canonical_atomic_store_required'};
  const mandateTopic=`mandate:${proposal.mandate_id}`;
  const budgetId=`budget:${proposal.mandate_id}`;
  if(store.listTopic(mandateTopic).length||store.listTopic(`execution-budget:${budgetId}`).length)
    return {ok:false,error:'existing_authority_requires_versioned_amendment'};
  const staged=createMemoryCopEventStore();
  recordMandateDeclaration(staged,{
    mandate_id:proposal.mandate_id,version:proposal.version,
    principal_ref:proposal.principal_ref,logical_agent_ref:proposal.logical_agent_ref,
    valid_from:proposal.valid_from,valid_until:proposal.valid_until,
    scope:{...proposal.scope,budget_ceiling:proposal.budget_limits},
    metadata:{issuer_fingerprint:proof.issuer_fingerprint,proposal_hash:proof.proposal_hash,
      max_delegation_depth:proposal.max_delegation_depth,...(sshsig?{signature_scheme:'sshsig',signature:approval.signature}:{signature_base64:approval.signature_base64})}
  });
  recordExecutionBudgetGrant(staged,{budget_id:budgetId,mandate_ref:proposal.mandate_id,
    principal_ref:proposal.principal_ref,limits:proposal.budget_limits});
  const events=staged.replay();
  if(events.length!==2)return {ok:false,error:'staging_mismatch'};
  const result=store.appendBatch(events,{maxBatchSize:2});
  if(!result?.ok||result.results?.some(x=>x.duplicate))
    return {ok:false,error:result?.error||'authority_issuance_conflict'};
  return {ok:true,mandate_ref:proposal.mandate_id,proposal_hash:proof.proposal_hash,
    issuer_fingerprint:proof.issuer_fingerprint,event_ids:result.results.map(r=>r.event.event_id)};
}
