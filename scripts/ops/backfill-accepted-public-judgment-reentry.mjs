#!/usr/bin/env node
/**
 * Narrow, opt-in owner-authorized maintenance: reattach the already existing
 * public index handler to ONE previously COP-accepted and locally resolved
 * legacy Judgment. No model call, GitHub write, resend or mandate amendment.
 *
 * --preview is strictly read-only. --apply observes a real local CLI reentry,
 * then publishes an addendum COP receipt without rewriting old history.
 */
import {execFileSync} from 'node:child_process';
import {createSqliteCopEventStore}
  from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createContinuationSqliteRepository}
  from '../lib/continuation-sqlite-repository.mjs';
import {inspectAcceptedLegacyPublicIndex,bindAcceptedLegacyPublicIndex,
  recordAcceptedLegacyPublicReentry}
  from '../lib/legacy-public-index-reentry-backfill.mjs';

const DB='/var/lib/cogentia/cop/john-root-v1.sqlite';
const ROOT='/srv/cogentia/repos/JeanHuguesRobert';
const REGISTRY=ROOT+'/.cogentia.json';
const argv=process.argv.slice(2);
const id=argv.find(x=>/^--id=ctn_[A-Za-z0-9_-]{5,120}$/.test(x))?.slice(5);
const apply=argv.includes('--apply');
if(!id||argv.some(x=>x!=='--apply'&&x!=='--preview'&&!x.startsWith('--id='))||
   (apply&&argv.includes('--preview'))){
 console.error('Usage: --id=ctn_... [--preview (default) | --apply]');
 process.exitCode=2;
}else{
 const store=createSqliteCopEventStore(DB);
 const local=createContinuationSqliteRepository({registryRoot:ROOT});
 try{
  const p=apply?bindAcceptedLegacyPublicIndex({store,local,continuation_id:id}):
   inspectAcceptedLegacyPublicIndex({store,local,continuation_id:id});
  if(!p.ok){
   console.log(JSON.stringify({ok:false,status:p.status,mode:apply?'apply':'preview'}));
   process.exitCode=1;
  }else if(!apply){
   console.log(JSON.stringify({ok:true,status:p.status,mode:'preview',
    continuation_id:id,source_digest:p.source_digest,
    original_cop_settlement_ref:p.original_cop_settlement_ref,
    current_local_resumed:p.local_work_resumed,provider_effects:0}));
  }else{
   let outcome;
   try{
    const raw=execFileSync(process.execPath,['scripts/cogentia.js',
      'continuation','reenter',id,'--registry',REGISTRY,'--json'],{
       cwd:'/srv/cogentia/repos/cogentia',encoding:'utf8',
       timeout:30000,maxBuffer:800000});
    outcome=JSON.parse(raw);
   }catch{outcome={ok:false}}
   if(outcome.ok!==true||!['resumed','already_resumed'].includes(outcome.reentry?.status)){
    console.log(JSON.stringify({ok:false,mode:'apply',
      status:'local_handler_reentry_needs_recovery',
      contract_bound:p.status==='bound_ready_for_reentry'}));
    process.exitCode=1;
   }else{
    const receipt=recordAcceptedLegacyPublicReentry({store,local,continuation_id:id});
    console.log(JSON.stringify({ok:receipt.ok,mode:'apply',
      status:receipt.status,continuation_id:id,
      provider_effects:0,handler_status:outcome.reentry.status,
      chunk_count:outcome.reentry.artifact?.chunk_count??null,
      local_artifact_ref:receipt.artifact_ref||null,
      cop_reentry_receipt_ref:receipt.receipt_ref||null,
      fractalog_receipt_ref:receipt.fractalog_receipt_ref||null,
      journal_audit:store.auditCommitments().ok}));
    if(!receipt.ok)process.exitCode=1;
   }
  }
 }finally{local.close();store.close()}
}
