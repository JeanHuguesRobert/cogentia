// Packet: Cogentia #344. Incremental, packet-scoped reconciliation.
// Fetches the live baseline; never discards/stashes someone else's work.
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const known = new Set(['RECONCILED','INDEPENDENT_WIP','AUTO_RECONCILABLE','ARBITRATION_REQUIRED','RECONCILIATION_REQUIRED','REMOTE_UNAVAILABLE','NO_SCOPE']);
export function gitCmd(repo,args,{buffer=false,optional=false,timeout=25000,input}={}){
 const p=spawnSync('git',['-C',repo,...args],{encoding:buffer?'buffer':'utf8',maxBuffer:8*1024*1024,timeout,input});
 if(p.error||p.status!==0){
  if(optional)return null;
  const e=new Error('Git operation failed: '+args[0]);
  e.code='GIT_COMMAND_FAILED';e.gitExit=p.status;throw e;
 }
 return buffer?p.stdout:p.stdout.trim();
}
function splitNull(x){return (x||'').split('\0').filter(Boolean)}
function safePath(value){
 if(typeof value!=='string'||!value||path.isAbsolute(value)||value.includes('\0')||
    value.split(/[\\/]/).includes('..')||value.startsWith('-'))throw Error('INVALID_TASK_PATH');
 return value.replaceAll('\\','/');
}
function stagedPaths(repo){
 return splitNull(gitCmd(repo,['diff','--cached','--name-only','-z'],{buffer:true}).toString('utf8')).map(safePath);
}
function statusPaths(repo){
 // -z emits original names without shell quotation or newline ambiguity.
 const raw=gitCmd(repo,['status','--porcelain=v1','-z','--untracked-files=normal'],{buffer:true}).toString('utf8');
 const parts=splitNull(raw);const paths=[];
 for(let i=0;i<parts.length;i++){
  const row=parts[i],name=row.slice(3);
  if(row.length<4)continue;
  paths.push(name);
  if(/^[RC]/.test(row[0])||/[RC]/.test(row[1]))i++; // extra original name
 }
 return paths.map(safePath);
}
function gitObject(repo,rev,file){
 return gitCmd(repo,['show',rev+':'+file],{optional:true,buffer:true});
}
async function trialThreeWay(repo,base,upstream,file) {
 const local=gitCmd(repo,['show',':'+file],{buffer:true,optional:true});
 const old=gitObject(repo,base,file),remote=gitObject(repo,upstream,file);
 if(!local||!old||!remote||local.includes(0)||old.includes(0)||remote.includes(0))
  return {status:'ARBITRATION_REQUIRED',reason:'non_text_or_missing_blob'};
 if(local.equals(remote))return {status:'RECONCILED',reason:'staged_blob_already_matches_upstream'};
 const dir=await mkdtemp(path.join(tmpdir(),'cogentia-merge-preview-'));
 try{
  for(const [f,bytes] of [['local',local],['base',old],['remote',remote]])
    await writeFile(path.join(dir,f),bytes);
  const p=spawnSync('git',['merge-file','-p','-L','PACKET_LOCAL','-L','COMMON_BASE','-L','UPSTREAM',
    path.join(dir,'local'),path.join(dir,'base'),path.join(dir,'remote')],
    {encoding:'buffer',maxBuffer:8*1024*1024,timeout:10000});
  if(p.status===0)return {status:'AUTO_RECONCILABLE',reason:'clean_three_way_preview'};
  if(p.status===1)return {status:'ARBITRATION_REQUIRED',reason:'three_way_conflict'};
  return {status:'ARBITRATION_REQUIRED',reason:'merge_preview_unavailable'};
 }finally{await rm(dir,{recursive:true,force:true})}
}
function classify(overlap,behind,ahead,mode) {
 if(mode==='push')return behind>0?'RECONCILIATION_REQUIRED':'RECONCILED';
 if(overlap.some(x=>x.status==='ARBITRATION_REQUIRED'))return 'ARBITRATION_REQUIRED';
 if(overlap.some(x=>x.status==='AUTO_RECONCILABLE'))return 'AUTO_RECONCILABLE';
 if(behind>0)return 'INDEPENDENT_WIP';
 return 'RECONCILED';
}
/**
 * A check before committing is scoped to exactly the staged paths, so another
 * packet's unrelated dirty file is not made a blocker. A push is stricter:
 * an outdated branch must first integrate its history, even with no overlap.
 *
 * The opt-in --apply fast-forwards only when the branch has no unique commits
 * and the incoming paths are disjoint from ALL local edits. It refuses to
 * rewrite staged changes or attempt a rebase in the background.
 */
export async function reconcileGitEvent({
 repo=process.cwd(),phase='commit',paths,fetch=true,apply=false,remote='origin',packetRef=process.env.COGENTIA_PACKET_REF||null
}={}){
 if(!['start','commit','push'].includes(phase))throw Error('INVALID_RECONCILE_PHASE');
 if(!/^[A-Za-z0-9._-]+$/.test(remote))throw Error('INVALID_REMOTE');
 const root=path.resolve(repo);
 const branch=gitCmd(root,['branch','--show-current']);
 if(!branch||branch==='HEAD')throw Error('DETACHED_HEAD');
 const head=gitCmd(root,['rev-parse','HEAD']);
 const upstream=gitCmd(root,['rev-parse','--abbrev-ref','--symbolic-full-name','@{upstream}'],{optional:true});
 const trackedRemote=upstream?.split('/')[0];
 if(!upstream||trackedRemote!==remote)return {
  schema:'cogentia.git_incremental_reconciliation.v1',phase,branch,
  status:'REMOTE_UNAVAILABLE',action:'CONFIGURE_TRACKING',head,upstream:null
 };
 let fetchError=false;
 if(fetch){
  try{gitCmd(root,['fetch','--no-tags',remote,branch]);}
  catch{fetchError=true;}
 }
 if(fetchError)return {
  schema:'cogentia.git_incremental_reconciliation.v1',phase,branch,status:'REMOTE_UNAVAILABLE',
  action:'RETRY_FETCH',head,upstream
 };
 const remoteSha=gitCmd(root,['rev-parse',upstream]);
 const counts=gitCmd(root,['rev-list','--left-right','--count','HEAD...'+upstream]).split(/\s+/).map(Number);
 const [ahead,behind]=counts;
 const mergeBase=gitCmd(root,['merge-base','HEAD',upstream],{optional:true});
 const owned=[...new Set((paths===undefined?phase==='start'?[]:stagedPaths(root):paths).map(safePath))].sort();
 const dirty=statusPaths(root);
 const changes=behind>0&&mergeBase?splitNull(gitCmd(root,['diff','--no-renames','--name-only','-z',mergeBase,upstream],{buffer:true}).toString('utf8')):[];
 const touched=new Set(changes),dirtySet=new Set(dirty);
 const intersect=owned.filter(f=>touched.has(f));
 const overlap=[];
 for(const f of intersect)overlap.push({path:f,...await trialThreeWay(root,mergeBase,upstream,f)});
 let status=classify(overlap,behind,ahead,phase);
 let applied=false;
 const anyDirtyOverlap=changes.some(f=>dirtySet.has(f));
 // This is the only automatic worktree update. Never ff when staging or
 // history divergence exists, or when incoming files touch local edits.
 if(phase==='start'&&apply&&behind>0&&ahead===0&&!anyDirtyOverlap&&mergeBase===head){
  const unchanged=gitCmd(root,['rev-parse','HEAD'])===head&&gitCmd(root,['rev-parse',upstream])===remoteSha;
  if(unchanged){
   const p=spawnSync('git',['-C',root,'merge','--ff-only',upstream],{encoding:'utf8',timeout:25000});
   if(p.status===0){
    applied=true;status='RECONCILED';
   }
  }
 }
 if(phase==='commit'&&owned.length===0)status='NO_SCOPE';
 const decision={
  schema:'cogentia.git_incremental_reconciliation.v1',phase,branch,upstream,
  packet_ref: typeof packetRef==='string' && packetRef.length<=190 ? packetRef : null,
  head,remote_sha:remoteSha,ahead,behind,changed_paths:changes.length,
  scope:owned,dirty_count:dirty.length,
  independent_dirty_count:dirty.filter(f=>!owned.includes(f)).length,
  overlap,applied,status,
  action:status==='ARBITRATION_REQUIRED'?'CONSULT_PACKET_OWNER':
   status==='AUTO_RECONCILABLE'?'RECONCILE_AND_RESTAGE_SCOPE':
   status==='RECONCILIATION_REQUIRED'?'INTEGRATE_REMOTE_HISTORY':
   status==='REMOTE_UNAVAILABLE'?'RETRY_FETCH':
   status==='INDEPENDENT_WIP'?'COMMIT_SCOPED_THEN_RECONCILE_BEFORE_PUSH':
   'CONTINUE'
 };
 if(!known.has(status))throw Error('UNKNOWN_RECONCILE_STATUS');
 return decision;
}
