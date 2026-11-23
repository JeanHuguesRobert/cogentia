// Packet: Cogentia #344. Persistent, low-frequency fleet checks.
// The Sleep Cycle itself keeps its original 2-hour schedule.
import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const DEFAULT_REPO_SYNC_INTERVAL_MS = 24 * 3600 * 1000;
const FAILED_RETRY_MS = 2 * 3600 * 1000;
export function defaultRepoSyncCadenceFile(){
 return path.join(process.env.XDG_STATE_HOME||path.join(homedir(),'.local','state'),'cogentia','repo-sync-cadence.json');
}
export function repoSyncCadenceDecision(state,{now=Date.now(),scope='all',includePrivate=false,
 intervalMs=DEFAULT_REPO_SYNC_INTERVAL_MS,force=false}={}){
 if(force||intervalMs===0)return {due:true,reason:'explicit'};
 if(!Number.isSafeInteger(intervalMs)||intervalMs<0)throw Error('INVALID_REPO_SYNC_INTERVAL');
 if(!state||state.schema!=='cogentia.repo_sync_cadence.v1'||
    state.scope!==scope||state.include_private!==includePrivate)
  return {due:true,reason:'no_matching_receipt'};
 const stamp=Date.parse(state.checked_at||'');
 if(!Number.isFinite(stamp)||stamp>now)return {due:true,reason:'invalid_timestamp'};
 const retry=state.status==='failed'||state.status==='completed_with_errors';
 const next=stamp+(retry?Math.min(intervalMs,FAILED_RETRY_MS):intervalMs);
 if(now>=next)return {due:true,reason:'interval_elapsed'};
 return {due:false,reason:'cadence',next_due_at:new Date(next).toISOString()};
}
export async function cadencedRepoSync({
 run,now=Date.now(),scope='all',includePrivate=false,intervalMs=DEFAULT_REPO_SYNC_INTERVAL_MS,
 stateFile=defaultRepoSyncCadenceFile(),force=false
}={}){
 if(typeof run!=='function')throw Error('REPO_SYNC_RUN_REQUIRED');
 let old=null;
 try {old=JSON.parse(await readFile(stateFile,'utf8'))} catch(e){if(e.code!=='ENOENT' && !(e instanceof SyntaxError))throw e}
 const decision=repoSyncCadenceDecision(old,{now,scope,includePrivate,intervalMs,force});
 if(!decision.due){
  return {
   status:'deferred_by_cadence',error:null,
   evidence:{
    schema:'cogentia.repo_sync_cadence.v1',
    checked_at:old.checked_at,
    next_due_at:decision.next_due_at,
    last_status:old.status,
    cached:true,
    summary:old.summary||null,
    health:old.health||{status:'ok',blocked_count:0,blocked:[]}
   }
  };
 }
 const result=await run();
 // Only store redacted status and counters: no private paths, credentials,
 // remote URLs, raw Git stdout/stderr or files from the worktree.
 const safeHealth={
  status:result.evidence?.health?.status||'unknown',
  blocked_count:Number.isSafeInteger(result.evidence?.health?.blocked_count)?result.evidence.health.blocked_count:0,
  blocked:(result.evidence?.health?.blocked||[]).map(x=>({
   repo:x.repo,status:x.status,
   ahead:Number.isInteger(x.ahead)?x.ahead:null,
   behind:Number.isInteger(x.behind)?x.behind:null
  }))
 };
 const s=result.evidence?.summary||{};
 const safeSummary=Object.fromEntries(['repos','ok','dirty','skipped','failed']
   .filter(k=>Number.isInteger(s[k])).map(k=>[k,s[k]]));
 const receipt={
  schema:'cogentia.repo_sync_cadence.v1',
  checked_at:new Date(now).toISOString(),
  scope,include_private:includePrivate,
  status:result.status,
  health:safeHealth,summary:safeSummary
 };
 await mkdir(path.dirname(stateFile),{recursive:true,mode:0o700});
 const temp=stateFile+'.'+randomUUID()+'.tmp';
 try{
  await writeFile(temp,JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
  await rename(temp,stateFile);
 }finally{await rm(temp,{force:true})}
 return {...result,cadence:{checked_at:receipt.checked_at,next_due_at:new Date(now+
  (result.status==='failed'?Math.min(intervalMs,FAILED_RETRY_MS):intervalMs)).toISOString(),cached:false}};
}
