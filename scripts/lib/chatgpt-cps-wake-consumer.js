/**
 * Bridge durable ChatGPT MCP return-wakes to Inseme's existing COPScheduler.
 *
 * A wake is neither approval nor a prompt. This adapter owns no scheduler,
 * browser channel or budget: the provided canonical scheduler invokes its
 * existing handler after a separate admission evaluator approves the resume.
 * The append-only dispatch intent is committed BEFORE calling the handler.
 * An interrupted/ambiguous intent requires reconciliation, never blind replay.
 */
const WAKE='cop.continuation-scheduler-wake/v1';
const RETURN='cop.continuation-result/v1';
const DECLARATION='cop/continuation';
const reserveKey=id=>'chatgpt-browser:'+id+':dispatch-attempt';
const completedKey=id=>'chatgpt-browser:'+id+':dispatch-result';
const isObject=x=>x!==null&&typeof x==='object';

/** Read-only discovery of pending wakes from the existing COP journal. */
export function listChatgptCpsWakes(store,{limit=25}={}){
  if(typeof store?.replay!=='function'||!Number.isSafeInteger(limit)||limit<1||limit>100)
    throw new TypeError('bounded COP replay store required');
  const wakes=store.replay().filter(e=>e.payload?.profile===WAKE&&
    e.payload.phase==='pending_scheduler_review'&&
    typeof e.payload.continuation_id==='string'&&
    e.topic?.id==='continuation:'+e.payload.continuation_id);
  return wakes.filter(e=>!store.eventByIdempotency(completedKey(e.payload.continuation_id)))
    .slice(0,limit).map(e=>({
      continuation_id:e.payload.continuation_id,
      receipt_ref:e.idempotency_key,
      status:store.eventByIdempotency(reserveKey(e.payload.continuation_id))
        ? 'needs_reconciliation':'pending',
    }));
}

/**
 * Return-wake dispatch, NOT a next-turn authorization.
 * `admit` is an independent trusted local authority evaluator, required on
 * each attempt and NEVER defaulted to a model-written value. Its result
 * must provide a current authorization receipt, not a mere boolean. The
 * returned step's COP budget is checked separately; this adapter does NOT
 * reserve authority or budget for a subsequent browser turn.
 * `scheduler` is the existing Inseme COPScheduler with a governed resolver.
 */
export async function consumeChatgptCpsWake({store,continuation_id,scheduler,admit}={}){
  if(!store||typeof store.transaction!=='function'||typeof store.listTopic!=='function'||
      typeof store.eventByIdempotency!=='function'||!scheduler||
      typeof scheduler.execute!=='function'||typeof admit!=='function'||
      typeof continuation_id!=='string'||!/^ctn_[a-zA-Z0-9_]{3,120}$/.test(continuation_id))
    return {ok:false,status:'invalid_request'};
  const topic='continuation:'+continuation_id;
  const events=store.listTopic(topic);
  const wake=events.find(e=>e.payload?.profile===WAKE&&
    e.payload.phase==='pending_scheduler_review'&&
    e.payload.continuation_id===continuation_id&&
    e.payload.dispatch_permitted===false);
  const declared=events.find(e=>e.payload?.profile===DECLARATION);
  const continuation=declared?.payload?.continuation;
  const returned=events.find(e=>e.payload?.profile===RETURN&&
    e.payload.phase==='returned'&&e.payload.continuation_id===continuation_id&&
    e.idempotency_key===wake?.payload?.returned_receipt_ref);
  if(!wake||!continuation||!returned||
      continuation.continuation_id!==continuation_id||
      continuation.provider!=='chatgpt'||continuation.channel!=='browser'||
      typeof continuation.budget_reservation_id!=='string')
    return {ok:false,status:'canonical_return_missing'};
  // If the parent mandate uses a different ledger, it must be resolved by
  // the authoritative admission callback; no fallback to model claims.
  const settling=store.replay().find(e=>e.event_type==='ExecutionBudgetSettlement'&&
    e.payload?.reservation_id===continuation.budget_reservation_id);
  if(!settling)return {ok:false,status:'budget_not_settled'};
  const prior=store.eventByIdempotency(reserveKey(continuation_id));
  if(prior)return {ok:false,status:store.eventByIdempotency(completedKey(continuation_id))
    ?'already_processed':'needs_reconciliation'};
  let admission;
  try{admission=await admit({continuation,returned,wake,settlement:settling,
    expected_resume_to:continuation.resumeTo});}
  catch(error){return {ok:false,status:'admission_failed',error:String(error?.message||error)}}
  if(!isObject(admission)||admission.granted!==true||
      typeof admission.authorization_ref!=='string'||!admission.authorization_ref||
      admission.handler_ref!==continuation.resumeTo||
      continuation.resumeTo!=='handler:chatgpt-browser-result-observer')
    return {ok:false,status:'not_admitted'};
  // CAS fence shared among concurrent workers and across process restarts.
  const attempted=store.transaction(tx=>{
    if(tx.eventByIdempotency(reserveKey(continuation_id)))return {reserved:false};
    const app=tx.append({
      topic_id:topic,event_type:'cop.event/v1',
      actor_id:'cop:chatgpt-wake-consumer',
      subject_ref:'continuation:'+continuation_id,
      visibility:'restricted',epistemic_status:'observed',
      idempotency_key:reserveKey(continuation_id),
      causal_refs:[wake.idempotency_key,returned.idempotency_key,
        settling.idempotency_key].filter(Boolean),
      payload:{profile:'cop.continuation-dispatch/v1',phase:'intent_committed',
        continuation_id,handler_ref:admission.handler_ref,
        authorization_ref:admission.authorization_ref,
        dispatch_permitted:true},
    });
    if(!app.ok)throw new Error(app.error||'dispatch_intent_commit_failed');
    return {reserved:true};
  });
  if(!attempted.ok)return {ok:false,status:'intent_commit_failed',error:attempted.error};
  if(!attempted.value.reserved)return {ok:false,status:'needs_reconciliation'};
  let execution;
  try{
    execution=await scheduler.execute({
      continuationId:continuation_id,
      resumeTo:continuation.resumeTo,
      resumeIntent:continuation.resumeIntent||'resume-external-continuation',
      state:continuation.state||{},
    },{
      reason:'external_result_returned',triggeringEvent:returned,
      payload:{candidateResult:returned.payload.candidate_result,
        yield:returned.payload.candidate_result?.result||null,
        provenance:returned.payload.provenance||null},
    });
  }catch(error){
    // Do not release the dispatch intent: side effects may have occurred.
    return {ok:false,status:'needs_reconciliation',error:String(error?.message||error)};
  }
  const outcome=execution?.execution?.result;
  // A scheduler evaluation may identify a candidate next act. Persist it as
  // data for a separate authority/budget/claim admission, never as a grant.
  const nextAction=outcome?.status==='continue'&&
    typeof outcome.next_action==='string'&&
    /^[a-zA-Z0-9_.:-]{1,96}$/.test(outcome.next_action)
      ?outcome.next_action:null;
  const committed=store.append({
    topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:chatgpt-wake-consumer',
    subject_ref:'continuation:'+continuation_id,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:completedKey(continuation_id),
    causal_refs:[reserveKey(continuation_id)],
    payload:{profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
      continuation_id,handler_ref:continuation.resumeTo,
      parent_mandate_status:'open',
      // This event reflects ONLY scheduler handler return, not a browser
      // message delivery or an autonomous next-turn result.
      next_turn_dispatched:false,
      next_action_candidate:nextAction,
      next_action_admitted:false},
  });
  if(!committed.ok)return {ok:false,status:'needs_reconciliation',error:'completion_receipt_missing'};
  return {ok:true,status:'handler_completed',continuation_id,
    receipt_ref:completedKey(continuation_id),
    result:execution?.execution?.result||null};
}
