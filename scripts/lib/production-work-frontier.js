/**
 * Read-only *production* projection of Cogentia's two existing continuation
 * stores. No synthetic work orders, no migration, no new scheduler, and no
 * guessed authorization. A record marked 'active' is not yet runnable.
 *
 * The authoritative CPS browser/return frontier is already serviced by the
 * resident ONA job; this adds cross-store discovery with an honest readiness
 * classification for the generic FractaScheduler pull adapter.
 */
import {existsSync} from 'node:fs';
import {projectPacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {listAssignedChatgptCpsContinuations} from './chatgpt-cps-assigned-dispatch.js';
import {listChatgptCpsWakes} from './chatgpt-cps-wake-consumer.js';
import {listChatgptCpsNextSteps} from './chatgpt-cps-next-step.js';
import {createContinuationSqliteRepository,continuationDatabasePath} from './continuation-sqlite-repository.mjs';

const counts=(items,key)=>{const field=typeof key==='function'?key:x=>x[key];
  return Object.fromEntries([...new Set(items.map(field))].sort().map(k=>
    [k,items.filter(x=>field(x)===k).length]));};
const isId=x=>typeof x==='string'&&/^ctn_[a-zA-Z0-9_-]{4,160}$/.test(x);
const packetRef=x=>typeof x==='string'&&/^(packet|continuation):[A-Za-z0-9_.:-]+$/.test(x);
const hasExplicitHandler=x=>typeof (x.resumeTo||x.resume_to)==='string'&&
  (x.resumeTo||x.resume_to).trim().length>0;
const caps=x=>Array.isArray(x.required_capabilities)?x.required_capabilities:
  x.required_capability?[x.required_capability]:[];

function classifyLocal(row,store){
  if(row.status!=='active')return {state:'not_active',runnable:false};
  const id=row.continuation_id||row.id;
  if(!isId(id))return {state:'invalid_identity',runnable:false};
  // Continuation instructions for a human judgment (`continuation resolve
  // <result.json>`) are not executable handler entrypoints.
  if(!hasExplicitHandler(row))return {state:'no_executable_handler_contract',runnable:false};
  if(!caps(row).length)return {state:'no_required_capabilities',runnable:false};
  const sourceRef=row.packet_ref||row.packetRef||row.context?.packet_ref;
  if(!packetRef(sourceRef))return {state:'no_canonical_packet_ref',runnable:false};
  const related=[sourceRef,'continuation:'+id];
  for(const ref of new Set(related)){
    const t=projectPacketTemperature(store,{packet_ref:ref});
    if(!t.ok||!t.runnable)return {state:'temperature_blocked',runnable:false};
  }
  // Never call this executable on the basis of metadata only. A live
  // resolver, current mandate, budget, provider, and claim are prerequisites
  // established by the actual pull path at dispatch, not at discovery.
  return {state:'requires_live_handler_and_mandate_admission',runnable:false,
    placement_candidate:true};
}

/** No private questions, prompts, secrets or arbitrary handler parameters are
 * returned. Only counts and boundaries, safe for status/ONA logs. */
export function projectProductionWorkFrontier({store,localRecords=[]}={}){
  if(typeof store?.replay!=='function'||!Array.isArray(localRecords))
    return {ok:false,status:'invalid_frontier_input'};
  const local=localRecords.map(row=>({kind:row.kind||'unknown',...classifyLocal(row,store)}));
  const canonical=store.replay().filter(e=>e.payload?.profile==='cop/continuation')
    .filter(e=>e.topic?.id==='continuation:'+e.payload.continuation?.continuation_id);
  const assigned=listAssignedChatgptCpsContinuations(store,{limit:100});
  const wakes=listChatgptCpsWakes(store,{limit:100});
  const next=listChatgptCpsNextSteps(store,{limit:100});
  const assignedReady=assigned.filter(c=>c.status==='ready'||
    c.status==='pre_submit_recovery_ready');
  const wakeReady=wakes.filter(c=>c.status==='pending');
  const nextReady=next.filter(c=>c.status==='pending_admission');
  const unsafe=assigned.filter(c=>c.status==='needs_reconciliation').length+
    wakes.filter(c=>c.status==='needs_reconciliation').length+
    next.filter(c=>c.status==='needs_reconciliation').length;
  return {ok:true,profile:'cogentia.production-work-frontier/v1',read_only:true,
    local:{total:localRecords.length,active:local.filter(x=>x.state!=='not_active').length,
      by_kind:counts(local,'kind'),by_blocker:counts(local,'state'),
      requiring_contract:local.filter(x=>x.state==='no_executable_handler_contract').length,
      candidates_needing_admission:local.filter(x=>x.placement_candidate).length},
    cop:{declared:canonical.length,assigned_ready:assignedReady.length,
      result_wakes_ready:wakeReady.length,next_steps_ready:nextReady.length,
      needs_reconciliation:unsafe,
      parked_uncertain_deliveries:assigned.filter(c=>c.status==='parked').length,
      // Existing specialized, independently governed CPS worker owns these
      // queues. Never dispatch a second time via generic work pull.
      specialized_cps_ready:assignedReady.length+wakeReady.length+nextReady.length},
    generic_runnable:0, // intentionally zero without real per-effect admission
    external_effects:0,
    production_gate:'generic_pull_requires_live_handler_mandate_budget_and_provider_receipt'};
}

export function inspectHostProductionWorkFrontier({store,
  registryRoot='/srv/cogentia/repos/JeanHuguesRobert'}={}){
  if(!existsSync(continuationDatabasePath(registryRoot)))
    return {ok:false,status:'host_local_continuation_store_missing',read_only:true};
  const local=createContinuationSqliteRepository({registryRoot});
  try{return projectProductionWorkFrontier({store,localRecords:local.list()});}
  finally{local.close()}
}
