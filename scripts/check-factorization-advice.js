import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
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
test("reciprocal co-sovereign language peers are preserved", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const a="cogentia/research/fr.md", b="cogentia/research/en.md";
  for (const [p,peer] of [[a,"research/en.md"],[b,"research/fr.md"]]) {
    fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});
    fs.writeFileSync(path.join(root,p),`---\ndocument_role: source\nlanguage_peer: ${peer}\n---\nSome text\n`);
  }
  const r=adviseFactorization(signal(a,b),{corpusRoot:root});
  assert.equal(r.recommendation,"preserve_co_sovereign_language_peers");
  assert.equal(r.relation.declared_relations.length,2);
});
test("derived product retains declared source relation", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const a="cogentia/research/derived_products/article.md", b="cogentia/research/source.md";
  for (const [p,front] of [[a,"document_role: derived\nsource_document: research/source.md"],[b,"document_role: source"]]) {
    fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});
    fs.writeFileSync(path.join(root,p),`---\n${front}\n---\nSome text\n`);
  }
  const r=adviseFactorization(signal(a,b),{corpusRoot:root});
  assert.equal(r.recommendation,"preserve_declared_derivation");
  assert.equal(r.relation.declared_relations[0].predicate,"source_document");
});

test("central CLI advises direct pairs without registry or changing sources", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const a="cogentia/docs/a.md", b="cogentia/docs/b.md";
  for (const p of [a,b]) {fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),"---\ntitle: Example\n---\nIdentical content\n");}
  const before=[a,b].map(p=>fs.readFileSync(path.join(root,p),"utf8"));
  const cli=path.resolve("scripts/cogentia.js");
  const run=spawnSync(process.execPath,[cli,"sleep-cycle","advise","--a",a,"--b",b,"--corpus-root",root,"--json"],
    {cwd:root,encoding:"utf8",env:{...process.env,COGENTIA_REGISTRY:""},timeout:20000});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout);
  assert.equal(result.mode,"read_only");
  assert.equal(result.count,1);
  assert.equal(result.results[0].recommendation,"inspect_identity_and_authority");
  assert.deepEqual([a,b].map(p=>fs.readFileSync(path.join(root,p),"utf8")),before);
});

test("central CLI rejects incomplete pair", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const cli=path.resolve("scripts/cogentia.js");
  const run=spawnSync(process.execPath,[cli,"sleep-cycle","advise","--a","cogentia/docs/a.md","--corpus-root",root],
    {cwd:root,encoding:"utf8",env:{...process.env,COGENTIA_REGISTRY:""},timeout:20000});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/--a and --b must be provided together/);
});

test("SleepCycle stats and review use the registered Cogentia repository, not cwd", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const repo=path.join(root,"cogentia"), other=path.join(root,"elsewhere");
  fs.mkdirSync(path.join(repo,".cogentia"),{recursive:true});
  fs.mkdirSync(other);
  const registry=path.join(root,".cogentia.json");
  fs.writeFileSync(registry,JSON.stringify({repos:[{name:"cogentia",path:"./cogentia"}]}));
  const q=path.join(repo,".cogentia","sleep_cycle_review_queue.jsonl");
  const record={...signal("cogentia/a.md","cogentia/b.md"),review_status:"pending_review"};
  fs.writeFileSync(q,JSON.stringify(record)+"\n");
  const cli=path.resolve("scripts/cogentia.js");
  const env={...process.env,COGENTIA_REGISTRY:registry};
  for(const [sub,field] of [["stats","stats"],["review","items"]]) {
    const run=spawnSync(process.execPath,[cli,"sleep-cycle",sub,"--json"],
      {cwd:other,encoding:"utf8",env,timeout:20000});
    assert.equal(run.status,0,run.stderr);
    const result=JSON.parse(run.stdout);
    if(sub==="stats") {
      assert.equal(result.stats.total_signals,1);
      assert.equal(result.stats.queue_file,q);
    } else assert.equal(result.items[0].id,"sig-test");
  }
  assert.equal(fs.existsSync(path.join(other,".cogentia")),false);
  assert.equal(fs.readFileSync(q,"utf8"),JSON.stringify(record)+"\n");
});

test("existing brique package source is preferred over inventing a new shared source", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const src="inseme/packages/brique-ophelia/public/prompts/identity/origin.md";
  const a="inseme/apps/inseme/public/briques/ophelia/prompts/identity/origin.md";
  const b="inseme/apps/oleole/public/briques/ophelia/prompts/identity/origin.md";
  for(const [p,c] of [
    [src,"---\ndocument_role: operational\n---\nShared text\n"],
    [a,"---\ndocument_role: archive\n---\nShared text\n"],
    [b,"---\ndocument_role: operational\n---\nShared text\n"]
  ]) {
    fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});
    fs.writeFileSync(path.join(root,p),c);
  }
  const r=adviseFactorization(signal(a,b),{corpusRoot:root});
  assert.equal(r.recommendation,"inspect_existing_package_projection");
  assert.equal(r.evidence.existing_package_source.path,src);
  assert.equal(r.evidence.existing_package_source.matches_both_bodies,true);
  assert.deepEqual(r.evidence.existing_package_source.metadata_drift,[true,false]);
  assert.equal(r.evidence.existing_package_source.authority,"unverified");
});

test("package file with divergent body does not justify factorizing the copies", t => {
  const root=mk();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const src="inseme/packages/brique-ophelia/public/prompts/a.md";
  const a="inseme/apps/inseme/public/briques/ophelia/prompts/a.md";
  const b="inseme/apps/oleole/public/briques/ophelia/prompts/a.md";
  for(const [p,c] of [[src,"Updated source"],[a,"Old shared body"],[b,"Old shared body"]]){
    fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});
    fs.writeFileSync(path.join(root,p),c);
  }
  const r=adviseFactorization(signal(a,b),{corpusRoot:root});
  assert.notEqual(r.recommendation,"inspect_existing_package_projection");
  assert.equal(r.evidence.existing_package_source.matches_both_bodies,false);
});
