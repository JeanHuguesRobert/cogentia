import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectDependencyLinks } from "./check-dependency-links.js";

test("detects broken link despite existing directory entry", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-link-test-"));
  try {
    fs.writeFileSync(path.join(root,"package.json"), JSON.stringify({ packageManager:"pnpm@10.28.2", dependencies:{ good:"1", broken:"1" }}));
    fs.mkdirSync(path.join(root,"node_modules"),{recursive:true});
    fs.mkdirSync(path.join(root,"node_modules","good"));
    fs.writeFileSync(path.join(root,"node_modules","good","package.json"), "{}");
    fs.symlinkSync(path.join(root,"does-not-exist"), path.join(root,"node_modules","broken"), "dir");
    const report = inspectDependencyLinks(root);
    assert.equal(report.ok, false);
    assert.equal(report.failures, 1);
    assert.equal(report.results.find(x=>x.name==="good").status, "ok");
    assert.notEqual(report.results.find(x=>x.name==="broken").status, "ok");
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
