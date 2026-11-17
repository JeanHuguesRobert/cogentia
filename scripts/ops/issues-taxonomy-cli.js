/** GitHub Issues taxonomy: native gh adapter. Plan and verify are read-only;
 * apply only adds definitions/labels from a hashed, fresh plan after preflight.
 * This CLI is an implementation, NOT an alternative authority to COP.
 */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CORE_REPOS,buildTaxonomyPlan,assertPlan,preflightIssueChange,checkRepoName} from '../lib/github-issues-taxonomy.js';

function gh(path,args=[]){
  const out=execFileSync('gh',['api',path,...args],{encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
  return out.trim()?JSON.parse(out):{};
}
function gitHubRepo(name) {
 const r=gh('repos/'+checkRepoName(name));
 const labels=gh('repos/'+name+'/labels?per_page=100');
 const issues=[];
 for(let page=1;page<=30;page++){
  const rows=gh('repos/'+name+'/issues?state=open&per_page=100&page='+page);
  issues.push(...rows.filter(x=>!x.pull_request));
  if(rows.length<100)break;
 }
 return {full_name:name,private:r.private,labels,issues};
}
function repoNames({all=false,repos=[]}={}){
 if(repos.length)return [...new Set(repos.map(x=>checkRepoName(x.includes('/')?x:'JeanHuguesRobert/'+x)))];
 if(all) {
  const names=[];
  for(let page=1;page<=10;page++){
   const rows=gh('user/repos?affiliation=owner&per_page=100&page='+page);
   names.push(...rows.filter(x=>x.owner?.login==='JeanHuguesRobert'&&!x.archived).map(x=>x.full_name));
   if(rows.length<100)break;
  }
  return names;
 }
 return CORE_REPOS.map(n=>'JeanHuguesRobert/'+n);
}
function argValue(args,name){const n=args.indexOf(name);return n>=0?args[n+1]:null;}
function scopeArgs(args){return {all:args.includes('--all'),repos:(argValue(args,'--repo')||'').split(',').filter(Boolean)}}
function writeJson(obj,path){if(path)fs.writeFileSync(path,JSON.stringify(obj,null,2)+'\n');else process.stdout.write(JSON.stringify(obj,null,2)+'\n');}
function readPlan(file){if(!file)throw Error('Use --from <plan.json>');const p=JSON.parse(fs.readFileSync(file,'utf8'));assertPlan(p);return p;}
function verify(plan){
 const rows=[];
 for(const r of plan.repositories){
  const current=gitHubRepo(r.name);
  const labels=new Set(current.labels.map(l=>l.name));
  const issues=new Map(current.issues.map(i=>[i.number,i]));
  const missing=r.missing_definitions.filter(l=>!labels.has(l.name)).map(l=>l.name);
  const definitionsDrift=r.definition_drift.filter(l=>{const currentLabel=current.labels.find(x=>x.name===l.name);return !currentLabel||currentLabel.color?.toLowerCase()!==l.desired.color||currentLabel.description!==l.desired.description}).map(l=>l.name);
  let pending=0,applied=0,diverged=0;
  for(const c of r.changes){
    const now=issues.get(c.number);
    if(!now || now.state!=='open'){diverged++;continue}
    const present=new Set(now.labels.map(l=>l.name));
    const missed=c.add.filter(a=>!present.has(a.label));
    if(!missed.length)applied++;
    else if(preflightIssueChange(c,now)===null)pending++;
    else diverged++;
  }
  rows.push({repo:r.name,definitions_missing:missing,definitions_drift:definitionsDrift,issue_changes_pending:pending,issue_changes_applied:applied,issue_changes_diverged:diverged});
 }
 return {schema:'cogentia.github-issues-taxonomy.verify/v1',plan_hash:plan.plan_hash,repositories:rows,complete:rows.every(r=>!r.definitions_missing.length&&!r.definitions_drift.length&&!r.issue_changes_pending&&!r.issue_changes_diverged)};
}
function apply(plan,{dryRun=false}={}){
 // Full preflight before any writes: avoid half-applied stale plans.
 const current=new Map();
 const conflicts=[];
 for(const r of plan.repositories){
  const snapshot=gitHubRepo(r.name);
  current.set(r.name,snapshot);
  const present=new Map(snapshot.labels.map(x=>[x.name,x]));
  for(const l of r.missing_definitions){
   const existing=present.get(l.name);
   if(existing&&(existing.color?.toLowerCase()!==l.color||existing.description!==l.description))conflicts.push(r.name+':'+l.name+':definition conflict');
  }
  for(const l of r.definition_drift){
   const existing=present.get(l.name);
   if(existing && (existing.color?.toLowerCase()!==l.expected.color?.toLowerCase()||existing.description!==(l.expected.description||null)) &&
       (existing.color?.toLowerCase()!==l.desired.color||existing.description!==l.desired.description))
     conflicts.push(r.name+':'+l.name+':definition drift changed');
  }
  const issues=new Map(snapshot.issues.map(x=>[x.number,x]));
  for(const c of r.changes) {
   const currentIssue=issues.get(c.number);
   const status=preflightIssueChange(c,currentIssue);
   if(status && status!=='already_applied') {
    // Already-applied means ALL requested labels should exist.
    const set=new Set((currentIssue?.labels||[]).map(l=>l.name));
    if(!currentIssue || c.add.some(a=>!set.has(a.label)))conflicts.push(r.name+'#'+c.number+':'+status);
   }
  }
 }
 if(conflicts.length)return {ok:false,blocked:true,conflicts:conflicts.slice(0,60),more_conflicts:Math.max(0,conflicts.length-60),written:0};
 if(dryRun)return {ok:true,dry_run:true,plan_hash:plan.plan_hash,would_create_definitions:plan.repositories.reduce((n,r)=>n+r.missing_definitions.length,0),would_reconcile_definitions:plan.repositories.reduce((n,r)=>n+r.definition_drift.length,0),would_label_issues:plan.repositories.reduce((n,r)=>n+r.changes.length,0)};
 const receipt={ok:true,plan_hash:plan.plan_hash,definitions_created:[],definitions_reconciled:[],issues_labeled:[],errors:[]};
 for(const r of plan.repositories){
  const currentLabels=new Set(current.get(r.name).labels.map(x=>x.name));
  for(const l of r.missing_definitions){
   if(currentLabels.has(l.name))continue;
   try{gh('repos/'+r.name+'/labels',['-X','POST','-f','name='+l.name,'-f','color='+l.color,'-f','description='+l.description]);receipt.definitions_created.push(r.name+':'+l.name);}
   catch(e){receipt.errors.push({target:r.name+':'+l.name,error:String(e.message).slice(0,180)});receipt.ok=false;return receipt;}
  }
  for(const l of r.definition_drift){
   const existing=current.get(r.name).labels.find(x=>x.name===l.name);
   if(existing && existing.color?.toLowerCase()===l.desired.color && existing.description===l.desired.description)continue;
   try{gh('repos/'+r.name+'/labels/'+encodeURIComponent(l.name),['-X','PATCH','-f','color='+l.desired.color,'-f','description='+l.desired.description]);receipt.definitions_reconciled.push(r.name+':'+l.name);}
   catch(e){receipt.errors.push({target:r.name+':'+l.name,error:String(e.message).slice(0,180)});receipt.ok=false;return receipt;}
  }
  for(const c of r.changes){
   const currentIssue=gh('repos/'+r.name+'/issues/'+c.number);
   const set=new Set((currentIssue.labels||[]).map(x=>x.name));
   const needed=c.add.map(x=>x.label).filter(x=>!set.has(x));
   if(!needed.length)continue;
   // Re-evaluate just before each effect, not only during batch preflight.
   const status=preflightIssueChange(c,currentIssue);
   if(status){receipt.errors.push({target:r.name+'#'+c.number,error:'concurrent_change:'+status});receipt.ok=false;return receipt;}
   try{
    gh('repos/'+r.name+'/issues/'+c.number+'/labels',['-X','POST',...needed.flatMap(l=>['-f','labels[]='+l])]);
    receipt.issues_labeled.push({repo:r.name,number:c.number,labels:needed});
   }catch(e){receipt.errors.push({target:r.name+'#'+c.number,error:String(e.message).slice(0,180)});receipt.ok=false;return receipt;}
  }
 }
 return receipt;
}
export function runIssuesTaxonomy(args){
 const sub=args[0]||'plan';
 if(sub==='plan'){
  const names=repoNames(scopeArgs(args));
  const plan=buildTaxonomyPlan({repositories:names.map(gitHubRepo)});
  writeJson(plan,argValue(args,'--output'));
  return {ok:true,plan_hash:plan.plan_hash,summary:plan.summary,scope:names,output:argValue(args,'--output')||'stdout'};
 }
 if(sub==='apply'||sub==='verify'){
  const plan=readPlan(argValue(args,'--from'));
  const result=sub==='apply'?apply(plan,{dryRun:args.includes('--dry-run')}):verify(plan);
  writeJson(result,argValue(args,'--output'));
  if(!result.ok && sub==='apply')process.exitCode=2;
  if(sub==='verify'&&!result.complete)process.exitCode=2;
  return result;
 }
 throw Error('Usage: issues taxonomy plan [--repo cogentia,inseme|--all] [--output plan.json] | apply --from plan.json [--dry-run] | verify --from plan.json');
}
