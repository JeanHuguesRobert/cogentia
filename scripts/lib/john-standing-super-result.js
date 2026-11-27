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
 if(proof?.verified!==true||!r||r.schema!=='cogentia.super.packet-receipt/v2'||
    r.packet_ref!==packet_ref||r.packet_claim_event_id!==packet_claim_event_id||
    r.target!==p.effect.target||r.payload_hash!==p.effect.payload_hash||
    r.principal_ref!==p.governed_chain.principal_ref||
    r.actor_ref!==p.governed_chain.logical_agent_ref||
    r.mandate_ref!==p.governed_chain.mandate_ref||r.mandate_version!==p.governed_chain.mandate_version||
    r.budget_reservation_id!==p.authority.budget_reservation_id||
    r.before_state_hash!==p.effect.before_state_hash||
    !/^sea_[0-9a-f-]{36}$/.test(r.authorization_id||'')||
    !str(r.receipt_ref)||
    r.attempted!==true||typeof r.ok!=='boolean'||typeof r.timeout!=='boolean'||
    !(r.exit_code===null||Number.isInteger(r.exit_code))||
    (r.ok&&(r.exit_code!==0||r.timeout))||
    !Number.isFinite(Date.parse(r.observed_at)))
   return deny('protected_broker_receipt_unverified');
 // Explicit fields only: execution accounting never depends on observing
 // the resource state. State evidence is a separate causal event.
 const evidence={receipt_ref:r.receipt_ref,authorization_id:r.authorization_id,
   packet_claim_event_id,payload_hash:r.payload_hash,
   attempted:true,ok:r.ok,exit_code:r.exit_code,timeout:r.timeout,observed_at:r.observed_at};
 const digest=hashPayload(evidence),key='standing-super-result:'+packet_claim_event_id;
 const o=proof.observation;
 const observationValid=o&&str(o.observation_ref)&&str(o.evidence_ref)&&
   o.execution_receipt_ref===r.receipt_ref&&hash.test(o.after_state_hash||'')&&
   Number.isFinite(Date.parse(o.observed_at))&&Date.parse(o.observed_at)>=Date.parse(r.observed_at);
 const observation=observationValid?{observation_ref:o.observation_ref,
   evidence_ref:o.evidence_ref,execution_receipt_ref:r.receipt_ref,
   after_state_hash:o.after_state_hash,observed_at:o.observed_at}:null;
 const observationError=proof.observation_error||(o&&!observationValid?'protected_state_observation_unverified':null);
 const obsKey=key+':state';
 const committed=store.transaction(tx=>{
   const local=tx.listTopic(topic);
   const prior=local.find(e=>e.idempotency_key===key);
   let resultId=prior?.event_id;
   if(prior){
     if(prior.payload?.effect?.receipt_hash!==digest)throw Error('administrative_receipt_conflict');
   }else{
     const ledger=createEventSourcedExecutionBudgetLedger({store:tx,budget_id:c.budget_id,require_authority_grant:true});
     const settlement=ledger.settle({reservation_id:r.budget_reservation_id,
       expected_version:ledger.snapshot().version,usage:{max_steps:1},
       idempotency_key:key,evidence});
     if(!settlement?.ok||settlement.duplicate)throw Error('packet_budget_settlement_failed');
     const parents=[...new Set([packet_claim_event_id,local.at(-1)?.event_id].filter(Boolean))];
     const log=createFractalogActRecord({
       record_id:'fractalog:'+key,act_id:p.act_id,act_kind:p.act_kind,
       act_phase:r.ok?'observed':'failed',owner_instance_ref:p.owner_instance_ref,
       governed_chain:p.governed_chain,visibility:'restricted',
       trace:{packet_ref,primary_store_id:c.primary_store_id,parent_event_ids:parents},
       authority:{...p.authority,authorization_id:r.authorization_id},
       effect:{target:r.target,execution_mode:'super',payload_hash:r.payload_hash,
         before_state_hash:r.before_state_hash,recovery_ref:p.effect.recovery_ref,
         receipt_ref:r.receipt_ref,receipt_hash:digest,attempted:true,ok:r.ok,
         exit_code:r.exit_code,timeout:r.timeout,observed_at:r.observed_at,
         budget_settlement:{max_steps:1},postcondition_status:'unassessed'},
       links:[...parents.map(ref=>({ref,relation:'caused_by'})),{ref:r.receipt_ref,relation:'evidence'}]
     });
     const appended=tx.append({event_type:'fractalog.act-record/v1',topic:{id:topic,seq:local.length+1},
       actor_ref:r.actor_ref,subject_ref:packet_ref,packet_id:packet_ref,mandate_ref:r.mandate_ref,
       visibility:'restricted',epistemic_status:'observed',parent_event_ids:parents,
       idempotency_key:key,payload:log});
     if(!appended?.ok||appended.duplicate)throw Error('packet_result_append_failed');
     resultId=appended.event.event_id;
   }
   return {duplicate:!!prior,event_id:resultId};
 });
 if(!committed.ok)return deny(committed.error||'packet_result_commit_failed');
 // Resource observation is independent even if its journal append fails.
 // Never roll back a known execution or charge again to repair this trace.
 const resultId=committed.value.event_id;
 const observed=store.transaction(tx=>{
   const local=tx.listTopic(topic);
   const priorObservation=local.find(e=>e.idempotency_key===obsKey);
   if(!observation)return {duplicate:true,event_id:priorObservation?.event_id??null};
   const obsDigest=hashPayload(observation);
   if(priorObservation){
     return {duplicate:true,event_id:priorObservation.event_id,
       conflict:priorObservation.payload?.effect?.observation_hash!==obsDigest};
   }
   const parents=[...new Set([resultId,local.at(-1)?.event_id].filter(Boolean))];
   const log=createFractalogActRecord({
     record_id:'fractalog:'+obsKey,act_id:p.act_id,act_kind:p.act_kind,
     act_phase:'observed',owner_instance_ref:p.owner_instance_ref,
     governed_chain:p.governed_chain,visibility:'restricted',
     trace:{packet_ref,primary_store_id:c.primary_store_id,parent_event_ids:parents},
     authority:{...p.authority,authorization_id:r.authorization_id},
     effect:{target:r.target,payload_hash:r.payload_hash,before_state_hash:r.before_state_hash,
       recovery_ref:p.effect.recovery_ref,...observation,observation_hash:obsDigest,
       postcondition_status:'unassessed'},
     links:[...parents.map(ref=>({ref,relation:'caused_by'})),
       {ref:observation.observation_ref,relation:'evidence'}]
   });
   const appended=tx.append({event_type:'fractalog.act-record/v1',topic:{id:topic,seq:local.length+1},
     actor_ref:r.actor_ref,subject_ref:packet_ref,packet_id:packet_ref,mandate_ref:r.mandate_ref,
     visibility:'restricted',epistemic_status:'observed',parent_event_ids:parents,
     idempotency_key:obsKey,payload:log});
   if(!appended?.ok||appended.duplicate)throw Error('packet_state_observation_append_failed');
   return {duplicate:false,event_id:appended.event.event_id};
 });
 const obs=observed.ok?observed.value:null;
 return {ok:true,phase:'PACKET_ADMINISTRATIVE_RESULT_RECORDED',packet_ref,
   result_event_id:committed.value.event_id,duplicate:committed.value.duplicate&&obs?.duplicate===true,
   executed_ok:r.ok,budget_settled:true,state_observation_event_id:obs?.event_id??null,
   state_observed:!!obs?.event_id,
   observation_error:!observed.ok?(observed.error||'packet_state_observation_commit_failed'):
     obs?.conflict?'administrative_observation_conflict':observationError,
   postcondition_status:'unassessed',assessment_required:true,grants_authority:false};
}

// A work owner's judgment belongs in the packet, not the node audit or
// budget ledger. This projection is about remaining responsibility, not
// admission to execute a repair. Only a trusted host may record judgments.
function administrativePacket(resolvePacketContext,packet_ref){
 if(!id.test(packet_ref||'')||typeof resolvePacketContext!=='function')return null;
 try{
   const c=resolvePacketContext({packet_ref}),store=c?.store,topic='packet:'+packet_ref;
   if(!str(c?.primary_store_id)||typeof store?.transaction!=='function'||
      store.auditTopicCommitment(topic)?.ok!==true)return null;
   const history=store.listTopic(topic),created=history[0]?.payload?.packet;
   const primary=created?.placements?.filter(x=>x.is_primary===true);
   if(created?.packet_id!==packet_ref||primary?.length!==1||
      primary[0].store_id!==c.primary_store_id)return null;
   return {store,topic,context:c,history};
 }catch{return null}
}

function actRecords(history,claimId){
 const claim=history.find(e=>e.event_id===claimId),p=claim?.payload;
 if(!p||!validateFractalogActRecord(p).ok||p.act_kind!=='host.process.run.super'||
    p.act_phase!=='attempt'||p.effect?.status!=='prepared_not_issued')return null;
 const key='standing-super-result:'+claimId;
 const find=suffix=>history.find(e=>e.idempotency_key===key+suffix);
 const result=find(''),observation=find(':state'),assessment=find(':assessment'),resolution=find(':repair-resolution');
 for(const row of [result,observation,assessment,resolution].filter(Boolean)){
   if(!validateFractalogActRecord(row.payload).ok||row.payload.act_id!==p.act_id)return null;
 }
 if(observation&&(!result||observation.payload.effect.execution_receipt_ref!==result.payload.effect.receipt_ref||
    !observation.parent_event_ids?.includes(result.event_id)))return null;
 if(assessment&&(!observation||assessment.payload.effect.observation_event_id!==observation.event_id||
    !assessment.parent_event_ids?.includes(observation.event_id)))return null;
 if(resolution&&(!assessment||resolution.payload.effect.assessment_event_id!==assessment.event_id||
    !resolution.parent_event_ids?.includes(assessment.event_id)))return null;
 return {claim,p,key,result,observation,assessment,resolution};
}

/** Packet-local read model. No second source of obligation state.
 * Ready means accountability has been addressed, NOT that the original
 * purpose succeeded or that all other packet completion criteria are met.
 */
export function projectStandingSuperResponsibilities({resolvePacketContext,packet_ref}={}){
 const c=administrativePacket(resolvePacketContext,packet_ref);
 if(!c)return deny('packet_primary_locality_unverified');
 const acts=[];
 for(const e of c.history){
   if(e.payload?.act_kind!=='host.process.run.super'||e.payload?.act_phase!=='attempt'||
      e.payload?.effect?.status!=='prepared_not_issued')continue;
   const a=actRecords(c.history,e.event_id);
   if(!a)return deny('administrative_responsibility_history_invalid');
   const judgment=a.assessment?.payload.effect,disposition=a.resolution?.payload.effect;
   acts.push({packet_claim_event_id:e.event_id,responsible_agent_ref:a.p.governed_chain.logical_agent_ref,
     result_event_id:a.result?.event_id??null,observation_event_id:a.observation?.event_id??null,
     assessment_event_id:a.assessment?.event_id??null,
     postcondition:judgment?.postcondition??'unassessed',
     repair_status:judgment?.repair_required===true?(disposition?.disposition??'open'):
       judgment?'not_required':'unassessed',
     ...(disposition?.disposition==='transferred'?{repair_packet_ref:disposition.repair_packet_ref}:{}),
     resolution_event_id:a.resolution?.event_id??null});
 }
 return {ok:true,packet_ref,acts,accountability_ready:acts.every(a=>
   a.result_event_id&&a.observation_event_id&&a.assessment_event_id&&
   ['not_required','repaired','transferred'].includes(a.repair_status)),
   grants_authority:false};
}

// The responsible handler supplies an independently checked judgment of the
// actual observation and applicable purpose. Never infer damage or success
// from the exit code, the state hash alone, or a candidate's assertion.
export function recordStandingSuperJudgment({resolvePacketContext,verifyJudgment,packet_ref,
 packet_claim_event_id,candidate,kind='assessment'}={}){
 const c=administrativePacket(resolvePacketContext,packet_ref);
 if(!c||!id.test(packet_claim_event_id||'')||typeof verifyJudgment!=='function'||
    !['assessment','repair-resolution'].includes(kind))return deny('trusted_judgment_context_required');
 const a=actRecords(c.history,packet_claim_event_id);
 if(!a?.result||!a.observation)return deny('administrative_state_observation_missing');
 const basis=kind==='assessment'?a.observation:a.assessment;
 if(!basis||kind==='repair-resolution'&&a.assessment.payload.effect.repair_required!==true)
   return deny('repair_obligation_missing');
 let verified;
 try{verified=verifyJudgment({candidate,kind,packet_ref,
   prepared:structuredClone(a.p),basis:structuredClone(basis)})}catch{}
 if(verified?.verified!==true||verified.basis_event_id!==basis.event_id||
    verified.responsible_agent_ref!==a.p.governed_chain.logical_agent_ref||
    !str(verified.evidence_ref))return deny('responsible_judgment_unverified');
 let judgment;
 if(kind==='assessment'){
   if(!['satisfied','unsatisfied'].includes(verified.postcondition)||
      typeof verified.repair_required!=='boolean'||
      verified.repair_required&&!str(verified.repair_purpose))
     return deny('administrative_assessment_invalid');
   judgment={observation_event_id:basis.event_id,postcondition:verified.postcondition,
     repair_required:verified.repair_required,
     ...(verified.repair_required?{repair_purpose:verified.repair_purpose}:{}),
     evidence_ref:verified.evidence_ref};
 }else{
   if(!['repaired','transferred'].includes(verified.disposition)||
      !str(verified.repair_packet_ref)||
      verified.disposition==='transferred'&&verified.repair_packet_ref===packet_ref)
     return deny('repair_disposition_invalid');
   // The host verifier checks actual repair evidence or explicit acceptance
   // by the recipient work's responsible handler. A packet ID is not proof.
   judgment={assessment_event_id:basis.event_id,disposition:verified.disposition,
     repair_packet_ref:verified.repair_packet_ref,evidence_ref:verified.evidence_ref};
 }
 const key=a.key+':'+kind,digest=hashPayload(judgment);
 const saved=c.store.transaction(tx=>{
   const local=tx.listTopic(c.topic),current=actRecords(local,packet_claim_event_id);
   if(!current||((kind==='assessment'?current.observation:current.assessment)?.event_id!==basis.event_id))
     throw Error('administrative_judgment_basis_changed');
   const old=local.find(e=>e.idempotency_key===key);
   if(old){
     if(old.payload?.effect?.judgment_hash!==digest)throw Error('administrative_judgment_conflict');
     return {duplicate:true,event_id:old.event_id};
   }
   const parents=[...new Set([basis.event_id,local.at(-1)?.event_id].filter(Boolean))];
   const log=createFractalogActRecord({
     record_id:'fractalog:'+key,act_id:a.p.act_id,act_kind:a.p.act_kind,
     act_phase:'observed',owner_instance_ref:a.p.owner_instance_ref,
     governed_chain:a.p.governed_chain,visibility:'restricted',
     trace:{packet_ref,primary_store_id:c.context.primary_store_id,parent_event_ids:parents},
     effect:{target:a.p.effect.target,judgment_kind:kind,judgment_hash:digest,...judgment},
     links:[...parents.map(ref=>({ref,relation:'caused_by'})),{ref:judgment.evidence_ref,relation:'evidence'}]
   });
   const result=tx.append({event_type:'fractalog.act-record/v1',topic:{id:c.topic,seq:local.length+1},
     actor_ref:verified.responsible_agent_ref,subject_ref:packet_ref,packet_id:packet_ref,
     mandate_ref:a.p.governed_chain.mandate_ref,visibility:'restricted',epistemic_status:'decided',
     parent_event_ids:parents,idempotency_key:key,payload:log});
   if(!result?.ok||result.duplicate)throw Error('administrative_judgment_append_failed');
   return {duplicate:false,event_id:result.event.event_id};
 });
 if(!saved.ok)return deny(saved.error||'administrative_judgment_commit_failed');
 return {ok:true,...saved.value,grants_authority:false};
}
