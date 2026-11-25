/**
 * Translate an already accepted canonical CPS ChatGPT result into a
 * caller-mediated Alan step result. This observer does not open a browser,
 * assign a continuation, reserve a budget or create an independent ledger.
 *
 * The CPS source belongs to its own locality; reference it explicitly.
 * A client-supplied answer or receipt name is not a verification.
 */
import {createHash} from "node:crypto";

const ID=id=>typeof id==="string"&&
  /^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(id);

export function assignedCpsReference({packetRef,pending}={}) {
  const ordinal=pending?.policy && pending?.capability==="chatgpt.delegate"
    ? pending.slot_ordinal : null;
  // slot_ordinal is copied from the Alan suspension by the MultiMCP step
  // projection (not deduced from the claimed browser result).
  if(typeof packetRef!=="string"||
    !/^pkt-mcp-[0-9a-f-]{36}$/.test(packetRef)||
    !Number.isSafeInteger(ordinal)||ordinal<0)
    throw new TypeError("canonical_multimcp_cps_reference_required");
  const task_ref="packet:"+packetRef+":slot:"+ordinal;
  const continuation_id="ctn_chatgpt_browser_"+
    createHash("sha256").update(task_ref).digest("hex").slice(0,32);
  return {task_ref,continuation_id};
}

export function createCanonicalChatgptCpsReturnVerifier({cpsStore}={}) {
  if(!cpsStore||typeof cpsStore.listTopic!=="function"||
    typeof cpsStore.eventByIdempotency!=="function")
    throw new TypeError("canonical_cps_source_required");
  return async function verify({packetRef,pending,suspension,candidate}={}) {
    if(suspension?.type!=="alan.suspension"||
      suspension.pending_call?.capability!=="chatgpt.delegate"||
      pending?.capability!=="chatgpt.delegate"||
      pending?.slot_ordinal!==suspension.pending_call?.slot_ordinal||
      pending?.input?.prompt!==suspension.pending_call?.input?.prompt||
      typeof pending.input.prompt!=="string"||
      !pending.input.prompt.trim()||
      pending.input.prompt.length>4500)
      return {verified:false,reason:"canonical_suspension_required"};
    let ref;
    try{ref=assignedCpsReference({packetRef,pending});}
    catch{return {verified:false,reason:"invalid_cps_reference"}}
    const {continuation_id:id,task_ref}=ref;
    if(candidate?.continuation_id!==id||!ID(id))
      return {verified:false,reason:"cps_correlation_mismatch"};
    const cpsTopic="continuation:"+id;
    // The return is a source-local history, not a claim copied from the
    // initiating program's Task or a cache. Verify its commitment when the
    // authoritative store exposes that operation.
    if(typeof cpsStore.auditTopicCommitment==="function" &&
      cpsStore.auditTopicCommitment(cpsTopic)?.ok!==true)
      return {verified:false,reason:"cps_history_commitment_invalid"};
    const events=cpsStore.listTopic(cpsTopic);
    const declaration=events.find(e=>e.payload?.profile==="cop/continuation");
    const c=declaration?.payload?.continuation;
    if(c?.continuation_id!==id||c?.provider!=="chatgpt"||
       c.channel!=="browser"||
       c.state?.dispatch_mode!=="cps:assigned-browser-turn/v1"||
       c.state?.assignment_ref!==task_ref||
       c.state?.question!==pending.input.prompt||
       typeof c.budget_reservation_id!=="string"||
       !c.budget_reservation_id||
       !c.claim?.claim_id)
      return {verified:false,reason:"assigned_cps_declaration_missing"};
    const click=cpsStore.eventByIdempotency(
      "chatgpt-browser:"+id+":first-dispatch-receipt");
    const returned=events.find(e=>
      e.payload?.profile==="cop.continuation-result/v1"&&
      e.payload.phase==="returned"&&
      e.payload.continuation_id===id);
    const accepted=events.find(e=>
      e.payload?.profile==="cop.continuation-result/v1"&&
      e.payload.phase==="accepted"&&
      e.payload.continuation_id===id);
    const handled=events.find(e=>
      e.payload?.profile==="cop.continuation-dispatch/v1"&&
      e.payload.phase==="handler_completed"&&
      e.payload.continuation_id===id);
    const wake=events.find(e=>
      e.payload?.profile==="cop.continuation-scheduler-wake/v1"&&
      e.payload.continuation_id===id&&
      e.payload.returned_receipt_ref===returned?.idempotency_key);
    // Every receipt must be sourced from the same declared continuation.
    // A mere UI click or model-visible answer is never sufficient.
    if(click?.topic?.id!=="continuation:"+id||
       click.payload?.phase!=="ui_click_dispatched_not_model_result"||
       !returned||!accepted||!handled||!wake||
       !(accepted.topic.seq<returned.topic.seq &&
         returned.topic.seq<handled.topic.seq)||
       accepted.payload.correlation_valid!==true||
       returned.payload.correlation_valid!==true||
       accepted.payload.schema_valid!==true||
       returned.payload.schema_valid!==true||
       !returned.payload.observation_key||
       accepted.payload.observation_key!==returned.payload.observation_key||
       returned.payload.candidate_result?.status!=="answered"||
       typeof returned.payload.candidate_result?.result?.answer!=="string"||
       !returned.payload.candidate_result.result.answer.trim())
      return {verified:false,reason:"accepted_cps_return_missing"};
    // The budget source may live in another COP locality; this explicit
    // verifier must be supplied with the authoritative CPS journal view.
    const settlement=cpsStore.listTopic(
      "execution-budget:budget:mandate:jhn:john-root").find(e=>
        e.event_type==="ExecutionBudgetSettlement"&&
        e.payload?.reservation_id===c.budget_reservation_id);
    if(!settlement)
      return {verified:false,reason:"cps_budget_settlement_missing"};
    if(typeof cpsStore.auditTopicCommitment==="function" &&
      cpsStore.auditTopicCommitment(
        "execution-budget:budget:mandate:jhn:john-root")?.ok!==true)
      return {verified:false,reason:"cps_budget_commitment_invalid"};
    return {
      verified:true,
      receipt_ref:returned.idempotency_key,
      value:{value:{
        answer:returned.payload.candidate_result.result.answer,
        packet_status:returned.payload.candidate_result.result.packet_status||
          "unknown",
      }},
    };
  };
}
