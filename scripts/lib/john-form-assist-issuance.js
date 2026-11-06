/** Separate, signed, atomic Inseme mandate for form assistance. */
import {verifyFormAssistApproval,FORM_ASSIST_KIND,FORM_ASSIST_MANDATE,FORM_ASSIST_NAMESPACE} from './john-form-assist-mandate.js';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
export function issueFormAssistMandate({store,proposal,approval,trustedSshPublicKey,expectedFingerprint,now}={}){
 const proof=verifyFormAssistApproval({proposal,approval,trustedSshPublicKey,expectedFingerprint,now});
 if(!proof.ok)return proof;
 if(!store||typeof store.appendBatch!=='function'||typeof store.listTopic!=='function')return {ok:false,error:'canonical_atomic_store_required'};
 const ref=FORM_ASSIST_MANDATE,budget='budget:'+ref;
 if(store.listTopic('mandate:'+ref).length||store.listTopic('execution-budget:'+budget).length)return {ok:false,error:'existing_form_authority_requires_amendment'};
 const staged=createMemoryCopEventStore();
 recordMandateDeclaration(staged,{mandate_id:ref,version:proposal.version,principal_ref:proposal.principal_ref,logical_agent_ref:proposal.logical_agent_ref,valid_from:proposal.valid_from,valid_until:proposal.valid_until,scope:{...proposal.scope,budget_ceiling:proposal.budget_limits},metadata:{issuer_fingerprint:proof.issuer_fingerprint,proposal_hash:proof.proposal_hash,signature_scheme:'sshsig',signature_namespace:FORM_ASSIST_NAMESPACE,signature:approval.signature,max_delegation_depth:0}});
 recordExecutionBudgetGrant(staged,{budget_id:budget,mandate_ref:ref,principal_ref:proposal.principal_ref,limits:proposal.budget_limits});
 const result=store.appendBatch(staged.replay(),{maxBatchSize:2});
 if(!result?.ok||result.results?.some(x=>x.duplicate))return {ok:false,error:result?.error||'canonical_form_issuance_conflict'};
 return {ok:true,mandate_ref:ref,event_ids:result.results.map(x=>x.event.event_id),proposal_hash:proof.proposal_hash};
}
export function createFormAssistIssuerVerifier({trustedSshPublicKey,expectedFingerprint,now=()=>new Date()}={}){
 return function verifyIssuer({mandate,mandate_ref}={}){
  const fail=()=>({verified:false});
  if(!mandate||mandate_ref!==FORM_ASSIST_MANDATE||mandate.mandate_id!==mandate_ref)return fail();
  const {budget_ceiling,...scope}=mandate.scope||{};
  const proposal={kind:FORM_ASSIST_KIND,mandate_id:mandate.mandate_id,
    version:mandate.version,principal_ref:mandate.principal_ref,
    logical_agent_ref:mandate.logical_agent_ref,valid_from:mandate.valid_from,
    valid_until:mandate.valid_until,scope,
    max_delegation_depth:mandate.metadata?.max_delegation_depth,budget_limits:budget_ceiling};
  if(mandate.metadata?.signature_scheme!=='sshsig'||mandate.metadata?.signature_namespace!==FORM_ASSIST_NAMESPACE)return fail();
  const approval={kind:'cogentia.principal-sshsig/v1',principal_ref:mandate.principal_ref,
    payload_hash:mandate.metadata.proposal_hash,key_fingerprint:mandate.metadata.issuer_fingerprint,
    signature:mandate.metadata.signature};
  const r=verifyFormAssistApproval({proposal,approval,trustedSshPublicKey,expectedFingerprint,now:now()});
  return r.ok?{verified:true,mandate_ref,principal_ref:'principal:jhn'}:fail();
 };
}
