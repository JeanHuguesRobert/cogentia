/**
 * Same-process, event-triggered CPS parent evaluation after a browser
 * ChatGPT result was accepted. No browser dispatch, background timer, or
 * alternative COP scheduler. Current signed mandate/issuer are checked again
 * against the canonical John journal before handler execution.
 */
import {COPScheduler} from '../../../inseme/packages/cop-kernel/src/scheduler.js';
import {COPBus} from '../../../inseme/packages/cop-kernel/src/bus.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {projectCognitivePacketProgress} from './cognitive-packet-progress.js';
import {consumeChatgptCpsWake} from './chatgpt-cps-wake-consumer.js';
import {runChatgptCpsWakeBatch} from './chatgpt-cps-wake-batch.js';

const HANDLER='handler:chatgpt-browser-result-observer';
/**
 * A correlated, admitted MCP result from the designated JudgmentHandler is
 * trusted for its OWN completion/next-action decision (Optimistic Locking).
 * The result status "answered" means the turn answered; it does NOT imply the
 * Cognitive Packet is complete. The agent says so in result.packet_status.
 * Historical result.mandate_status remains readable, but never changes authority.
 * A next_action is a CANDIDATE, not a browser dispatch grant: the separate
 * executor still enforces current COP authority, claims, quotas and effects.
 */
export function createReturnScheduler(){
  return new COPScheduler(new COPBus({name:'chatgpt-cps-evaluator'}),{
    handlerResolver:async ref=>ref===HANDLER?{
      execute:async({continuation,payload})=>{
        const candidate=payload?.candidateResult;
        const answered=candidate?.status==='answered' &&
          typeof candidate.result?.answer==='string' &&
          candidate.result.answer.trim().length>0;
        const result=answered?candidate.result:{};
        const packetStatus=result.packet_status??result.mandate_status;
        const agentClaim=['completed','continue','blocked'].includes(packetStatus)
          ?packetStatus:null;
        const progress=projectCognitivePacketProgress({
          acceptance:continuation.state?.parent_acceptance||[],
          trustAgentJudgment:answered,
          agentClaim,
          agentNextAction:agentClaim!=='completed'?result.next_action:null,
        });
        return {observed:!!candidate,
          candidate_status:typeof candidate?.status==='string'?candidate.status:null,
          ...progress,
          // A short action ID names the branch; the agent can also provide
          // the actual next cognitive question for automatic continuation.
          next_question:progress.status==='continue'&&
            typeof result.next_question==='string'&&
            result.next_question.trim().length>0&&result.next_question.length<=4500
              ?result.next_question:null,
          next_turn_dispatched:false,
          packet_completed:progress.status==='completed',
        };
      },
    }:null,
  });
}

export function createChatgptCpsReturnEvaluator({
  store,auth,mandate_ref,budget_id,transport_mandate_label,verifyIssuer,
}={}){
  if(!store||!auth||!mandate_ref||!budget_id||!transport_mandate_label||
      typeof verifyIssuer!=='function')
    throw new TypeError('canonical_judgment_evaluator_configuration_required');
  const scheduler=createReturnScheduler();
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


/**
 * After a process crash, reconcile only ALREADY RETURNED and SETTLED
 * ChatGPT MCP continuations through the same original COPScheduler handler.
 * This is not a browser trigger, a new grant or a second scheduler. The
 * model/result was admitted earlier by an authenticated MCP result host.
 * A resident caller supplies a separately pinned, independently verified
 * JHN issuer chain; neither environment text nor a bearer token issues it.
 */
export function createChatgptCpsLocalWakeReconciler({store,mandate_ref,budget_id,verifyIssuer}={}){
 if(store?.kind!=='sqlite'||typeof store.listTopic!=='function'||
   typeof store.replay!=='function'||!mandate_ref||!budget_id||
   typeof verifyIssuer!=='function')
   throw new TypeError('canonical_local_reconciler_configuration_required');
 const scheduler=createReturnScheduler();
 const admit=async({continuation,settlement})=>{
   const latest=resolveMandate(store,mandate_ref);
   if(!latest)return {granted:false};
   let issuer;
   try{issuer=verifyIssuer({mandate:latest,mandate_ref,store});}
   catch{return {granted:false}}
   if(issuer?.verified!==true||issuer.principal_ref!=='principal:jhn'||
      issuer.mandate_ref!==mandate_ref)return {granted:false};
   const mandate=evaluateMandate(store,{mandate_ref,
     version_pin:latest.version,expected_principal_ref:'principal:jhn',
     expected_actor_ref:'agent:jhn',capability:'cogentia.continuation.result.submit'});
   if(mandate.granted!==true)return {granted:false};
   // A settlement under some other budget or a model-fabricated reservation
   // cannot unlock this consumer. No new budget is reserved for local review.
   const realSettlement=store.listTopic('execution-budget:'+budget_id)
     .find(e=>e.event_type==='ExecutionBudgetSettlement'&&
       e.payload?.reservation_id===continuation.budget_reservation_id&&
       e.idempotency_key===settlement.idempotency_key);
   if(!realSettlement)return {granted:false};
   return {granted:true,authorization_ref:mandate_ref+'@'+latest.version,
     handler_ref:continuation.resumeTo};
 };
 return async function reconcile({max_steps=3}={}){
   return runChatgptCpsWakeBatch({store,scheduler,admit,max_steps});
 };
}
