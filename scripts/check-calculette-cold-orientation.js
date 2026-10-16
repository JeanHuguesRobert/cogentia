import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const fixture=path.join(root,"scripts/fixtures/resumable-issues/minimal-pass.md");
const cli=spawnSync(process.execPath,["scripts/cogentia.js","calculette","orient","--body-file",fixture,"--root",root,"--json"],{cwd:root,encoding:"utf8"});
assert.equal(cli.status,0,cli.stderr||cli.stdout);
const parsed=JSON.parse(cli.stdout);
assert.equal(parsed.schema,"cogentia.calculette.cold-orientation/v1");
assert.equal(parsed.next_action.authorized,false);
assert.equal(parsed.effects.issue_mutation,false);
console.log("cold orientation CLI: passed");
