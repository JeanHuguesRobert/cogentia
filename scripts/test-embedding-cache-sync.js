#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
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
      { id: 1, hash: "hash-shared", text: "Shared public chunk." },
      { id: 2, hash: "hash-source-only", text: "Source-only public chunk." },
    ],
    embeddings: [
      { chunk_id: 1, hash: "hash-shared", vector: [0.1, 0.2, 0.3, 0.4] },
      { chunk_id: 2, hash: "hash-source-only", vector: [0.4, 0.3, 0.2, 0.1] },
    ],
  });
  createIndexFixture(targetRoot, {
    chunks: [
      { id: 10, hash: "hash-shared", text: "Shared public chunk." },
      { id: 11, hash: "hash-target-only", text: "Target-only public chunk." },
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
  });
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
