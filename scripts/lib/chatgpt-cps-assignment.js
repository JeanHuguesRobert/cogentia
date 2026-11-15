/**
 * Generic CPS assignment of an existing cognitive task/question to the
 * ChatGPT browser JudgmentHandler. Reuses the signed John root, existing
 * execution budget and packet claim coordinator; no new queue or mandate.
 * PREPARATION ONLY: no browser message or provider effect.
 */
import {createHash,randomUUID} from 'node:crypto';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {EventStorePacketClaimCoordinator} from '../../../inseme/packages/cop-kernel/src/packetCoordination.js';
import {declaredContinuationRecord} from '../../../inseme/packages/cop-core/src/continuation-result.js';
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {buildAssignedChatgptCpsPrompt} from './chatgpt-cps-assigned-dispatch.js';
const REF='mandate:jhn:john-root';
const deny=error=>({ok:false,error});
const safeTaskRef=x=>typeof x==='string'&&x.length>=3&&x.length<=256&&
  /^[a-zA-Z0-9_:./@#-]+$/.test(x);
export async function prepareAssignedChatgptCpsContinuation({store,task_ref,question,
  claim_ttl_ms=900000}={}){
  if(store?.kind!=='sqlite'||!safeTaskRef(task_ref)||
     typeof question!=='string'||!question.trim()||question.length>4500||
     !Number.isSafeInteger(claim_ttl_ms)||claim_ttl_ms<60000||claim_ttl_ms>3600000)
    return deny('invalid_task_assignment');
  const id='ctn_chatgpt_browser_'+createHash('sha256').update(task_ref).digest('hex').slice(0,32);
  const packet_ref='packet:'+id;
  const topic='continuation:'+id;
  const earlier=store.listTopic(topic).find(e=>e.payload?.profile==='cop/continuation');
  if(earlier){
    const prev=earlier.payload.continuation;
    if(prev?.state?.assignment_ref!==task_ref||prev?.state?.question!==question)
      return deny('task_assignment_conflict');
    return {ok:true,duplicate:true,continuation_id:id,packet_ref,
      declaration_receipt_ref:earlier.idempotency_key};
  }
  const mandate=resolveMandate(store,REF);
  const allowed=mandate?evaluateMandate(store,{mandate_ref:REF,
    version_pin:mandate.version,expected_principal_ref:'principal:jhn',
    expected_actor_ref:'agent:jhn',capability:'browser.chatgpt.turn'}):{granted:false};
  if(allowed.granted!==true)return deny('signed_chatgpt_turn_mandate_required');
  const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+REF,
    require_authority_grant:true});
  const reserved=ledger.reserve({idempotency_key:'chatgpt-browser:'+id,
    expected_version:ledger.snapshot().version,demand:{max_steps:1}});
  if(!reserved.ok||reserved.duplicate)return deny('budget_reservation_unavailable');
  const coordinator=new EventStorePacketClaimCoordinator({store});
  const claim=await coordinator.tryClaim({packetRef:packet_ref,
    handlerRef:'agent:jhn',ttlMs:claim_ttl_ms});
  if(!claim.ok){ledger.release({reservation_id:reserved.reservation.reservation_id,
    expected_version:ledger.snapshot().version});
    return deny('packet_claim_failed');}
  const continuation={continuation_id:id,packet_ref,version:1,
    attempt_id:'a1',execution_binding_ref:'binding:'+id,
    lifecycle:'suspended',correlation:{challenge:'browser-'+randomUUID()},
    budget_reservation_id:reserved.reservation.reservation_id,
    claim:{claim_id:claim.claim.claim_id,epoch:claim.claim.epoch,
      expected_generation:coordinator.inspect(packet_ref).generation},
    provider:'chatgpt',channel:'browser',
    resumeTo:'handler:chatgpt-browser-result-observer',
    expected_result:{schema:'cogentia.step_result/v1'},
    state:{assignment_ref:task_ref,dispatch_mode:'cps:assigned-browser-turn/v1',
      question},
  };
  const prompt=buildAssignedChatgptCpsPrompt(continuation);
  const append=prompt.ok?store.append(declaredContinuationRecord(continuation))
    :{ok:false};
  if(!append.ok){
    await coordinator.release({packetRef:packet_ref,
      claimId:claim.claim.claim_id,handlerRef:'agent:jhn',epoch:claim.claim.epoch});
    ledger.release({reservation_id:reserved.reservation.reservation_id,
      expected_version:ledger.snapshot().version});
    return deny(prompt.ok?'continuation_declaration_failed':prompt.error);
  }
  return {ok:true,duplicate:false,continuation_id:id,packet_ref,
    claim_expires_at:claim.claim.expires_at,
    declaration_receipt_ref:append.event.idempotency_key,
    budget_reservation_id:reserved.reservation.reservation_id,
    mandate_version:mandate.version};
}
