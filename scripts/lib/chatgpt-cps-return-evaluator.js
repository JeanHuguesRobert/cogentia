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
import {projectMandateProgress} from './mandate-completion-projection.js';
import {consumeChatgptCpsWake} from './chatgpt-cps-wake-consumer.js';
import {runChatgptCpsWakeBatch} from './chatgpt-cps-wake-batch.js';

const HANDLER='handler:chatgpt-browser-result-observer';
/**
 * The continuation's state and the returned model answer are DATA, not issuer
 * authority. A claim carrying `verified:true` or `admissible:true` is never
 * sufficient to close a parent or select a new child. Only trusted, separately
 * provided verifier callbacks may confirm matching receipts. Until a runtime
 * wires real receipt checks, fail closed with the parent open.
 */
export function createReturnScheduler({verifyAcceptanceReceipt,admitNextAction}={}){
  return new COPScheduler(new COPBus({name:'chatgpt-cps-evaluator'}),{
    handlerResolver:async ref=>ref===HANDLER?{
      execute:async({continuation,payload})=>{
        const candidate=payload?.candidateResult;
        const state=continuation.state||{};
        const acceptance=Array.isArray(state.parent_acceptance)?state.parent_acceptance:[];
        const evidence=[];
        if(typeof verifyAcceptanceReceipt==='function'){
          for(const item of Array.isArray(state.verified_evidence)?state.verified_evidence.slice(0,24):[]){
            if(!item||typeof item.criterion!=='string'||
               !acceptance.includes(item.criterion)||
               typeof item.receipt_ref!=='string'||!item.receipt_ref)continue;
            let proof;
            try{proof=await verifyAcceptanceReceipt({continuation,
              criterion:item.criterion,receipt_ref:item.receipt_ref});}
            catch{continue;}
            if(proof?.verified===true&&proof.criterion===item.criterion&&
               proof.receipt_ref===item.receipt_ref&&
               typeof proof.issuer_ref==='string'&&proof.issuer_ref)
              evidence.push({criterion:item.criterion,receipt_ref:item.receipt_ref,verified:true});
          }
        }
        const nextActions=[];
        if(typeof admitNextAction==='function'){
          for(const item of Array.isArray(state.next_actions)?state.next_actions.slice(0,24):[]){
            if(!item||typeof item.id!=='string'||!item.id)continue;
            let verdict;
            try{verdict=await admitNextAction({continuation,action_id:item.id});}
            catch{continue;}
            if(verdict?.action_id===item.id&&verdict.admissible===true&&
               verdict.available===true&&
               typeof verdict.authorization_ref==='string'&&verdict.authorization_ref)
              nextActions.push({id:item.id,admissible:true,available:true});
          }
        }
        const progress=projectMandateProgress({acceptance,evidence,nextActions,
          agentClaim:candidate?.status==='completed'?'completed':null});
        return {observed:!!candidate,
          candidate_status:typeof candidate?.status==='string'?candidate.status:null,
          ...progress,
          next_turn_dispatched:false,
          // Handler evaluation is NOT independent parent-mission closure,
          // even if all acceptance evidence is present for later verification.
          mandate_completed:false,
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
