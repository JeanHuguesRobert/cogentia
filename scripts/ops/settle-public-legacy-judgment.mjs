#!/usr/bin/env node
/** Existing Cogentia continuation resolve CLI is the ONLY local state writer;
 * this adapter first validates the signed-CPS evidence and schema. */
import {execFileSync} from 'node:child_process';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createContinuationSqliteRepository} from '../lib/continuation-sqlite-repository.mjs';
import {inspectPublicLegacyJudgmentResult,settlePublicLegacyJudgment}
  from '../lib/legacy-public-judgment-settlement.js';
const args=process.argv.slice(2),id=args.find(x=>x.startsWith('--id='))?.slice(5);
const apply=args.includes('--apply');
const registry='/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json';
const sourceRootFor=c=>c?.subject?.repo==='barons-Mariani'
  ?{repositoryRoot:'/srv/cogentia/repos/barons-Mariani',publicRepo:'barons-Mariani'}
  :c?.subject?.repo==='cogentia'
    ?{repositoryRoot:'/srv/cogentia/repos/cogentia',publicRepo:'cogentia'}
    :null;
const commandRoot='/srv/cogentia/repos/cogentia';
if(!id||!/^ctn_[A-Za-z0-9_-]{5,120}$/.test(id)||
    args.some(x=>x!=='--apply'&&!x.startsWith('--id='))){
  console.error('Usage: node scripts/ops/settle-public-legacy-judgment.mjs --id=ctn_... [--apply]');
  process.exitCode=2;
}else{
 const local=createContinuationSqliteRepository({registryRoot:'/srv/cogentia/repos/JeanHuguesRobert'});
 const store=createSqliteCopEventStore('/var/lib/cogentia/cop/john-root-v1.sqlite');
 try{
  const continuation=local.load(id);
  if(!continuation){console.log(JSON.stringify({ok:false,status:'legacy_not_found'}));process.exitCode=1;}
  else if(!sourceRootFor(continuation)){
    console.log(JSON.stringify({ok:false,status:'unapproved_source_repo'}));process.exitCode=1;
  }else if(!apply){
   const p=inspectPublicLegacyJudgmentResult({store,continuation,
     ...sourceRootFor(continuation)});
   // No full model response is printed by default; only the decision.
   console.log(JSON.stringify({ok:p.ok,status:p.status,ready:!!p.ready,
     continuation_id:id,decision:p.decision||null}));
   if(!p.ok)process.exitCode=1;
  }else{
   const result=await settlePublicLegacyJudgment({store,continuation,
    ...sourceRootFor(continuation),
    apply:async({continuation_id,payload})=>{
     const stdout=execFileSync(process.execPath,[
       'scripts/cogentia.js','continuation','resolve',continuation_id,
       '--payload-json',JSON.stringify(payload),'--registry',registry,'--json'],
       {cwd:commandRoot,encoding:'utf8',timeout:20000,maxBuffer:750000});
     const parsed=JSON.parse(stdout);return {ok:parsed.ok===true};
    }});
   console.log(JSON.stringify({...result,mode:'governed_legacy_cas',
     journal_audit:store.auditCommitments().ok}));
   if(!result.ok)process.exitCode=1;
  }
 }finally{store.close();local.close()}
}
