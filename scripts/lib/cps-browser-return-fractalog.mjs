/**
 * Original browser CPS Judgment -> local FractaLog observation.
 * Derived strictly from an already accepted direct MCP result and its
 * canonical browser-click and budget receipts; no independent spend ledger.
 *
 * Do not use this for reconstructed late browser answers: those retain a
 * different provenance through cps-visible-result-recovery.mjs.
 */
import {createFractalogActRecord,fractalogRecordToCopEnvelope,
  copEnvelopeToFractalogRecord}
  from '../../../inseme/packages/cop-core/src/fractalog.js';

const childId=x=>typeof x==='string'&&
  /^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(x);
const resultProfile='cop.continuation-result/v1';
const browserProfile='cop.continuation-browser-dispatch/v1';
const budgetTopic='execution-budget:budget:mandate:jhn:john-root';

export function recordCompletedDirectCpsBrowserJudgment({store,continuation_id}={}){
  if(!childId(continuation_id)||!store?.listTopic||
     typeof store.eventByIdempotency!=='function')
    return {ok:false,status:'invalid_cps_judgment'};
  const topic='continuation:'+continuation_id;
  const events=store.listTopic(topic);
  const c=events.find(e=>e.payload?.profile==='cop/continuation')
    ?.payload?.continuation;
  if(c?.continuation_id!==continuation_id||
     c?.provider!=='chatgpt'||c.channel!=='browser'||
     typeof c.budget_reservation_id!=='string'||!c.packet_ref)
    return {ok:false,status:'cps_continuation_missing'};
  const clickRef='chatgpt-browser:'+continuation_id+':first-dispatch-receipt';
  const click=store.eventByIdempotency(clickRef);
  const returned=events.filter(e=>e.payload?.profile===resultProfile&&
    e.payload.phase==='returned');
  const accepted=events.filter(e=>e.payload?.profile===resultProfile&&
    e.payload.phase==='accepted');
  const handler=events.filter(e=>e.payload?.profile==='cop.continuation-dispatch/v1'&&
    e.payload.phase==='handler_completed');
  const mcp=events.filter(e=>e.payload?.surface==='mcp');
  const settled=store.listTopic(budgetTopic).filter(e=>
    e.event_type==='ExecutionBudgetSettlement'&&
    e.payload?.reservation_id===c.budget_reservation_id);
  const reserved=store.listTopic(budgetTopic).filter(e=>
    e.event_type==='ExecutionBudgetReservation'&&
    e.payload?.reservation?.reservation_id===c.budget_reservation_id);
  if(click?.topic?.id!==topic||click.payload?.profile!==browserProfile||
     click.payload?.phase!=='ui_click_dispatched_not_model_result'||
     returned.length!==1||accepted.length!==1||handler.length!==1||
     mcp.length!==1||reserved.length!==1||settled.length!==1||
     settled[0].payload?.usage?.max_steps!==1||
     returned[0].payload?.candidate_result?.status!=='answered'||
     typeof returned[0].payload?.candidate_result?.result?.answer!=='string')
    return {ok:false,status:'direct_judgment_receipts_not_complete'};
  if(mcp[0].payload?.usage_observation?.direct_model_tool_submission===false)
    return {ok:false,status:'visible_recovery_requires_separate_fractalog'};
  const logId='fractalog:cps-browser-judgment:'+continuation_id;
  const existing=store.eventByIdempotency(logId);
  if(existing){
    try{
      const record=copEnvelopeToFractalogRecord(existing);
      if(record.trace?.mcp_return_receipt_ref!==returned[0].idempotency_key||
         record.trace?.browser_click_receipt_ref!==clickRef||
         record.trace?.budget_settlement_receipt_ref!==settled[0].idempotency_key||
         record.effect?.new_browser_submissions!==1)
        return {ok:false,status:'cps_fractalog_receipt_conflict'};
    }catch{return {ok:false,status:'cps_fractalog_receipt_invalid'}}
    return {ok:true,status:'direct_cps_fractalog_recorded',
      duplicate:true,receipt_ref:logId};
  }
  const record=createFractalogActRecord({
    record_id:'flr:cps-browser-judgment:'+continuation_id,
    act_id:'act:cps-browser-judgment:'+continuation_id,
    act_kind:'cogentia.browser.judgment.return',
    act_phase:'observed',idempotency_key:logId,visibility:'restricted',
    owner_instance_ref:'node:fracta2/cogentia:cps-result-ingress',
    on_behalf_of_instance_ref:'agent:jhn',
    governed_chain:{
      principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
      mandate_ref:'mandate:jhn:john-root',
      capability:'browser.chatgpt.turn',
      packet_ref:c.packet_ref,continuation_id,
      claim_epoch:c.claim?.epoch??null},
    trace:{continuation_id,packet_ref:c.packet_ref,
      declaration_ref:'continuation:'+continuation_id+':declared',
      browser_click_receipt_ref:clickRef,
      mcp_observation_receipt_ref:mcp[0].idempotency_key,
      mcp_return_receipt_ref:returned[0].idempotency_key,
      mcp_acceptance_receipt_ref:accepted[0].idempotency_key,
      scheduler_handler_receipt_ref:handler[0].idempotency_key,
      budget_reservation_receipt_ref:reserved[0].idempotency_key,
      budget_settlement_receipt_ref:settled[0].idempotency_key},
    effect:{new_browser_submissions:1,
      model_answer_returned:1,
      cop_budget_settled_max_steps:1,
      provider_monetary_cost:'not_measured',
      monetary_allocation_method:'none',
      provider_billing_basis:'subscription_or_provider_record_not_observed'},
    links:[
      {rel:'browser_click',ref:clickRef},
      {rel:'mcp_return',ref:returned[0].idempotency_key},
      {rel:'handler_completed',ref:handler[0].idempotency_key},
      {rel:'execution_budget_settlement',ref:settled[0].idempotency_key},
    ],
  });
  const saved=store.append(fractalogRecordToCopEnvelope(record));
  if(!saved.ok)return {ok:false,status:'direct_cps_fractalog_write_failed'};
  return {ok:true,status:'direct_cps_fractalog_recorded',
    duplicate:saved.duplicate===true,receipt_ref:logId};
}
