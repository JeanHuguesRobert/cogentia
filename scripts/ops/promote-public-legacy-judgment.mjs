#!/usr/bin/env node
/** Explicit, bounded promotion of an already-active PUBLIC document-role
 * continuation into the existing signed CPS JudgmentHandler. A preview is
 * read-only. --apply reserves the existing budget/PacketClaim; the resident
 * ONA worker owns eventual browser dispatch and result submission. */
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createContinuationSqliteRepository} from '../lib/continuation-sqlite-repository.mjs';
import {previewPublicLegacyJudgment,preparePublicLegacyJudgmentCps}
  from '../lib/legacy-public-judgment-cps.js';
const a=process.argv.slice(2),id=a.find(x=>x.startsWith('--id='))?.slice(5);
const apply=a.includes('--apply');
if(!id||!/^ctn_[A-Za-z0-9_-]{5,120}$/.test(id)||
   a.some(x=>x!=='--apply'&&!x.startsWith('--id='))){
  console.error('Usage: node scripts/ops/promote-public-legacy-judgment.mjs --id=ctn_... [--apply]');
  process.exitCode=2;
}else{
 const legacy=createContinuationSqliteRepository({
   registryRoot:'/srv/cogentia/repos/JeanHuguesRobert'});
 try{
  const c=legacy.load(id);
  if(!c){console.log(JSON.stringify({ok:false,status:'legacy_continuation_not_found'}));process.exitCode=1}
  else if(!apply){
   const p=previewPublicLegacyJudgment({continuation:c,
     repositoryRoot:'/srv/cogentia/repos/cogentia'});
   console.log(JSON.stringify(p.ok?{ok:true,mode:'preview',
     legacy_continuation_id:id,source_path:p.path,source_digest:p.source_digest,
     cps_child_ref:p.child_ref,prompt_length:p.question.length,
     external_effects:0}:{ok:false,status:p.status}));
   if(!p.ok)process.exitCode=1;
  }else{
   const store=createSqliteCopEventStore('/var/lib/cogentia/cop/john-root-v1.sqlite');
   try{
    const p=await preparePublicLegacyJudgmentCps({store,continuation:c,
      repositoryRoot:'/srv/cogentia/repos/cogentia'});
    console.log(JSON.stringify({...p,mode:'declaration_only',
      browser_dispatched:false,
      canonical_journal_audit:store.auditCommitments().ok}));
    if(!p.ok)process.exitCode=1;
   }finally{store.close()}
  }
 }finally{legacy.close()}
}
