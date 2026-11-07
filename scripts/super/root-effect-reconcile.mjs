/** Root-only accounting bridge: an effect already consumed and observed may
 * be settled, never released/replayed, after independent receipt correlation.
 * This is NOT an authorization issuer. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {isProtectedFile} from './root-principal-effect-issue.mjs';
const COP='/var/lib/cogentia-super/canonical-authority.sqlite';
const GRANTS='/var/lib/cogentia-super/authorizations.json';
const AUDIT='/var/lib/cogentia-super/audit.jsonl';
const deny=error=>({ok:false,error,grants_authority:false});
export function reconcileCompletedEffect({store,grant,logEntries,authorization_id}={}){
 if(!store?.listTopic||!store?.append||!grant||grant.authorization_id!==authorization_id||!grant.consumed_at||
  grant.authority_origin!=='principal'||grant.single_use!==true||grant.action_class!=='host.process.run'||
  grant.principal!=='principal:jhn'||grant.actor!=='agent:jhn'||grant.mandate_ref!=='mandate:jhn:maintenance'||
  typeof grant.budget_reservation_id!=='string'||!grant.budget_reservation_id||
  typeof grant.payload_hash!=='string'||!Array.isArray(logEntries))return deny('trusted_consumed_grant_required');
 const reserved=logEntries.filter(e=>e.event==='cop_reserve'&&e.authorization_id===authorization_id&&e.payload_hash===grant.payload_hash);
 const outcome=logEntries.filter(e=>e.event==='effect_result'&&e.authorization_id===authorization_id&&
   e.payload_hash===grant.payload_hash&&typeof e.ok==='boolean'&&(Number.isInteger(e.exit_code)||e.exit_code===null)&&typeof e.timeout==='boolean');
 if(reserved.length!==1||outcome.length!==1)return deny('unambiguous_root_receipt_required');
 if(Date.parse(outcome[0].at)<Date.parse(reserved[0].at))return deny('receipt_order_invalid');
 const claims=store.listTopic(`privileged-issuer:${grant.budget_reservation_id}`);
 if(claims.length!==1||claims[0].event_type!=='PrivilegedEffectClaim'||
  claims[0].payload?.effect_hash!==grant.payload_hash||
  claims[0].event_id!==grant.provenance?.cop_claim_event_id)return deny('canonical_effect_claim_missing');
 const budget_id='budget:'+grant.mandate_ref;
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id,require_authority_grant:true});
 const result=ledger.settle({reservation_id:grant.budget_reservation_id,expected_version:ledger.snapshot().version,
  usage:{max_steps:1},idempotency_key:'root_receipt:'+authorization_id,
  evidence:{issuer:'root_broker',authorization_id,payload_hash:grant.payload_hash,
    consumed_at:grant.consumed_at,result_observed_at:outcome[0].at,
    ok:outcome[0].ok,exit_code:outcome[0].exit_code,timeout:outcome[0].timeout}});
 if(!result.ok)return deny(result.error||'cop_settlement_failed');
 return {ok:true,phase:'COP_EFFECT_SETTLED',authorization_id,
  budget_reservation_id:grant.budget_reservation_id,duplicate:!!result.duplicate,
  executed_ok:outcome[0].ok,grants_authority:false};
}
export function reconcileRootEffect({authorization_id}={}){
 if(process.geteuid?.()!==0)return deny('root_required');
 if(!isProtectedFile(fileURLToPath(import.meta.url))||!isProtectedFile(COP,{mode:'private'})||
  !isProtectedFile(GRANTS,{mode:'private'})||!isProtectedFile(AUDIT,{mode:'private'}))return deny('root_owned_receipts_required');
 if(typeof authorization_id!=='string'||!/^sea_[0-9a-f-]{36}$/.test(authorization_id))return deny('authorization_id_invalid');
 let store;
 try{
  const data=JSON.parse(fs.readFileSync(GRANTS,'utf8'));
  const grant=data.grants?.[authorization_id];
  const lines=fs.readFileSync(AUDIT,'utf8').split('\n').filter(Boolean);
  const logs=[];
  for(const line of lines){const e=JSON.parse(line);if(e.authorization_id===authorization_id)logs.push(e);}
  store=createSqliteCopEventStore(COP);
  return reconcileCompletedEffect({store,grant,logEntries:logs,authorization_id});
 }catch{return deny('trusted_reconciliation_unavailable');}
 finally{try{store?.close()}catch{}}
}
