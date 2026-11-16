/** Reconcile previously assigned PUBLIC legacy document judgments from the
 * canonical CPS journal into the host-local CAS continuation store. This is
 * a bounded extension of the EXISTING ONA tick, not an assignment producer,
 * background timer, generic authority grant or provider dispatcher.
 *
 * Only user-authorized, already accepted and schema-validated CPS results
 * are eligible. An LLM's bare text cannot close a continuation.
 */
import {execFileSync} from 'node:child_process';
import {createContinuationSqliteRepository} from './continuation-sqlite-repository.mjs';
import {inspectPublicLegacyJudgmentResult,settlePublicLegacyJudgment}
  from './legacy-public-judgment-settlement.js';

const ID=/^ctn_[A-Za-z0-9_-]{5,120}$/;
const DEFAULT_ROOT='/srv/cogentia/repos/JeanHuguesRobert';
const DEFAULT_SOURCE='/srv/cogentia/repos/cogentia';

export async function runResidentPublicLegacyJudgmentSettlement({store,
  registryRoot=DEFAULT_ROOT,sourceRoot=DEFAULT_SOURCE,
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
  let settled=0,reconciled=0,not_ready=0,needs_review=0;
  const findings=[];
  try{
    for(const declaration of rows){
      if(settled>=max_steps)break;
      const id=declaration.state.assignment_ref.slice(7);
      if(!ID.test(id))continue;
      // Completed authoritative receipt is sufficient to stop scanning this
      // parent.  Do not replay old work at each ONA tick.
      if(store.listTopic('continuation:'+id).some(e=>
        e.payload?.profile==='cogentia.legacy-continuation-settlement/v1'&&
        e.payload.phase==='local_resolution_confirmed'))continue;
      const continuation=local.load(id);
      if(!continuation){findings.push({id,status:'local_source_absent'});needs_review++;continue;}
      if(continuation.status==='resolved'){
        const r=await settlePublicLegacyJudgment({store,continuation,
          repositoryRoot:sourceRoot,apply:async()=>({ok:false})});
        if(r.ok){reconciled++;findings.push({id,status:'legacy_audit_reconciled'})}
        else{needs_review++;findings.push({id,status:r.status})}
        continue;
      }
      const p=inspectPublicLegacyJudgmentResult({store,continuation,
        repositoryRoot:sourceRoot});
      if(!p.ok){needs_review++;findings.push({id,status:p.status});continue;}
      if(!p.ready){not_ready++;continue;}
      const apply=resolveCli|| (async({continuation_id,payload})=>{
        const stdout=execFileSync(process.execPath,[
          'scripts/cogentia.js','continuation','resolve',continuation_id,
          '--payload-json',JSON.stringify(payload),
          '--registry',registryRoot+'/.cogentia.json','--json'],{
          cwd:sourceRoot,encoding:'utf8',timeout:20000,maxBuffer:750000});
        const response=JSON.parse(stdout);
        return {ok:response.ok===true};
      });
      let r;
      try{r=await settlePublicLegacyJudgment({store,continuation,
        repositoryRoot:sourceRoot,apply})}
      catch{r={ok:false,status:'local_cas_or_cop_reconciliation_needed'}}
      if(r.ok){settled++;findings.push({id,status:r.status})}
      else{needs_review++;findings.push({id,status:r.status})}
    }
    return {ok:true,status:'reconciled',settled,reconciled,not_ready,
      needs_review,declared_legacy_assignments:rows.length,findings,
      external_provider_effects:0};
  }finally{local.close()}
}
