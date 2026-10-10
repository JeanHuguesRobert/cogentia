/** Federated, source-local, read-only open-issue bootstrap. */
import { bootstrapOpenIssues } from "./calculette-open-issues-bootstrap.js";
export async function bootstrapCorpusOpenIssues(repositories,{load,observedAt,maxRepositories=100}={}) {
  if(!Array.isArray(repositories)||typeof load!=="function"||!observedAt) throw new Error("repositories, loader, observedAt required");
  if(repositories.length>maxRepositories) throw new Error("repository budget exceeded");
  const names=[...new Set(repositories.map(r=>typeof r==="string"?r:r.full_name))];
  const entries=[],failures=[];let complete=true;
  for(const name of names) {
    if(!/^[\w.-]+\/[\w.-]+$/.test(name)) {failures.push({repository:name,error:"invalid_name"});complete=false;continue;}
    try{
      const result=await load(name);
      if(!result||!Array.isArray(result.issues)) throw new Error("invalid issue snapshot");
      const seed=bootstrapOpenIssues(result.issues,{repository:name,observedAt});
      entries.push({repository:name,work_queue:seed.work_queue,
        link_candidates:seed.link_candidates,complete:result.complete===true,
        pages_checked:result.pages_checked});
      if(result.complete!==true) complete=false;
    }catch(error){failures.push({repository:name,error:String(error.message||error)});complete=false;}
  }
  return {protocol:"cogentia.calculette_corpus_bootstrap/v1",as_of:observedAt,
    repositories_requested:names.length,repositories_loaded:entries.length,
    complete,failures,by_repository:entries,
    work_queue:entries.flatMap(e=>e.work_queue),
    link_candidates:entries.flatMap(e=>e.link_candidates),
    readiness:"unknown_until_triage",persisted:false,private_import:false};
}
