/**
 * Bounded CPS browser-turn orchestration, owned by the existing
 * runMandateToBoundary driver. Hooks are independently governed COP
 * operations, NOT arbitrary browser RPCs or model-generated grants.
 *
 * `prepare` declares/reserves/claims a NEW child continuation.
 * `dispatch` invokes the existing authenticated john.request.v1
 * browser.chatgpt.turn capability, with its OWN COP budget and receipt.
 * `observeReturn` proves the correlated MCP `returned` event and
 * scheduler's `handler_completed` receipt, not merely DOM text.
 * `next` is an independently trusted parent-policy evaluator.
 */
import {runMandateToBoundary} from './mandate-continuation.js';

const isId=x=>typeof x==='string'&&/^ctn_[a-zA-Z0-9_]{3,120}$/.test(x);
export async function runChatgptCpsBrowserLoop({
  prepare,dispatch,observeReturn,next,max_turns=3,
}={}){
  if([prepare,dispatch,observeReturn,next].some(fn=>typeof fn!=='function')||
      !Number.isSafeInteger(max_turns)||max_turns<1||max_turns>10)
    return {ok:false,status:'invalid_loop'};
  const trace=[];
  let prior=null,terminal=false,stopReason=null;
  const running=await runMandateToBoundary({max_steps:max_turns,
    inspect:async({step})=>{
      if(terminal)return {objective_met:true};
      // Only the trusted application policy can choose the next packet.
      const choice=await next({step,prior:prior?{...prior}:null});
      if(choice?.completed===true){terminal=true;return {objective_met:true};}
      if(choice?.blocked===true)return {hard_blocker:true};
      if(choice?.human_judgment_required===true)return {judgment_required:true};
      if(choice?.allowed!==true||choice?.ready!==true||
          !choice?.parent_packet_ref)
        return {next_step_clear:false,next_step_allowed:false};
      return {next_step_clear:true,next_step_allowed:true,
        parent_packet_ref:choice.parent_packet_ref,
        declared_next_action:choice.action_id||null};
    },
    execute:async({step,state})=>{
      let prepared;
      try{prepared=await prepare({step,parent_packet_ref:state.parent_packet_ref,
        declared_next_action:state.declared_next_action,prior});}
      catch(error){stopReason='prepare_failed';return {ok:false,code:stopReason}}
      if(!isId(prepared?.continuation_id)||typeof prepared.prompt!=='string'||
          prepared.prompt.length<1||prepared.prompt.length>6000||
          typeof prepared.packet_ref!=='string'||!prepared.packet_ref){
        stopReason='canonical_prepare_required';return {ok:false,code:stopReason};
      }
      const id=prepared.continuation_id;
      // Persisted preparation/reservation is the sole packet source;
      // this runner never supplies a new budget or claim from model output.
      let sent;
      try{sent=await dispatch({step,prepared});}
      catch(error){sent={ok:false,reason:'dispatch_exception'}}
      if(sent?.ok!==true||sent.submitted!==true||
          typeof sent.execution_receipt_ref!=='string'||!sent.execution_receipt_ref){
        trace.push({step,continuation_id:id,stage:'dispatch_ambiguous'});
        stopReason='needs_reconciliation';return {ok:false,code:stopReason};
      }
      let delivery;
      try{delivery=await observeReturn({step,prepared,dispatch_receipt:sent.execution_receipt_ref});}
      catch(error){delivery={ok:false,reason:'observe_exception'}}
      if(delivery?.ok!==true||delivery.continuation_id!==id||
          typeof delivery.returned_receipt_ref!=='string'||!delivery.returned_receipt_ref||
          typeof delivery.handler_receipt_ref!=='string'||!delivery.handler_receipt_ref){
        trace.push({step,continuation_id:id,stage:'return_ambiguous',
          dispatch_receipt_ref:sent.execution_receipt_ref});
        stopReason='needs_reconciliation';return {ok:false,code:stopReason};
      }
      prior={continuation_id:id,packet_ref:prepared.packet_ref,
        returned_receipt_ref:delivery.returned_receipt_ref,
        handler_receipt_ref:delivery.handler_receipt_ref};
      trace.push({step,continuation_id:id,stage:'returned_and_evaluated',
        dispatch_receipt_ref:sent.execution_receipt_ref,
        ...prior});
      return {ok:true,code:'returned_and_evaluated'};
    },
  });
  // The generic bounded driver stops immediately after its last permitted
  // Step. Inspect acceptance once more WITHOUT admitting another action:
  // exactly N verified returns can therefore finish a max-N-turn mandate.
  let endStatus=running.reason;
  if(endStatus==='step_limit' && !stopReason){
    try{
      const outcome=await next({step:max_turns,prior:prior?{...prior}:null,
        final_verification_only:true});
      if(outcome?.completed===true)endStatus='verified_objective_met';
    }catch{/* unknown final acceptance remains a step_limit */}
  }
  return {ok:endStatus==='verified_objective_met',
    status:stopReason||endStatus,steps_completed:running.steps_completed,
    trace,autonomous_per_turn:true,
    // This is a bounded foreground process; it is not a resident worker.
    persistent_worker:false};
}
