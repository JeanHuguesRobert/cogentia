/**
 * Bounded FractaScheduler COP work-pull adapter.
 *
 * This is NOT a scheduler, queue, mandate issuer, or alternate PacketClaim.
 * It bridges the existing read-only FractaRouting placement projection to
 * the existing COPScheduler (which acquires authoritative PacketClaims) and
 * publishes child results in the canonical COP event journal for Ithaca.
 *
 * A caller must supply real capability/mandate/budget admission and an
 * executable handler. No provider or external operation is inferred from
 * a matching capability declaration. Ambiguous effects stay fenced.
 */
import {createHash} from 'node:crypto';
import {projectContinuationPlacement} from './continuation-placement.js';
import {COPScheduler} from '../../../inseme/packages/cop-kernel/src/scheduler.js';
import {COPBus} from '../../../inseme/packages/cop-kernel/src/bus.js';
import {EventStorePacketClaimCoordinator} from '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {projectPacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {reconcilePacketParentContinuations} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';

export const CONTINUATION_PULL_PROFILE='cogentia.continuation-work-pull/v1';
const hasRef=x=>typeof x==='string'&&/^(?:packet|continuation):[a-zA-Z0-9_.:-]{1,160}$/.test(x);
const digest=(...parts)=>createHash('sha256').update(parts.join('\0')).digest('hex').slice(0,38);
const planned=(id,version)=>({
  intent:'cop-pull:intent:'+digest(id,version),
  settled:'cop-pull:settled:'+digest(id,version),
  completed:'cop-pull:child-completed:'+digest(id,version),
});
const fact=(topic,id,phase,details,causal_refs=[])=>({
  topic_id:topic,event_type:'cop.event/v1',actor_id:'cop:fracta-scheduler-pull',
  subject_ref:topic,visibility:'restricted',epistemic_status:'observed',
  idempotency_key:id,causal_refs,
  payload:{profile:CONTINUATION_PULL_PROFILE,phase,...details},
});
function tempReady(store,refs){
  for(const packet_ref of refs){
    const t=projectPacketTemperature(store,{packet_ref});
    if(!t.ok||!t.runnable)return {admitted:false,
      reason:t.deleted?'deleted':'temperature:'+(t.effective_temperature||'unknown')};
  }
  return {admitted:true};
}

/** Each call is one bounded drain cycle, suitable as a hook for the existing
 * FractaScheduler/ONA tick. No timer, queue daemon, or spin loop is created.
 */
export async function pullReadyContinuations({store,continuations=[],handlers=[],
  node,now=new Date().toISOString(),max_steps=3,admit,handlerResolver,
  parentJoinExecutor=null}={}){
  if(typeof store?.transaction!=='function'||!Array.isArray(continuations)||
     !Array.isArray(handlers)||typeof node!=='string'||!node.trim()||
     typeof admit!=='function'||typeof handlerResolver!=='function'||
     !Number.isSafeInteger(max_steps)||max_steps<1||max_steps>20||
     (parentJoinExecutor!==null&&typeof parentJoinExecutor!=='function'))
    return {ok:false,status:'invalid_work_pull'};
  const preview=projectContinuationPlacement({continuations,handlers,
    homeNode:node,now,temperatureStore:store});
  const findings=[],calls=[];
  const coordinator=new EventStorePacketClaimCoordinator({store});
  // The Scheduler holds only transient handlers for this drain. All claims,
  // intents, results and parent links remain in the canonical COP Store.
  const scheduler=new COPScheduler(new COPBus({name:'fracta-work-pull:'+node}),{
    packetClaimCoordinator:coordinator,
    admissionResolver:cont=>tempReady(store,cont._temperature_refs),
    coordinationResolver:cont=>({mode:'MUTATE',
      packetRef:cont.packetRef,handlerRef:cont._handler_id,ttlMs:30000}),
    handlerResolver:async (capability,cont)=>({
      execute:async args=>{
        const ids=cont._work_ids,topic=cont.topicId;
        const intent=store.transaction(tx=>{
          if(tx.eventByIdempotency(ids.settled))
            return {ok:true,status:'already_settled'};
          if(tx.eventByIdempotency(ids.intent))
            return {ok:false,status:'needs_reconciliation'};
          // At this point COPScheduler has acquired PacketClaim. The next
          // event is an intent written before any handler side effect.
          const receipt=tx.append(fact(topic,ids.intent,'dispatch_intent',{
            continuation_id:cont.continuationId,packet_ref:cont.packetRef,
            version:cont._version,handler_id:cont._handler_id,
            authorization_ref:cont._admission.authorization_ref}));
          if(!receipt.ok)throw Error(receipt.error||'work_intent_commit_failed');
          return {ok:true,status:'intent_committed'};
        });
        if(!intent.ok||intent.value?.status!=='intent_committed')
          throw Error(intent.value?.status||'work_intent_commit_failed');
        const selected=await handlerResolver(capability,cont,{
          handler_id:cont._handler_id,node,admission:cont._admission});
        const handler=typeof selected==='function'?selected:selected?.execute?.bind(selected);
        if(typeof handler!=='function')throw Error('approved_handler_unavailable');
        const result=await handler(args);
        // Only an actual effect/result receipt permits settlement. A mere
        // callback return with no receipt is ambiguous and stays fenced.
        if(result?.ok!==true||typeof result.receipt_ref!=='string'||
           !result.receipt_ref)throw Error('effect_receipt_missing_or_ambiguous');
        const packetStatus=result.packet_status;
        if(!['completed','failed','blocked','open'].includes(packetStatus))
          throw Error('explicit_packet_status_required');
        const settlement=store.transaction(tx=>{
          const first=tx.append(fact(topic,ids.settled,'dispatch_settled',{
            continuation_id:cont.continuationId,packet_ref:cont.packetRef,
            version:cont._version,handler_id:cont._handler_id,
            handler_receipt_ref:result.receipt_ref,packet_status:packetStatus,
          },[ids.intent,result.receipt_ref]));
          if(!first.ok)throw Error('work_settlement_commit_failed');
          // Reuse the child-state profile recognized by COP's already-tested
          // parent notification projector. This is not the parent's mandate
          // state and does not auto-complete the parent's cognitive goal.
          const second=tx.append({
            topic_id:topic,event_type:'cop.event/v1',actor_id:'cop:fracta-scheduler-pull',
            subject_ref:topic,visibility:'restricted',epistemic_status:'observed',
            idempotency_key:ids.completed,causal_refs:[ids.settled],
            payload:{profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
              continuation_id:cont.continuationId,parent_packet_status:packetStatus,
              result_ref:result.receipt_ref,handler_id:cont._handler_id},
          });
          if(!second.ok)throw Error('child_completion_commit_failed');
          return {ok:true,status:'settled',duplicate:first.duplicate};
        });
        if(!settlement.ok)throw Error('work_settlement_commit_failed');
        return {ok:true,packet_status:packetStatus,receipt_ref:result.receipt_ref};
      },
    }),
  });
  for(const entry of preview.entries){
    if(calls.length>=max_steps)break;
    if(!entry.runnable_candidate)continue;
    const handler=entry.handler_candidates.find(h=>h.node===node);
    if(!handler){findings.push({continuation_id:entry.continuation_id,
      status:'remote_handler_not_local'});continue;}
    const original=continuations.find(c=>(c.id||c.continuation_id)===entry.continuation_id);
    const topic='continuation:'+entry.continuation_id;
    const packetRef=entry.packet_ref;
    if(!hasRef(packetRef)){
      findings.push({continuation_id:entry.continuation_id,
        status:'noncanonical_packet_ref'});continue;
    }
    const refs=[...new Set([packetRef,topic])],warm=tempReady(store,refs);
    if(!warm.admitted){findings.push({continuation_id:entry.continuation_id,
      status:warm.reason});continue;}
    const version=String(original.version??1),ids=planned(entry.continuation_id,version);
    if(store.eventByIdempotency(ids.settled)){
      findings.push({continuation_id:entry.continuation_id,status:'already_settled'});continue;
    }
    if(store.eventByIdempotency(ids.intent)){
      findings.push({continuation_id:entry.continuation_id,status:'needs_reconciliation'});continue;
    }
    const admission=await admit({continuation:original,packet_ref:packetRef,
      handler_id:handler.handler_id,node});
    if(admission?.granted!==true||typeof admission.authorization_ref!=='string'||
       !admission.authorization_ref){
      findings.push({continuation_id:entry.continuation_id,status:'not_admitted'});continue;
    }
    const cont={...original,continuationId:entry.continuation_id,
      topicId:topic,packetRef,resumeTo:original.resumeTo||original.resume_to,
      _handler_id:handler.handler_id,_temperature_refs:refs,
      _work_ids:ids,_version:version,_admission:admission};
    if(typeof cont.resumeTo!=='string'||!cont.resumeTo){
      findings.push({continuation_id:entry.continuation_id,status:'missing_handler_capability'});continue;
    }
    try{
      const run=await scheduler.execute(cont);
      if(run.deferred){findings.push({continuation_id:entry.continuation_id,
        status:'deferred',reason:run.reason});continue;}
      findings.push({continuation_id:entry.continuation_id,status:'executed',
        handler_id:handler.handler_id,receipt_ref:run.execution.result.receipt_ref,
        packet_status:run.execution.result.packet_status});
      calls.push(entry.continuation_id);
    }catch(error){
      findings.push({continuation_id:entry.continuation_id,
        status:error.code==='PACKET_BUSY'?'busy':
          error.code==='PACKET_TEMPERATURE_BLOCKED'?'temperature_blocked':
          store.eventByIdempotency(ids.intent)?'needs_reconciliation':'failed_before_dispatch',
        reason:error.code||error.message});
    }
  }
  // Parent notification and optional join handler reuse the same existing
  // CPS reconciler. Without an actual configured handler, no parent is
  // resumed speculatively; only durable results are made visible to it.
  const parent=await reconcilePacketParentContinuations(store,{
    execute:parentJoinExecutor,max_parents:50,max_child_events:100});
  return {ok:parent.ok,protocol:CONTINUATION_PULL_PROFILE,node,
    work_executed:calls.length,findings,
    preview:{candidates:preview.counts.runnable_candidates,blocked:preview.counts.blocked},
    parent_notifications:parent.notified,parent_resumptions:parent.resumed,
    needs_reconciliation:parent.needs_reconciliation||0};
}
