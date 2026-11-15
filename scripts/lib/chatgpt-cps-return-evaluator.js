/**
 * Same-process, event-triggered CPS parent evaluation after a browser
 * ChatGPT result was accepted. No browser dispatch, background timer, or
 * alternative COP scheduler. Current signed mandate/issuer are checked again
 * against the canonical John journal before handler execution.
 */
import {COPScheduler} from '../../../inseme/packages/cop-kernel/src/scheduler.js';
import {COPBus} from '../../../inseme/packages/cop-kernel/src/bus.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {projectMandateProgress} from './mandate-completion-projection.js';
import {consumeChatgptCpsWake} from './chatgpt-cps-wake-consumer.js';

const HANDLER='handler:chatgpt-browser-result-observer';
export function createChatgptCpsReturnEvaluator({
  store,auth,mandate_ref,budget_id,transport_mandate_label,verifyIssuer,
}={}){
  if(!store||!auth||!mandate_ref||!budget_id||!transport_mandate_label||
      typeof verifyIssuer!=='function')
    throw new TypeError('canonical_judgment_evaluator_configuration_required');
  const scheduler=new COPScheduler(new COPBus({name:'chatgpt-cps-evaluator'}),{
    handlerResolver:async ref=>ref===HANDLER?{
      execute:async({continuation,payload})=>{
        const candidate=payload?.candidateResult;
        // A model claiming completion is not evidence. This evaluation
        // *always* leaves the parent open until its verified contract is met.
        return {observed:!!candidate,
          candidate_status:typeof candidate?.status==='string'?candidate.status:null,
          ...projectMandateProgress({
            acceptance:continuation.state?.parent_acceptance||[],
            evidence:continuation.state?.verified_evidence||[],
            nextActions:continuation.state?.next_actions||[],
            agentClaim:candidate?.status==='completed'?'completed':null,
          }),
          next_turn_dispatched:false,
          mandate_completed:false,
        };
      },
    }:null,
  });
  const admit=async({continuation})=>{
    const latest=resolveMandate(store,mandate_ref);
    const ledger=createEventSourcedExecutionBudgetLedger({
      store,budget_id,require_authority_grant:true});
    const evaluated=assessJohnCopAuthority({
      store,auth,mandate_ref,version_pin:latest?.version,
      capability:'cogentia.continuation.result.submit',
      transport_mandate_label,ledger,verifyIssuer,
    });
    return {granted:evaluated.preflight_ok===true,
      authorization_ref:evaluated.preflight_ok
        ?`${mandate_ref}@${latest.version}`:null,
      handler_ref:continuation.resumeTo};
  };
  return async function evaluate(continuation_id){
    return consumeChatgptCpsWake({store,continuation_id,
      scheduler,admit});
  };
}
