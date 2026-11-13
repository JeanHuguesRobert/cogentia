#!/usr/bin/env node
// Safe, cross-platform existing-checkouts-only fast-forward. No clone/checkout/stash/commit/push.
import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function runGit(repo,args,{optional=false}={}) {
  const p=spawnSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:20000});
  if(p.error||p.status!==0) {
    if(optional)return null;
    throw Error((p.error?.message||p.stderr?.trim()||'Git exit '+p.status).slice(0,450));
  }
  return p.stdout.trim();
}

export function syncExistingRepo(repo,{apply=false}={}) {
  const result={repo:path.basename(repo),status:'UNKNOWN',before:null,after:null,ahead:null,behind:null};
  try {
    const name=runGit(repo,['branch','--show-current']);
    const initial=runGit(repo,['rev-parse','HEAD']);
    result.before=initial;
    if(!['main','master'].includes(name))return {...result,status:'SKIP_NONCANONICAL_BRANCH',branch:name};
    if(runGit(repo,['status','--porcelain','--untracked-files=normal']))return {...result,status:'SKIP_DIRTY'};
    if(!runGit(repo,['remote'],{optional:true})?.split('\n').includes('origin'))return {...result,status:'SKIP_NO_ORIGIN'};
    if(!apply)return {...result,status:'DRY_RUN',branch:name};
    // This fetch is the only network operation; never switch branches or overwrite files.
    runGit(repo,['fetch','--no-tags','origin',name]);
    const remote=runGit(repo,['rev-parse','refs/remotes/origin/'+name],{optional:true});
    if(!remote)return {...result,status:'SKIP_NO_REMOTE_BRANCH'};
    const [ahead,behind]=runGit(repo,['rev-list','--left-right','--count','HEAD...refs/remotes/origin/'+name]).split(/\s+/).map(Number);
    result.ahead=ahead;result.behind=behind;
    if(ahead>0)return {...result,status:behind?'SKIP_DIVERGED':'SKIP_LOCAL_COMMITS'};
    // A second preflight avoids trampling edits made while fetch was running.
    if(runGit(repo,['branch','--show-current'])!==name||runGit(repo,['rev-parse','HEAD'])!==initial||
       runGit(repo,['status','--porcelain','--untracked-files=normal']))
      return {...result,status:'SKIP_CHANGED_DURING_FETCH'};
    if(behind===0)return {...result,status:'CURRENT',after:initial};
    runGit(repo,['merge','--ff-only','refs/remotes/origin/'+name]);
    const after=runGit(repo,['rev-parse','HEAD']);
    if(after!==remote)throw Error('Post-merge commit differs from fetched remote');
    if(runGit(repo,['status','--porcelain','--untracked-files=normal']))throw Error('Unexpected post-merge worktree changes');
    return {...result,status:'FAST_FORWARDED',after};
  } catch(e) {
    return {...result,status:'ERROR',error:String(e.message).slice(0,300)};
  }
}

export async function syncExistingRoot(root,{apply=false}={}) {
  const candidates=await readdir(root,{withFileTypes:true});
  const results=[];
  for(const entry of candidates.sort((a,b)=>a.name.localeCompare(b.name))) {
    if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
    const p=path.join(root,entry.name);
    try {await stat(path.join(p,'.git'))}catch{continue}
    results.push(syncExistingRepo(p,{apply}));
  }
  return {schema:'cogentia.git_clean_repo_sync.v1',root,apply,results,
    summary:Object.fromEntries([...new Set(results.map(x=>x.status))].sort().map(k=>[k,results.filter(x=>x.status===k).length]))};
}

const invoked=process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked) {
  const args=process.argv.slice(2),ix=args.indexOf('--root');
  const root=path.resolve(ix<0?process.cwd():args[ix+1]);
  try {
    const r=await syncExistingRoot(root,{apply:args.includes('--apply')});
    if(args.includes('--json'))console.log(JSON.stringify(r,null,2));
    else {for(const v of r.results)console.log(v.repo+': '+v.status+(v.error?' — '+v.error:''));console.log('Summary:',JSON.stringify(r.summary))}
    if(r.results.some(x=>x.status==='ERROR'))process.exitCode=1;
  }catch(e){console.error('git-sync-clean-repos:',e.message);process.exitCode=2}
}
