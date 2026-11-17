/** CPKT-2026-010 (#336): One bounded historical COP->H1 contract repair.
 * No new Judgment, no provider effect, no second scheduler or budget.
 *
 * Existing legacy roles were resolved through authenticated CPS before the
 * indexer's durable handler contract existed. A past MCP response alone never
 * grants permission to backfill: the ORIGINAL accepted result, published
 * source hash, parent join and local settlement must all agree.
 */
import {createHash} from 'node:crypto';
import {inspectPublicLegacyJudgmentResult} from './legacy-public-judgment-settlement.js';
import {inspectLocalPublicIndexReentry} from './legacy-public-judgment-resident.js';
import {PUBLIC_INDEX_REENTRY_HANDLER} from './public-index-judgment-reentry.mjs';
import {createFractalogActRecord,fractalogRecordToCopEnvelope,
  copEnvelopeToFractalogRecord}
  from '../../../inseme/packages/cop-core/src/fractalog.js';

const hash=s=>createHash('sha256').update(s).digest('hex');
const PROFILE='cogentia.legacy-public-index-reentry-backfill/v1';
const safeId=id=>typeof id==='string'&&/^ctn_[A-Za-z0-9_-]{5,120}$/.test(id);
const allowedRoots={
  cogentia:'/srv/cogentia/repos/cogentia',
  'barons-Mariani':'/srv/cogentia/repos/barons-Mariani',
};

export function inspectAcceptedLegacyPublicIndex({store,local,continuation_id,
  repoRoots=allowedRoots,requirePublishedSource=true}={}){
  if(typeof store?.listTopic!=='function'||typeof local?.load!=='function'||
     !safeId(continuation_id))
    return {ok:false,status:'invalid_backfill_source'};
  const c=local.load(continuation_id);
  if(!c||c.status!=='resolved'||c.kind!=='index.document_role_judgment')
    return {ok:false,status:'not_resolved_public_index_judgment'};
  if(!c.context||c.context.boundary!==c.kind||
     !c.resolution||typeof c.resolution.reason!=='string')
    return {ok:false,status:'legacy_context_incomplete'};
  const root=repoRoots[c.subject?.repo];
  if(typeof root!=='string'||!root)return {ok:false,status:'unapproved_source_repo'};
  const target=c.resumption_target;
  if(target&&(target.kind!=='handler'||
     target.handler_ref!==PUBLIC_INDEX_REENTRY_HANDLER))
    return {ok:false,status:'foreign_reentry_handler'};
  const returned=inspectPublicLegacyJudgmentResult({
    store,continuation:{...c,status:'active'},
    repositoryRoot:root,publicRepo:c.subject.repo,requirePublishedSource});
  if(!returned.ok||!returned.ready)
    return {ok:false,status:'cop_result_not_accepted',
      cause:returned.status||null};
  if(c.resolution.decision!==returned.decision||
     c.resolution.reason!==returned.reason||
     c.resolution.payload?.cps_child_ref!==returned.cps_child_ref||
     c.resolution.payload?.cps_return_receipt_ref!==returned.cps_return_receipt_ref||
     c.resolution.payload?.source_digest!==returned.source_digest)
    return {ok:false,status:'cop_return_local_result_mismatch'};
  if(c.context.source_sha256&&c.context.source_sha256!==returned.source_digest)
    return {ok:false,status:'source_version_conflict'};
  const confirmed=store.listTopic('continuation:'+continuation_id).find(e=>
    e.payload?.profile==='cogentia.legacy-continuation-settlement/v1'&&
    e.payload?.phase==='local_resolution_confirmed');
  if(!confirmed||confirmed.payload.continuation_id!==continuation_id||
     confirmed.payload.decision!==returned.decision||
     confirmed.payload.source_digest!==returned.source_digest||
     confirmed.payload.source_return_receipt_ref!==returned.cps_return_receipt_ref||
     typeof confirmed.idempotency_key!=='string')
    return {ok:false,status:'canonical_legacy_settlement_not_verified'};
  return {ok:true,status:target?'already_bound':'eligible_for_backfill',
    continuation_id,source_digest:returned.source_digest,
    source_return_receipt_ref:returned.cps_return_receipt_ref,
    original_cop_settlement_ref:confirmed.idempotency_key,
    handler_ref:PUBLIC_INDEX_REENTRY_HANDLER,
    local_work_resumed:c.resolution.return_state?.resumed===true};
}

export function bindAcceptedLegacyPublicIndex({store,local,continuation_id,
  repoRoots,requirePublishedSource=true}={}){
  const p=inspectAcceptedLegacyPublicIndex({store,local,continuation_id,
    repoRoots,requirePublishedSource});
  if(!p.ok)return p;
  if(p.status==='already_bound')return {...p,duplicate:true};
  const c=local.load(continuation_id);
  if(c.resumption_target||c.context.source_sha256)
    return {ok:false,status:'concurrent_reentry_contract_change'};
  c.context={...c.context,source_sha256:p.source_digest};
  c.resumption_target={kind:'handler',handler_ref:PUBLIC_INDEX_REENTRY_HANDLER};
  c.history.push({at:new Date().toISOString(),
    event:'accepted_cop_reentry_handler_backfilled',
    cop_settlement_ref:p.original_cop_settlement_ref,
    cps_return_receipt_ref:p.source_return_receipt_ref,
    source_sha256:p.source_digest});
  try{local.save(c)}
  catch{return {ok:false,status:'local_continuation_revision_conflict'}}
  return {...p,status:'bound_ready_for_reentry',duplicate:false};
}

export function recordAcceptedLegacyPublicReentry({store,local,continuation_id,
  repoRoots,requirePublishedSource=true}={}){
  const p=inspectAcceptedLegacyPublicIndex({store,local,continuation_id,
    repoRoots,requirePublishedSource});
  if(!p.ok||p.status!=='already_bound')
    return {ok:false,status:p.status||'reentry_handler_not_bound'};
  const proof=inspectLocalPublicIndexReentry(local,{continuation_id});
  if(!proof.ok)return proof;
  const topic='continuation:'+continuation_id;
  const id='legacy-role-late-reentry:'+hash(continuation_id+'\0'+
    p.source_return_receipt_ref).slice(0,36);
  const payload={profile:PROFILE,phase:'local_reentry_verified',
    continuation_id,source_sha256:p.source_digest,
    source_return_receipt_ref:p.source_return_receipt_ref,
    original_cop_settlement_ref:p.original_cop_settlement_ref,
    local_output_artifact_ref:proof.artifact_ref,
    local_resume_receipt_ref:proof.receipt_ref,
    local_work_status:'resumed',provider_effects:0};
  const r=store.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:local-legacy-reentry-repair',subject_ref:topic,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:id,causal_refs:[
      p.original_cop_settlement_ref,p.source_return_receipt_ref,
      proof.receipt_ref],payload});
  if(!r.ok)return {ok:false,status:'cop_reentry_repair_receipt_failed'};
  if(r.duplicate&&
     (r.event?.topic?.id!==topic||
      JSON.stringify(r.event.payload)!==JSON.stringify(payload)))
    return {ok:false,status:'cop_reentry_repair_receipt_conflict'};

  // A real FractaLog observation is a *separate causal projection* of this
  // verified local act. It does NOT invent a provider model charge, re-admit
  // a historical mandate or add spending to an upstream packet.
  const logRef='fractalog:legacy-index-reentry:'+hash(continuation_id+'\0'+
    p.source_return_receipt_ref).slice(0,36);
  const actRef='act:cogentia-index-reentry:'+continuation_id;
  const previous=store.eventByIdempotency(logRef);
  let log;
  if(previous){
    try{log=copEnvelopeToFractalogRecord(previous)}
    catch{return {ok:false,status:'fractalog_receipt_invalid'}}
    if(previous.topic?.id!==actRef||
       log.trace?.local_resume_receipt_ref!==proof.receipt_ref||
       log.trace?.original_cop_settlement_ref!==p.original_cop_settlement_ref||
       log.effect?.provider_effects!==0)
      return {ok:false,status:'fractalog_receipt_conflict'};
  }else{
    log=createFractalogActRecord({
      record_id:'flr:cogentia-legacy-reentry:'+
        hash(continuation_id+'\0'+p.source_return_receipt_ref).slice(0,36),
      act_id:actRef,
      act_kind:'cogentia.index.document_role.reentry',
      act_phase:'observed',
      owner_instance_ref:'node:fracta2/cogentia:indexer',
      on_behalf_of_instance_ref:'agent:jhn',
      visibility:'restricted',
      idempotency_key:logRef,
      governed_chain:{
        principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
        capability:'index.document_role_judgment.reentry',
        admission_evidence:'historical_cps_accepted_and_local_result_verified',
        original_cop_settlement_ref:p.original_cop_settlement_ref,
      },
      trace:{source_sha256:p.source_digest,continuation_id,
        original_cop_settlement_ref:p.original_cop_settlement_ref,
        cps_return_receipt_ref:p.source_return_receipt_ref,
        local_output_artifact_ref:proof.artifact_ref,
        local_resume_receipt_ref:proof.receipt_ref},
      effect:{provider_effects:0,source_modified:false,
        outcome:'local_index_projection_computed',
        external_provider_spend:'not_measured_from_local_reentry'},
      links:[{rel:'accepted_cop_return',ref:p.source_return_receipt_ref},
        {rel:'reconciliation_receipt',ref:id},
        {rel:'local_artifact',ref:proof.artifact_ref}],
    });
    const logged=store.append(fractalogRecordToCopEnvelope(log,{
      topic_id:actRef,causation_id:id}));
    if(!logged.ok)return {ok:false,status:'fractalog_observation_not_persisted'};
  }
  return {ok:true,status:'local_reentry_verified',
    receipt_ref:id,duplicate:r.duplicate,artifact_ref:proof.artifact_ref,
    fractalog_receipt_ref:logRef,fractalog_act_ref:actRef};
}
