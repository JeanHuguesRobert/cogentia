#!/usr/bin/env node
/**
 * Opt-in, NO BROWSER EFFECT, existing Operium Node Agent script-job adapter.
 * Replays committed result wakes after MCP host crash, not ChatGPT outputs.
 * The resident ONA schedule is the only timer; no second scheduler created.
 */
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {reconcilePacketParentContinuations} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {createOfflineJohnIssuerVerifier} from '../lib/john-offline-issuer-verifier.js';
import {createChatgptCpsLocalWakeReconciler} from '../lib/chatgpt-cps-return-evaluator.js';
import {listAssignedChatgptCpsContinuations,runAssignedChatgptCpsBatch} from '../lib/chatgpt-cps-assigned-dispatch.js';
import {listChatgptCpsNextSteps,runChatgptCpsNextStepBatch} from '../lib/chatgpt-cps-next-step.js';
import {createCpsDefaultAssignedWorker,createCpsDefaultNextWorker} from '../lib/chatgpt-cps-default-worker.js';
import {inspectHostProductionWorkFrontier} from '../lib/production-work-frontier.js';

const DB='/var/lib/cogentia/cop/john-root-v1.sqlite';
const FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const MANDATE='mandate:jhn:john-root';
const BUDGET='budget:'+MANDATE;
/** The SQLite statement owner must outlive awaited COPScheduler handlers. */
export async function withOwnedCpsStore(store,work){
  try{return await work(store)}finally{store.close()}
}
export async function runScheduledHeartbeat({env=process.env,assignedWorker=null,nextWorker=null}={}){
  if(env.COGENTIA_CPS_WAKE_RECOVERY_ENABLED!=='1')
    return {ok:true,skipped:'not_enabled',external_effects:0};
  const publicKeyFile=env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS;
  if(!publicKeyFile||typeof publicKeyFile!=='string')
    return {ok:false,error:'trusted_issuer_not_configured'};
  let key;
  try{
    if(realpathSync(DB)!==DB||!statSync(DB).isFile())
      return {ok:false,error:'canonical_store_untrusted'};
    key=readFileSync(publicKeyFile,'utf8').split('\n').find(x=>{
      try{return sshFingerprint(x)===FP}catch{return false}
    });
  }catch{return {ok:false,error:'canonical_store_or_issuer_unavailable'}}
  if(!key)return {ok:false,error:'trusted_issuer_key_missing'};
  return withOwnedCpsStore(createSqliteCopEventStore(DB),async(store)=>{
    const verifyIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,
      expectedSshFingerprint:FP});
    const reconcile=createChatgptCpsLocalWakeReconciler({store,
      mandate_ref:MANDATE,budget_id:BUDGET,verifyIssuer});
    const configuredWorker=assignedWorker||createCpsDefaultAssignedWorker({store,
      env,verifyIssuer});
    const configuredNext=nextWorker||createCpsDefaultNextWorker({store,
      assignedWorker:configuredWorker});
    // Await while the canonical SQLite store is still open; otherwise the
    // enclosing finally closes prepared statements during async COP replay.
    const result=await runChatgptCpsResidentCycle({store,
      reconcile,env,assignedWorker:configuredWorker,nextWorker:configuredNext});
    // The resident ONA job now inspects BOTH real continuation stores on
    // every cycle.  This is a read-only production discovery bridge, not a
    // second dispatcher: the specialized CPS queue keeps sole ownership of
    // its existing browser/MCP continuations and generic pull stays fenced
    // until concrete handler and mandate/budget adapters are configured.
    if(env.COGENTIA_COP_WORK_FRONTIER_ENABLED==='0')return result;
    try{
      const frontier=inspectHostProductionWorkFrontier({store,
        registryRoot:env.COGENTIA_WORK_FRONTIER_REGISTRY_ROOT||
          '/srv/cogentia/repos/JeanHuguesRobert'});
      const metrics=frontier.ok
        ?`COP frontier: local_active=${frontier.local.active}; `+
          `missing_handler_contract=${frontier.local.requiring_contract}; `+
          `generic_candidate=${frontier.local.candidates_needing_admission}; `+
          `cps_pending=${frontier.cop.specialized_cps_ready}; `+
          `reconciliation=${frontier.cop.needs_reconciliation}`
        :`COP frontier observer: ${frontier.status}`;
      return {...result,work_frontier:frontier,
        detail:result.detail?result.detail+'; '+metrics:metrics};
    }catch{
      // Observability must not invalidate valid CPS effect receipts.  The
      // failure is explicit and cannot be mistaken for an empty queue.
      return {...result,work_frontier:{ok:false,status:'frontier_projection_failed',
        external_effects:0}};
    }
  });
}

/** Existing ONA scheduler is the sole clock. Test this entire decision
 * cycle against a disposable COP store without production tokens or effects.
 */
export async function runChatgptCpsResidentCycle({store,reconcile,env={},
  assignedWorker=null,nextWorker=null,parentJoinExecutor=null}={}){
  if(!store||typeof reconcile!=='function')return {ok:false,status:'invalid_cycle'};
  const result=await reconcile({max_steps:6});
  // Distributed Promise bridge: existing ONA poll reconciles child state
  // transitions into the linked parent's durable COP topic. No second
  // scheduler and no invented LLM completion. A registered join can resume
  // through an explicitly configured existing COPScheduler handler.
  const parentResults=await reconcilePacketParentContinuations(store,{
    execute:parentJoinExecutor,max_parents:50,max_child_events:100});
  const assigned=listAssignedChatgptCpsContinuations(store,{limit:100});
  const next=listChatgptCpsNextSteps(store,{limit:100});
  const overview={pending_assigned:assigned.filter(x=>x.status==='ready').length,
    assigned_needs_reconciliation:assigned.filter(x=>x.status==='needs_reconciliation').length,
    pending_next_actions:next.filter(x=>x.status==='pending_admission').length,
    next_needs_reconciliation:next.filter(x=>x.status==='needs_reconciliation').length};
  const common={steps_completed:result.steps_completed,
    parent_notifications:parentResults.notified,
    parent_join_resumptions:parentResults.resumed,
    parent_join_waiting:parentResults.waiting,
    pending_count:result.pending_count,
    needs_reconciliation:result.needs_reconciliation,
    external_effects:0,parent_packet_completed:false,...overview};
  if(!parentResults.ok)return {ok:false,status:'parent_join_reconciliation_failed',...common,
    parent_reconciliation_status:parentResults.status,
    autonomous_browser_worker:false};
  if(!result.ok)return {ok:false,status:result.status,...common,
    autonomous_browser_worker:false};
  if(env.COGENTIA_CPS_BROWSER_DISPATCH_ENABLED!=='1')
    return {ok:true,status:result.status,...common,
      autonomous_browser_worker:false};
  if(overview.assigned_needs_reconciliation||overview.next_needs_reconciliation)
    return {ok:false,status:'dispatch_needs_reconciliation',...common,
      autonomous_browser_worker:false};
  let steps=result.steps_completed;
  if(overview.pending_assigned){
    if(typeof assignedWorker?.admit!=='function'||
       typeof assignedWorker?.dispatch!=='function')
      return {ok:false,status:'governed_browser_dispatcher_not_configured',
        ...common,autonomous_browser_worker:false};
    const dispatched=await runAssignedChatgptCpsBatch({store,
      admit:assignedWorker.admit,dispatch:assignedWorker.dispatch,max_steps:3});
    steps+=dispatched.steps_completed;
    if(!dispatched.ok)return {ok:false,status:dispatched.status,
      ...common,steps_completed:steps,autonomous_browser_worker:true};
  }
  if(overview.pending_next_actions){
    if(typeof nextWorker?.admit!=='function'||typeof nextWorker?.dispatch!=='function')
      return {ok:false,status:'governed_next_step_dispatcher_not_configured',
        ...common,steps_completed:steps,autonomous_browser_worker:false};
    const continued=await runChatgptCpsNextStepBatch({store,
      admit:nextWorker.admit,dispatch:nextWorker.dispatch,
      verifyDispatchReceipt:nextWorker.verifyDispatchReceipt,max_steps:3});
    steps+=continued.steps_completed;
    if(!continued.ok)return {ok:false,status:continued.status,
      ...common,steps_completed:steps,autonomous_browser_worker:true};
  }
  const assignedAfter=listAssignedChatgptCpsContinuations(store,{limit:100});
  const nextAfter=listChatgptCpsNextSteps(store,{limit:100});
  return {ok:true,status:steps>result.steps_completed?'dispatched_awaiting_return':result.status,
    ...common,steps_completed:steps,
    pending_assigned:assignedAfter.filter(x=>x.status==='ready').length,
    assigned_needs_reconciliation:assignedAfter.filter(x=>x.status==='needs_reconciliation').length,
    pending_next_actions:nextAfter.filter(x=>x.status==='pending_admission').length,
    next_needs_reconciliation:nextAfter.filter(x=>x.status==='needs_reconciliation').length,
    autonomous_browser_worker:Boolean(overview.pending_assigned||overview.pending_next_actions)};
}

if(process.argv[1]&&import.meta.url===new URL('file:'+process.argv[1]).href){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--frontier'){
    // Read-only local control-plane inspection, with no issuer replay or
    // background dispatch. Only aggregate counts are emitted.
    const store=createSqliteCopEventStore(DB);
    try{console.log(JSON.stringify(inspectHostProductionWorkFrontier({store,
      registryRoot:process.env.COGENTIA_WORK_FRONTIER_REGISTRY_ROOT||
        '/srv/cogentia/repos/JeanHuguesRobert'})));}
    finally{store.close()}
  }else if(args.length===1&&args[0]==='--status'){
    const {listChatgptCpsWakes}=await import('../lib/chatgpt-cps-wake-consumer.js');
    const store=createSqliteCopEventStore(DB);
    try{console.log(JSON.stringify({mode:'read_only',
      pending:listChatgptCpsWakes(store,{limit:25}),
      assigned:listAssignedChatgptCpsContinuations(store,{limit:25}),
      next_actions:listChatgptCpsNextSteps(store,{limit:25})}));}
    finally{store.close()}
  }else if(args.length===1&&args[0]==='--run-once'){
    const result=await runScheduledHeartbeat();
    console.log(JSON.stringify(result));
    if(!result.ok)process.exitCode=1;
  }else{
    console.error('Use --frontier, --status or --run-once (opt-in only; no browser actions)');
    process.exitCode=2;
  }
}
