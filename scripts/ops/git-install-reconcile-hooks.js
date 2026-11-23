#!/usr/bin/env node
// Packet Cogentia #344: opt-in installation of event preflight hooks.
// No overwriting existing hooks; a publisher using a direct GitHub API must
// separately enforce its remote SHA lease (hooks only cover local git).
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,chmod,readdir,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

export const MARKER='# Cogentia incremental reconciliation, owning packet #344';
function git(repo,args){
 const x=spawnSync('git',['-C',repo,...args],{encoding:'utf8',timeout:12000});
 if(x.status!==0)throw Error('GIT_INSTALL_INSPECTION_FAILED');
 return x.stdout.trim();
}
function sh(value){return "'"+value.replaceAll("'","'\\''")+"'";}
export function contentForHook(kind,{nodePath=process.execPath,
 runnerPath=fileURLToPath(new URL('./git-incremental-reconcile.js',import.meta.url))}={}){
 if(!['pre-commit','pre-push'].includes(kind))throw Error('INVALID_HOOK_KIND');
 return '#!/bin/sh\n'+MARKER+'\n'+
  (kind==='pre-push'
    ? 'exec '+sh(nodePath)+' '+sh(runnerPath)+' --phase push --remote "$1" --repo "$PWD"\n'
    : 'exec '+sh(nodePath)+' '+sh(runnerPath)+' --phase commit --repo "$PWD"\n');
}
export async function installReconcileHooks({repo=process.cwd(),apply=false,nodePath,runnerPath}={}){
 const root=git(repo,['rev-parse','--show-toplevel']);
 const custom=spawnSync('git',['-C',root,'config','--get','core.hooksPath'],{encoding:'utf8',timeout:10000});
 if(custom.status===0 && custom.stdout.trim())throw Error('CUSTOM_HOOKS_PATH_REQUIRES_REVIEW');
 const gitPath=git(root,['rev-parse','--git-path','hooks']);
 const hookDir=path.isAbsolute(gitPath)?gitPath:path.resolve(root,gitPath);
 const result=[];
 for(const kind of ['pre-commit','pre-push']){
  const destination=path.join(hookDir,kind);
  const content=contentForHook(kind,{nodePath,runnerPath});
  let current=null;
  try{current=await readFile(destination,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
  const state=current===content?'ALREADY_INSTALLED':
    current!==null?'EXISTING_HOOK_NOT_TOUCHED':
    apply?'INSTALLABLE':'WOULD_INSTALL';
  if(state==='INSTALLABLE'){
   await mkdir(hookDir,{recursive:true});
   // exclusive create: never races an existing custom hook into oblivion.
   await writeFile(destination,content,{mode:0o755,flag:'wx'});
   await chmod(destination,0o755);
   result.push({hook:kind,status:'INSTALLED'});
  }else result.push({hook:kind,status:state});
 }
 return {schema:'cogentia.git_hook_install.v1',repo:root,apply,results:result};
}

export async function installReconcileHooksAcrossRoot({root,apply=false}={}){
 if(!root)throw Error('ROOT_REQUIRED');
 const entries=await readdir(path.resolve(root),{withFileTypes:true});
 const seen=new Set(),results=[];
 for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
  if(entry.name.startsWith('.')||(!entry.isDirectory()&&!entry.isSymbolicLink()))continue;
  const item=path.resolve(root,entry.name);
  let canonical;
  try{canonical=await realpath(item);await stat(path.join(item,'.git'))}
  catch{continue}
  if(seen.has(canonical))continue;
  seen.add(canonical);
  try {results.push(await installReconcileHooks({repo:item,apply}))}
  catch(e){results.push({repo:item,apply,error:e.message})}
 }
 return {schema:'cogentia.git_hook_fleet_install.v1',root:path.resolve(root),apply,results};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const argv=process.argv.slice(2), i=argv.indexOf('--repo'), rix=argv.indexOf('--root');
 try{
  const r=rix>=0
   ?await installReconcileHooksAcrossRoot({root:argv[rix+1],apply:argv.includes('--apply')})
   :await installReconcileHooks({repo:i<0?process.cwd():argv[i+1],apply:argv.includes('--apply')});
  if(argv.includes('--json'))console.log(JSON.stringify(r,null,2));
  else if(Array.isArray(r.results)&&r.results.some(x=>Array.isArray(x.results)))
   for(const repo of r.results)console.log(repo.repo+': '+(repo.error||repo.results.map(h=>h.hook+'='+h.status).join(', ')));
  else for(const v of r.results)console.log(v.hook+': '+v.status);
  if(r.results.some(x=>x.status==='EXISTING_HOOK_NOT_TOUCHED'||x.error||
    x.results?.some(h=>h.status==='EXISTING_HOOK_NOT_TOUCHED')))process.exitCode=1;
 }catch(e){console.error('git-install-reconcile-hooks: '+e.message);process.exitCode=2}
}
