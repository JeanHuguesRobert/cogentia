/** Merge observational snapshots. This is NEVER a deletion authorization. */
export function wipMergeInventories(reports, {now=new Date().toISOString(),maxAgeHours=24}={}) {
 if (!Array.isArray(reports) || reports.length<2) throw Error("at_least_two_inventories_required");
 const groups=new Map(), coverage=[], machines=new Set(), clock=Date.parse(now);
 if (!Number.isFinite(clock)||!(maxAgeHours>0)) throw Error("invalid_time_or_age");
 for(const report of reports) {
  if(report?.schema!=="wip.inventory/v1"||!report.machine||!Array.isArray(report.repositories))
   throw Error("invalid_wip_inventory_v1");
  const observed=Date.parse(report.observed_at);
  if(!Number.isFinite(observed)) throw Error("invalid_observation_time");
  const fresh=clock>=observed && clock-observed<=maxAgeHours*3600000;
  const complete=!(report.discovery_errors?.length || report.summary?.errors);
  machines.add(report.machine);
  coverage.push({machine:report.machine,root:report.root,observed_at:report.observed_at,
   scope:report.coverage||"unspecified",fresh,complete});
  for(const repo of report.repositories) {
   const match=String(repo.origin||"").match(/^(?:https:\/\/github\.com\/|ssh@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i);
   const key=match?"github:"+match[1].toLowerCase():"unpaired:"+report.machine+":"+repo.path;
   if(!groups.has(key)) groups.set(key,[]);
   groups.get(key).push({machine:report.machine,path:repo.path,head:repo.head||null,
    branch:repo.branch||null,observed_at:repo.observed_at||report.observed_at,
    fresh:fresh&&complete&&!repo.errors?.length,dirty:!!repo.dirty,
    staged_count:repo.staged?.length||0,unstaged_count:repo.unstaged?.length||0,
    untracked_count:repo.untracked?.length||0,ignored_count:repo.ignored?.count??null,
    stash_count:repo.stashes?.length||0,errors:repo.errors?.length||0,
    refs:(repo.refs||[]).map(r=>({name:r.name,oid:r.oid}))});
  }
 }
 const repositories=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([identity,items])=>{
  items.sort((a,b)=>a.machine.localeCompare(b.machine)||a.path.localeCompare(b.path));
  const refs=new Map();
  for(const item of items) for(const r of item.refs){
   if(!refs.has(r.name)) refs.set(r.name,[]);
   refs.get(r.name).push({machine:item.machine,oid:r.oid});
  }
  const ref_differences=[...refs].filter(([_,v])=>v.length!==items.length
   ||new Set(v.map(x=>x.oid)).size!==1).map(([ref,observed])=>({
    ref,observed,interpretation:"cached_ref_disagreement_not_live_remote_absence"}))
   .sort((a,b)=>a.ref.localeCompare(b.ref));
  const sufficient=items.length>=2&&new Set(items.map(x=>x.machine)).size>=2
   &&items.every(x=>x.fresh&&x.head);
  const state=!sufficient?"insufficient_or_stale_coverage"
   :new Set(items.map(x=>x.head)).size>1?"heads_differ_no_semantic_claim"
   :ref_differences.length?"cached_remote_refs_differ"
   :items.some(x=>x.dirty||x.stash_count||x.untracked_count)?"same_head_local_wip_present"
   :"same_head_no_detected_local_wip";
  return {identity,state,observations:items.map(({refs,...x})=>x),
   ref_differences,semantic_equivalence:"not_assessed",deletion_authorized:false};
 });
 return {schema:"wip.multi-machine/v1",observed_at:now,machines:[...machines].sort(),
  coverage:coverage.sort((a,b)=>a.machine.localeCompare(b.machine)),repositories,
  summary:{inventories:reports.length,machines:machines.size,identities:repositories.length,
   requiring_review:repositories.filter(x=>x.state!=="same_head_no_detected_local_wip").length},
  policy:{read_only:true,missing_observation_is_not_absence:true,
   cached_remote_refs_are_not_live_proof:true,deletions_require_separate_plan:true}};
}
