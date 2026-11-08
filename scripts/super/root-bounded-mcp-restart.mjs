/** Fixed-scope recurring maintenance effect, grounded in ONE signed time-bound COP mandate.
 * The caller cannot select a command, service, budget, principal or mandate.
 * This is callable only from the protected broker, never as an issuer from MCP.
 */
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {isProtectedFile} from './root-principal-effect-issue.mjs';

export const RESTART_MANDATE='mandate:jhn:maintenance';
export const RESTART_SERVICE='mcp-cogentia.service';
export const RESTART_SCOPE={allowed_actions:['service.restart'],execution_mode:'super',target:'node:fracta2',service:RESTART_SERVICE};
const COP='/var/lib/cogentia-super/canonical-authority.sqlite';
const fail=error=>({ok:false,error,executed:false});

export async function executeMandatedMcpRestart({store,performRestart,now=new Date(),clock=()=>new Date(),requestId=randomUUID()}={}){
 if(!store?.listTopic||typeof performRestart!=='function'||!/^[-a-zA-Z0-9_]{8,128}$/.test(requestId))return fail('restart_request_invalid');
 const event=store.listTopic('mandate:'+RESTART_MANDATE).filter(e=>e.payload?.kind==='MandateDeclaration').at(-1)?.payload;
 if(!event||event.version!=='v1'||event.metadata?.issuer!=='independent_sshsig'||
    !/^sha256:[a-f0-9]{64}$/.test(event.metadata?.proposal_hash||'')||
    JSON.stringify(event.scope)!==JSON.stringify(RESTART_SCOPE))return fail('restart_signed_scope_missing');
 const mandate=evaluateMandate(store,{mandate_ref:RESTART_MANDATE,version_pin:'v1',
   expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',
   capability:'service.restart',at_time:now});
 if(!mandate.granted)return fail(mandate.error||'restart_mandate_inactive');
 const budgetId='budget:'+RESTART_MANDATE;
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:budgetId,require_authority_grant:true});
 const snap=ledger.snapshot();
 if(Object.keys(snap.limits).join(',')!=='max_steps'||snap.limits.max_steps>12)return fail('restart_budget_scope_invalid');
 const reserve=ledger.reserve({idempotency_key:'mcp_restart:'+requestId,expected_version:snap.version,
    demand:{max_steps:1},forecasts:[{kind:'effect_intent',service:RESTART_SERVICE,request_id:requestId}]});
 if(!reserve.ok||reserve.duplicate)return fail(reserve.error||'restart_duplicate');
 // Budget must be reserved before the root-owned executor sees the effect.
 let outcome;
 try{
  const current=evaluateMandate(store,{mandate_ref:RESTART_MANDATE,version_pin:'v1',
    expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',capability:'service.restart',at_time:clock()});
  if(!current.granted){
   const release=ledger.release({reservation_id:reserve.reservation.reservation_id,expected_version:ledger.snapshot().version});
   return fail(release.ok?(current.error||'restart_mandate_changed'):'restart_reservation_release_uncertain');
  }
  outcome=await performRestart(RESTART_SERVICE);
 }catch(e){outcome={ok:false,error:'restart_executor_failed',details:e?.code||'exception'};}
 // A dispatched effect is charged even when it fails; never silently retry.
 const settlement=ledger.settle({reservation_id:reserve.reservation.reservation_id,expected_version:ledger.snapshot().version,
   usage:{max_steps:1},idempotency_key:'mcp_restart_settle:'+requestId,
   evidence:{service:RESTART_SERVICE,request_id:requestId,ok:outcome?.ok===true}});
 if(!settlement.ok)return {ok:false,error:'restart_settlement_uncertain',executed:true,
   request_id:requestId,reservation_id:reserve.reservation.reservation_id};
 return {ok:outcome?.ok===true,executed:true,service:RESTART_SERVICE,request_id:requestId,
   reservation_id:reserve.reservation.reservation_id,settled:true,
   remaining:ledger.snapshot().available.max_steps,
   receipt:{mandate_ref:RESTART_MANDATE,version:'v1',effect:'service.restart',
     service:RESTART_SERVICE,execution_ok:outcome?.ok===true},
   ...(outcome?.ok===true?{}:{error:'restart_failed'})};
}

export async function restartMcpFromProtectedBroker({performRestart}={}){
 if(process.geteuid?.()!==0)return fail('root_required');
 if(!isProtectedFile(fileURLToPath(import.meta.url))||!isProtectedFile(COP,{mode:'private'}))return fail('root_owned_cop_required');
 let store;
 try{store=createSqliteCopEventStore(COP);return await executeMandatedMcpRestart({store,performRestart});}
 catch{return fail('restart_authority_store_unavailable');}
 finally{try{store?.close()}catch{}}
}
