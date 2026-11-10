#!/usr/bin/env node
/** Live, bounded, public GitHub open-issues bootstrap. No source writes.
 * May return partial coverage on rate limit/network failure; never silently
 * publish an incomplete result as a complete queue.
 */
import { bootstrapOpenIssues } from "./lib/calculette-open-issues-bootstrap.js";
export async function fetchOpenIssues(repository,{fetchImpl=fetch,maxPages=10,perPage=100}={}) {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("owner/repo required");
  if(!Number.isInteger(maxPages)||maxPages<1||maxPages>30) throw new Error("maxPages 1..30");
  const issues=[]; let complete=false; let pagesChecked=0;
  for(let page=1;page<=maxPages;page++) {
    const url=`https://api.github.com/repos/${repository}/issues?state=open&per_page=${perPage}&page=${page}`;
    const response=await fetchImpl(url,{headers:{Accept:"application/vnd.github+json","User-Agent":"Cogentia-Calculette-Janus-Bootstrap"}});
    if(!response.ok) throw new Error(`GitHub HTTP ${response.status} at page ${page}`);
    const items=await response.json();
    pagesChecked=page;
    if(!Array.isArray(items)) throw new Error("GitHub expected issue array");
    issues.push(...items.filter(item=>!item.pull_request));
    if(items.length<perPage){complete=true;break;}
  }
  return {issues,complete,pages_checked:pagesChecked};
}
const invoked=process.argv[1]?.endsWith("calculette-open-issues-prefill.js");
if(invoked){
  const args=process.argv.slice(2);
  const repo=args[args.indexOf("--repository")+1];
  const asOf=args.includes("--as-of")?args[args.indexOf("--as-of")+1]:new Date().toISOString();
  const maxPages=args.includes("--max-pages")?Number(args[args.indexOf("--max-pages")+1]):10;
  try{
    const fetched=await fetchOpenIssues(repo,{maxPages});
    const seed=bootstrapOpenIssues(fetched.issues,{repository:repo,observedAt:asOf});
    console.log(JSON.stringify({...seed,source:"github-rest-api-open-issues",complete:fetched.complete,
      observed_open_issue_count:fetched.issues.length,pages_checked:fetched.pages_checked,
      persisted:false,refresh_required:true},null,2));
    if(!fetched.complete) process.exitCode=2;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
