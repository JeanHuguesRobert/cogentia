/** Existing GitHub work -> canonical COP Task and delegated funding.
 * The host supplies the exact reviewed plan, separate live Principal session
 * verifier, branded agent identity and existing signed mandate verifier.
 * No new mandate, issuer, external execution surface or source registry.
 */
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {reserveEventSourcedDelegatedBudget} from '../../../inseme/packages/cop-core/src/delegated-budget.js';
import {buildWorkCommissioningContract} from './work-commissioning-contract.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {createCopMcpTasksPilot,packetRefForMcpTask} from './mcp-tasks-cop-pilot.mjs';
import {STANDING_MANDATE_REF,STANDING_BUDGET_ID,STANDING_TRANSPORT_LABEL,
 STANDING_GENERAL_HOST_PROFILE} from './john-standing-mission-authority.js';

const deny=(error,details={})=>({ok:false,error,grants_authority:false,...details});
const TOOL='cogentia_host_process_run';
const exactKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const source=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*$/;
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:/@-]{1,255}$/.test(x);

// A host-owned plan is immutable for the lifetime of this adapter; no
// command, budget, actor or permission is taken from the confirmation body.
export function createExistingHostWorkCommissioner({
 rootStore,packetStore,primaryStoreId,ownerInstanceRef,verifyIssuer,
 authenticatePrincipal,plan,sourceRef,handler,now=()=>new Date(),
}={}){
 if(rootStore?.kind!=='sqlite'||packetStore?.kind!=='sqlite'||rootStore===packetStore||
    typeof verifyIssuer!=='function'||typeof authenticatePrincipal!=='function'||
    typeof handler!=='function'||!ref(sourceRef))
   throw TypeError('trusted_work_commissioning_dependencies_required');
 const reviewed=structuredClone(plan),r=reviewed?.request,i=reviewed?.intent,a=r?.first_act;
 if(!exactKeys(reviewed,['request','intent'])||
    !exactKeys(r,['work_ref','source_issue_id','purpose','first_act','completion'])||
    !source.test(r.work_ref)||sourceRef!==r.work_ref||typeof r.source_issue_id!=='string'||!r.source_issue_id||
    typeof r.purpose!=='string'||!r.purpose.trim()||typeof r.completion!=='string'||!r.completion.trim()||
    !exactKeys(a,['capability','target','provider','execution_mode','command','timeout_ms'])||
    a.capability!=='host.process.run'||a.execution_mode!=='normal'||
    typeof a.command!=='string'||!a.command.trim()||a.command.length>32768||
    !Number.isSafeInteger(a.timeout_ms)||a.timeout_ms<1||a.timeout_ms>120000||
    !exactKeys(i,['submission_key','request_hash','principal_ref','responsible_agent_ref','capability','mandate_ref','mandate_version','parent_budget_ref','allocation'])||
    i.request_hash!==hashPayload(r)||i.principal_ref!=='principal:jhn'||i.responsible_agent_ref!=='agent:jhn'||
    i.capability!==a.capability||i.mandate_ref!==STANDING_MANDATE_REF||i.parent_budget_ref!==STANDING_BUDGET_ID||
    !exactKeys(i.allocation,['max_steps'])||!Number.isSafeInteger(i.allocation.max_steps)||i.allocation.max_steps<1)
   throw TypeError('reviewed_work_plan_invalid');
 const plan_hash=hashPayload(reviewed);
 const parent=()=>createEventSourcedExecutionBudgetLedger({store:rootStore,
   budget_id:STANDING_BUDGET_ID,require_authority_grant:true});
 const budgetKey=packet=>'delegate:budget:'+packet+':'+packet;
 function inspectAuthority(auth){
   const mandate=resolveMandate(rootStore,STANDING_MANDATE_REF);
   if(auth?.actor!==i.responsible_agent_ref||mandate?.version!==i.mandate_version)
     return deny('work_identity_or_mandate_changed');
   const p=assessJohnCopAuthority({store:rootStore,auth,verifyIssuer,ledger:parent(),
     mandate_ref:i.mandate_ref,version_pin:i.mandate_version,capability:a.capability,
     transport_mandate_label:STANDING_TRANSPORT_LABEL,at_time:now()});
   if(!p.preflight_ok)return deny(p.error||'work_mandate_denied');
   // Reuse the already signed general normal profile. Diagnostic-only
   // mandates do not get upgraded by commissioning a general work order.
   if(!mandate.scope?.standing_operations?.some(op=>op.profile===STANDING_GENERAL_HOST_PROFILE&&
     op.capability===a.capability&&op.target===a.target&&op.provider===a.provider&&op.execution_mode===a.execution_mode))
     return deny('work_general_normal_scope_missing');
   return {ok:true};
 }
 function allocationFor(packet){
   const rows=rootStore.listTopic('execution-budget:'+STANDING_BUDGET_ID);
   return rows.find(e=>e.event_type==='ExecutionBudgetReservation'&&
     e.payload?.reservation?.idempotency_key===budgetKey(packet))?.payload?.reservation??null;
 }
 function reserve(packet){
   return reserveEventSourcedDelegatedBudget({store:rootStore,child_store:packetStore,
     child_source_ref:primaryStoreId+'#'+packet,parent_ledger:parent(),
     child_budget_id:'budget:'+packet,child_mandate_ref:i.mandate_ref,
     principal_ref:i.principal_ref,allocation:i.allocation,idempotency_key:packet});
 }
 return Object.freeze({
   plan_hash,
   async commission({session,auth,presented_plan_hash}={}){
     if(presented_plan_hash!==plan_hash)return deny('work_plan_hash_mismatch');
     let identity;
     try{identity=await authenticatePrincipal({session})}catch{return deny('principal_session_unverified')}
     if(identity?.ok!==true||identity.authenticated!==true||identity.principal_ref!==i.principal_ref)
       return deny('principal_session_unverified');
     const authority=inspectAuthority(auth);
     if(!authority.ok)return authority;
     const built=buildWorkCommissioningContract({intent:i,context:{
       verified:true,principal_ref:identity.principal_ref,request_hash:i.request_hash,
       requesting_agent_ref:auth.actor,commissioned_by_principal_ref:identity.principal_ref,
       commissioning_ref:sourceRef,destination_ref:'destination:jhn:work',recipient_ref:i.principal_ref,
       result_visibility:'restricted',
     }});
     if(!built.ok)return deny(built.error);
     // This is the authenticated decision recorded atomically with the
     // canonical creation and assignment. Never persist the session/token.
     const access_context={...built.contract,commissioning_evidence:{
       scheme:'supabase_authenticated_owner_work_intent/v1',plan_hash,
       source_work_ref:r.work_ref,source_issue_id:r.source_issue_id,source_ref:sourceRef,
     }};
     const pilot=createCopMcpTasksPilot({store:packetStore,toolName:TOOL,
       primaryStoreId,ownerInstanceRef,handler,
       prepareCreation:()=>({admitted:true,submission_key:i.submission_key,
         assignment:built.assignment,access_context})});
     let task;
     try{task=await pilot.adapter.create({name:TOOL,args:{request:r},auth})}
     catch(e){return deny(e.message||'work_creation_failed')}
     const packet_ref=packetRefForMcpTask(task.taskId);
     const status=await pilot.adapter.get({taskId:task.taskId,auth});
     if(status.status!=='working')return {ok:true,duplicate:true,task_id:task.taskId,packet_ref,
       status:status.status,grants_authority:false};
     const fresh=inspectAuthority(auth);
     if(!fresh.ok)return deny(fresh.error,{packet_ref,created:true,funded:false});
     const existing=allocationFor(packet_ref);
     const childTopic='execution-budget:budget:'+packet_ref;
     if(packetStore.listTopic(childTopic).some(e=>e.event_type==='ExecutionBudgetSeal')||
        existing&&rootStore.listTopic('execution-budget:'+STANDING_BUDGET_ID).some(e=>
          ['ExecutionBudgetSettlement','ExecutionBudgetRelease'].includes(e.event_type)&&
          e.payload?.reservation_id===existing.reservation_id))
       return deny('work_allocation_already_closed',{packet_ref,created:true,funded:false});
     if(!existing&&parent().snapshot().available.max_steps<i.allocation.max_steps)
       return deny('work_budget_unavailable',{packet_ref,created:true,funded:false});
     let funding;
     try{funding=reserve(packet_ref)}
     catch{return deny('work_allocation_requires_reconciliation',{packet_ref,created:true,funded:false})}
     if(!funding.ok)return deny(funding.error||'work_allocation_failed',{packet_ref,created:true,funded:false});
     return {ok:true,task_id:task.taskId,packet_ref,plan_hash,duplicate:task.duplicate===true,
       funded:true,allocation_ref:funding.reservation.reservation_id,budget_id:'budget:'+packet_ref,
       allocation:{...i.allocation},grants_authority:false};
   },
 });
}
