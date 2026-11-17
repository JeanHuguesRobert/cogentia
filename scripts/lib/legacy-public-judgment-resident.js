/** Reconcile previously assigned PUBLIC legacy document judgments from the
 * canonical CPS journal into the host-local CAS continuation store. This is
 * a bounded extension of the EXISTING ONA tick, not an assignment producer,
 * background timer, generic authority grant or provider dispatcher.
 *
 * Only user-authorized, already accepted and schema-validated CPS results
 * are eligible. An LLM's bare text cannot close a continuation.
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {inspectPublicLegacyJudgmentResult,settlePublicLegacyJudgment}
  from './legacy-public-judgment-settlement.js';

const ID=/^ctn_[A-Za-z0-9_-]{5,120}$/;
const DEFAULT_ROOT='/srv/cogentia/repos/JeanHuguesRobert';
const DEFAULT_SOURCE='/srv/cogentia/repos/cogentia';
const BARONS_SOURCE='/srv/cogentia/repos/barons-Mariani';
const publicSourceFor=(continuation,sourceRoot,baronsSourceRoot)=>{
  const repo=continuation?.subject?.repo;
  if(repo==='cogentia')return {repositoryRoot:sourceRoot,publicRepo:repo};
  if(repo==='barons-Mariani')return {repositoryRoot:baronsSourceRoot,publicRepo:repo};
  return null;
};

/**
 * Read-only proof: observed local SQLite CAS + SHA256 memo + return receipt.
 * Used by the resident and by audited late backfill of accepted COP results.
 */
export function inspectLocalPublicIndexReentry(local,{continuation_id}={}){
  const current=local.load(continuation_id);
  const state=current?.resolution?.return_state;
  if(current?.status!=='resolved'||state?.resumed!==true||
     state?.delivered!==true)
    return {ok:false,status:'local_reentry_pending'};
  const expected='continuation:'+continuation_id+'/slot:reentry:public-document-index';
  if(state.output_artifact_ref!==expected)
    return {ok:false,status:'local_reentry_artifact_mismatch'};
  const slot=local.snapshot(continuation_id)?.slots?.find(s=>
    s.slot==='reentry:public-document-index');
  if(!slot?.result||slot.result.continuation_id!==continuation_id||
     slot.result.source_sha256!==current.context?.source_sha256)
    return {ok:false,status:'local_reentry_slot_invalid'};
  const digest=createHash('sha256').update(JSON.stringify(slot.result)).digest('hex');
  const receipt_ref=expected+'#sha256:'+digest;
  if(state.resume_receipt_ref!==receipt_ref)
    return {ok:false,status:'local_reentry_receipt_mismatch'};
  return {ok:true,artifact_ref:expected,receipt_ref};
}

export async function runResidentPublicLegacyJudgmentSettlement({store,
  registryRoot=DEFAULT_ROOT,sourceRoot=DEFAULT_SOURCE,
  baronsSourceRoot=BARONS_SOURCE,
  localDbPath=null,max_steps=1,resolveCli=null}={}){
  if(typeof store?.replay!=='function'||!Number.isSafeInteger(max_steps)||
     max_steps<1||max_steps>3||
     (resolveCli!==null&&typeof resolveCli!=='function'))
    return {ok:false,status:'invalid_settlement_cycle'};
  // An explicit CPS declaration with assignment_ref=legacy:ID is required.
  // No local legacy record is promoted or scheduled by this reconciler.
  const rows=store.replay().filter(e=>e.payload?.profile==='cop/continuation')
    .map(e=>e.payload.continuation).filter(c=>
      c?.provider==='chatgpt'&&c?.channel==='browser'&&
      typeof c?.state?.assignment_ref==='string'&&
      /^legacy:ctn_[A-Za-z0-9_-]{5,120}$/.test(c.state.assignment_ref));
  const local=createContinuationSqliteRepository({registryRoot,
    ...(localDbPath?{dbPath:localDbPath}:{})});
  // The same verifier is also used for COP acceptance repair of previously
  // settled legacy continuations, without adding another local store.
  const verifyLocalReentry=args=>inspectLocalPublicIndexReentry(local,args);
  const cliResolver=resolveCli|| (async({continuation_id,payload})=>{
    const stdout=execFileSync(process.execPath,[
      'scripts/cogentia.js','continuation','resolve',continuation_id,
      '--payload-json',JSON.stringify(payload),
      '--registry',registryRoot+'/.cogentia.json','--json'],{
      cwd:DEFAULT_SOURCE,encoding:'utf8',timeout:20000,maxBuffer:750000});
    const response=JSON.parse(stdout);
    return {ok:response.ok===true,reentry:response.reentry||null};
  });
  let settled=0,reconciled=0,not_ready=0,needs_review=0;
  const findings=[];
  try{
    for(const declaration of rows){
      if(settled>=max_steps)break;
      const id=declaration.state.assignment_ref.slice(7);
      if(!ID.test(id))continue;
      const confirmation=store.listTopic('continuation:'+id).find(e=>
        e.payload?.profile==='cogentia.legacy-continuation-settlement/v1'&&
        e.payload.phase==='local_resolution_confirmed');
      const continuation=local.load(id);
      // An old COP acknowledgment without a local resume receipt must not
      // mask a stranded post-Judgment computation.
      if(confirmation){
        if(continuation?.resumption_target?.kind==='handler'){
          const proof=verifyLocalReentry({continuation_id:id});
          const recovered=store.listTopic('continuation:'+id).find(e=>
            e.payload?.profile===
              'cogentia.legacy-public-index-reentry-backfill/v1'&&
            e.payload?.phase==='local_reentry_verified'&&
            e.payload?.original_cop_settlement_ref===confirmation.idempotency_key&&
            e.payload?.source_return_receipt_ref===
              confirmation.payload.source_return_receipt_ref&&
            e.payload?.local_resume_receipt_ref===proof.receipt_ref&&
            e.payload?.local_output_artifact_ref===proof.artifact_ref);
          if(!proof.ok||
             (confirmation.payload.local_work_status!=='resumed'&&!recovered)){
            needs_review++;findings.push({id,status:'cop_confirmation_without_verified_reentry'});
          }
        }
        continue;
      }
      if(!continuation){findings.push({id,status:'local_source_absent'});needs_review++;continue;}
      const source=publicSourceFor(continuation,sourceRoot,baronsSourceRoot);
      if(!source){findings.push({id,status:'unapproved_public_source_repo'});needs_review++;continue;}
      if(continuation.status==='resolved'){
        if(continuation.resumption_target?.kind==='handler'&&
           continuation.resolution?.return_state?.resumed!==true){
          // A crash after local CAS but before the handler ran is recoverable.
          // Re-check the ORIGINAL accepted COP result before returning to
          // work: an untrusted locally-resolved row cannot trigger a handler.
          const ready=inspectPublicLegacyJudgmentResult({store,
            continuation:{...continuation,status:'active'},...source});
          if(!ready.ok||!ready.ready||
             ready.decision!==continuation.resolution?.decision||
             ready.reason!==continuation.resolution?.reason||
             ready.cps_return_receipt_ref!==
               continuation.resolution?.payload?.cps_return_receipt_ref||
             ready.source_digest!==continuation.resolution?.payload?.source_digest){
            needs_review++;findings.push({id,
              status:'pending_reentry_cop_admission_not_reverified'});
            continue;
          }
          try{
            const retried=await cliResolver({continuation_id:id,
              payload:continuation.resolution.payload});
            if(retried?.ok!==true){
              needs_review++;findings.push({id,status:'local_reentry_retry_failed'});
              continue;
            }
          }catch{
            needs_review++;findings.push({id,status:'local_reentry_retry_failed'});
            continue;
          }
        }
        const refreshed=local.load(id);
        const r=await settlePublicLegacyJudgment({store,continuation:refreshed,
          ...source,verifyLocalReentry,apply:async()=>({ok:false})});
        if(r.ok){reconciled++;findings.push({id,status:'legacy_audit_reconciled'})}
        else{needs_review++;findings.push({id,status:r.status})}
        continue;
      }
      const p=inspectPublicLegacyJudgmentResult({store,continuation,
        ...source});
      if(!p.ok){needs_review++;findings.push({id,status:p.status});continue;}
      if(!p.ready){not_ready++;continue;}
      const apply=cliResolver;
      let r;
      try{r=await settlePublicLegacyJudgment({store,continuation,
        ...source,verifyLocalReentry,apply})}
      catch{r={ok:false,status:'local_cas_or_cop_reconciliation_needed'}}
      if(r.ok){settled++;findings.push({id,status:r.status})}
      else{needs_review++;findings.push({id,status:r.status})}
    }
    return {ok:true,status:'reconciled',settled,reconciled,not_ready,
      needs_review,declared_legacy_assignments:rows.length,findings,
      external_provider_effects:0};
  }finally{local.close()}
}
