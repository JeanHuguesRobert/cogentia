/** Root-only accounting bridge: an effect already consumed and observed may
 * be settled, never released/replayed, after independent receipt correlation.
 * This is NOT an authorization issuer. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
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


// Node-local evidence projection, not an issuer. All inputs must come from
// protected node custody, never from the requesting packet or MCP arguments.
// An observed postcondition is separate from the shell's exit status.
export function projectCompletedPacketEffect({store,grant,logEntries,authorization_id}={}){
 const sha=/^sha256:[a-f0-9]{64}$/;
 const ref=v=>typeof v==='string'&&v.length>0&&v.length<=512;
 const g=grant,p=g?.provenance;
 if(typeof store?.listTopic!=='function'||typeof store?.auditTopicCommitment!=='function'||
    !g||g.authorization_id!==authorization_id||!/^sea_[0-9a-f-]{36}$/.test(authorization_id||'')||
    g.authority_origin!=='verified_mission'||g.single_use!==true||
    g.action_class!=='host.process.run'||g.mandate_ref!=='mandate:jhn:john-root'||
    !/^v[1-9]\d*$/.test(g.mandate_version||'')||Number(g.mandate_version.slice(1))<8||
    g.principal!=='principal:jhn'||g.actor!=='agent:jhn'||g.target?.node!=='node:fracta2'||
    !sha.test(g.payload_hash||'')||!ref(g.budget_reservation_id)||
    !ref(p?.packet_ref)||!ref(p?.packet_claim_event_id)||!ref(p?.cop_claim_event_id)||
    !Number.isFinite(Date.parse(g.consumed_at))||!Array.isArray(logEntries))
   return deny('trusted_packet_consumed_grant_required');
 const topic='privileged-issuer:'+g.budget_reservation_id;
 const claims=store.listTopic(topic),claim=claims[0],c=claim?.payload;
 if(claims.length!==1||store.auditTopicCommitment(topic)?.ok!==true||
    claim.event_type!=='PrivilegedEffectClaim'||claim.event_id!==p.cop_claim_event_id||
    c?.verification!=='verified_standing_mandate'||c.mandate_version!==g.mandate_version||
    c.budget_reservation_id!==g.budget_reservation_id||c.effect_hash!==g.payload_hash||
    c.packet_ref!==p.packet_ref||c.packet_claim_event_id!==p.packet_claim_event_id||
    c.target!==g.target.node||c.principal_ref!==g.principal||c.actor_ref!==g.actor||
    !sha.test(c.before_state_hash||''))
   return deny('protected_packet_claim_unverified');
 const entries=logEntries.filter(e=>e.authorization_id===authorization_id);
 const matching=kind=>entries.filter(e=>e.event===kind);
 const reserves=matching('cop_reserve'),results=matching('effect_result'),
   observations=matching('effect_state_observed');
 if(reserves.length!==1||results.length!==1)
   return deny('unambiguous_root_receipt_required');
 const a=reserves[0],r=results[0];
 if(a.payload_hash!==g.payload_hash||r.payload_hash!==g.payload_hash||
    typeof r.ok!=='boolean'||typeof r.timeout!=='boolean'||
    !(r.exit_code===null||Number.isInteger(r.exit_code))||(r.ok&&(r.timeout||r.exit_code!==0))||
    !Number.isFinite(Date.parse(a.at))||!Number.isFinite(Date.parse(r.at))||
    Date.parse(a.at)<Date.parse(g.consumed_at)||Date.parse(r.at)<Date.parse(a.at))
   return deny('protected_execution_receipt_unverified');
 if(observations.length!==1)return deny('postcondition_observation_required');
 const o=observations[0];
 if(o.payload_hash!==g.payload_hash||o.packet_claim_event_id!==p.packet_claim_event_id||
    o.target!==g.target.node||o.before_state_hash!==c.before_state_hash||
    !sha.test(o.after_state_hash||'')||!ref(o.evidence_ref)||
    !Number.isFinite(Date.parse(o.at))||Date.parse(o.at)<Date.parse(r.at))
   return deny('protected_postcondition_unverified');
 const receipt={
   schema:'cogentia.super.packet-receipt/v1',
   packet_ref:p.packet_ref,packet_claim_event_id:p.packet_claim_event_id,
   target:g.target.node,payload_hash:g.payload_hash,
   principal_ref:g.principal,actor_ref:g.actor,mandate_ref:g.mandate_ref,
   mandate_version:g.mandate_version,budget_reservation_id:g.budget_reservation_id,
   before_state_hash:c.before_state_hash,after_state_hash:o.after_state_hash,
   authorization_id,attempted:true,ok:r.ok,exit_code:r.exit_code,
   timeout:r.timeout,observed_at:o.at
 };
 // Reference commits to the source projection, including the actual
 // observation evidence. No output contents or secret material cross.
 receipt.receipt_ref='cop:node:fracta2:super:'+authorization_id+':'+hashPayload({
   receipt,claim_event_id:claim.event_id,reserved_at:a.at,
   execution_observed_at:r.at,observation_evidence_ref:o.evidence_ref
 });
 return {ok:true,verified:true,receipt,grants_authority:false};
}

// Root-local reader for the existing grant and audit files. No new socket
// route, grant writing, state observation, or remote disclosure is implied.
export function readRootPacketEffectReceipt({authorization_id}={}){
 if(process.geteuid?.()!==0)return deny('root_required');
 if(!isProtectedFile(fileURLToPath(import.meta.url))||!isProtectedFile(COP,{mode:'private'})||
    !isProtectedFile(GRANTS,{mode:'private'})||!isProtectedFile(AUDIT,{mode:'private'}))
   return deny('root_owned_receipts_required');
 if(!/^sea_[0-9a-f-]{36}$/.test(authorization_id||''))return deny('authorization_id_invalid');
 let store;
 try{
   const grant=JSON.parse(fs.readFileSync(GRANTS,'utf8')).grants?.[authorization_id];
   const logEntries=fs.readFileSync(AUDIT,'utf8').split('\n').filter(Boolean)
     .map(line=>JSON.parse(line)).filter(e=>e.authorization_id===authorization_id);
   // The existing SQLite adapter may perform schema maintenance on open.
   // This is a protected node-local operation, not an unprivileged reader.
   store=createSqliteCopEventStore(COP);
   return projectCompletedPacketEffect({store,grant,logEntries,authorization_id});
 }catch{return deny('trusted_packet_receipt_unavailable')}
 finally{try{store?.close()}catch{}}
}
