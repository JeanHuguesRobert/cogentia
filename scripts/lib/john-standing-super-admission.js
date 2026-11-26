/**
 * Standing administrative admission (#285).
 * Protected issuer-side Core, not an MCP endpoint or executable grant issuer.
 * A writable agent journal is NOT protected administrative authority.
 * The host supplies independently verified custody, caller and judgment.
 */
import {createCopEventEnvelope} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {canonicalPayloadHash,buildEffectPayload} from './side-effect-authorization.js';
import {STANDING_MANDATE_REF,STANDING_BUDGET_ID,STANDING_TRANSPORT_LABEL} from './john-standing-mission-authority.js';
import {STANDING_ADMIN_PROFILE} from './jhn-standing-mandate-plan.js';

const deny=error=>({ok:false,error,grant:null,executed:false});
const hash=/^sha256:[a-f0-9]{64}$/;
const classes=['operating_system_and_packages','service_installation_configuration_and_deployment',
 'local_network_and_system_configuration','resource_management','security_policy_maintenance'];
const excluded=['self_authorization_or_mandate_change','issuer_or_audit_integrity_change',
 'credential_or_secret_disclosure','third_party_commitment','irreversible_destructive_action',
 'other_principals_resources_without_delegation'];
const requiredAuthority=['independent_principal_ratification','active_version_recheck',
 'per_act_exact_payload_grant','protected_issuer','no_per_act_human_signature_within_scope',
 'revocation_recheck','budget_reservation_required'];
const traceFields=['principal_ref','actor_ref','mandate_ref','mandate_version','target',
 'execution_mode','purpose','payload_hash','authorization_id','reservation_id','before_state',
 'after_state','effect_receipt','budget_settlement','recovery_ref'];
const equalSet=(a,b)=>Array.isArray(a)&&a.length===b.length&&b.every(x=>a.includes(x));
const text=(v,max=256)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function assessStandingSuperEffect({store,auth,verifyIssuer,verifyProtectedCustody,
 verifyIntent,request,at_time=new Date()}={}){
 if(typeof verifyProtectedCustody!=='function'||typeof verifyIntent!=='function')
  return deny('protected_issuer_and_intent_verifier_required');
 // These functions are injected by the protected host, not request fields.
 // No reliance on an assertion that a path, caller or intent is trusted.
 try{if(verifyProtectedCustody({store})!==true)return deny('protected_custody_unverified')}
 catch{return deny('protected_custody_unverified')}
 const q=request;
 if(!q||q.execution_mode!=='super'||q.target!=='node:fracta2'||q.provider!=='unix-process'||
  q.capability!=='host.process.run'||q.mandate_ref!==STANDING_MANDATE_REF||
  q.actor_ref!=='agent:jhn'||q.principal_ref!=='principal:jhn'||
  !/^v[1-9]\d*$/.test(q.mandate_version||'')||
  !/^[-\w:.]{1,120}$/.test(q.request_id||'')||!text(q.purpose,512)||!text(q.recovery_ref)||
  !hash.test(q.before_state_hash||'')||!classes.includes(q.effect_class)||
  !text(q.command,32768)||Buffer.byteLength(q.command)>32768||
  !Number.isSafeInteger(q.timeout_ms)||q.timeout_ms<1||q.timeout_ms>120000)
  return deny('administrative_effect_invalid');
 if(auth?.actor!==q.actor_ref||auth?.principal_ref!==q.principal_ref)
  return deny('administrative_actor_mismatch');
 const payload=buildEffectPayload('host.process.run',{command:q.command,
  execution_mode:'super',timeout_ms:q.timeout_ms},{target:q.target,provider:q.provider});
 const payload_hash=canonicalPayloadHash(payload);
 if(q.payload_hash!==payload_hash)return deny('administrative_payload_hash_mismatch');
 let m,ledger;
 try{
  m=resolveMandate(store,STANDING_MANDATE_REF);
  ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:STANDING_BUDGET_ID,require_authority_grant:true});
 }catch{return deny('canonical_authority_unavailable')}
 const p=m?.scope?.administrative_policy;
 const operations=m?.scope?.standing_operations;
 if(!m||m.version!==q.mandate_version||Number(m.version.slice(1))<8||
  !Array.isArray(operations)||!operations.some(o=>Object.keys(STANDING_ADMIN_PROFILE).every(k=>o[k]===STANDING_ADMIN_PROFILE[k]))||
  p?.kind!=='cop.host-administration-policy/v1'||p.target!==q.target||p.execution_mode!=='super'||
  !equalSet(p.included_classes,classes)||!equalSet(p.excluded_classes,excluded)||
  !requiredAuthority.every(k=>p.authority?.[k]===true)||
  p.trace?.required!==true||p.trace.protect_audit_integrity!==true||
  p.trace.exclude_secret_values!==true||!equalSet(p.trace.fields,traceFields))
  return deny('administrative_scope_not_ratified');
 const preflight=assessJohnCopAuthority({store,auth,verifyIssuer,mandate_ref:STANDING_MANDATE_REF,
  version_pin:q.mandate_version,capability:q.capability,ledger,at_time,
  transport_mandate_label:STANDING_TRANSPORT_LABEL});
 if(!preflight.preflight_ok)return deny(preflight.error||'canonical_authority_denied');
 // A semantic effect classification is not a shell sandbox. The independently
 // configured judgment handler must assess this exact effect, not echo a label.
 let verdict;
 try{verdict=verifyIntent({request:structuredClone(q),payload_hash,policy:structuredClone(p)})}
 catch{return deny('administrative_intent_unverified')}
 if(verdict?.allowed!==true||verdict.payload_hash!==payload_hash||
  verdict.effect_class!==q.effect_class||!text(verdict.evidence_ref))
  return deny('administrative_intent_unverified');
 const b=ledger.snapshot();
 if((b.available?.max_steps||0)<1)return deny('budget_exhausted');
 return {ok:true,phase:'STANDING_SUPER_PREFLIGHT',grant:null,executed:false,
  requires_protected_claim:true,requires_root_issuance:true,
  principal_ref:q.principal_ref,actor_ref:q.actor_ref,mandate_ref:q.mandate_ref,
  mandate_version:q.mandate_version,target:q.target,execution_mode:q.execution_mode,
  payload_hash,purpose:q.purpose,effect_class:q.effect_class,request_id:q.request_id,
  before_state_hash:q.before_state_hash,recovery_ref:q.recovery_ref,
  judgment_evidence_ref:verdict.evidence_ref,budget_id:STANDING_BUDGET_ID,
  budget_version:b.version};
}

// Must be called from the same trusted issuer boundary as preflight.
// Claim is durable evidence, NOT a spendable grant. No shell invocation.
export function claimStandingSuperEffect(options={}){
 const pre=assessStandingSuperEffect(options);
 if(!pre.ok)return pre;
 const {store}=options;
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:pre.budget_id,require_authority_grant:true});
 const key='standing-super:'+pre.request_id;
 const reservation=ledger.reserve({idempotency_key:key,expected_version:pre.budget_version,
  demand:{max_steps:1},forecasts:[{kind:'effect_intent',payload_hash:pre.payload_hash}]});
 if(!reservation?.ok||reservation.duplicate)
  return deny(reservation?.duplicate?'administrative_request_already_reserved':reservation?.error||'administrative_reservation_failed');
 const id=reservation.reservation.reservation_id;
 const claim=createCopEventEnvelope({
  event_type:'PrivilegedEffectClaim',topic:{id:'privileged-issuer:'+id,seq:1},
  epistemic_status:'normative',actor_ref:pre.actor_ref,subject_ref:pre.mandate_ref,
  mandate_ref:pre.mandate_ref,visibility:'restricted',
  idempotency_key:'privileged-issuer:claim:'+id,
  payload:{kind:'PrivilegedEffectClaim',mandate_version:pre.mandate_version,
   budget_reservation_id:id,effect_hash:pre.payload_hash,verification:'verified_standing_mandate',
   request_id:pre.request_id,principal_ref:pre.principal_ref,target:pre.target,
   purpose:pre.purpose,effect_class:pre.effect_class,before_state_hash:pre.before_state_hash,
   recovery_ref:pre.recovery_ref,judgment_evidence_ref:pre.judgment_evidence_ref,
   status:'claimed_pending_root_grant'}
 });
 let saved;
 try{saved=store.append(claim)}catch{}
 // An uncertain append is not permission to recycle a reservation.
 if(!saved?.ok||saved.duplicate)return {...deny('administrative_claim_requires_reconciliation'),reservation_id:id};
 return {...pre,phase:'COP_CLAIMED_NOT_ISSUED',budget_reservation_id:id,
  claim_event_id:saved.event.event_id,requires_protected_claim:false};
}
