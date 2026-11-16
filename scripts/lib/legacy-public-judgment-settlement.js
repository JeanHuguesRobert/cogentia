/** Resolve the ORIGINAL local continuation only after COP has independently
 * correlated, accepted and completed the assigned public-source Judgment.
 * The caller supplies the authorized local mutation adapter; inspection
 * itself is immutable and never confuses a browser click with a model result.
 */
import {createHash} from 'node:crypto';
import {projectParentJoin} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {projectPacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {previewPublicLegacyJudgment} from './legacy-public-judgment-cps.js';

export function inspectPublicLegacyJudgmentResult({store,continuation,repositoryRoot,
  publicRepo='cogentia',requirePublishedSource=true}={}){
  if(typeof store?.listTopic!=='function'||!continuation)
    return {ok:false,status:'invalid_source'};
  const preview=previewPublicLegacyJudgment({continuation,repositoryRoot,
    publicRepo,requirePublishedSource});
  if(!preview.ok)return preview;
  const t=preview.child_ref,es=store.listTopic(t);
  const c=es.find(e=>e.payload?.profile==='cop/continuation')?.payload?.continuation;
  if(c?.state?.assignment_ref!==preview.task_ref||
     c.state.question!==preview.question)return {ok:false,status:'assignment_not_verified'};
  const returned=es.find(e=>e.payload?.profile==='cop.continuation-result/v1'&&
    e.payload.phase==='returned');
  if(!returned)return {ok:true,status:'waiting_for_model_result',ready:false};
  const accepted=es.some(e=>e.payload?.profile==='cop.continuation-result/v1'&&
    e.payload.phase==='accepted');
  const completed=es.some(e=>e.payload?.profile==='cop.continuation-dispatch/v1'&&
    e.payload.phase==='handler_completed'&&e.payload.parent_packet_status==='completed');
  if(!accepted||!completed)return {ok:true,status:'waiting_for_accepted_result',ready:false};
  const result=returned.payload.candidate_result;
  if(result?.status!=='answered'||result?.result?.packet_status!=='completed'||
     result.malformed===true||typeof result.result.answer!=='string')
    return {ok:false,status:'model_result_not_acceptable'};
  let response;
  try{response=JSON.parse(result.result.answer)}
  catch{return {ok:false,status:'judgment_answer_not_json'}}
  const allowed=continuation.expected_response?.allowed_decisions||[];
  if(!allowed.includes(response?.decision)||typeof response.reason!=='string'||
     response.reason.trim().length<15)
    return {ok:false,status:'judgment_schema_not_accepted'};
  if(response.decision==='needs_more_context')
    return {ok:true,status:'more_context_needed',ready:false};
  const join=projectParentJoin(store,{parent_ref:preview.parent_ref,
    join_id:'public-document-role-judgment'});
  if(!join.ok||!join.ready||join.status!=='completed'||
     join.children?.[0]?.child_ref!==t||join.children[0].state!=='completed')
    return {ok:false,status:'parent_join_not_accepted'};
  const warmth=projectPacketTemperature(store,{packet_ref:preview.parent_ref});
  if(!warmth.ok||!warmth.runnable)return {ok:true,status:'parent_temperature_deferred',ready:false};
  return {ok:true,status:'ready_to_resolve_legacy',ready:true,
    legacy_id:continuation.id,decision:response.decision,reason:response.reason.trim(),
    cps_return_receipt_ref:returned.idempotency_key,cps_child_ref:preview.child_ref,
    source_digest:preview.source_digest,parent_ref:preview.parent_ref};
}

/** Two SQLite stores cannot share a transaction. Publish the local CAS
 * success into the canonical COP parent topic as an idempotent reconciliation
 * fact AFTER the local writer confirms the effect. A failed COP append can
 * be retried without repeating the local resolution. */
function recordCanonicalLocalResolution(store,{continuation_id,decision,
  return_receipt_ref,source_digest}){
  const original=store.eventByIdempotency(return_receipt_ref);
  if(!original||original.payload?.profile!=='cop.continuation-result/v1'||
     original.payload?.phase!=='returned')return {ok:false,status:'source_receipt_missing'};
  const topic='continuation:'+continuation_id;
  const id='legacy-role-resolution:'+createHash('sha256')
    .update(continuation_id+'\0'+return_receipt_ref).digest('hex').slice(0,36);
  const r=store.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:legacy-local-cas-bridge',subject_ref:topic,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:id,causal_refs:[return_receipt_ref],
    payload:{profile:'cogentia.legacy-continuation-settlement/v1',
      phase:'local_resolution_confirmed',continuation_id,decision,
      source_digest,source_return_receipt_ref:return_receipt_ref,
      local_work_status:'resolved',local_journal:'host-local-continuations'},
  });
  return r.ok?{ok:true,status:'canonical_resolution_observed',receipt_ref:id,
    duplicate:r.duplicate}:{ok:false,status:'canonical_resolution_needs_reconciliation'};
}

export async function settlePublicLegacyJudgment({store,continuation,
  repositoryRoot,publicRepo='cogentia',apply,requirePublishedSource=true}={}){
  if(typeof apply!=='function')return {ok:false,status:'missing_legacy_cas_writer'};
  if(continuation?.status==='resolved'){
    const ref=continuation.resolution?.payload?.cps_return_receipt_ref;
    const child='continuation:ctn_chatgpt_browser_'+
      createHash('sha256').update('legacy:'+continuation.id).digest('hex').slice(0,32);
    const recorded=typeof ref==='string'?store.eventByIdempotency(ref):null;
    if(recorded?.topic?.id===child&&
       recorded.payload?.profile==='cop.continuation-result/v1'&&
       recorded.payload?.phase==='returned'){
      const registered=recordCanonicalLocalResolution(store,{
        continuation_id:continuation.id,
        decision:continuation.resolution?.decision,
        return_receipt_ref:ref,
        source_digest:continuation.resolution?.payload?.source_digest});
      if(!registered.ok)return registered;
      return {ok:true,status:'already_resolved',duplicate:true,
        canonical_resolution_ref:registered.receipt_ref};
    }
    return {ok:false,status:'legacy_already_resolved_other_provenance'};
  }
  const p=inspectPublicLegacyJudgmentResult({store,continuation,repositoryRoot,
    publicRepo,requirePublishedSource});
  if(!p.ok||!p.ready)return p;
  const result=await apply({continuation_id:p.legacy_id,decision:p.decision,
    reason:p.reason,payload:{continuation_id:p.legacy_id,decision:p.decision,
      reason:p.reason,cps_child_ref:p.cps_child_ref,
      cps_return_receipt_ref:p.cps_return_receipt_ref,
      source_digest:p.source_digest}});
  if(result?.ok!==true)return {ok:false,status:'legacy_write_not_confirmed'};
  const observed=recordCanonicalLocalResolution(store,{
    continuation_id:p.legacy_id,decision:p.decision,
    return_receipt_ref:p.cps_return_receipt_ref,source_digest:p.source_digest});
  if(!observed.ok)return observed;
  return {ok:true,status:'legacy_resolved',continuation_id:p.legacy_id,
    decision:p.decision,cps_return_receipt_ref:p.cps_return_receipt_ref,
    canonical_resolution_ref:observed.receipt_ref};
}
