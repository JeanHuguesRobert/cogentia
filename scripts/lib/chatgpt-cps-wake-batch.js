/**
 * Run already-returned ChatGPT continuations to the next genuine boundary,
 * reusing Cogentia's existing mandate-continuation driver and Inseme
 * COPScheduler. This starts no browser turn and owns no background timer.
 */
import {runMandateToBoundary} from './mandate-continuation.js';
import {listChatgptCpsWakes,consumeChatgptCpsWake} from './chatgpt-cps-wake-consumer.js';

export async function runChatgptCpsWakeBatch({store,scheduler,admit,max_steps=3}={}){
  if(!store||!scheduler||typeof admit!=='function'||
     !Number.isSafeInteger(max_steps)||max_steps<1||max_steps>20)
    return {ok:false,status:'invalid_batch'};
  const run=await runMandateToBoundary({max_steps,inspect:async()=>{
    const wakes=listChatgptCpsWakes(store,{limit:100});
    const ambiguous=wakes.find(x=>x.status==='needs_reconciliation');
    if(ambiguous)return {hard_blocker:true,ambiguous_id:ambiguous.continuation_id};
    const pending=wakes.find(x=>x.status==='pending');
    if(!pending)return {objective_met:true};
    return {next_step_clear:true,next_step_allowed:true,
      continuation_id:pending.continuation_id};
  },execute:async({state})=>{
    const effect=await consumeChatgptCpsWake({
      store,continuation_id:state.continuation_id,scheduler,admit});
    return {ok:effect.ok===true,code:effect.status};
  }});
  // Draining a local queue NEVER proves the parent's cognitive goal completed.
  const queue_drained=run.action==='complete'&&run.reason==='verified_objective_met';
  const remaining=listChatgptCpsWakes(store,{limit:100});
  return {ok:queue_drained,status:queue_drained?'queue_drained':run.reason,
    steps_completed:run.steps_completed,
    pending_count:remaining.filter(x=>x.status==='pending').length,
    needs_reconciliation:remaining.filter(x=>x.status==='needs_reconciliation').length,
    events:run.events,autonomous_browser_worker:false,
    parent_packet_completed:false};
}
