/** Small, separately bounded, reviewed cohorts of PUBLIC document-role
 * judgments, assigned through the existing signed CPS worker.
 *
 * Uses the resident ONA clock, the COP journal's atomic selection-intent,
 * the signed mandate/budget PacketClaim preparer and the already-tested
 * parent/child join. NEVER infers authority from public visibility alone.
 *
 * The original Cogentia cohort is capped at TWO, and a separate reviewed
 * Barons Mariani cohort at THREE explicit paths. One unresolved CPS task at
 * a time globally. Wider disclosure needs another reviewed policy.
 */
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {createHash} from 'node:crypto';
import {projectPacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {previewPublicLegacyJudgment,preparePublicLegacyJudgmentCps}
  from './legacy-public-judgment-cps.js';
import {inspectQuarantinedBrowserDelivery} from './chatgpt-cps-delivery-quarantine.js';
import {prepareAssignedChatgptCpsContinuation}
  from './chatgpt-cps-assignment.js';

const PROFILE='cogentia.legacy-public-auto-assignment/v1';
const DEFAULT_ROOT='/srv/cogentia/repos/JeanHuguesRobert';
const DEFAULT_SOURCE='/srv/cogentia/repos/cogentia';
const PATH_COHORT=/^(?:skills\/[a-zA-Z0-9_-]+\/SKILL\.md|patterns\/[a-zA-Z0-9_-]+\/(?:PRIOR_ART|PATTERN)\.md|mcp-apps\/README\.md)$/;
// Deliberately reviewed, finite provider-disclosure policies, *not* general
// public-repo capabilities. Extend only after inspecting source content.
export const PUBLIC_COHORT_POLICIES=Object.freeze({
  cogentia:Object.freeze({id:'cogentia-public-v1',repo:'cogentia',
    root:DEFAULT_SOURCE,max:2,paths:PATH_COHORT}),
  baronsReviewed:Object.freeze({id:'barons-school-1755-public-v1',
    repo:'barons-Mariani',root:'/srv/cogentia/repos/barons-Mariani',max:3,
    paths:Object.freeze([
      'projects/school/README.md',
      'projects/school/editorial-architecture.md',
      'projects/1755/magazine/2026-10-09-une-cote-pour-la-constitution.md',
    ])}),
});
const policyFor=name=>PUBLIC_COHORT_POLICIES[name]||null;
const allowedPath=(policy,path)=>policy.paths instanceof RegExp?
  policy.paths.test(path):policy.paths.includes(path);
const cohortIntents=(store,policy)=>autoIntents(store).filter(e=>
  (e.payload.cohort_id||'cogentia-public-v1')===policy.id);
// Retain the original idempotency key and exactly two historical slots.
const KEY=(id,policy)=>'public-legacy-auto-assignment:v1:'+
  (policy.id==='cogentia-public-v1'?'':policy.id+':')+id;
const isReturn=e=>e.payload?.profile==='cop.continuation-result/v1'&&
  e.payload.phase==='returned';
const declared=store=>store.replay().filter(e=>e.payload?.profile==='cop/continuation'&&
  e.topic?.id==='continuation:'+e.payload.continuation?.continuation_id)
  .map(e=>e.payload.continuation);
const autoIntents=store=>store.replay().filter(e=>e.payload?.profile===PROFILE&&
  e.payload.phase==='selection_intent');

function outstanding(store,local,allDeclarations){
  // A browser turn can have been submitted but not returned; a browser click
  // is NOT a result. Never assign another task over an unresolved turn.
  for(const c of allDeclarations.filter(c=>c.provider==='chatgpt'&&c.channel==='browser')){
    const events=store.listTopic('continuation:'+c.continuation_id);
    const returned=events.some(isReturn);
    const quarantine=inspectQuarantinedBrowserDelivery(store,c.continuation_id);
    // An explicitly quarantined cold child holds its own uncertain outcome;
    // never re-dispatch it, but don't starve independent ready work either.
    if(quarantine.ok&&quarantine.quarantined)continue;
    const abandoned=events.some(e=>e.payload?.profile==='cop.continuation-abandonment/v1');
    if(!returned&&!abandoned)return 'browser_turn_in_flight';
    const legacyId=c.state?.assignment_ref?.startsWith('legacy:')?
      c.state.assignment_ref.slice(7):null;
    if(legacyId){
      const finished=store.listTopic('continuation:'+legacyId).some(e=>
        e.payload?.profile==='cogentia.legacy-continuation-settlement/v1'&&
        e.payload.phase==='local_resolution_confirmed');
      if(!finished){
        // If local CAS finished but COP receipt is missing, the dedicated
        // resident reconciler must repair that half-commit first.
        return 'legacy_child_not_reconciled';
      }
    }
  }
  const stale=autoIntents(store).some(e=>{
    const id=e.payload?.legacy_id;
    return !store.eventByIdempotency('continuation:'+e.payload.child_id+':declared');
  });
  if(stale)return 'selection_intent_needs_reconciliation';
  return null;
}

/** Inspection selects a candidate but creates no COP intent or model effect. */
export function inspectAutoPublicLegacyJudgment({store,localRecords=[],
  sourceRoot=null,cohort='cogentia'}={}){
  const policy=policyFor(cohort);
  if(!policy||typeof store?.replay!=='function'||!Array.isArray(localRecords))
    return {ok:false,status:'invalid_auto_assignment_inputs'};
  const root=sourceRoot||policy.root;
  const intents=cohortIntents(store,policy);
  // A full cohort is NOT necessarily a completed cohort: preserve the
  // in-flight/reconciliation status until its last child actually returns.
  const blocker=outstanding(store,null,declared(store));
  if(blocker)return {ok:true,status:blocker,total_auto_assignments:intents.length,
    eligible:0};
  if(intents.length>=policy.max)return {ok:true,status:'cohort_exhausted',
    total_auto_assignments:intents.length,eligible:0};
  // Check all existing CPS outcomes, not only the legacy subset. If a browser
  // intent was committed without a reliable receipt it must be reconciled,
  // never hidden behind a new assignment.
  const unresolved=store.replay().some(e=>{
    const p=e.payload;
    if(p?.profile!=='cop.continuation-browser-dispatch/v1'||
       p.phase!=='intent_committed')return false;
    if(store.eventByIdempotency('chatgpt-browser:'+p.continuation_id+':first-dispatch-receipt')||
       store.listTopic('continuation:'+p.continuation_id).some(isReturn))return false;
    const quarantined=inspectQuarantinedBrowserDelivery(store,p.continuation_id);
    return !(quarantined.ok&&quarantined.quarantined);
  });
  if(unresolved)return {ok:true,status:'browser_dispatch_needs_reconciliation',
    total_auto_assignments:intents.length,eligible:0};
  const candidates=localRecords.filter(x=>x.status==='active'&&
    x.kind==='index.document_role_judgment'&&x.subject?.repo===policy.repo&&
    allowedPath(policy,x.subject?.path||''))
    .sort((a,b)=>{
      const pa=policy.paths instanceof RegExp?
        (a.subject.path.startsWith('skills/')?0:1):policy.paths.indexOf(a.subject.path);
      const pb=policy.paths instanceof RegExp?
        (b.subject.path.startsWith('skills/')?0:1):policy.paths.indexOf(b.subject.path);
      return pa-pb||String(a.created_at||'').localeCompare(String(b.created_at||''))||
        String(a.id).localeCompare(String(b.id));
    });
  let skipped=0;
  for(const c of candidates){
    const p=previewPublicLegacyJudgment({continuation:c,
      repositoryRoot:root,publicRepo:policy.repo});
    if(!p.ok){skipped++;continue;}
    if(store.eventByIdempotency(KEY(c.id,policy))||
       declared(store).some(x=>x.state?.assignment_ref==='legacy:'+c.id)){skipped++;continue;}
    const temperature=projectPacketTemperature(store,{packet_ref:p.parent_ref});
    if(!temperature.ok||!temperature.runnable){skipped++;continue;}
    // Avoid carrying full private question/document text into logs/status.
    return {ok:true,status:'candidate_ready',eligible:1,skipped,
      total_auto_assignments:intents.length,legacy_id:c.id,
      source_path:p.path,source_digest:p.source_digest};
  }
  return {ok:true,status:'no_public_candidate',eligible:0,skipped,
    total_auto_assignments:intents.length};
}

/** Single admitted assignment, one at a time, with an idempotent COP selection
 * intent committed BEFORE any budget reservation. A crash at this boundary
 * fences the cohort and requires reconciliation rather than repeating effects. */
export async function autoAssignPublicLegacyJudgment({store,
  registryRoot=DEFAULT_ROOT,sourceRoot=null,localDbPath=null,
  cohort='cogentia',admit,prepare=prepareAssignedChatgptCpsContinuation,
  enabled=false}={}){
  if(!enabled)return {ok:true,status:'disabled',assigned:0};
  const policy=policyFor(cohort);
  if(!policy||typeof store?.transaction!=='function'||typeof admit!=='function'||
    typeof prepare!=='function')
    return {ok:false,status:'handler_or_source_not_configured',assigned:0};
  const root=sourceRoot||policy.root;
  const local=createContinuationSqliteRepository({registryRoot,
    ...(localDbPath?{dbPath:localDbPath}:{})});
  try{
    const records=local.list();
    const preview=inspectAutoPublicLegacyJudgment({store,localRecords:records,
      sourceRoot:root,cohort});
    if(!preview.ok||preview.status!=='candidate_ready')return {...preview,assigned:0};
    let authority;
    try{authority=await admit();}
    catch{return {ok:false,status:'governed_admission_unavailable',assigned:0}}
    if(authority?.granted!==true||authority?.provider_permitted!==true||
       authority?.budget_admitted!==true||
       typeof authority.authorization_ref!=='string'||
       typeof authority.provider_permission_receipt_ref!=='string'||
       typeof authority.budget_authorization_ref!=='string')
      return {ok:true,status:'provider_or_budget_not_admitted',assigned:0};
    // Reinspect immediately before the serialized COP selection intent.
    // One resident ONA process is the clock; transaction fences simultaneous
    // candidates/quotas from other processes sharing the same COP Store.
    const choice=store.transaction(tx=>{
      // Keep disk/git I/O outside BEGIN IMMEDIATE. The idempotent
      // preparation checks the source again after the intent.
      if(cohortIntents(tx,policy).length>=policy.max||
         tx.eventByIdempotency(KEY(preview.legacy_id,policy))||
         outstanding(tx,null,declared(tx))||
         !projectPacketTemperature(tx,{packet_ref:'continuation:'+preview.legacy_id}).runnable)
        return {status:'selection_changed',reserved:false};
      const row=records.find(x=>x.id===preview.legacy_id);
      const p={parent_ref:'continuation:'+row.id,
        child_ref:'continuation:ctn_chatgpt_browser_'+
          createHash('sha256').update('legacy:'+row.id).digest('hex').slice(0,32),
        source_digest:preview.source_digest,path:preview.source_path};
      const receipt=tx.append({topic_id:p.parent_ref,event_type:'cop.event/v1',
        actor_id:'cop:ona-public-auto-assignment',subject_ref:p.parent_ref,
        visibility:'restricted',epistemic_status:'decided',
        idempotency_key:KEY(row.id,policy),
        causal_refs:[authority.authorization_ref,
          authority.provider_permission_receipt_ref,
          authority.budget_authorization_ref],
        payload:{profile:PROFILE,phase:'selection_intent',legacy_id:row.id,
          child_id:p.child_ref.slice('continuation:'.length),
          source_digest:p.source_digest,source_path:p.path,
          public_repo:policy.repo,cohort_id:policy.id,max_cohort:policy.max},
      });
      return {status:receipt.ok?'reserved':'intent_not_committed',
        reserved:receipt.ok};
    });
    if(!choice.ok||!choice.value?.reserved)return {ok:false,
      status:choice.value?.status||'selection_claim_failed',assigned:0};
    const selected=records.find(x=>x.id===preview.legacy_id);
    let result;
    try{result=await preparePublicLegacyJudgmentCps({store,
      continuation:selected,repositoryRoot:root,publicRepo:policy.repo,prepare});}
    catch{return {ok:false,status:'assignment_needs_reconciliation',assigned:0}}
    return result.ok?{ok:true,status:'assigned_pending_judgment',assigned:1,
      legacy_id:selected.id,cps_child_id:result.cps_continuation_id,
      declaration_receipt_ref:result.child_receipt_ref}:
      {ok:false,status:'assignment_needs_reconciliation',
        reason:result.status||'prepare_failed',assigned:0};
  }finally{local.close()}
}
