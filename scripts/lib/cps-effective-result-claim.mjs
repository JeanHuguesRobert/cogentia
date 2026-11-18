/**
 * CPS result ingress: correlate the current PacketClaim with the immutable
 * original assignment and the existing, fenced recovery-claim receipts.
 *
 * A clock-expired claim is NEVER made valid by this projection. A late
 * observed browser response can be accepted only after a separate governed
 * PacketClaim reacquisition, with a traceable observation + confirmed click.
 * No new authority, provider action, schema or ledger is created here.
 */
import {projectPacketCoordination,validateCurrentPacketClaim} from
  '../../../inseme/packages/cop-core/src/packet-coordination.js';

const ASSIGNED='cogentia.cps-assigned-recovery-claim/v1';
const LATE='cogentia.cps-late-observed-result-claim/v1';
const OBS='cogentia.cps-browser-visible-result/v1';
const CLICK='cop.continuation-browser-dispatch/v1';

export function projectCpsResultClaim({store,continuation,actor,now=new Date()}={}){
  if(!store?.listTopic||!store.eventByIdempotency||
     !continuation?.continuation_id||!continuation?.packet_ref||
     !continuation.claim||actor!=='agent:jhn')
    return {ok:false,status:'invalid_claim_projection'};
  const c=continuation;
  const topic='continuation:'+c.continuation_id;
  const records=store.listTopic(topic);
  const projection=projectPacketCoordination(
    store.listTopic('packet-coordination:'+c.packet_ref)
      .map(e=>e.payload?.packet_coordination_event).filter(Boolean));
  const original=c.claim;
  if(!Number.isSafeInteger(original.expected_generation)||
     projection.generation!==original.expected_generation)
    return {ok:false,status:'packet_generation_changed'};
  let claim={claim_id:original.claim_id,epoch:original.epoch,
    handler_ref:actor,packet_ref:c.packet_ref};
  const rebound=records.filter(e=>e.payload?.profile===ASSIGNED&&
    e.payload?.phase==='recovery_claim_rebound');
  if(rebound.length>1)return {ok:false,status:'ambiguous_pre_submit_rebind'};
  if(rebound.length){
    const e=rebound[0],p=e.payload;
    if(p.continuation_id!==c.continuation_id||
       p.prior_claim_id!==claim.claim_id||p.prior_epoch!==claim.epoch||
       typeof p.new_claim_id!=='string'||!p.new_claim_id||
       !Number.isSafeInteger(p.new_epoch)||p.new_epoch<=claim.epoch||
       e.topic?.id!==topic)
      return {ok:false,status:'invalid_pre_submit_rebind'};
    claim={...claim,claim_id:p.new_claim_id,epoch:p.new_epoch};
  }
  const late=records.filter(e=>e.payload?.profile===LATE&&
    e.payload?.phase==='late_return_claim_rebound');
  if(late.length>1)return {ok:false,status:'ambiguous_late_rebind'};
  if(late.length){
    const e=late[0],p=e.payload;
    const clickRef='chatgpt-browser:'+c.continuation_id+':first-dispatch-receipt';
    const click=store.eventByIdempotency(clickRef);
    const observed=store.eventByIdempotency(p.observation_receipt_ref);
    if(e.topic?.id!==topic||p.continuation_id!==c.continuation_id||
       p.packet_ref!==c.packet_ref||p.prior_claim_id!==claim.claim_id||
       p.prior_epoch!==claim.epoch||
       typeof p.new_claim_id!=='string'||!p.new_claim_id||
       !Number.isSafeInteger(p.new_epoch)||p.new_epoch<=claim.epoch||
       p.original_click_receipt_ref!==clickRef||
       click?.topic?.id!==topic||click.payload?.profile!==CLICK||
       click.payload?.phase!=='ui_click_dispatched_not_model_result'||
       !observed||observed.topic?.id!==topic||
       observed.payload?.profile!==OBS||
       observed.payload?.phase!=='governed_browser_reply_observed'||
       observed.payload?.continuation_id!==c.continuation_id||
       observed.payload?.original_click_receipt_ref!==clickRef||
       !e.parent_event_ids?.includes(p.observation_receipt_ref)||
       !e.parent_event_ids?.includes(clickRef))
      return {ok:false,status:'late_rebind_provenance_invalid'};
    claim={...claim,claim_id:p.new_claim_id,epoch:p.new_epoch};
  }
  const valid=validateCurrentPacketClaim(projection,{
    claimId:claim.claim_id,handlerRef:actor,epoch:claim.epoch,now});
  if(!valid.ok)return {ok:false,status:valid.code,claim:null};
  return {ok:true,status:'current_claim',claim:{
    packet_ref:c.packet_ref,claim_id:claim.claim_id,
    handler_ref:actor,epoch:claim.epoch,
    expected_generation:original.expected_generation},
    source:late.length?'late_observed_return':rebound.length?'pre_submit_rebound':'declared'};
}
