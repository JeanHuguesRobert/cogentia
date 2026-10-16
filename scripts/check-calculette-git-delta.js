import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {inspectGitDelta} from "./lib/calculette-git-delta.js";
const root=mkdtempSync(path.join(tmpdir(),"calculette-git-"));
const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
try {
  git("init");
  git("config","user.name","Fixture");
  git("config","user.email","fixture@example.invalid");
  writeFileSync(path.join(root,"a.txt"),"one");
  git("add","a.txt");git("commit","-m","baseline");
  const base=git("rev-parse","HEAD");
  writeFileSync(path.join(root,"a.txt"),"two");
  git("commit","-am","verified test change");
  const ok=inspectGitDelta({root,base});
  assert.equal(ok.status,"verified_local_git");
  assert.equal(ok.commit_count,1);
  assert.equal(ok.verified.length,1);
  assert.match(ok.verified[0].description,/verified test change/);
  assert.equal(inspectGitDelta({root}).status,"unknown");
  assert.equal(inspectGitDelta({root,base:"nonexistent"}).status,"unknown");
  assert.equal(inspectGitDelta({root,base:"HEAD",head:base}).status,"unknown");
  console.log("calculette Git delta: verified + blocked regressions passed");
} finally { rmSync(root,{recursive:true,force:true}); }
