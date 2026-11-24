#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-embedding-cache-"));
const sourceRoot = path.join(tempRoot, "source");
const targetRoot = path.join(tempRoot, "target");
const artifact = path.join(tempRoot, "embeddings.jsonl.gz");

try {
  createIndexFixture(sourceRoot, {
    chunks: [
      { id: 1, hash: "hash-shared", text: "Shared public chunk. ".repeat(10) },
      { id: 2, hash: "hash-source-only", text: "Source-only public chunk. ".repeat(10) },
    ],
    embeddings: [
      { chunk_id: 1, hash: "hash-shared", vector: [0.1, 0.2, 0.3, 0.4] },
      { chunk_id: 2, hash: "hash-source-only", vector: [0.4, 0.3, 0.2, 0.1] },
    ],
  });
  createIndexFixture(targetRoot, {
    chunks: [
      { id: 10, hash: "hash-shared", text: "Shared public chunk. ".repeat(10) },
      { id: 11, hash: "hash-target-only", text: "Target-only public chunk. ".repeat(10) },
    ],
    embeddings: [],
  });

  const exported = await runCogentia(sourceRoot, [
    "embeddings",
    "export-cache",
    "--output",
    artifact,
    "--view",
    "public",
    "--provider",
    "openai",
    "--model",
    "text-embedding-3-small",
    "--dimensions",
    "4",
    "--json",
  ]);
  assert.equal(exported.ok, true);
  assert.equal(exported.rows, 2);
  assert.equal(exported.compressed, true);
  assert.equal(fs.existsSync(artifact), true);

  const plan = await runCogentia(targetRoot, ["embeddings", "sync-plan", artifact, "--json"]);
  assert.equal(plan.ok, true);
  assert.equal(plan.seen, 2);
  assert.equal(plan.importable, 1);
  assert.equal(plan.missing_content_hash, 1);
  assert.equal(plan.already_present, 0);
  assert.equal(plan.imported, 0);
  assert.equal(plan.rows_hash_matches_summary, true);

  const imported = await runCogentia(targetRoot, ["embeddings", "import-cache", artifact, "--json"]);
  assert.equal(imported.ok, true);
  assert.equal(imported.imported, 1);
  assert.equal(imported.importable, 1);
  assert.equal(imported.missing_content_hash, 1);

  const secondPlan = await runCogentia(targetRoot, ["embeddings", "sync-plan", artifact, "--json"]);
  assert.equal(secondPlan.ok, true);
  assert.equal(secondPlan.importable, 0);
  assert.equal(secondPlan.already_present, 1);
  assert.equal(secondPlan.missing_content_hash, 1);

  const status = await runCogentia(targetRoot, ["embeddings", "status", "--json"]);
  assert.equal(status.ok, true);
  assert.equal(status.count, 1);
  assert.equal(status.providers[0].provider, "openai");
  assert.equal(status.providers[0].model_name, "text-embedding-3-small");
  assert.equal(status.providers[0].dimensions, 4);

  const targetDbPath=path.join(targetRoot,".cogentia","index","corpus.sqlite");
  const sourceDbPath=path.join(sourceRoot,".cogentia","index","corpus.sqlite");
  const targetDb=new DatabaseSync(targetDbPath);
  assert.equal(targetDb.prepare("SELECT policy FROM embeddings").get().policy,null);
  targetDb.close();
  // A known policy is transported verbatim, not inferred from the CLI filters.
  const sourceDb=new DatabaseSync(sourceDbPath);
  sourceDb.exec("ALTER TABLE embeddings ADD COLUMN policy TEXT; UPDATE embeddings SET policy='document-v1'");
  sourceDb.close();
  const knownArtifact=path.join(tempRoot,"known.jsonl");
  assert.equal((await runCogentia(sourceRoot,["embeddings","export-cache","--output",knownArtifact,"--json"])).rows,2);
  const knownRows=fs.readFileSync(knownArtifact,"utf8").trim().split("\n").map(JSON.parse);
  assert.ok(knownRows.filter(r=>r.type==="embedding").every(r=>r.policy==="document-v1"));
  const conflict=await runCogentia(targetRoot,["embeddings","sync-plan",knownArtifact,"--json"]);
  assert.equal(conflict.incompatible_existing,1);
  assert.equal(conflict.importable,0);
  const freshRoot=path.join(tempRoot,"fresh");
  createIndexFixture(freshRoot,{chunks:[{id:20,hash:"hash-shared",text:"Shared public chunk. ".repeat(10)}],embeddings:[]});
  const corrupt=path.join(tempRoot,"corrupt.jsonl");
  const corrupted=knownRows.map(r=>r.type==="summary"?{...r,rows_hash:"0".repeat(64)}:r);
  fs.writeFileSync(corrupt,corrupted.map(r=>JSON.stringify(r)).join("\n")+"\n");
  const refusal=await runCogentia(freshRoot,["embeddings","import-cache",corrupt,"--json"]);
  assert.equal(refusal.ok,false);
  const freshPath=path.join(freshRoot,".cogentia","index","corpus.sqlite");
  const freshDb=new DatabaseSync(freshPath);
  assert.equal(freshDb.prepare("SELECT count(*) AS n FROM embeddings").get().n,0);
  freshDb.close();
  assert.equal((await runCogentia(freshRoot,["embeddings","import-cache",knownArtifact,"--json"])).imported,1);
  const verifiedDb=new DatabaseSync(freshPath);
  assert.equal(verifiedDb.prepare("SELECT policy FROM embeddings").get().policy,"document-v1");
  verifiedDb.close();
  const unknownRows=gunzipSync(fs.readFileSync(artifact)).toString().trim().split("\n").map(JSON.parse);
  assert.ok(unknownRows.filter(r=>r.type==="embedding").every(r=>r.policy===null));
  // Legacy wire identity is verified without inventing stored provenance.
  const stable = v => JSON.stringify(v, (_k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k,x[k]])) : x);
  const digest = v => createHash("sha256").update(v).digest("hex");
  const legacyRows=unknownRows.filter(r=>r.type==="embedding").map(r=>{
    const {policy,...old}=r;
    old.embedding_key=digest(stable({content_hash:r.content_hash,provider:r.provider,model_name:r.model_name,dimensions:r.dimensions,policy:`${r.provider}/${r.model_name}/${r.dimensions}`}));
    return old;
  });
  const legacyArtifact=path.join(tempRoot,"legacy.jsonl");
  fs.writeFileSync(legacyArtifact,[unknownRows[0],...legacyRows,{...unknownRows.at(-1),rows_hash:digest(legacyRows.map(stable).join(""))}].map(r=>JSON.stringify(r)).join("\n")+"\n");
  const legacyRoot=path.join(tempRoot,"legacy");
  createIndexFixture(legacyRoot,{chunks:[{id:30,hash:"hash-shared",text:"Shared public chunk. ".repeat(10)}],embeddings:[]});
  const legacyResult=await runCogentia(legacyRoot,["embeddings","import-cache",legacyArtifact,"--json"]);
  assert.equal(legacyResult.ok,true);
  assert.equal(legacyResult.imported,1);
  const legacyDb=new DatabaseSync(path.join(legacyRoot,".cogentia","index","corpus.sqlite"));
  assert.equal(legacyDb.prepare("SELECT policy FROM embeddings").get().policy,null);
  legacyDb.close();
  console.log(JSON.stringify({ ok: true, exported: exported.rows, imported: imported.imported, already_present: secondPlan.already_present }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

async function runCogentia(dataRoot, args) {
  const registry = path.join(dataRoot, ".cogentia.json");
  const { stdout } = await execFileAsync(process.execPath, ["scripts/cogentia.js", ...args], {
    cwd: root,
    env: {
      ...process.env,
      COGENTIA_REGISTRY: registry,
      COGENTIA_DATA_DIR: dataRoot,
    },
    maxBuffer: 1024 * 1024,
  }).catch(error=>{if(error.stdout)return {stdout:error.stdout};throw error;});
  return JSON.parse(stdout);
}

function createIndexFixture(dataRoot, fixture) {
  fs.mkdirSync(path.join(dataRoot, ".cogentia", "index"), { recursive: true });
  fs.writeFileSync(path.join(dataRoot, ".cogentia.json"), `${JSON.stringify({ repos: [] }, null, 2)}\n`, "utf8");
  const db = new DatabaseSync(path.join(dataRoot, ".cogentia", "index", "corpus.sqlite"));
  try {
    db.exec(`
      CREATE TABLE index_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE chunks (
        id INTEGER PRIMARY KEY,
        repo TEXT NOT NULL,
        path TEXT NOT NULL,
        title TEXT NOT NULL,
        heading_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        text TEXT NOT NULL,
        word_estimate INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        visibility TEXT NOT NULL,
        public_presence TEXT NOT NULL,
        trace_level TEXT NOT NULL,
        github_url TEXT NOT NULL,
        searchable_public INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE embeddings (
        id INTEGER PRIMARY KEY,
        chunk_id INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        provider TEXT NOT NULL,
        repo TEXT NOT NULL,
        path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        embedding JSON NOT NULL,
        model_name TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(chunk_id, provider, model_name)
      );
    `);
    db.prepare("INSERT INTO index_state (key, value) VALUES (?, ?)").run("index_hash", `fixture-${path.basename(dataRoot)}`);
    db.prepare("INSERT INTO index_state (key, value) VALUES (?, ?)").run("indexing_policy_version", "test-v1");
    const insertChunk = db.prepare(`
      INSERT INTO chunks
      (id, repo, path, title, heading_path, start_line, end_line, text, word_estimate, content_hash, role, visibility, public_presence, trace_level, github_url, searchable_public)
      VALUES (?, 'demo', 'README.md', 'Demo', 'Demo', ?, ?, ?, 4, ?, 'source', 'public', 'full', 'public', 'https://example.invalid/demo/README.md', 1)
    `);
    for (const [index, chunk] of fixture.chunks.entries()) {
      insertChunk.run(chunk.id, index * 10 + 1, index * 10 + 5, chunk.text, chunk.hash);
    }
    const insertEmbedding = db.prepare(`
      INSERT INTO embeddings
      (chunk_id, content_hash, provider, repo, path, start_line, end_line, embedding, model_name, dimensions, created_at)
      SELECT id, content_hash, 'openai', repo, path, start_line, end_line, ?, 'text-embedding-3-small', 4, '2026-06-30T00:00:00.000Z'
      FROM chunks WHERE id = ?
    `);
    for (const item of fixture.embeddings) {
      insertEmbedding.run(JSON.stringify(item.vector), item.chunk_id);
    }
  } finally {
    db.close();
  }
}
