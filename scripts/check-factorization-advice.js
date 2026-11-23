import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { adviseFactorization } from "./lib/factorization-advice.js";
const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), "factorization-advice-"));
const signal = (a,b) => ({ id: "sig-test", signal_kind: "duplication", method: "ngram_paragraph_similarity", review_status: "pending_review", doc_a: {path:a}, doc_b:{path:b} });
test("identical content in distinct applications keeps endpoints and recommends shared build source", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const a="inseme/apps/inseme/legal/terms.md",b="inseme/apps/cyrnea/legal/terms.md";
  for(const p of [a,b]) {fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),"---\ntitle: Terms\n---\nSame independent text.\n");}
  const r=adviseFactorization(signal(a,b),{corpusRoot:root});
  assert.equal(r.recommendation,"consider_shared_source_with_independent_projections");
  assert.equal(r.relation.semantic_equivalence,"unverified");
  assert.equal(r.locality.preserve_public_endpoints,true);
  assert.equal(r.evidence.same_full_bytes,true);
});
test("partial duplication is not silently promoted to full semantic identity", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const a="inseme/docs/a.md",b="inseme/docs/b.md";
  for(const [p,c] of [[a,"shared\none"],[b,"shared\ntwo"]]) {fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),c);}
  const r=adviseFactorization(signal(a,b),{corpusRoot:root});
  assert.equal(r.recommendation,"preserve_and_review");assert.equal(r.relation.kind,"partial_overlap_candidate");
});
test("unavailable source does not claim equivalence", t => {
 const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const r=adviseFactorization(signal("inseme/missing.md","inseme/other.md"),{corpusRoot:root});
 assert.equal(r.status,"source_unavailable");
});
test("path traversal is rejected", t => {
 const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const r=adviseFactorization(signal("inseme/../../secret.md","inseme/a.md"),{corpusRoot:root});
 assert.equal(r.status,"source_unavailable");
});
