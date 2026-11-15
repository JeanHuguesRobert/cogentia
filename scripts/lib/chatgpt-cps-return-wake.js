/**
 * Project a durable wake request from an accepted ChatGPT browser MCP result.
 * This is an event for the EXISTING COP scheduler, never a second scheduler,
 * execution grant, or assertion that a new conversational turn was submitted.
 */
export function recordChatgptReturnWake({store,continuation,returned,budget_id}={}){
  const id=continuation?.continuation_id;
  if(!store||typeof store.append!=='function'||
      typeof store.eventByIdempotency!=='function'||
      !id||!budget_id||!continuation.budget_reservation_id||
      continuation.provider!=='chatgpt'||
      continuation.channel!=='browser'||
      returned?.payload?.profile!=='cop.continuation-result/v1'||
      returned.payload.phase!=='returned'||
      returned.payload.continuation_id!==id)
    return {ok:false,error:'canonical_return_required'};
  const settlement=store.listTopic('execution-budget:'+budget_id).find(e=>
    e.event_type==='ExecutionBudgetSettlement' &&
    e.payload?.reservation_id===continuation.budget_reservation_id);
  if(!settlement)return {ok:false,error:'settlement_required'};
  const key='chatgpt-browser:'+id+':scheduler-wake';
  const existing=store.eventByIdempotency(key);
  if(existing)return {ok:true,duplicate:true,receipt_ref:existing.idempotency_key};
  const recorded=store.append({
    topic_id:'continuation:'+id,
    event_type:'cop.event/v1',
    actor_id:'cop:chatgpt-result-observer',
    subject_ref:'continuation:'+id,
    visibility:'restricted',
    epistemic_status:'observed',
    idempotency_key:key,
    causal_refs:[returned.idempotency_key,settlement.idempotency_key].filter(Boolean),
    payload:{
      profile:'cop.continuation-scheduler-wake/v1',
      phase:'pending_scheduler_review',
      continuation_id:id,
      returned_receipt_ref:returned.idempotency_key,
      parent_packet_status:'open',
      requires_next_step_authority:true,
      dispatch_permitted:false,
    },
  });
  if(!recorded.ok)return {ok:false,error:recorded.error||'wake_commit_failed'};
  return {ok:true,duplicate:false,receipt_ref:key};
}
