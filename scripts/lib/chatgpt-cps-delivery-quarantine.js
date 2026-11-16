/** One explicit cold-work quarantine for a CPS browser delivery of UNKNOWN
 * outcome. This is neither a model result nor an abandoned/failed delivery.
 * COP's canonical packet-temperature parent cascade remains the only suspend
 * implementation. The receipt permits unrelated work to proceed, but NEVER
 * permits re-sending the fenced continuation or discarding a late return.
 */
import {changePacketTemperature,projectPacketTemperature}
  from '../../../inseme/packages/cop-core/src/packet-temperature.js';

const PROFILE='cogentia.cps-browser-delivery-quarantine/v1';
const CHILD=/^ctn_chatgpt_browser_[a-f0-9]{32}$/;
const PARENT=/^ctn_[a-zA-Z0-9_-]{5,120}$/;
const childTopic=id=>'continuation:'+id;
const intentKey=id=>`chatgpt-browser:${id}:first-dispatch-intent`;
const clickKey=id=>`chatgpt-browser:${id}:first-dispatch-receipt`;
const quarantineKey=id=>`cps-browser:delivery-quarantine:${id}`;
const fail=status=>({ok:false,status});

/** Read-only, strict projection. A mere 'parked' event without a receipt is
 * NOT sufficient to remove an ambiguous browser intent from admission fences.
 * Existing late results remain canonical and are independently reconciled.
 */
export function inspectQuarantinedBrowserDelivery(store,continuation_id){
  if(typeof store?.listTopic!=='function'||typeof store?.eventByIdempotency!=='function'||
     !CHILD.test(continuation_id||''))return fail('invalid_child_ref');
  const topic=childTopic(continuation_id);
  const declaration=store.listTopic(topic)
    .find(x=>x.payload?.profile==='cop/continuation')?.payload?.continuation;
  const parentId=declaration?.state?.assignment_ref?.startsWith('legacy:')
    ?declaration.state.assignment_ref.slice(7):null;
  if(!PARENT.test(parentId||''))return fail('unlinked_or_nonlegacy_continuation');
  const parent=childTopic(parentId);
  const link=store.listTopic(parent).find(x=>
    x.payload?.profile==='cop.packet-parent-continuation/v1'&&
    x.payload?.phase==='child_linked'&&x.payload?.parent_ref===parent&&
    x.payload?.child_ref===topic);
  if(!link)return fail('parent_link_missing');
  const intent=store.eventByIdempotency(intentKey(continuation_id));
  if(!intent||intent.topic?.id!==topic||
     intent.payload?.profile!=='cop.continuation-browser-dispatch/v1'||
     intent.payload?.phase!=='intent_committed')
    return fail('original_dispatch_intent_missing');
  const receipt=store.eventByIdempotency(quarantineKey(continuation_id));
  if(!receipt)return {ok:true,status:'not_quarantined',quarantined:false,
    parent_ref:parent,child_ref:topic,intent_ref:intentKey(continuation_id)};
  if(receipt.topic?.id!==topic||receipt.payload?.profile!==PROFILE||
     receipt.payload?.phase!=='quarantined_uncertain_delivery'||
     receipt.payload?.parent_ref!==parent||
     receipt.payload?.original_dispatch_intent_ref!==intentKey(continuation_id)||
     receipt.payload?.retry_authorized!==false)
    return fail('quarantine_receipt_mismatch');
  const coldParent=projectPacketTemperature(store,{packet_ref:parent});
  const coldChild=projectPacketTemperature(store,{packet_ref:topic});
  if(!coldParent.ok||!coldChild.ok||coldParent.temperature!=='parked'||
     coldChild.temperature!=='parked'||
     coldChild.effective_temperature!=='parked')
    return fail('quarantine_temperature_changed');
  const events=store.listTopic(topic);
  return {ok:true,status:'quarantined_uncertain_delivery',quarantined:true,
    parent_ref:parent,child_ref:topic,quarantine_receipt_ref:quarantineKey(continuation_id),
    original_intent_ref:intentKey(continuation_id),
    delivered:events.some(x=>x.idempotency_key===clickKey(continuation_id)),
    late_return_observed:events.some(x=>x.payload?.profile==='cop.continuation-result/v1'&&
      x.payload?.phase==='returned'),retry_authorized:false};
}

/** Explicit owner-instructed quarantine. No fresh browser calls occur here.
 * Cooling parent -> all children is already a COP-core atomic transition;
 * quarantine evidence is an append-only second stage. A crash between them
 * remains CLOSED until this function is safely repeated.
 */
export function quarantineUncertainBrowserDelivery(store,{continuation_id,
  transition_id='park-uncertain-cps-browser-delivery-'+continuation_id}={}){
  if(typeof store?.append!=='function'||typeof store?.transaction!=='function')
    return fail('invalid_canonical_store');
  const prior=inspectQuarantinedBrowserDelivery(store,continuation_id);
  if(!prior.ok)return prior;
  if(prior.quarantined)return {...prior,duplicate:true};
  if(store.eventByIdempotency(clickKey(continuation_id)))
    return fail('browser_delivery_already_confirmed');
  const childEvents=store.listTopic(prior.child_ref);
  if(childEvents.some(e=>e.payload?.profile==='cop.continuation-result/v1'&&
    e.payload?.phase==='returned'))return fail('model_return_already_observed');
  const parked=changePacketTemperature(store,{packet_ref:prior.parent_ref,
    temperature:'parked',transition_id});
  if(!parked.ok)return parked;
  const child=projectPacketTemperature(store,{packet_ref:prior.child_ref});
  if(!child.ok||child.temperature!=='parked')return fail('cascade_not_confirmed');
  // A return or confirmed click can race with the cooling transition.
  // Lock the canonical journal for this final verification + quarantine
  // receipt. If any real result arrived, preserve the colder parent but
  // leave the scheduler CLOSED until explicit reconciliation.
  const committed=store.transaction(tx=>{
    const rows=tx.listTopic(prior.child_ref);
    if(rows.some(x=>x.idempotency_key===clickKey(continuation_id)||
      (x.payload?.profile==='cop.continuation-result/v1'&&
       x.payload?.phase==='returned')))
      return {ok:false,status:'late_delivery_requires_reconciliation'};
    const existing=tx.eventByIdempotency(quarantineKey(continuation_id));
    if(existing)return {ok:true,duplicate:true};
    const observed=tx.append({topic_id:prior.child_ref,event_type:'cop.event/v1',
      actor_id:'cop:cps-delivery-quarantine',subject_ref:prior.child_ref,
      visibility:'restricted',epistemic_status:'decided',
      idempotency_key:quarantineKey(continuation_id),
      causal_refs:[prior.intent_ref,parked.receipt_ref],
      payload:{profile:PROFILE,phase:'quarantined_uncertain_delivery',
        parent_ref:prior.parent_ref,child_ref:prior.child_ref,
        original_dispatch_intent_ref:prior.intent_ref,
        temperature_transition_ref:parked.receipt_ref,
        disposition:'parked',certainty:'delivery_unknown',
        retain_late_results:true,retry_authorized:false,
        affects_other_cohort_jobs:false},
    });
    return {ok:observed.ok,duplicate:observed.duplicate===true,
      status:observed.ok?'quarantined_uncertain_delivery':'quarantine_receipt_not_committed'};
  });
  if(!committed.ok||!committed.value?.ok)
    return fail(committed.value?.status||'quarantine_receipt_not_committed');
  return {...inspectQuarantinedBrowserDelivery(store,continuation_id),
    duplicate:committed.value.duplicate===true};
}
