import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { wipInventory, wipCompare } from "./wip-inventory.js";
function git(repo,...args){return execFileSync("git",["-C",repo,...args],{encoding:"utf8"}).trim();}
test("inventory shows noncanonical refs, stash and dirty files invisible to git status",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"wip-309-"));
 const repo=path.join(root,"sample");fs.mkdirSync(repo);
 try {
  git(repo,"init","-q","-b","main");
  git(repo,"config","user.name","Fixture");git(repo,"config","user.email","fixture@example.invalid");
  fs.writeFileSync(path.join(repo,"a.txt"),"base\n");
  git(repo,"add","a.txt");git(repo,"commit","-qm","base");
  git(repo,"remote","add","origin",repo);
  git(repo,"update-ref","refs/remotes/origin/main","HEAD");
  git(repo,"branch","hidden");
  git(repo,"checkout","-q","hidden");
  fs.writeFileSync(path.join(repo,"a.txt"),"changed\n");
  git(repo,"commit","-qam","hidden work");
  git(repo,"checkout","-q","main");
  fs.writeFileSync(path.join(repo,"scratch.txt"),"unique WIP");
  git(repo,"stash","push","-u","-qm","untracked work");
  fs.writeFileSync(path.join(repo,"local.txt"),"untracked");
  fs.writeFileSync(path.join(repo,"a.txt"),"unstaged\n");
  const inv=wipInventory({root,machine:"fixture"});
  assert.equal(inv.repositories.length,1);
  const r=inv.repositories[0];
  assert.equal(inv.machine,"fixture");
  assert.ok(r.comparisons.find(x=>x.ref==="refs/heads/hidden" && x.ahead===1));
  assert.equal(r.stashes.length,1);
  assert.deepEqual(r.untracked,["local.txt"]);
  assert.deepEqual(r.unstaged,["a.txt"]);
  const cmp=wipCompare({repo,ref:"hidden"});
  assert.equal(cmp.structural.ahead,1);
  assert.equal(cmp.structural.behind,0);
  assert.equal(cmp.semantic.status,"not_assessed");
  assert.equal(cmp.structural.patch_equivalence.length,1);
  assert.equal(cmp.structural.patch_equivalence[0].equivalent,false);
  assert.equal(git(repo,"status","--porcelain").includes("hidden"),false);
  assert.equal(git(repo,"status","--porcelain").includes("scratch.txt"),false);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test("missing root is reported, not silently treated as empty inventory",()=>{
 const root=path.join(os.tmpdir(),"nonexistent-wip-309-"+process.pid);
 const report=wipInventory({root});
 assert.ok(report.discovery_errors.includes("root_missing"));
});
