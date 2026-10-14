/** Lightweight Janus bootstrap from OPEN GitHub issues only.
 * The live issue snapshot is a work queue, not proof of runnability.
 */
import { importGithubIssues } from "./calculette-github-issues-import.js";
import { buildJanusSeed } from "./calculette-janus-seed.js";
export function bootstrapOpenIssues(issues,{repository,observedAt}={}) {
  const open = issues.filter(x=>x && !x.pull_request && x.state === "open");
  const imported = importGithubIssues(open,{repository,observedAt});
  const seed = buildJanusSeed({...imported,asOf:observedAt});
  const work = seed.facts.filter(x=>x.kind==="github_issue_snapshot").map(x=>({
    id:x.subject,title:x.title,source:x.source,observed_at:x.observed_at,
    state:"open",readiness:"unknown",authorization:"not_inferred",
    next_action:"triage",epistemic_status:"source_attested",
  }));
  return {...seed,work_queue:work,link_candidates:imported.candidates,
    coverage:"open issues from supplied snapshot; no historical completeness",
    no_action_without_mandate:true};
}
