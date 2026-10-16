import assert from "node:assert/strict";
import { orientResumableIssue } from "./lib/calculette-cold-orientation.js";
const issue={repository:"JeanHuguesRobert/cogentia",number:241,state:"open",body:[
"## Goal","Resume work.","## Current state","Patch claimed merged.",
"## Agent-resumable Next Action","Inspect sources.",
"## Acceptance","Return evidence."
].join("\n\n")};
const a=orientResumableIssue(issue);
assert.equal(a.change_delta.status,"unknown");
assert.equal(a.next_action.authorized,false);
assert.equal(a.applicable_control.verified,false);
const b=orientResumableIssue(issue,{verifiedChanges:[{verified:true,ref:"commit:a60b267",description:"Merged fix"},{verified:false,ref:"false",description:"Claim"}]});
assert.equal(b.change_delta.verified.length,1);
console.log("cold orientation smoke: passed");
