/** Existing GitHub work -> canonical COP Task and delegated funding.
 * The host supplies the exact reviewed plan, separate live Principal session
 * verifier, branded agent identity and existing signed mandate verifier.
 * No new mandate, issuer, external execution surface or source registry.
 */
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {openExistingJohnCopStore} from './john-cop-existing-store.js';
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';
import {projectPacketWorkAssignment} from '../../../inseme/packages/cop-core/src/packet-work-assignment.js';
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {reserveEventSourcedDelegatedBudget} from '../../../inseme/packages/cop-core/src/delegated-budget.js';
import {buildWorkCommissioningContract} from './work-commissioning-contract.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {createCopMcpTasksPilot,packetRefForMcpTask,stableMcpWorkTaskId} from './mcp-tasks-cop-pilot.mjs';
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
 function inspectAuthority(auth,{directPrincipal=false}={}){
   const mandate=resolveMandate(rootStore,STANDING_MANDATE_REF);
   if((!directPrincipal&&auth?.actor!==i.responsible_agent_ref)||mandate?.version!==i.mandate_version)
     return deny('work_identity_or_mandate_changed');
   if(directPrincipal){
     // Commissioning is a human act. Verify the existing agent mandate
     // without pretending the human session is an agent bearer.
     const proof=verifyIssuer({mandate,mandate_ref:i.mandate_ref,store:rootStore});
     const grant=evaluateMandate(rootStore,{mandate_ref:i.mandate_ref,
       version_pin:i.mandate_version,expected_principal_ref:i.principal_ref,
       expected_actor_ref:i.responsible_agent_ref,capability:i.capability,at_time:now()});
     const budget=parent().snapshot();
     if(proof?.verified!==true||proof.principal_ref!==i.principal_ref||
        proof.mandate_ref!==i.mandate_ref||grant?.granted!==true||
        budget.has_grant!==true||budget.mandate_ref!==i.mandate_ref||
        !Number.isSafeInteger(mandate.scope?.budget_ceiling?.max_steps)||
        budget.limits?.max_steps>mandate.scope.budget_ceiling.max_steps)
       return deny('work_mandate_denied');
   }else{
     const p=assessJohnCopAuthority({store:rootStore,auth,verifyIssuer,ledger:parent(),
       mandate_ref:i.mandate_ref,version_pin:i.mandate_version,capability:a.capability,
       transport_mandate_label:STANDING_TRANSPORT_LABEL,at_time:now()});
     if(!p.preflight_ok)return deny(p.error||'work_mandate_denied');
   }
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
 async function commission({session,auth,presented_plan_hash}={},directPrincipal=false){
     if(presented_plan_hash!==plan_hash)return deny('work_plan_hash_mismatch');
     let identity;
     try{identity=await authenticatePrincipal({session})}catch{return deny('principal_session_unverified')}
     if(identity?.ok!==true||identity.authenticated!==true||identity.principal_ref!==i.principal_ref)
       return deny('principal_session_unverified');
     const authority=inspectAuthority(auth,{directPrincipal});
     if(!authority.ok)return authority;
     const built=buildWorkCommissioningContract({intent:i,context:{
       verified:true,principal_ref:identity.principal_ref,request_hash:i.request_hash,
       ...(directPrincipal?{requesting_principal_ref:identity.principal_ref}:{requesting_agent_ref:auth.actor}),
       commissioned_by_principal_ref:identity.principal_ref,
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
     try{
       task=directPrincipal?await pilot.createCommissioned({args:{request:r},admission:{
         admitted:true,submission_key:i.submission_key,assignment:built.assignment,access_context}})
         :await pilot.adapter.create({name:TOOL,args:{request:r},auth});
     }catch(e){return deny(e.message||'work_creation_failed')}
     const packet_ref=packetRefForMcpTask(task.taskId);
     const status=directPrincipal?task.status:(await pilot.adapter.get({taskId:task.taskId,auth})).status;
     if(status!=='working')return {ok:true,duplicate:true,task_id:task.taskId,packet_ref,
       status,grants_authority:false};
     const fresh=inspectAuthority(auth,{directPrincipal});
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
 }
 return Object.freeze({plan_hash,
   commission:input=>commission(input,false),
   // Only the trusted owner HTTP service calls this method. Agent auth
   // is checked separately at real Task dispatch, never synthesized here.
   commissionFromPrincipal:input=>commission(input,true),
 });
}

// Both existing services open the same explicit local source. Neither
// silently creates it, selects a path from client input or issues authority.
export function openConfiguredExistingWork(env=process.env){
 if(env.COGENTIA_JHN_WORK_COMMISSION_ENABLED!=='1')return null;
 const planPath=env.COGENTIA_JHN_WORK_COMMISSION_PLAN,localPath=env.COGENTIA_JHN_WORK_COMMISSION_STORE;
 const primaryStoreId=env.COGENTIA_JHN_WORK_COMMISSION_STORE_ID;
 if(!planPath||!localPath||!/^sqlite:[A-Za-z0-9:._-]+$/.test(primaryStoreId||''))
   throw Error('work_commission_configuration_missing');
 const path=realpathSync(localPath);
 if(path!==localPath||path==='/var/lib/cogentia/cop/john-root-v1.sqlite'||!statSync(path).isFile())
   throw Error('work_commission_distinct_store_required');
 const existing=openExistingJohnCopStore(path);
 if(!existing.ok)throw Error(existing.error);
 existing.close();
 const plan=JSON.parse(readFileSync(planPath,'utf8'));
 const packetStore=createSqliteCopEventStore(path);
 return {plan,packetStore,primaryStoreId,close(){packetStore.close()}};
}

/** Take charge of an already commissioned work through the existing agent
 * transport. The reference selects a work, not an authority. The only
 * dispatch is the exact plan via the ordinary governed host router.
 */
export function createCommissionedHostWorkRunner({rootStore,packetStore,primaryStoreId,
 plan,verifyIssuer,now=()=>new Date()}={}){
 const reviewed=structuredClone(plan),r=reviewed?.request,i=reviewed?.intent;
 // Reuse the plan validator with a verifier that cannot authenticate a human.
 // This construction is read-only; the worker never invokes commission().
 const validator=createExistingHostWorkCommissioner({rootStore,packetStore,primaryStoreId,
   ownerInstanceRef:'instance:jhn-host-work',plan:reviewed,sourceRef:r?.work_ref,verifyIssuer,
   authenticatePrincipal:async()=>({ok:false}),handler:async()=>{throw Error('not_a_commissioner')},now});
 const taskId=stableMcpWorkTaskId('jhn:'+i.responsible_agent_ref,TOOL,i.submission_key);
 const packet_ref=packetRefForMcpTask(taskId),topic='packet:'+packet_ref,budget_id='budget:'+packet_ref;
 const parent=()=>createEventSourcedExecutionBudgetLedger({store:rootStore,
   budget_id:STANDING_BUDGET_ID,require_authority_grant:true});
 function context(){
   const first=packetStore.listTopic(topic)[0]?.payload;
   const c=first?.access_context,e=c?.commissioning_evidence;
   const assigned=projectPacketWorkAssignment(packetStore,{packet_ref:topic});
   if(first?.toolName!==TOOL||first?.owner!=='jhn:'+i.responsible_agent_ref||
      hashPayload(first?.args?.request)!==i.request_hash||
      c?.request_hash!==i.request_hash||c?.authority?.mandate_ref!==i.mandate_ref||
      c?.authority?.version!==i.mandate_version||c?.authority?.capability!==i.capability||
      c?.principal_ref!==i.principal_ref||c?.funding?.parent_budget_ref!==i.parent_budget_ref||
      hashPayload(c?.funding?.allocation)!==hashPayload(i.allocation)||
      c?.delivery?.recipient_ref!==i.principal_ref||c?.delivery?.visibility!=='restricted'||
      e?.scheme!=='supabase_authenticated_owner_work_intent/v1'||e?.plan_hash!==validator.plan_hash||
      e?.source_issue_id!==r.source_issue_id||e?.source_work_ref!==r.work_ref||
      assigned?.responsible_agent_ref!==i.responsible_agent_ref||
      assigned?.commissioned_by_principal_ref!==i.principal_ref||
      packetStore.auditTopicCommitment(topic)?.ok!==true)return null;
   const rows=rootStore.listTopic('execution-budget:'+STANDING_BUDGET_ID);
   const a=rows.find(e=>e.event_type==='ExecutionBudgetReservation'&&
     e.payload?.reservation?.idempotency_key==='delegate:'+budget_id+':'+packet_ref)?.payload?.reservation;
   if(!a||hashPayload(a.demand)!==hashPayload(i.allocation)||
      rows.some(e=>['ExecutionBudgetSettlement','ExecutionBudgetRelease'].includes(e.event_type)&&
        e.payload?.reservation_id===a.reservation_id)||
      packetStore.listTopic('execution-budget:'+budget_id).some(e=>e.event_type==='ExecutionBudgetSeal'))return null;
   return {store:packetStore,primary_store_id:primaryStoreId,budget_id,allocation_ref:a.reservation_id};
 }
 function resolvePacketContext(q){
   if(q.packet_ref!==packet_ref||q.actor_ref!==i.responsible_agent_ref||
      q.principal_ref!==i.principal_ref||q.mandate_ref!==i.mandate_ref||
      q.mandate_version!==i.mandate_version)return null;
   return context();
 }
 return Object.freeze({
   resolvePacketContext,
   async run({args,auth,invoke}={}){
     if(!isResolvedCallerAuth(auth)||auth.actor!==i.responsible_agent_ref||
        auth.principal_ref!==i.principal_ref||auth.allowMutate!==true||
        auth.mandate_ref!==STANDING_TRANSPORT_LABEL||typeof invoke!=='function')
       return deny('work_authenticated_agent_required');
     // No independent effect grant or arbitrary substitutions in this path.
     const {work_ref,mandate,...given}=args||{};
     const {capability,...expected}=r.first_act;
     if(work_ref!==r.work_ref||(mandate!=null&&mandate!==STANDING_TRANSPORT_LABEL)||
        hashPayload(given)!==hashPayload(expected))return deny('work_exact_act_mismatch');
     const pilot=createCopMcpTasksPilot({store:packetStore,toolName:TOOL,primaryStoreId,
       ownerInstanceRef:'instance:jhn-host-work',handler:async()=>{
         const active=context();
         if(!active)throw Error('work_context_or_allocation_unavailable');
         const result=await invoke(expected,{packet_ref});
         const spend=result?.trace?.verification?.cop_spend;
         if(spend?.accounting_complete!==true||spend.accounting_locality!=='packet'||
            spend.packet_ref!==packet_ref||spend.budget_id!==budget_id)
           throw Error('work_effect_accounting_requires_reconciliation');
         // Budget closure is an accounting operation, not a judgment that
         // the entire GitHub work is complete. Only close known local spend.
         const allocation=reserveEventSourcedDelegatedBudget({store:rootStore,child_store:packetStore,
           child_source_ref:primaryStoreId+'#'+packet_ref,parent_ledger:parent(),
           child_budget_id:budget_id,child_mandate_ref:i.mandate_ref,
           principal_ref:i.principal_ref,allocation:i.allocation,idempotency_key:packet_ref});
         if(!allocation.ok||allocation.reservation.reservation_id!==active.allocation_ref)
           throw Error('work_allocation_reconciliation_required');
         const closed=allocation.close();
         if(!closed.ok)throw Error('work_budget_reconciliation_required');
         return {result,packet_ref,parent_summary:closed.evidence,
           work_complete:false,postcondition_status:'unassessed'};
       }});
     const authority=assessJohnCopAuthority({store:rootStore,auth,verifyIssuer,
       ledger:parent(),mandate_ref:i.mandate_ref,version_pin:i.mandate_version,
       capability:i.capability,transport_mandate_label:STANDING_TRANSPORT_LABEL,at_time:now()});
     if(!authority.preflight_ok)return deny(authority.error||'work_mandate_denied');
     let status;
     try{status=await pilot.adapter.get({taskId,auth})}catch{return deny('commissioned_work_not_found')}
     if(status.status==='completed'||status.status==='failed'||status.status==='cancelled')
       return {ok:status.status==='completed'&&status.result?.result?.ok===true,
         duplicate:true,packet_ref,task:status,grants_authority:false};
     if(!context())return deny('work_context_or_allocation_unavailable');
     const done=await pilot.run(taskId,auth);
     return {ok:done.status==='completed'&&done.result?.result?.ok===true,
       packet_ref,task:done,grants_authority:false};
   },
 });
}
