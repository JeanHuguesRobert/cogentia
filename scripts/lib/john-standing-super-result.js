/**
 * Local return of an observed administrative Act (#285).
 * The verifier is injected by the trusted host; no client-supplied verifier,
 * claimed success flag or packet history can prove a protected broker effect.
 * Recording a past outcome never issues authority or dispatches a command.
 */
import {createFractalogActRecord,validateFractalogActRecord} from '../../../inseme/packages/cop-core/src/fractalog.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
const deny=error=>({ok:false,error,grants_authority:false});
const hash=/^sha256:[a-f0-9]{64}$/;
const id=/^[-\w:.]{1,120}$/;
const str=(v,max=512)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function recordStandingSuperResult({resolvePacketContext,verifyBrokerReceipt,packet_ref,
 packet_claim_event_id,receipt_candidate}={}){
 if(!id.test(packet_ref||'')||!id.test(packet_claim_event_id||'')||
    typeof resolvePacketContext!=='function'||typeof verifyBrokerReceipt!=='function')
   return deny('trusted_packet_and_receipt_verifier_required');
 let c;
 try{c=resolvePacketContext({packet_ref})}catch{}
 const store=c?.store,topic='packet:'+packet_ref;
 if(!str(c?.primary_store_id)||!str(c?.budget_id)||typeof store?.transaction!=='function'||
    typeof store?.auditTopicCommitment!=='function')return deny('packet_primary_locality_unverified');
 const history=store.listTopic(topic),created=history[0]?.payload?.packet;
 const placements=created?.placements?.filter(p=>p.is_primary===true);
 if(created?.packet_id!==packet_ref||placements?.length!==1||placements[0].store_id!==c.primary_store_id||
    store.auditTopicCommitment(topic)?.ok!==true||
    store.auditTopicCommitment('execution-budget:'+c.budget_id)?.ok!==true)
   return deny('packet_primary_locality_unverified');
 const prepared=history.find(e=>e.event_id===packet_claim_event_id);
 const p=prepared?.payload;
 if(!p||!validateFractalogActRecord(p).ok||p.act_kind!=='host.process.run.super'||
    p.act_phase!=='attempt'||p.effect?.status!=='prepared_not_issued'||
    p.trace?.packet_ref!==packet_ref||p.trace?.primary_store_id!==c.primary_store_id||
    p.authority?.budget_id!==c.budget_id||p.authority?.allocation_ref!==c.allocation_ref||
    !str(p.authority?.budget_reservation_id)||!hash.test(p.effect?.payload_hash||''))
   return deny('packet_preparation_missing');
 // A verifier must obtain/validate evidence from the node locality, not
 // simply trust receipt_candidate. It returns a minimized canonical receipt.
 let proof;
 try{proof=verifyBrokerReceipt({candidate:receipt_candidate,packet_ref,
   packet_claim_event_id,prepared:structuredClone(p)})}catch{}
 const r=proof?.receipt;
 if(proof?.verified!==true||!r||r.schema!=='cogentia.super.packet-receipt/v1'||
    r.packet_ref!==packet_ref||r.packet_claim_event_id!==packet_claim_event_id||
    r.target!==p.effect.target||r.payload_hash!==p.effect.payload_hash||
    r.principal_ref!==p.governed_chain.principal_ref||
    r.actor_ref!==p.governed_chain.logical_agent_ref||
    r.mandate_ref!==p.governed_chain.mandate_ref||r.mandate_version!==p.governed_chain.mandate_version||
    r.budget_reservation_id!==p.authority.budget_reservation_id||
    r.before_state_hash!==p.effect.before_state_hash||
    !/^sea_[0-9a-f-]{36}$/.test(r.authorization_id||'')||
    !str(r.receipt_ref)||!hash.test(r.after_state_hash||'')||
    r.attempted!==true||typeof r.ok!=='boolean'||typeof r.timeout!=='boolean'||
    !(r.exit_code===null||Number.isInteger(r.exit_code))||
    (r.ok&&(r.exit_code!==0||r.timeout))||
    !Number.isFinite(Date.parse(r.observed_at)))
   return deny('protected_broker_receipt_unverified');
 // Explicit fields only: never copy stdout, stderr, command or credentials
 // from the node into the packet's cognitive history.
 const evidence={receipt_ref:r.receipt_ref,authorization_id:r.authorization_id,
   packet_claim_event_id,payload_hash:r.payload_hash,after_state_hash:r.after_state_hash,
   attempted:true,ok:r.ok,exit_code:r.exit_code,timeout:r.timeout,observed_at:r.observed_at};
 const digest=hashPayload(evidence),key='standing-super-result:'+packet_claim_event_id;
 const committed=store.transaction(tx=>{
   const local=tx.listTopic(topic);
   const prior=local.find(e=>e.idempotency_key===key);
   if(prior){
     if(prior.payload?.effect?.receipt_hash!==digest)throw Error('administrative_receipt_conflict');
     return {duplicate:true,event_id:prior.event_id};
   }
   const ledger=createEventSourcedExecutionBudgetLedger({store:tx,budget_id:c.budget_id,require_authority_grant:true});
   const settlement=ledger.settle({reservation_id:r.budget_reservation_id,
     expected_version:ledger.snapshot().version,usage:{max_steps:1},
     idempotency_key:key,evidence});
   if(!settlement?.ok||settlement.duplicate)throw Error('packet_budget_settlement_failed');
   const last=local.at(-1),parents=[...new Set([packet_claim_event_id,last?.event_id].filter(Boolean))];
   const log=createFractalogActRecord({
     record_id:'fractalog:'+key,act_id:p.act_id,act_kind:p.act_kind,
     act_phase:r.ok?'observed':'failed',owner_instance_ref:p.owner_instance_ref,
     governed_chain:p.governed_chain,visibility:'restricted',
     trace:{packet_ref,primary_store_id:c.primary_store_id,parent_event_ids:parents},
     authority:{...p.authority,authorization_id:r.authorization_id},
     effect:{target:r.target,execution_mode:'super',payload_hash:r.payload_hash,
       before_state_hash:r.before_state_hash,after_state_hash:r.after_state_hash,
       recovery_ref:p.effect.recovery_ref,receipt_ref:r.receipt_ref,
       receipt_hash:digest,attempted:true,ok:r.ok,exit_code:r.exit_code,timeout:r.timeout,
       observed_at:r.observed_at,budget_settlement:{max_steps:1}},
     links:[...parents.map(ref=>({ref,relation:'caused_by'})),{ref:r.receipt_ref,relation:'evidence'}]
   });
   const appended=tx.append({event_type:'fractalog.act-record/v1',topic:{id:topic,seq:local.length+1},
     actor_ref:r.actor_ref,subject_ref:packet_ref,packet_id:packet_ref,mandate_ref:r.mandate_ref,
     visibility:'restricted',epistemic_status:'observed',parent_event_ids:parents,
     idempotency_key:key,payload:log});
   if(!appended?.ok||appended.duplicate)throw Error('packet_result_append_failed');
   return {duplicate:false,event_id:appended.event.event_id};
 });
 if(!committed.ok)return deny(committed.error||'packet_result_commit_failed');
 return {ok:true,phase:'PACKET_ADMINISTRATIVE_RESULT_RECORDED',packet_ref,
   result_event_id:committed.value.event_id,duplicate:committed.value.duplicate,
   executed_ok:r.ok,budget_settled:true,grants_authority:false};
}
