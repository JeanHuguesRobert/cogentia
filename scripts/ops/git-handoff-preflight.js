#!/usr/bin/env node
// Worktree-read-only, cross-platform GitHub-first diagnosis; optional fetch updates remote refs.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const args=process.argv.slice(2);
const repoArg=args.indexOf('--repo');
const repo=path.resolve(repoArg>=0 ? args[repoArg+1] : process.cwd());
const json=args.includes('--json');
const fetch=args.includes('--fetch');
function git(cmd, {optional=false,raw=false}={}) {
  const r=spawnSync('git',['-C',repo,...cmd],{encoding:'utf8',maxBuffer:8_000_000,timeout:25000});
  if(r.error || r.status!==0) {
    if(optional)return null;
    throw Error(`git ${cmd[0]} failed: ${r.error?.message || r.stderr?.trim() || r.status}`);
  }
  return raw ? r.stdout.replace(/\r?\n$/, '') : r.stdout.trim();
}
function lines(raw){return raw ? raw.split(/\r?\n/) : []}
function isProjection(name){return /(^|\/)(llms(-full)?\.txt|corpus-status\.md)$/.test(name)}
function looksSensitive(name){return /(^|\/)(\.env($|\.)|id_(rsa|ed25519)|[^/]*\.(pem|key|p12|pfx)|credentials?[^/]*\.json|[^/]*secret[^/]*|\.cogentia\/)/i.test(name)}
try {
  const branch=git(['branch','--show-current']);
  const head=git(['rev-parse','HEAD']);
  const upstream=git(['rev-parse','--abbrev-ref','--symbolic-full-name','@{upstream}'],{optional:true});
  if(fetch && upstream) {
    // Fetch only the preconfigured remote, never pull, merge, push or alter the worktree.
    const remote=upstream.split('/')[0];
    git(['fetch','--no-tags',remote]);
  }
  const counts=upstream ? git(['rev-list','--left-right','--count',`HEAD...${upstream}`],{optional:true}) : null;
  const [ahead,behind]=counts?.split(/\s+/).map(Number)??[null,null];
  const porcelain=lines(git(['status','--porcelain=v1','--untracked-files=normal'],{raw:true}));
  const changed=porcelain.map(line=>({
    code:line.slice(0,2),
    path:line.slice(3),
    generated:isProjection(line.slice(3)),
    sensitive_hint:looksSensitive(line.slice(3)),
  }));
  let state='CURRENT';
  if(!upstream)state='NO_UPSTREAM';
  else if(ahead>0 && behind>0)state='DIVERGED';
  else if(behind>0 && changed.length>0)state='DIRTY_AND_BEHIND';
  else if(behind>0)state='FAST_FORWARD_AVAILABLE';
  else if(ahead>0 && changed.length>0)state='LOCAL_COMMITS_AND_WIP';
  else if(ahead>0)state='UNPUSHED_COMMITS';
  else if(changed.length>0)state='LOCAL_WIP';
  const result={
    schema:'cogentia.git_handoff_preflight.v1',
    repo,branch,head,upstream,ahead,behind,state,
    dirty_count:changed.length,
    generated_count:changed.filter(x=>x.generated).length,
    sensitive_hint_count:changed.filter(x=>x.sensitive_hint).length,
    changed,
    next:state==='CURRENT'?'Nothing to transfer':
      state==='FAST_FORWARD_AVAILABLE'?'git pull --ff-only after confirming no live build relies on the old revision':
      state==='UNPUSHED_COMMITS'?'Review commits and push to GitHub after checking public/private and deployment effects':
      state==='LOCAL_WIP'?'Review the exact WIP diff, checkpoint task-owned publishable files to GitHub, then verify remote SHA':
      'Reconcile this state explicitly; never reset, stash wholesale or blindly pull/push',
    note:'Names-only heuristic: no file scan can prove absence of secrets. A public commit may trigger CI or deployment. User mandate and publication/deployment boundaries remain separate.',
  };
  if(json) console.log(JSON.stringify(result,null,2));
  else {
    console.log(`${path.basename(repo)} [${branch||'DETACHED'}] ${head.slice(0,10)}: ${state} (ahead=${ahead??'?'}, behind=${behind??'?'}, dirty=${changed.length})`);
    for(const c of changed)console.log(`  ${c.code} ${c.path}${c.sensitive_hint?' [REVIEW PRIVACY]':''}${c.generated?' [GENERATED]':''}`);
    console.log(result.next);
    console.log(result.note);
  }
} catch(e) {console.error('git-handoff-preflight: '+e.message);process.exitCode=2}
