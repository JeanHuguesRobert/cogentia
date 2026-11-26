/** #342: admission of a public-corpus work through the existing COP Task
 * pilot. No issuer, token exchange, new scheduler or implicit commissioner.
 * Host-resolved commissioning/delivery context is an independent input.
 */
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {resolveMandate,invokeGovernedCapability} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {reserveEventSourcedDelegatedBudget} from '../../../inseme/packages/cop-core/src/delegated-budget.js';
import {projectPacketWorkAssignment} from '../../../inseme/packages/cop-core/src/packet-work-assignment.js';
import {buildWorkCommissioningContract,compareWorkCommissioningContract} from './work-commissioning-contract.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';
import {createCopMcpTasksPilot,packetRefForMcpTask,packetTopicForMcpTask} from './mcp-tasks-cop-pilot.mjs';
import {STANDING_MANDATE_REF,STANDING_BUDGET_ID,STANDING_TRANSPORT_LABEL} from './john-standing-mission-authority.js';

const TOOL='cogentia_john_run',CAPABILITY='corpus.search';
const REF=/^[A-Za-z0-9][A-Za-z0-9_.:/@-]{1,255}$/;
const ref=x=>typeof x==='string'&&REF.test(x);
const deny=error=>({ok:false,admitted:false,error});
const keys=(obj,allowed)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).every(k=>allowed.includes(k));
const STEPS=3;

// This pilot accepts an exact bounded semantic request, not arbitrary John
// handlers, caller-issued authority, secret options or a private corpus view.
export function normalizePublicJohnWork(args){
 const r=args?.request;
 if(!keys(args,['request'])||!keys(r,['version','request_id','principal','mandate','budget','execution_budget','exposure','capability','input','handler'])||
    r.version!=='john.request.v1'||!(/^[A-Za-z0-9_.:-]{1,128}$/.test(r.request_id||''))||
    r.exposure!=='read_only'||r.capability!==CAPABILITY||
    !keys(r.principal,['id'])||r.principal.id!=='principal:jhn'||
    !keys(r.mandate,['id','version'])||r.mandate.id!==STANDING_MANDATE_REF||!(/^v[1-9][0-9]*$/.test(r.mandate.version||''))||
    !keys(r.budget,['id'])||r.budget.id!==STANDING_BUDGET_ID||
    !keys(r.handler,['id','kind','allowed_capabilities'])||r.handler.id!=='capability.once'||
    r.handler.kind!=='capability_once'||JSON.stringify(r.handler.allowed_capabilities)!==JSON.stringify([CAPABILITY])||
    !keys(r.execution_budget,['max_steps','max_tool_calls','max_subagents','max_elapsed_ms','max_external_effects','max_internal_effects'])||
    r.execution_budget.max_steps!==STEPS||r.execution_budget.max_tool_calls!==1||
    r.execution_budget.max_subagents!==0||r.execution_budget.max_external_effects!==0||
    (r.execution_budget.max_internal_effects??0)!==0||
    !Number.isSafeInteger(r.execution_budget.max_elapsed_ms)||r.execution_budget.max_elapsed_ms<100||r.execution_budget.max_elapsed_ms>15000||
    !keys(r.input,['prompt','arguments'])||!keys(r.input.arguments,['query','repo','mode','limit']))
    return deny('bounded_public_work_request_required');
 const a=r.input.arguments;
 if(typeof a.query!=='string'||!a.query.trim()||a.query.length>256||r.input.prompt!==a.query||
    typeof a.repo!=='string'||!(/^[A-Za-z0-9_.-]{1,80}$/.test(a.repo))||
    a.mode!=='keyword'||!Number.isSafeInteger(a.limit)||a.limit<1||a.limit>8)
   return deny('bounded_public_search_required');
 return {ok:true,request:r,request_hash:hashPayload(r)};
}

export function assessCanonicalPublicJohnWork({store,verifyIssuer,resolveContext,auth,args,operation='submit',now=new Date()}={}){
 const normalized=normalizePublicJohnWork(args);
 if(!normalized.ok)return normalized;
 if(!isResolvedCallerAuth(auth)||auth.auth!=='jhn'||auth.actor!=='agent:jhn'||
    auth.principal_ref!=='principal:jhn'||auth.allowMutate!==true)
   return deny('verified_jhn_transport_required');
 if(typeof resolveContext!=='function')return deny('commissioning_and_destination_verifier_required');
 const r=normalized.request;
 let ledger,mandate;
 try{
   mandate=resolveMandate(store,STANDING_MANDATE_REF);
   ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:STANDING_BUDGET_ID,require_authority_grant:true});
 }catch{return deny('canonical_authority_unavailable')}
 const preflight=assessJohnCopAuthority({store,auth,verifyIssuer,
   mandate_ref:STANDING_MANDATE_REF,version_pin:r.mandate.version,
   capability:CAPABILITY,ledger,transport_mandate_label:STANDING_TRANSPORT_LABEL,at_time:now});
 if(!preflight.preflight_ok)return deny(preflight.error||'canonical_public_work_denied');
 if(mandate?.version!==r.mandate.version)return deny('mandate_version_stale');
 let context;
 try{context=resolveContext({auth,request_hash:normalized.request_hash,
    request_id:r.request_id,capability:CAPABILITY,operation})}catch{}
 if(context?.verified!==true||context.principal_ref!=='principal:jhn'||
    context.commissioned_by_principal_ref!=='principal:jhn'||
    context.request_hash!==normalized.request_hash||context.result_visibility!=='public'||
    !ref(context.destination_ref)||!ref(context.commissioning_ref))
   return deny('verified_commissioning_and_public_destination_required');
 const built=buildWorkCommissioningContract({intent:{
   principal_ref:'principal:jhn',responsible_agent_ref:'agent:jhn',
   submission_key:r.request_id,request_hash:normalized.request_hash,capability:CAPABILITY,
   mandate_ref:STANDING_MANDATE_REF,mandate_version:mandate.version,
   parent_budget_ref:STANDING_BUDGET_ID,allocation:{max_steps:STEPS},
 },context});
 if(!built.ok)return deny(built.error);
 return {ok:true,admitted:true,submission_key:r.request_id,access_context:built.contract,
   contract_hash:built.contract_hash,assignment:built.assignment,request:r};
}

export function createCanonicalJohnPublicWorkPilot({store,verifyIssuer,resolveContext,publicCore,primaryStoreId,ownerInstanceRef,now=()=>new Date()}={}){
 if(store?.kind!=='sqlite'||typeof verifyIssuer!=='function'||typeof resolveContext!=='function'||
    typeof publicCore?.callTool!=='function'||!ref(ownerInstanceRef))
   throw new TypeError('canonical_public_work_host_dependencies_required');
 const check=(auth,args,operation)=>assessCanonicalPublicJohnWork({store,verifyIssuer,resolveContext,auth,args,operation,now:now()});
 const fail=e=>{throw Object.assign(new Error(e),{code:'unknown_task'})};
 const creation=taskId=>store.listTopic(packetTopicForMcpTask(taskId)).find(e=>
   e.payload?.profile==='cogentia.mcp-tasks-cop-pilot/v1'&&e.payload.phase==='created'&&e.payload.toolName===TOOL)?.payload;
 function permitted(taskId,auth,operation){
   const c=creation(taskId);
   if(!c||c.owner!=='jhn:'+auth?.actor||!c.access_context)fail('unknown_task');
   const a=check(auth,c.args,operation);
   if(!a.admitted||!compareWorkCommissioningContract(c.access_context,{ok:a.ok,contract:a.access_context,contract_hash:a.contract_hash}).ok)fail('unknown_task');
   const assignment=projectPacketWorkAssignment(store,{packet_ref:packetTopicForMcpTask(taskId)});
   if(!assignment.ok||assignment.responsible_agent_ref!=='agent:jhn'||
      assignment.commissioned_by_principal_ref!=='principal:jhn'||
      assignment.history?.at(-1)?.source_ref!==c.access_context.assignment.source_ref)
     fail('unknown_task');
   return a;
 }
 const pilot=createCopMcpTasksPilot({
   store,toolName:TOOL,primaryStoreId,ownerInstanceRef,
   prepareCreation:({args,auth})=>check(auth,args,'submit'),
   handler:async (args,{taskId,auth})=>{
     const a=permitted(taskId,auth,'dispatch');
     const packetRef=packetRefForMcpTask(taskId),topic=packetTopicForMcpTask(taskId);
     const parent=createEventSourcedExecutionBudgetLedger({store,budget_id:STANDING_BUDGET_ID,require_authority_grant:true});
     const snap=parent.snapshot();
     if(Object.keys(snap.limits||{}).length!==1||!Number.isSafeInteger(snap.limits.max_steps))
       throw Error('public_work_budget_dimensions_unsupported');
     const allocation=reserveEventSourcedDelegatedBudget({store,parent_ledger:parent,
       child_budget_id:'budget:'+packetRef,child_mandate_ref:STANDING_MANDATE_REF,
       principal_ref:'principal:jhn',child_source_ref:primaryStoreId+'#'+packetRef,
       allocation:a.access_context.funding.allocation,idempotency_key:packetRef});
     if(!allocation.ok)throw Error(allocation.error||'public_work_allocation_failed');
     let governed;
     try{
       // Recheck after allocating, then use COP's existing immediate
       // pre-invoke authority check. Allocation never issues a mandate.
       permitted(taskId,auth,'dispatch');
       governed=await invokeGovernedCapability({store,ledger:allocation.child_ledger,
         identity:{principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
           mandate_ref:STANDING_MANDATE_REF,version_pin:a.request.mandate.version,topic_id:topic},
         capability:CAPABILITY,packet_id:packetRef,idempotency_key:'john-public-work:'+packetRef,
         demand:{max_steps:STEPS},input:{request_hash:a.access_context.request_hash},
         handler:{id:'handler:john-public-corpus',async invoke(){
           const result=await publicCore.callTool(TOOL,{request:a.request});
           let data;try{data=JSON.parse(result.text)}catch{}
           const used=result?.accounting?.observed_steps;
           if(result?.ok!==true||result.status!=='completed'||data?.view!=='public'||
              !Array.isArray(data.results)||data.results.length>a.request.input.arguments.limit||
              result.accounting?.tool_calls_count!==1||result.accounting?.external_effects!==0||
              result.accounting?.internal_effects!==0||result.accounting?.ithaca_returned!==true||
              !Number.isSafeInteger(used)||used<1||used>STEPS)
             throw Error('public_work_result_not_verified');
           // Return only the result of the public projection, not the
           // reasoner trace, credentials or private journal metadata.
           return {public_result:data,execution_usage:{max_steps:used}};
         }}});
     }catch(e){
       // Never release capacity for an uncertain invocation. close() only
       // settles a verified local summary with no outstanding reservations.
       const state=allocation.child_ledger.snapshot();
       if(state.reserved?.max_steps===0)allocation.close();
       throw e;
     }
     const close=allocation.close();
     if(!close.ok)throw Error('public_work_budget_reconciliation_required');
     if(!governed.ok||!governed.receipt||governed.receipt.event_ids?.length!==4||
        !governed.settlement?.ok||store.auditTopicCommitment(topic)?.ok!==true)
       throw Error('public_work_governed_result_failed');
     // Disclosure is checked independently again when the client reads it.
     return {content:[{type:'text',text:JSON.stringify({
       ok:true,view:'public',result:governed.effect.public_result,
       act_ref:governed.act_id,packet_ref:packetRef,
       accounting:{canonical_cop:true,packet_budget_id:'budget:'+packetRef,
         settled_steps:governed.effect.execution_usage.max_steps,
         parent_allocation_settled:true},
     })}],isError:false};
   },
 });
 const adapter={...pilot.adapter,
   async shouldCreate(c){return c.name===TOOL&&c.args?.request?.capability===CAPABILITY&&
     isResolvedCallerAuth(c.auth)&&c.auth.auth==='jhn'},
   async get(c){permitted(c.taskId,c.auth,'retrieve');return pilot.adapter.get(c)},
   async update(c){permitted(c.taskId,c.auth,'update');return pilot.adapter.update(c)},
   async cancel(c){permitted(c.taskId,c.auth,'cancel');return pilot.adapter.cancel(c)},
 };
 return {...pilot,adapter,async run(taskId,auth){
   permitted(taskId,auth,'dispatch');
   return pilot.run(taskId,auth);
 }};
}
