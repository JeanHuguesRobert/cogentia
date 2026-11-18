/**
 * Explicit recovery of one already generated browser Judgment whose original
 * MCP submission failed after the UI click. Never click Send, call an LLM,
 * or pretend the browser observation is a direct model MCP tool call.
 */
import {createHash} from 'node:crypto';
import {EventStorePacketClaimCoordinator} from
  '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {projectPacketCoordination} from
  '../../../inseme/packages/cop-core/src/packet-coordination.js';
import {projectCpsResultClaim} from './cps-effective-result-claim.mjs';
import {inspectQuarantinedBrowserDelivery} from './chatgpt-cps-delivery-quarantine.js';
import {previewPublicLegacyJudgment} from './legacy-public-judgment-cps.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {createFractalogActRecord,fractalogRecordToCopEnvelope,
  copEnvelopeToFractalogRecord}
  from '../../../inseme/packages/cop-core/src/fractalog.js';

const sha=s=>createHash('sha256').update(s).digest('hex');
const ROOTS=Object.freeze({
  cogentia:'/srv/cogentia/repos/cogentia',
  'barons-Mariani':'/srv/cogentia/repos/barons-Mariani',
});
const OBS='cogentia.cps-browser-visible-result/v1';
const LATE='cogentia.cps-late-observed-result-claim/v1';
const known=new Set(['index','source','derived','archive','skip','private',
  'public','needs_more_context']);
const childId=x=>typeof x==='string'&&/^ctn_chatgpt_browser_[0-9a-f]{32}$/.test(x);
const continuationTopic=id=>'continuation:'+id;
const observerKey=id=>'cps-visible-result:'+id;
const rebindKey=id=>'cps-visible-result-claim:'+id;
const clickKey=id=>'chatgpt-browser:'+id+':first-dispatch-receipt';

export function parseCpsVisibleJudgment(observation,{continuation_id}={}){
  if(!childId(continuation_id)||observation?.assistant_reply_visible!==true||
     observation?.composer_present!==true||observation?.composer_blank!==true||
     observation?.generating!==false||
     !/^\/c\/[A-Za-z0-9-]{8,100}$/.test(observation.current_path||'')||
     !String(observation.reply_tail||'').includes(continuation_id))
    return {ok:false,status:'owned_browser_reply_not_verified'};
  const text=String(observation.transcript_answer||'').trim();
  if(!text||text.length>8500)return {ok:false,status:'visible_reply_unavailable'};
  const jsonBlocks=[...text.matchAll(/\{[^{}]{1,2500}\}/g)];
  const decisions=[];
  for(const match of jsonBlocks){
    try{
      const parsed=JSON.parse(match[0]);
      if(known.has(parsed?.decision)&&typeof parsed.reason==='string'&&
         parsed.reason.trim().length>=15&&parsed.reason.length<=1500)
        decisions.push({decision:parsed.decision,reason:parsed.reason.trim()});
    }catch{}
  }
  if(decisions.length!==1)return {ok:false,status:'visible_judgment_not_unambiguous'};
  const answer=JSON.stringify(decisions[0]);
  return {ok:true,decision:decisions[0].decision,
    reason:decisions[0].reason,answer,
    response_sha256:sha(text),answer_sha256:sha(answer),
    delivery_status:'observed_in_browser_not_received_by_mcp'};
}

export function inspectCpsVisibleRecovery({store,local,continuation_id,
  repoRoots=ROOTS}={}){
  if(!childId(continuation_id)||!store?.listTopic||!local?.load)
    return {ok:false,status:'invalid_recovery_request'};
  const topic=continuationTopic(continuation_id);
  const events=store.listTopic(topic);
  const declaration=events.find(x=>x.payload?.profile==='cop/continuation')
    ?.payload?.continuation;
  if(declaration?.provider!=='chatgpt'||declaration?.channel!=='browser'||
     declaration?.state?.dispatch_mode!=='cps:assigned-browser-turn/v1'||
     declaration?.continuation_id!==continuation_id||
     !declaration.state?.assignment_ref?.startsWith('legacy:'))
    return {ok:false,status:'unexpected_continuation_contract'};
  const originalClick=store.eventByIdempotency(clickKey(continuation_id));
  if(originalClick?.topic?.id!==topic||
     originalClick.payload?.profile!=='cop.continuation-browser-dispatch/v1'||
     originalClick.payload?.phase!=='ui_click_dispatched_not_model_result')
    return {ok:false,status:'original_confirmed_click_missing'};
  if(events.some(x=>x.payload?.profile==='cop.continuation-result/v1'&&
       x.payload.phase==='returned'))
    return {ok:true,status:'already_returned',continuation:declaration};
  if(events.some(x=>x.payload?.profile==='cop.continuation-abandonment/v1'))
    return {ok:false,status:'continuation_abandoned'};
  const q=inspectQuarantinedBrowserDelivery(store,continuation_id);
  if(q.quarantined)return {ok:false,status:'quarantined_continuation'};
  const parent_id=declaration.state.assignment_ref.slice(7);
  const parent=local.load(parent_id);
  const root=repoRoots[parent?.subject?.repo];
  if(!root||parent?.status!=='active'||parent.kind!=='index.document_role_judgment')
    return {ok:false,status:'local_parent_not_active_public_judgment'};
  const published=previewPublicLegacyJudgment({continuation:parent,
    repositoryRoot:root,publicRepo:parent.subject.repo});
  if(!published.ok||published.child_ref!==topic)
    return {ok:false,status:'public_source_not_verified',
      cause:published.status};
  const settled=store.listTopic('execution-budget:budget:mandate:jhn:john-root')
    .filter(x=>(x.event_type==='ExecutionBudgetReservation'&&
      x.payload?.reservation?.reservation_id===declaration.budget_reservation_id)||
      (['ExecutionBudgetSettlement','ExecutionBudgetRelease'].includes(x.event_type)&&
       x.payload?.reservation_id===declaration.budget_reservation_id));
  if(settled.length!==1||
     settled[0].event_type!=='ExecutionBudgetReservation')
    return {ok:false,status:'original_budget_not_reserved'};
  return {ok:true,status:'eligible_for_visible_recovery',continuation:declaration,
    parent_id,source_digest:published.source_digest,
    original_click_receipt_ref:clickKey(continuation_id)};
}

/** Append a hashed observation, then reacquire exactly one expired claim.
 * COP projection (not client claims) supplies the next epoch. Stale/pending
 * claim records are recoverable without discarding the first observation.
 */
export async function bindCpsVisibleRecovery({store,local,continuation_id,
  observed,john_request_id,tab_id,admission,repoRoots=ROOTS}={}){
  const preview=inspectCpsVisibleRecovery({store,local,continuation_id,repoRoots});
  if(!preview.ok||preview.status!=='eligible_for_visible_recovery')
    return {ok:false,status:preview.status};
  if(admission?.granted!==true||admission?.provider_permitted!==true||
     admission?.budget_admitted!==true||
     typeof admission.authorization_ref!=='string'||
     typeof admission.provider_permission_receipt_ref!=='string'||
     typeof admission.budget_authorization_ref!=='string')
    return {ok:false,status:'signed_cps_admission_missing'};
  if(typeof john_request_id!=='string'||
     !/^jhn-cps-observe-ctn_[A-Za-z0-9_]{5,120}$/.test(john_request_id)||
     !Number.isSafeInteger(tab_id)||tab_id<1)
    return {ok:false,status:'governed_observation_receipt_missing'};
  const answer=parseCpsVisibleJudgment(observed,{continuation_id});
  if(!answer.ok)return answer;
  // The John read must itself have a durable, settled COP receipt. A model
  // text or an invented request_id is not evidence that this browser was
  // actually inspected under mandate.
  const budgetEvents=store.listTopic(
    'execution-budget:budget:mandate:jhn:john-root');
  const johnReservation='reservation:budget:mandate:jhn:john-root:chatgpt-turn:'+
    john_request_id;
  const observedRead=budgetEvents.some(e=>
    e.event_type==='ExecutionBudgetReservation'&&
    e.payload?.reservation?.reservation_id===johnReservation&&
    e.payload.reservation.idempotency_key==='chatgpt-turn:'+john_request_id);
  const observedSettlement=budgetEvents.some(e=>
    e.event_type==='ExecutionBudgetSettlement'&&
    e.payload?.reservation_id===johnReservation);
  if(!observedRead||!observedSettlement)
    return {ok:false,status:'governed_browser_read_receipt_not_settled'};
  const topic=continuationTopic(continuation_id);
  const ref=observerKey(continuation_id);
  const observationPayload={profile:OBS,
    phase:'governed_browser_reply_observed',continuation_id,
    original_click_receipt_ref:preview.original_click_receipt_ref,
    source_digest:preview.source_digest,answer_sha256:answer.answer_sha256,
    response_sha256:answer.response_sha256,
    browser_tab_id:tab_id,
    john_observation_request_id:john_request_id,
    observation_kind:'reconstructed_from_browser_not_direct_mcp_result',
    provider_effects:0};
  const r=store.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:cps-visible-result-reconciler',subject_ref:topic,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:ref,causal_refs:[preview.original_click_receipt_ref,
      admission.authorization_ref,admission.provider_permission_receipt_ref,
      admission.budget_authorization_ref],payload:observationPayload});
  if(!r.ok)return {ok:false,status:'visible_observation_persist_failed'};
  if(r.duplicate){
    const original=r.event?.payload;
    // A repeat John observation gets a NEW COP request id but must prove
    // the identical assistant answer and identical owned browser tab. Keep
    // the first observation's immutable request id and do not append again.
    if(r.event?.topic?.id!==topic||!original||
       original.profile!==OBS||
       original.phase!==observationPayload.phase||
       original.continuation_id!==continuation_id||
       original.original_click_receipt_ref!==preview.original_click_receipt_ref||
       original.source_digest!==observationPayload.source_digest||
       original.answer_sha256!==observationPayload.answer_sha256||
       original.response_sha256!==observationPayload.response_sha256||
       original.browser_tab_id!==tab_id||
       typeof original.john_observation_request_id!=='string')
      return {ok:false,status:'visible_observation_conflict'};
  }
  const c=preview.continuation;
  const already=store.eventByIdempotency(rebindKey(continuation_id));
  if(!already){
    const original=projectPacketCoordination(
      store.listTopic('packet-coordination:'+c.packet_ref)
        .map(x=>x.payload?.packet_coordination_event).filter(Boolean));
    const priorEvent=store.listTopic(topic).find(x=>
      x.payload?.profile==='cogentia.cps-assigned-recovery-claim/v1'&&
      x.payload?.phase==='recovery_claim_rebound');
    const prior=priorEvent?.payload;
    if(prior&&(priorEvent.topic?.id!==topic||
       prior.continuation_id!==continuation_id||
       prior.prior_claim_id!==c.claim.claim_id||
       prior.prior_epoch!==c.claim.epoch||
       typeof prior.new_claim_id!=='string'||!prior.new_claim_id||
       !Number.isSafeInteger(prior.new_epoch)||
       prior.new_epoch<=c.claim.epoch))
      return {ok:false,status:'invalid_prior_claim_rebind'};
    const oldClaim=prior?{claim_id:prior.new_claim_id,epoch:prior.new_epoch}:c.claim;
    const sameOld=original.active_claim?.claim_id===oldClaim.claim_id&&
      original.active_claim?.epoch===oldClaim.epoch&&
      original.active_claim?.handler_ref==='agent:jhn';
    if(sameOld&&Date.parse(original.active_claim.expires_at)>Date.now())
      return {ok:false,status:'old_claim_not_expired'};
    let fresh;
    if(sameOld){
      const coordinator=new EventStorePacketClaimCoordinator({store});
      fresh=await coordinator.tryClaim({packetRef:c.packet_ref,
        handlerRef:'agent:jhn',ttlMs:900000});
      if(!fresh.ok)return {ok:false,status:'late_result_claim_denied',
        code:fresh.code};
    }else{
      // Crash recovery: the standard coordinator may already have emitted
      // EXPIRED + RECLAIMED, but our later causal receipt was interrupted.
      // Accept ONLY its immediate next epoch by the same actor, before
      // expiry, with the original claim present in the preceding trace.
      const events=store.listTopic('packet-coordination:'+c.packet_ref)
        .map(x=>x.payload?.packet_coordination_event).filter(Boolean);
      const lastReclaimed=events.filter(x=>x.type==='PACKET_RECLAIMED').at(-1);
      const oldExpired=events.some(x=>x.type==='PACKET_CLAIM_EXPIRED'&&
        x.claim?.claim_id===oldClaim.claim_id&&x.claim?.epoch===oldClaim.epoch);
      const current=original.active_claim;
      if(!oldExpired||lastReclaimed?.claim?.claim_id!==current?.claim_id||
         current?.epoch!==oldClaim.epoch+1||
         current.handler_ref!=='agent:jhn'||
         Date.parse(current.expires_at)<=Date.now())
        return {ok:false,status:'old_claim_not_reacquirable'};
      fresh={ok:true,claim:current};
    }
    const payload={profile:LATE,phase:'late_return_claim_rebound',
      continuation_id,packet_ref:c.packet_ref,
      prior_claim_id:oldClaim.claim_id,prior_epoch:oldClaim.epoch,
      new_claim_id:fresh.claim.claim_id,new_epoch:fresh.claim.epoch,
      observation_receipt_ref:ref,
      original_click_receipt_ref:preview.original_click_receipt_ref,
      provider_effects:0};
    const appended=store.append({topic_id:topic,event_type:'cop.event/v1',
      actor_id:'cop:cps-visible-result-reconciler',subject_ref:topic,
      visibility:'restricted',epistemic_status:'observed',
      idempotency_key:rebindKey(continuation_id),
      causal_refs:[ref,preview.original_click_receipt_ref],
      payload});
    if(!appended.ok)return {ok:false,status:'late_claim_receipt_pending'};
  }
  const projected=projectCpsResultClaim({store,continuation:c,actor:'agent:jhn'});
  if(!projected.ok)return {ok:false,status:'late_rebind_not_admitted',
    cause:projected.status};
  const step_result={protocol:'cogentia.step_result/v1',
    continuation_id,challenge:c.correlation.challenge,
    status:'answered',result:{answer:answer.answer,packet_status:'completed',
      source_provenance:'governed_browser_observation_after_mcp_rejection'}};
  const submission={protocol:'cop.continuation-result-submit/v0',
    continuation_id,attempt_id:c.attempt_id,
    execution_binding_ref:c.execution_binding_ref,
    continuation_version:String(c.version),
    idempotency_key:'chatgpt-browser:'+continuation_id+':visible-recovery',
    result_digest:hashPayload(step_result),step_result,
    usage_observation:{source:'governed_browser_observation',
      original_model_reply_sha256:answer.response_sha256,
      observation_receipt_ref:ref,
      direct_model_tool_submission:false,provider_cost:'unknown'}};
  return {ok:true,status:'ready_to_submit_existing_judgment',
    submission,observation_receipt_ref:ref,
    claim_receipt_ref:rebindKey(continuation_id),
    answer_sha256:answer.answer_sha256,decision:answer.decision};
}

/**
 * Idempotent FractaLog projection of an actually admitted recovered return.
 * Does not rewrite the old click nor claim a measured provider invoice.
 * Can also run after a crash between accepted MCP result and trace append.
 */
export function recordCpsVisibleRecoveryFractalog({store,continuation_id}={}){
  if(!childId(continuation_id)||!store?.listTopic)
    return {ok:false,status:'invalid_fractalog_source'};
  const topic=continuationTopic(continuation_id);
  const events=store.listTopic(topic);
  const observation=store.eventByIdempotency(observerKey(continuation_id));
  const rebound=store.eventByIdempotency(rebindKey(continuation_id));
  const returned=events.find(x=>x.payload?.profile==='cop.continuation-result/v1'&&
    x.payload?.phase==='returned');
  const mcp=events.find(x=>x.payload?.surface==='mcp'&&
    x.payload?.usage_observation?.observation_receipt_ref===observerKey(continuation_id));
  const declaration=events.find(x=>x.payload?.profile==='cop/continuation')
    ?.payload?.continuation;
  const budget=store.listTopic('execution-budget:budget:mandate:jhn:john-root');
  const settlements=budget.filter(x=>x.event_type==='ExecutionBudgetSettlement'&&
    x.payload?.reservation_id===declaration?.budget_reservation_id);
  if(!observation||!rebound||!returned||!mcp||
     mcp.payload?.usage_observation?.direct_model_tool_submission!==false||
     settlements.length!==1||settlements[0].payload?.usage?.max_steps!==1)
    return {ok:false,status:'canonical_recovered_return_not_verified'};
  const key='fractalog:cps-visible-recovery:'+continuation_id;
  const previous=store.eventByIdempotency(key);
  if(previous){
    try{
      const record=copEnvelopeToFractalogRecord(previous);
      if(record.trace?.mcp_return_receipt_ref!==returned.idempotency_key||
         record.trace?.original_click_receipt_ref!==clickKey(continuation_id)||
         record.effect?.new_browser_submissions!==0)
        return {ok:false,status:'fractalog_recovery_conflict'};
    }catch{return {ok:false,status:'fractalog_recovery_receipt_invalid'}}
    return {ok:true,status:'fractal_recovery_recorded',duplicate:true,
      receipt_ref:key};
  }
  const log=createFractalogActRecord({
    record_id:'flr:cps-visible-recovery:'+continuation_id,
    act_id:'act:cps-visible-recovery:'+continuation_id,
    act_kind:'cogentia.browser.judgment.visible-result-recovery',
    act_phase:'observed',idempotency_key:key,visibility:'restricted',
    owner_instance_ref:'node:fracta2/cogentia:cps-result-ingress',
    on_behalf_of_instance_ref:'agent:jhn',
    governed_chain:{principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
      mandate_ref:'mandate:jhn:john-root',
      capability:'cogentia.continuation.result.submit',
      external_result_source:'governed_browser_observation_not_direct_model_tool'},
    trace:{
      continuation_id,source_sha256:observation.payload.source_digest,
      original_click_receipt_ref:clickKey(continuation_id),
      browser_observation_receipt_ref:observerKey(continuation_id),
      renewed_claim_receipt_ref:rebindKey(continuation_id),
      mcp_observation_receipt_ref:mcp.idempotency_key,
      mcp_return_receipt_ref:returned.idempotency_key,
      cop_budget_settlement_ref:settlements[0].idempotency_key,
      response_sha256:observation.payload.response_sha256,
    },
    effect:{new_browser_submissions:0,new_model_generations:0,
      recovered_observed_result:1,
      provider_monetary_cost:'unmeasured_historical_call',
      cop_budget_unit_max_steps:1},
    links:[{rel:'original_browser_click',ref:clickKey(continuation_id)},
      {rel:'governed_observation',ref:observerKey(continuation_id)},
      {rel:'accepted_result',ref:returned.idempotency_key},
      {rel:'cop_budget_settlement',ref:settlements[0].idempotency_key}],
  });
  const recorded=store.append(fractalogRecordToCopEnvelope(log));
  if(!recorded.ok)return {ok:false,status:'fractalog_recovery_write_failed'};
  return {ok:true,status:'fractal_recovery_recorded',
    duplicate:recorded.duplicate===true,receipt_ref:key};
}
