/**
 * Durable NEXT-ACT handoff after the EXISTING COPScheduler has evaluated a
 * ChatGPT result. This is NOT a second scheduler or a provider/browser client.
 * A candidate merely exposes an action the trusted parent policy may consider.
 * The independently authenticated caller supplies its own COP authorization,
 * fresh child packet, claim, budget and execution through governed callbacks.
 * The governed dispatcher's own receipt is trusted by default; an OPTIONAL
 * stronger verifier can be supplied for a consequential profile. A persisted
 * intent fences ambiguous dispatch, including after process crash.
 */
import {runMandateToBoundary} from './mandate-continuation.js';
const HANDLER_COMPLETED='cop.continuation-dispatch/v1';
const NEXT_DISPATCH='cop.continuation-next-step/v1';
const validId=id=>typeof id==='string'&&/^ctn_[a-zA-Z0-9_]{3,120}$/.test(id);
const intentKey=id=>'chatgpt-browser:'+id+':next-step-intent';
const resultKey=id=>'chatgpt-browser:'+id+':next-step-dispatched';
const validAction=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,96}$/.test(x);

export function listChatgptCpsNextSteps(store,{limit=25}={}){
  if(typeof store?.replay!=='function'||typeof store.eventByIdempotency!=='function'||
    !Number.isSafeInteger(limit)||limit<1||limit>100)
    throw new TypeError('canonical COP store and bounded limit required');
  return store.replay().filter(e=>e.payload?.profile===HANDLER_COMPLETED&&
    e.payload?.phase==='handler_completed'&&
    validId(e.payload?.continuation_id)&&
    e.topic?.id==='continuation:'+e.payload.continuation_id&&
    e.payload.parent_mandate_status==='open'&&
    e.payload.next_turn_dispatched===false&&
    e.payload.next_action_admitted===false&&
    validAction(e.payload.next_action_candidate))
    .filter(e=>!store.eventByIdempotency(resultKey(e.payload.continuation_id)))
    .slice(0,limit).map(e=>({continuation_id:e.payload.continuation_id,
      action_id:e.payload.next_action_candidate,
      status:store.eventByIdempotency(intentKey(e.payload.continuation_id))
        ?'needs_reconciliation':'pending_admission',
      handler_receipt_ref:e.idempotency_key}));
}

/**
 * The provided `admit` must check signed current authority, provider terms,
 * parent acceptance and available COP budget. A boolean from a model is NOT
 * sufficient: the reply must carry a verifiable receipt reference. `dispatch`
 * must use the ordinary governed John/COP executable route, not raw browser
 * automation. This adapter never creates or reserves a child itself.
 */
export async function consumeChatgptCpsNextStep({store,continuation_id,admit,dispatch,verifyDispatchReceipt}={}){
  if(typeof store?.transaction!=='function'||typeof store.listTopic!=='function'||
     typeof store.eventByIdempotency!=='function'||!validId(continuation_id)||
     typeof admit!=='function'||typeof dispatch!=='function'||
     (verifyDispatchReceipt!==undefined&&typeof verifyDispatchReceipt!=='function'))
    return {ok:false,status:'invalid_request'};
  const topic='continuation:'+continuation_id;
  const records=store.listTopic(topic);
  const completed=records.find(e=>e.payload?.profile===HANDLER_COMPLETED&&
    e.payload.phase==='handler_completed'&&
    e.payload.continuation_id===continuation_id&&
    e.payload.parent_mandate_status==='open'&&
    e.payload.next_turn_dispatched===false&&
    e.payload.next_action_admitted===false&&
    validAction(e.payload.next_action_candidate));
  const returned=records.find(e=>e.payload?.profile==='cop.continuation-result/v1'&&
    e.payload.phase==='returned'&&e.payload.continuation_id===continuation_id);
  const wake=records.find(e=>e.payload?.profile==='cop.continuation-scheduler-wake/v1'&&
    e.payload.continuation_id===continuation_id);
  if(!completed||!returned||!wake||
     wake.payload.returned_receipt_ref!==returned.idempotency_key||
     !store.eventByIdempotency('chatgpt-browser:'+continuation_id+':dispatch-attempt'))
    return {ok:false,status:'verified_candidate_missing'};
  if(store.eventByIdempotency(resultKey(continuation_id)))
    return {ok:false,status:'already_dispatched'};
  if(store.eventByIdempotency(intentKey(continuation_id)))
    return {ok:false,status:'needs_reconciliation'};
  const action_id=completed.payload.next_action_candidate;
  let admission;
  try{admission=await admit({continuation_id,action_id,completed,returned,wake});}
  catch{return {ok:false,status:'admission_failed'}}
  if(admission?.granted!==true||admission?.action_id!==action_id||
     typeof admission.authorization_ref!=='string'||!admission.authorization_ref||
     admission.provider_permitted!==true||admission.budget_admitted!==true||
     typeof admission.provider_permission_receipt_ref!=='string'||
     !admission.provider_permission_receipt_ref||
     typeof admission.budget_authorization_ref!=='string'||
     !admission.budget_authorization_ref)
    return {ok:false,status:'not_admitted'};
  let intent;
  try{intent=store.transaction(tx=>{
    if(tx.eventByIdempotency(intentKey(continuation_id)))return {reserved:false};
    const written=tx.append({topic_id:topic,event_type:'cop.event/v1',
      actor_id:'cop:chatgpt-next-step-bridge',subject_ref:'continuation:'+continuation_id,
      visibility:'restricted',epistemic_status:'decided',
      idempotency_key:intentKey(continuation_id),
      causal_refs:[completed.idempotency_key,admission.authorization_ref,
        admission.provider_permission_receipt_ref,
        admission.budget_authorization_ref].filter(Boolean),
      payload:{profile:NEXT_DISPATCH,phase:'intent_committed',
        continuation_id,action_id,authorization_ref:admission.authorization_ref,
        child_execution_required:true},
    });
    if(!written.ok)throw Error(written.error||'intent_failed');
    return {reserved:true};
  });}catch{return {ok:false,status:'intent_commit_failed'}}
  if(!intent.ok)return {ok:false,status:'intent_commit_failed'};
  if(!intent.value.reserved)return {ok:false,status:'needs_reconciliation'};
  let execution;
  try{execution=await dispatch({continuation_id,action_id,
    authorization_ref:admission.authorization_ref,
    parent_handler_receipt_ref:completed.idempotency_key});}
  catch{return {ok:false,status:'needs_reconciliation'}}
  if(execution?.ok!==true||!validId(execution.child_continuation_id)||
     typeof execution.execution_receipt_ref!=='string'||!execution.execution_receipt_ref)
    return {ok:false,status:'needs_reconciliation'};
  // Optimistic Locking: the governed dispatcher's receipt is sufficient.
  // A second verifier is OPTIONAL, not a mandatory distrust ritual. Keep
  // reconciliation on transport ambiguity; never replay an uncertain effect.
  let evidenceRef=execution.execution_receipt_ref;
  let receiptBasis='mandated_dispatcher_report';
  if(typeof verifyDispatchReceipt==='function'){
    let proof;
    try{proof=await verifyDispatchReceipt({continuation_id,action_id,
      execution_receipt_ref:execution.execution_receipt_ref,
      child_continuation_id:execution.child_continuation_id});}
    catch{return {ok:false,status:'needs_reconciliation'}}
    if(proof?.verified!==true||
       proof.child_continuation_id!==execution.child_continuation_id||
       proof.execution_receipt_ref!==execution.execution_receipt_ref||
       typeof proof.evidence_ref!=='string'||!proof.evidence_ref)
      return {ok:false,status:'needs_reconciliation'};
    evidenceRef=proof.evidence_ref;
    receiptBasis='optional_separate_verifier';
  }
  const committed=store.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:chatgpt-next-step-bridge',subject_ref:'continuation:'+continuation_id,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:resultKey(continuation_id),
    causal_refs:[intentKey(continuation_id),evidenceRef],
    payload:{profile:NEXT_DISPATCH,phase:'child_dispatched',
      continuation_id,action_id,child_continuation_id:execution.child_continuation_id,
      child_execution_receipt_ref:execution.execution_receipt_ref,
      child_dispatch_evidence_ref:evidenceRef,
      receipt_basis:receiptBasis,
      parent_mandate_status:'open'},
  });
  if(!committed.ok)return {ok:false,status:'needs_reconciliation'};
  return {ok:true,status:'child_dispatched',continuation_id,
    child_continuation_id:execution.child_continuation_id,
    receipt_ref:resultKey(continuation_id)};
}


/** Drain already-evaluated next-step candidates through the SAME bounded
 * mandate continuation driver. Not a background loop, timer or scheduler.
 * Each dispatch is separately admitted by the trusted caller. */
export async function runChatgptCpsNextStepBatch({store,admit,dispatch,verifyDispatchReceipt,max_steps=3}={}){
 if(!store||typeof admit!=='function'||typeof dispatch!=='function'||
    (verifyDispatchReceipt!==undefined&&typeof verifyDispatchReceipt!=='function')||
    !Number.isSafeInteger(max_steps)||max_steps<1||max_steps>20)
   return {ok:false,status:'invalid_batch'};
 const run=await runMandateToBoundary({max_steps,inspect:async()=>{
   const pending=listChatgptCpsNextSteps(store,{limit:100});
   const ambiguous=pending.find(x=>x.status==='needs_reconciliation');
   if(ambiguous)return {hard_blocker:true,ambiguous_id:ambiguous.continuation_id};
   const next=pending.find(x=>x.status==='pending_admission');
   if(!next)return {objective_met:true};
   return {next_step_clear:true,next_step_allowed:true,
     continuation_id:next.continuation_id};
 },execute:async({state})=>{
   const result=await consumeChatgptCpsNextStep({store,
     continuation_id:state.continuation_id,admit,dispatch,verifyDispatchReceipt});
   return {ok:result.ok===true,code:result.status};
 }});
 const pending=listChatgptCpsNextSteps(store,{limit:100});
 const drained=(run.action==='complete'&&run.reason==='verified_objective_met')||
   (run.reason==='step_limit'&&pending.length===0);
 return {ok:drained,status:drained?'queue_drained':run.reason,
   steps_completed:run.steps_completed,
   pending_count:pending.filter(x=>x.status==='pending_admission').length,
   needs_reconciliation:pending.filter(x=>x.status==='needs_reconciliation').length,
   parent_mandate_completed:false,persistent_worker:false,
   events:run.events};
}
