import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orientResumableIssue } from "./lib/calculette-cold-orientation.js";
const issue={repository:"JeanHuguesRobert/cogentia",number:241,state:"open",body:[
"## Goal","Resume work.","## Current state","Patch claimed merged.",
"## Agent-resumable Next Action","1. Inspect sources.",
"## Acceptance","Return evidence."
].join("\n\n")};
const a=orientResumableIssue(issue);
assert.equal(a.change_delta.status,"unknown");
for (const dimension of ["constraints","authority","acceptance","stop_conditions","context_references"]) assert.ok(Object.hasOwn(a,dimension),dimension+" missing");
assert.equal(a.next_action.authorized,false);
assert.equal(a.applicable_control.verified,false);
assert.equal(a.applicable_control.status,"access_unverified");
assert.equal(a.authorization.status,"not_granted");
assert.equal(a.effective_ready,false);
assert.ok(a.handoff_preflight.closure.status);
assert.equal(a.handoff_preflight.first_step.text,"Inspect sources.");
const unnumbered=orientResumableIssue({...issue,body:issue.body.replace("1. Inspect sources.","Inspect sources.")});
assert.equal(unnumbered.handoff_preflight.first_step.missing,true);
assert.ok(unnumbered.blockers.includes("handoff: first_step_missing"));
const b=orientResumableIssue(issue,{verifiedChanges:[{verified:true,ref:"commit:a60b267",description:"Merged fix"},{verified:false,ref:"false",description:"Claim"}]});
assert.equal(b.change_delta.verified.length,1);
const absent=orientResumableIssue({...issue,body:issue.body+"\n\n## Context References\n\n- `docs/absent-cold-orientation.md`"},{fileExists:()=>false});
assert.ok(absent.blockers.length>0);
assert.equal(absent.next_action.authorized,false);
assert.equal(absent.applicable_control.status,"blocked");
assert.ok(absent.blockers.some(x=>x==="control_unavailable: AGENTS.md"));
const reachable=orientResumableIssue(issue,{fileExists:()=>true});
assert.equal(reachable.applicable_control.status,"accessible_not_activated");
assert.equal(reachable.authorization.status,"not_granted");
assert.equal(reachable.effective_ready,false);
console.log("cold orientation smoke: passed");

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const fixture=path.join(root,"scripts/fixtures/resumable-issues/minimal-pass.md");
const cli=spawnSync(process.execPath,["scripts/cogentia.js","calculette","orient","--body-file",fixture,"--root",root,"--json"],{cwd:root,encoding:"utf8"});
assert.equal(cli.status,0,cli.stderr||cli.stdout);
const parsed=JSON.parse(cli.stdout);
assert.equal(parsed.schema,"cogentia.calculette.cold-orientation/v1");
assert.equal(parsed.next_action.authorized,false);
assert.equal(parsed.effects.issue_mutation,false);
assert.ok(parsed.handoff_preflight);
assert.ok(Array.isArray(parsed.handoff_preflight.dependencies));
assert.equal(parsed.applicable_control.status,"accessible_not_activated");
assert.equal(parsed.authorization.status,"not_granted");
console.log("cold orientation CLI: passed");

const withDelta=spawnSync(process.execPath,["scripts/cogentia.js","calculette","orient","--body-file",fixture,"--root",root,"--delta-base","deliberately-invalid-base","--json"],{cwd:root,encoding:"utf8"});
assert.equal(withDelta.status,0,withDelta.stderr||withDelta.stdout);
const deltaResult=JSON.parse(withDelta.stdout);
assert.equal(deltaResult.git_delta.status,"unknown");
assert.equal(deltaResult.git_delta.reason,"git_verification_failed");
assert.notEqual(deltaResult.git_delta.reason,"root_and_base_required");
console.log("calculette CLI delta flag: passed");

const commented=orientResumableIssue({...issue,comments:[
  {body:"Next action: inspect old implementation",url:"https://example.invalid/old"},
  {body:"Next bounded action: compare latest benchmark",url:"https://example.invalid/new"},
]});
assert.equal(commented.continuation_candidate.index,2);
assert.match(commented.continuation_candidate.text,/compare latest benchmark/);
assert.equal(commented.continuation_candidate.authorized,false);
assert.equal(commented.next_action.authorized,false);
console.log("cold orientation comment candidate: passed");

const temp=mkdtempSync(path.join(tmpdir(),"calculette-snapshot-"));
try {
  const snapshot=path.join(temp,"issue.json");
  writeFileSync(snapshot,JSON.stringify({number:241,title:"cold fixture",body:issue.body,comments:[{body:"Next action: verify latest continuation"}]}));
  const p=spawnSync(process.execPath,["scripts/cogentia.js","calculette","orient","JeanHuguesRobert/cogentia#241","--issue-snapshot",snapshot,"--root",root,"--json"],{cwd:root,encoding:"utf8"});
  assert.equal(p.status,2,p.stderr||p.stdout); // intentionally PARTIAL fixture
  const output=JSON.parse(p.stdout);
  assert.equal(output.closure.status,"PARTIAL");
  assert.equal(output.continuation_candidate.index,1);
  assert.equal(output.continuation_candidate.authorized,false);
  assert.equal(output.next_action_reconciliation.status,"review_newer_comment");
  console.log("cold orientation Issue snapshot CLI: passed");
} finally {rmSync(temp,{recursive:true,force:true});}

const postMergeCase=orientResumableIssue({...issue,body:issue.body+
  "\n## Post-merge continuation (2026-10-16)\n- Next bounded work: compare matched trials without repeating merged FBF.\n",
  comments:[]});
assert.equal(postMergeCase.continuation_candidate.source,"body");
assert.match(postMergeCase.continuation_candidate.text,/compare matched trials/);
assert.equal(postMergeCase.next_action_reconciliation.status,"review_post_merge_body");
assert.equal(postMergeCase.continuation_candidate.authorized,false);
console.log("cold orientation post-merge continuation: passed");

const janusIssue={...issue,body:issue.body+"\n## Post-merge continuation (2026-10-16)\n- Next bounded work: compare matched benchmark arms.\n",comments:[
 {body:"Matched benchmark batch2 complete. Control: 84.78 s, 6 commands. Assisted: 160.82 s, 13 commands.",url:"https://example.invalid/receipt"}
]};
const janusView=orientResumableIssue(janusIssue);
assert.equal(janusView.janus_reconciliation.execution,"reported_both_arms");
assert.equal(janusView.janus_reconciliation.independently_verified,false);
assert.equal(janusView.next_action_reconciliation.status,"review_execution_receipts_before_repeat");
assert.equal(janusView.authorization.status,"not_granted");
const missingReceipt=orientResumableIssue({...janusIssue,comments:[]});
assert.equal(missingReceipt.janus_reconciliation.execution,"not_established");
console.log("cold orientation Janus claims vs results: passed");
