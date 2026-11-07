/** Protected broker-only preparation of a signed, budget-reserved super effect. */
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {canonical} from './principal-effect-issuer.mjs';
import {isProtectedFile} from './root-principal-effect-issue.mjs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {createHash} from 'node:crypto';
const sha=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const deny=error=>({ok:false,error,grants_authority:false});
const MANDATE='mandate:jhn:maintenance';
const DB='/var/lib/cogentia-super/canonical-authority.sqlite';
export function reserveProposedSuperEffect({store,command,recovery_ref,now=new Date()}={}){
 if(!store?.listTopic||!store?.append||typeof command!=='string'||!command.trim()||
    Buffer.byteLength(command)>32768||typeof recovery_ref!=='string'||recovery_ref.trim().length<8)return deny('proposal_input_invalid');
 const grant=evaluateMandate(store,{mandate_ref:MANDATE,expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',capability:'host.process.run',at_time:now});
 if(!grant.granted)return deny(grant.error||'maintenance_mandate_missing');
 const budget_id='budget:'+MANDATE;
 const events=store.listTopic('execution-budget:'+budget_id);
 const released=new Set(events.filter(x=>['ExecutionBudgetSettlement','ExecutionBudgetRelease'].includes(x.event_type)).map(x=>x.payload?.reservation_id));
 const pending=events.filter(x=>x.event_type==='ExecutionBudgetReservation'&&!released.has(x.payload?.reservation?.reservation_id));
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id,limits:{max_steps:50},require_authority_grant:true});
 // One pending signing challenge at a time. A stale unclaimed reservation
 // may be released; a claimed effect is NEVER silently recycled.
 for(const event of pending){
  const id=event.payload?.reservation?.reservation_id;
  if(!id||store.listTopic(`privileged-issuer:${id}`).length)return deny('previous_effect_claim_requires_reconciliation');
  const age=+new Date(now)-Date.parse(event.time?.recorded_at||'');
  if(!Number.isFinite(age)||age<11*60000)return deny('previous_approval_pending_or_unreconciled');
  const result=ledger.release({reservation_id:id,expected_version:ledger.snapshot().version,
    idempotency_key:'expire_unsigned_approval:'+id});
  if(!result.ok)return deny('expired_approval_release_failed');
 }
 const request_id=randomUUID();
 const reserved=ledger.reserve({idempotency_key:'signed-effect:'+request_id,
  expected_version:ledger.snapshot().version,demand:{max_steps:1},forecasts:[{kind:'effect_intent',request_id}]});
 if(!reserved.ok||reserved.duplicate)return deny(reserved.error||'reservation_conflict');
 const effect={action_class:'host.process.run',command,execution_mode:'super',provider:'unix-process',target:'node:fracta2',timeout_ms:15000};
 effect.payload_hash=sha(canonical({capability:effect.action_class,target:effect.target,command:effect.command,args:[],timeout_ms:effect.timeout_ms,execution_mode:effect.execution_mode,provider:effect.provider}));
 const proposal={kind:'cogentia.super-effect-proposal/v1',principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:MANDATE,
  mandate_version:grant.mandate_version,budget_reservation_id:reserved.reservation.reservation_id,
  issuer_evidence:'principal:sshsig:thinkpad',recovery_ref,
  expires_at:new Date(+new Date(now)+9*60000).toISOString(),risk_control:'B',single_use:true,effect};
 return {ok:true,phase:'COP_RESERVED_AWAITING_SIGNATURE',request_id,
  reservation_id:reserved.reservation.reservation_id,
  proposal,canonical_to_sign:canonical(proposal),sign_namespace:'cogentia-super-effect-v1',
  signature_required:true,grants_authority:false};
}
export function prepareRootSuper({command,recovery_ref,now=new Date()}={}){
 if(process.geteuid?.()!==0)return deny('root_required');
 if(!isProtectedFile(fileURLToPath(import.meta.url))||!isProtectedFile(DB,{mode:'private'}))return deny('root_authority_unavailable');
 let store;
 try{store=createSqliteCopEventStore(DB);return reserveProposedSuperEffect({store,command,recovery_ref,now});}
 catch{return deny('root_reservation_failed');}
 finally{try{store?.close();}catch{}}
}
