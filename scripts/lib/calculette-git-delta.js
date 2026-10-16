import { execFileSync } from "node:child_process";
import path from "node:path";

/** Local Git evidence only: never turns issue claims into verified facts. */
export function inspectGitDelta({root, base, head="HEAD", maxCommits=30}={}) {
  if (!root || !base) return {status:"unknown",verified:[],reason:"root_and_base_required"};
  const cwd=path.resolve(root);
  try {
    const git=(...args)=>execFileSync("git",args,{cwd,encoding:"utf8",timeout:10000,maxBuffer:1024*1024}).trim();
    const top=git("rev-parse","--show-toplevel");
    if (path.resolve(top)!==cwd) return {status:"unknown",verified:[],reason:"root_not_git_toplevel"};
    const baseline=git("rev-parse","--verify",base+"^{commit}");
    const current=git("rev-parse","--verify",head+"^{commit}");
    git("merge-base","--is-ancestor",baseline,current);
    const count=Number(git("rev-list","--count",baseline+".."+current));
    const log=git("log","--format=%H%x09%s","--max-count="+Math.max(1,Math.min(100,maxCommits)),baseline+".."+current);
    const commits=log?log.split("\n").map(line=>{const pos=line.indexOf("\t");return {sha:line.slice(0,pos),subject:line.slice(pos+1)}}):[];
    const remote=git("remote","get-url","origin");
    return {status:"verified_local_git",base_sha:baseline,head_sha:current,commit_count:count,commits,remote,verified:commits.map(c=>({verified:true,ref:c.sha,description:c.subject})),truncated:count>commits.length};
  }catch(e){return {status:"unknown",verified:[],reason:"git_verification_failed",detail:String(e.message||e).slice(0,180)};}
}
