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
import {HOST_PROCESS,exactKeys,validNormalWorkRoute,routeInSignedScope,normalizeWorkAct} from './commissioned-work-routes.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {createCopMcpTasksPilot,packetRefForMcpTask,stableMcpWorkTaskId} from './mcp-tasks-cop-pilot.mjs';
import {STANDING_MANDATE_REF,STANDING_BUDGET_ID,STANDING_TRANSPORT_LABEL} from './john-standing-mission-authority.js';

const deny=(error,details={})=>({ok:false,error,grants_authority:false,...details});
const LEGACY_TOOL='cogentia_host_process_run';
// Preserve the original stable work identity namespace across surface migrations.
const toolNameFor=r=>r?.routes?'cogentia_work_turn':LEGACY_TOOL;
const source=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*$/;
const ref=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:/@-]{1,255}$/.test(x);
const TURN_POLICY='agent_selected_normal/v1';
const turnPolicy=p=>exactKeys(p,['kind','valid_until'])&&p.kind===TURN_POLICY&&
 typeof p.valid_until==='string'&&Number.isFinite(Date.parse(p.valid_until))&&
 new Date(p.valid_until).toISOString()===p.valid_until;
const turnId=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);
const routesOf=r=>{
 if(r.routes)return r.routes;
 if(r.route)return [r.route];
 const {capability,target,provider,execution_mode}=r.first_act??{};
 return [{capability,target,provider,execution_mode}];
};
const capabilitiesOf=i=>i.capabilities??[i.capability];
const authorityMatches=(a,i)=>hashPayload(a)===hashPayload({mandate_ref:i.mandate_ref,
 version:i.mandate_version,...(i.capabilities?{capabilities:i.capabilities}:{capability:i.capability})});
const validRoutes=(r,i)=>{
 if(r.routes!==undefined){
   return r.turn_policy&&Array.isArray(r.routes)&&r.routes.length>=1&&r.routes.length<=16&&
     r.routes.every(validNormalWorkRoute)&&new Set(r.routes.map(hashPayload)).size===r.routes.length&&
     Array.isArray(i?.capabilities)&&hashPayload(i.capabilities)===hashPayload([...new Set(r.routes.map(x=>x.capability))]);
 }
 if(r.route)return r.route.capability===HOST_PROCESS&&validNormalWorkRoute(r.route)&&i?.capability===HOST_PROCESS;
 const {capability,...act}=r.first_act??{};
 return capability===HOST_PROCESS&&i?.capability===HOST_PROCESS&&!!normalizeWorkAct(routesOf(r)[0],act);
};


// A host-owned plan is immutable for the lifetime of this adapter; no
// command, budget, actor or permission is taken from the confirmation body.
export function createWorkCommissioner({
 rootStore,packetStore,primaryStoreId,ownerInstanceRef,verifyIssuer,
 authenticatePrincipal,plan,sourceRef,handler,now=()=>new Date(),
}={}){
 if(rootStore?.kind!=='sqlite'||packetStore?.kind!=='sqlite'||rootStore===packetStore||
    typeof verifyIssuer!=='function'||typeof authenticatePrincipal!=='function'||
    typeof handler!=='function'||!ref(sourceRef))
   throw TypeError('trusted_work_commissioning_dependencies_required');
 const reviewed=structuredClone(plan),r=reviewed?.request,i=reviewed?.intent;
 if(!exactKeys(reviewed,['request','intent'])||
    !(exactKeys(r,['work_ref','source_issue_id','purpose','first_act','completion'])||
      (exactKeys(r,['work_ref','source_issue_id','purpose','route','completion','turn_policy'])||
       exactKeys(r,['work_ref','source_issue_id','purpose','routes','completion','turn_policy']))&&turnPolicy(r.turn_policy))||
    !source.test(r.work_ref)||sourceRef!==r.work_ref||typeof r.source_issue_id!=='string'||!r.source_issue_id||
    typeof r.purpose!=='string'||!r.purpose.trim()||typeof r.completion!=='string'||!r.completion.trim()||
    !validRoutes(r,i)||
    !exactKeys(i,['submission_key','request_hash','principal_ref','responsible_agent_ref',r.routes?'capabilities':'capability','mandate_ref','mandate_version','parent_budget_ref','allocation'])||
    i.request_hash!==hashPayload(r)||i.principal_ref!=='principal:jhn'||i.responsible_agent_ref!=='agent:jhn'||
    i.mandate_ref!==STANDING_MANDATE_REF||i.parent_budget_ref!==STANDING_BUDGET_ID||
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
     const grants=capabilitiesOf(i).map(capability=>evaluateMandate(rootStore,{mandate_ref:i.mandate_ref,
       version_pin:i.mandate_version,expected_principal_ref:i.principal_ref,
       expected_actor_ref:i.responsible_agent_ref,capability,at_time:now()}));
     const budget=parent().snapshot();
     if(proof?.verified!==true||proof.principal_ref!==i.principal_ref||
        proof.mandate_ref!==i.mandate_ref||grants.some(g=>g?.granted!==true)||
        budget.has_grant!==true||budget.mandate_ref!==i.mandate_ref||
        !Number.isSafeInteger(mandate.scope?.budget_ceiling?.max_steps)||
        budget.limits?.max_steps>mandate.scope.budget_ceiling.max_steps)
       return deny('work_mandate_denied');
   }else{
     for(const capability of capabilitiesOf(i)){
       const p=assessJohnCopAuthority({store:rootStore,auth,verifyIssuer,ledger:parent(),
         mandate_ref:i.mandate_ref,version_pin:i.mandate_version,capability,
         transport_mandate_label:STANDING_TRANSPORT_LABEL,at_time:now()});
       if(!p.preflight_ok)return deny(p.error||'work_mandate_denied');
     }
   }
   // Reuse the already signed general normal profile. Diagnostic-only
   // mandates do not get upgraded by commissioning a general work order.
   if(!routesOf(r).every(route=>routeInSignedScope(mandate.scope,route)))
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
     if(r.turn_policy&&Date.parse(r.turn_policy.valid_until)<=now().getTime())return deny('work_turn_policy_expired');
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
     const pilot=createCopMcpTasksPilot({store:packetStore,toolName:toolNameFor(r),submissionNamespace:LEGACY_TOOL,
       primaryStoreId,ownerInstanceRef,handler,
       prepareCreation:()=>({admitted:true,submission_key:i.submission_key,
         assignment:built.assignment,access_context})});
     let task;
     try{
       task=directPrincipal?await pilot.createCommissioned({args:{request:r},admission:{
         admitted:true,submission_key:i.submission_key,assignment:built.assignment,access_context}})
         :await pilot.adapter.create({name:toolNameFor(r),args:{request:r},auth});
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
 // The consent service reads proposals at confirmation time. Replacing a
 // proposal file atomically does not restart either service or change an
 // already commissioned packet. The worker needs no proposal file at all.
 const getPlans=()=>{
   if(statSync(planPath).size>1024*1024)throw Error('work_plan_catalog_too_large');
   const raw=JSON.parse(readFileSync(planPath,'utf8'));
   return Array.isArray(raw)?raw:[raw];
 };
 const packetStore=createSqliteCopEventStore(path);
 return {getPlans,packetStore,primaryStoreId,close(){packetStore.close()}};
}

/** Take charge of an already commissioned work through the existing agent
 * transport. The reference selects a work, not an authority. Dispatch
 * through the ordinary governed host router is exact for legacy plans and
 * bounded by the reviewed route and signed mandate for multi-turn plans.
 */
export function createCommissionedWorkRunner({rootStore,packetStore,primaryStoreId,
 plan,verifyIssuer,now=()=>new Date()}={}){
 const reviewed=structuredClone(plan),r=reviewed?.request,i=reviewed?.intent;
 // Reuse the plan validator with a verifier that cannot authenticate a human.
 // This construction is read-only; the worker never invokes commission().
 const validator=createWorkCommissioner({rootStore,packetStore,primaryStoreId,
   ownerInstanceRef:'instance:jhn-host-work',plan:reviewed,sourceRef:r?.work_ref,verifyIssuer,
   authenticatePrincipal:async()=>({ok:false}),handler:async()=>{throw Error('not_a_commissioner')},now});
 const taskId=stableMcpWorkTaskId('jhn:'+i.responsible_agent_ref,LEGACY_TOOL,i.submission_key);
 const packet_ref=packetRefForMcpTask(taskId),topic='packet:'+packet_ref,budget_id='budget:'+packet_ref;
 const parent=()=>createEventSourcedExecutionBudgetLedger({store:rootStore,
   budget_id:STANDING_BUDGET_ID,require_authority_grant:true});
 function verifiedWorkIdentity(){
   const first=packetStore.listTopic(topic)[0]?.payload;
   const c=first?.access_context,e=c?.commissioning_evidence;
   const assigned=projectPacketWorkAssignment(packetStore,{packet_ref:topic});
   if(first?.toolName!==toolNameFor(r)||first?.owner!=='jhn:'+i.responsible_agent_ref||
      hashPayload(first?.args?.request)!==i.request_hash||
      c?.request_hash!==i.request_hash||c?.authority?.mandate_ref!==i.mandate_ref||
      !authorityMatches(c?.authority,i)||
      c?.principal_ref!==i.principal_ref||c?.funding?.parent_budget_ref!==i.parent_budget_ref||
      hashPayload(c?.funding?.allocation)!==hashPayload(i.allocation)||
      c?.delivery?.recipient_ref!==i.principal_ref||c?.delivery?.visibility!=='restricted'||
      e?.scheme!=='supabase_authenticated_owner_work_intent/v1'||e?.plan_hash!==validator.plan_hash||
      e?.source_issue_id!==r.source_issue_id||e?.source_work_ref!==r.work_ref||
      assigned?.ok!==true||assigned.status!=='assigned'||
      assigned.responsible_agent_ref!==i.responsible_agent_ref||
      assigned?.commissioned_by_principal_ref!==i.principal_ref||
      packetStore.auditTopicCommitment(topic)?.ok!==true||
      packetStore.auditTopicCommitment('execution-budget:'+budget_id)?.ok!==true||
      rootStore.auditTopicCommitment('execution-budget:'+STANDING_BUDGET_ID)?.ok!==true)return false;
   return true;
 }
 function context(){
   if(!verifiedWorkIdentity())return null;
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
      q.mandate_version!==i.mandate_version||
      (q.capability!==undefined&&!routesOf(r).some(route=>
       route.capability===q.capability&&route.target===q.target&&route.provider===q.provider&&
       route.execution_mode===q.execution_mode)))return null;
   return context();
 }
 // Multi-turn policy is part of the Principal-reviewed request hash.
 // All acts, including the first, are chosen by the responsible agent
 // within the reviewed routes, signed scope and local budget.
 // The final judgment is not a command and does not consume an execution Step.
 function normalizeTurn(args){
   const {work_ref,mandate,work_turn:t,...act}=args||{};
   if(work_ref!==r.work_ref||(mandate!=null&&mandate!==STANDING_TRANSPORT_LABEL)||!turnId(t?.id))return null;
   if(exactKeys(t,['id','kind','status','summary'])&&t.kind==='finish'&&
      ['completed','blocked'].includes(t.status)&&typeof t.summary==='string'&&t.summary.trim()&&t.summary.length<=2048&&
      Object.keys(act).length===0)return {turn:t};
   if(!exactKeys(t,['id','kind'])||t.kind!=='act')return null;
   if(r.routes){
     if(!exactKeys(act,['capability','arguments']))return null;
     const route=r.routes.find(x=>x.capability===act.capability&&normalizeWorkAct(x,act.arguments));
     const normalized=normalizeWorkAct(route,act.arguments);
     return normalized?{turn:t,capability:act.capability,act:normalized}:null;
   }
   const normalized=normalizeWorkAct(r.route,act);
   return normalized?{turn:t,act:normalized}:null;
 }
 function storedTurn(rows,id){
   for(const e of rows){
     const p=e.payload;
     const receipt=p?.phase==='input_required'?p.checkpoint:p?.phase==='completed'?p.result:null;
     if(receipt?.turn?.id===id)return receipt;
   }
   return null;
 }
 function turnResponse(task,receipt,duplicate=false){
   return {ok:receipt?.result?.ok!==false,packet_ref,task,turn_receipt:receipt,
     ...(duplicate?{duplicate:true}:{}),grants_authority:false};
 }
 async function runTurns({args,auth,invoke}){
   const candidate=normalizeTurn(args);
   if(!candidate)return deny('work_turn_invalid');
   const digest=hashPayload(candidate),id=candidate.turn.id;
   const localLedger=()=>createEventSourcedExecutionBudgetLedger({store:packetStore,budget_id,require_authority_grant:true});
   const actWithinTime=v=>Date.parse(r.turn_policy.valid_until)-now().getTime()>=v.act.timeout_ms;
   const check=(capability)=>assessJohnCopAuthority({store:rootStore,auth,verifyIssuer,
     ledger:localLedger(),mandate_ref:i.mandate_ref,version_pin:i.mandate_version,capability,
     transport_mandate_label:STANDING_TRANSPORT_LABEL,at_time:now()});
   const checkTurn=v=>v.turn.kind==='finish'
     ? capabilitiesOf(i).every(capability=>check(capability).preflight_ok)
     : check(v.capability??i.capability).preflight_ok;
   // Every actual act is admitted by the same standing COP resolver.
   // The host-input validator also binds the accepted turn to its suspension.
   const pilot=createCopMcpTasksPilot({store:packetStore,toolName:toolNameFor(r),submissionNamespace:LEGACY_TOOL,primaryStoreId,
     ownerInstanceRef:'instance:jhn-host-work',
     verifyHostInput:({candidate:next})=>{
       const v=normalizeTurn({work_ref:r.work_ref,work_turn:next?.turn,
         ...(r.routes&&next?.act?{capability:next.capability,arguments:next.act}:next?.act)});
       if(!v||hashPayload(v)!==hashPayload(next)||!context())return {verified:false};
       if(!checkTurn(v))return {verified:false};
       if(v.turn.kind==='act'&&(!actWithinTime(v)||
          localLedger().snapshot().available.max_steps<1))return {verified:false};
       return {verified:true,value:v};
     },
     handler:async(_created,{resume})=>{
       const next=resume?.inputResponses;
       if(!next)throw Error("work_turn_input_not_admitted");
       const active=context();
       if(!active)throw Error('work_context_or_allocation_unavailable');
       if(next.turn.kind==='finish'){
         if(!checkTurn(next))throw Error('work_finish_authority_unverified');
         const allocation=reserveEventSourcedDelegatedBudget({store:rootStore,child_store:packetStore,
           child_source_ref:primaryStoreId+'#'+packet_ref,parent_ledger:parent(),
           child_budget_id:budget_id,child_mandate_ref:i.mandate_ref,principal_ref:i.principal_ref,
           allocation:i.allocation,idempotency_key:packet_ref});
         if(!allocation.ok||allocation.reservation.reservation_id!==active.allocation_ref)
           throw Error('work_allocation_reconciliation_required');
         const closed=allocation.close();
         if(!closed.ok)throw Error('work_budget_reconciliation_required');
         return {turn:next.turn,input_hash:hashPayload(next),packet_ref,parent_summary:closed.evidence,
           work_complete:next.turn.status==='completed',postcondition_status:'agent_assessed',
           packet_status:next.turn.status};
       }
       if(!actWithinTime(next)||!checkTurn(next)){
         // The provider has not been called. Keep the packet resumable so
         // a subsequent authorized judgment can reconcile its unused funds.
         return {type:'cop.task.host-input/v1',checkpoint:{turn:next.turn,input_hash:hashPayload(next),
           result:{ok:false,error:'work_turn_authority_or_time_expired',dispatched:false},packet_ref,
           remaining_steps:localLedger().snapshot().available.max_steps,work_complete:false},
           pending:{kind:'agent_work_turn'}};
       }
       const result=await invoke(next.act,{packet_ref,capability:next.capability??HOST_PROCESS});
       const spend=result?.trace?.verification?.cop_spend;
       if(spend?.accounting_complete!==true||spend.accounting_locality!=='packet'||
          spend.packet_ref!==packet_ref||spend.budget_id!==budget_id||
          (r.routes&&result.trace.capability!==next.capability))
         throw Error('work_effect_accounting_requires_reconciliation');
       const checkpoint={turn:next.turn,...(next.capability?{capability:next.capability}:{}),
         input_hash:hashPayload(next),result,packet_ref,
         remaining_steps:localLedger().snapshot().available.max_steps,work_complete:false};
       return {type:'cop.task.host-input/v1',checkpoint,pending:{kind:'agent_work_turn'}};
     }});
   let task;
   try{task=await pilot.adapter.get({taskId,auth})}catch{return deny('commissioned_work_not_found')}
   let rows=packetStore.listTopic(topic);
   if(!verifiedWorkIdentity()||!checkTurn(candidate))return deny('work_history_or_authority_unverified');
   const receipt=storedTurn(rows,id);
   if(receipt)return receipt.input_hash===digest?turnResponse(task,receipt,true):deny('work_turn_id_conflict');
   if(['completed','failed','cancelled'].includes(task.status))return deny('work_turn_terminal');
   if(!context())return deny('work_context_or_allocation_unavailable');
   if(!checkTurn(candidate))return deny('work_turn_authority_unverified');
   if(candidate.turn.kind==='act'&&(!actWithinTime(candidate)||
       localLedger().snapshot().available.max_steps<1))return deny('work_turn_time_or_budget_exhausted');
   let open=rows.findLast(e=>e.payload?.phase==='input_required');
   if(!open){
     try{task=await pilot.requireInitialHostInput(taskId,auth)}catch(e){return deny(e.message||'work_turn_start_failed')}
     rows=packetStore.listTopic(topic);open=rows.findLast(e=>e.payload?.phase==='input_required');
     if(!open)return deny('work_turn_start_unavailable');
   }
   if(rows.some(e=>e.payload?.phase==='input_received'&&e.payload.inputResponses?.turn?.id===id&&
      e.payload.host_input_hash!==digest))return deny('work_turn_id_conflict');
   // Replays of an admitted but unfinished turn never bind to a later
   // suspension. They observe the old claim rather than redispatch it.
   const admitted=rows.find(e=>e.payload?.phase==='input_received'&&e.payload.inputResponses?.turn?.id===id);
   if(admitted&&admitted.payload.suspension_event_ref!==open.event_id)return deny('work_turn_outcome_unknown');
   try{await pilot.acceptHostInput(taskId,auth,candidate,open.event_id)}
   catch(e){return deny(e.message||'work_turn_not_admitted')}
   task=await pilot.run(taskId,auth,{hostInput:{suspension_ref:open.event_id,input_hash:digest}});
   const done=storedTurn(packetStore.listTopic(topic),id);
   if(!done)return deny('work_turn_result_pending_or_reconciliation_required',{packet_ref,task});
   return turnResponse(task,done);
 }
 return Object.freeze({
   resolvePacketContext,
   async run({args,auth,invoke,semanticSurface=false}={}){
     if(!isResolvedCallerAuth(auth)||auth.actor!==i.responsible_agent_ref||
        auth.principal_ref!==i.principal_ref||auth.allowMutate!==true||
        auth.mandate_ref!==STANDING_TRANSPORT_LABEL||typeof invoke!=='function')
       return deny('work_authenticated_agent_required');
     if(Boolean(r.routes)!==semanticSurface)return deny('work_turn_surface_mismatch');
     if(r.turn_policy)return runTurns({args,auth,invoke});
     // No independent effect grant or arbitrary substitutions in this path.
     const {work_ref,mandate,...given}=args||{};
     const {capability,...expected}=r.first_act;
     if(work_ref!==r.work_ref||(mandate!=null&&mandate!==STANDING_TRANSPORT_LABEL)||
        hashPayload(given)!==hashPayload(expected))return deny('work_exact_act_mismatch');
     const pilot=createCopMcpTasksPilot({store:packetStore,toolName:toolNameFor(r),submissionNamespace:LEGACY_TOOL,primaryStoreId,
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

/** Resolve proposals by exact reviewed hash, and commissioned work by its
 * canonical packet. No per-issue service configuration or second ledger.
 * Reconstruct an already commissioned plan from the immutable creation;
 * the original plan hash and all authority/assignment/budget checks still
 * run in the existing runner. A removed proposal does not orphan work.
 */
function planFromCreation(c){
 const r=c?.args?.request,w=c?.access_context,e=w?.commissioning_evidence;
 if(c?.phase!=='created'||c?.toolName!==toolNameFor(r)||
    w?.schema!=='cogentia.work-commissioning/v1'||
    e?.scheme!=='supabase_authenticated_owner_work_intent/v1'||!r)return null;
 const plan={request:r,intent:{submission_key:w.submission_key,request_hash:w.request_hash,
   principal_ref:w.principal_ref,responsible_agent_ref:w.assignment?.responsible_agent_ref,
   ...(w.authority?.capabilities?{capabilities:w.authority.capabilities}:{capability:w.authority?.capability}),mandate_ref:w.authority?.mandate_ref,
   mandate_version:w.authority?.version,parent_budget_ref:w.funding?.parent_budget_ref,
   allocation:w.funding?.allocation}};
 return hashPayload(plan)===e.plan_hash?plan:null;
}
export function createWorkCommissionCatalog({plans,getPlans,...options}={}){
 if((plans===undefined)===(getPlans===undefined)||getPlans!==undefined&&typeof getPlans!=='function')
   throw TypeError('one_work_plan_catalog_source_required');
 const build=entries=>{
   if(!Array.isArray(entries)||entries.length>128)throw TypeError('work_plan_catalog_invalid');
   const byHash=new Map(),byRef=new Set();
   for(const plan of entries){
     const c=createWorkCommissioner({...options,plan,sourceRef:plan?.request?.work_ref});
     if(byHash.has(c.plan_hash)||byRef.has(plan.request.work_ref))
       throw TypeError('work_plan_catalog_ambiguous');
     byHash.set(c.plan_hash,c);byRef.add(plan.request.work_ref);
   }
   return byHash;
 };
 const fixed=getPlans?null:build(plans);
 return Object.freeze({
   async commissionFromPrincipal(input){
     let byHash;
     try{byHash=fixed??build(getPlans())}catch{return deny('work_plan_catalog_unavailable')}
     const c=byHash.get(input?.presented_plan_hash);
     return c?c.commissionFromPrincipal(input):deny('work_plan_hash_mismatch');
   },
 });
}
export function createCommissionedWorkDispatcher({packetStore,...options}={}){
 if(packetStore?.kind!=='sqlite')throw TypeError('canonical_work_store_required');
 function forPacket(packet_ref){
   if(typeof packet_ref!=='string'||!/^pkt-mcp-[0-9a-f-]{36}$/.test(packet_ref))return null;
   try{
     const topic='packet:'+packet_ref,rows=packetStore.listTopic(topic);
     if(packetStore.auditTopicCommitment(topic)?.ok!==true)return null;
     const p=planFromCreation(rows[0]?.payload);
     if(!p||packetRefForMcpTask(stableMcpWorkTaskId('jhn:'+p.intent.responsible_agent_ref,LEGACY_TOOL,p.intent.submission_key))!==packet_ref)return null;
     return createCommissionedWorkRunner({...options,packetStore,plan:p});
   }catch{return null}
 }
 function forRef(work_ref){
   if(/^pkt-mcp-[0-9a-f-]{36}$/.test(work_ref||''))return forPacket(work_ref);
   if(typeof work_ref!=='string'||!source.test(work_ref))return null;
   const matches=packetStore.replay().filter(e=>e.payload?.phase==='created'&&
     e.payload?.toolName===toolNameFor(e.payload?.args?.request)&&e.payload?.args?.request?.work_ref===work_ref);
   // Never silently pick a newer/older commission of the same Issue.
   if(matches.length!==1)return null;
   return forPacket(matches[0].payload.packetRef);
 }
 return Object.freeze({
   resolvePacketContext(q){return forPacket(q?.packet_ref)?.resolvePacketContext(q)??null},
   async run(input){
     const ref=input?.args?.work_ref,runner=forRef(ref);
     if(!runner)return deny('commissioned_work_missing_or_ambiguous');
     // The existing runner verifies the plan, actual caller and exact act.
     // Its canonical reference remains the original Issue URL.
     if(/^pkt-mcp-[0-9a-f-]{36}$/.test(ref)){
       const p=planFromCreation(packetStore.listTopic('packet:'+ref)[0]?.payload);
       return runner.run({...input,args:{...input.args,work_ref:p.request.work_ref}});
     }
     return runner.run(input);
   },
 });
}

// Legacy import names remain source-compatible during the surface migration.
export {
 createWorkCommissioner as createExistingHostWorkCommissioner,
 createCommissionedWorkRunner as createCommissionedHostWorkRunner,
 createWorkCommissionCatalog as createExistingHostWorkCatalog,
 createCommissionedWorkDispatcher as createCommissionedHostWorkDispatcher
};
