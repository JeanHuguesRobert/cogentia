#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-query-cache-"));
const queryPayload = path.join(tempRoot, "query.json");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;

try {
  createIndexFixture(tempRoot);
  fs.writeFileSync(queryPayload, `${JSON.stringify({
    query: "alpha topic",
    provider: "openai",
    model_name: "text-embedding-3-small",
    dimensions: 2,
    query_embedding: [1, 0],
  }, null, 2)}\n`, "utf8");

  const cached = await runCogentia([
    "embeddings",
    "search-with",
    queryPayload,
    "--query",
    "alpha topic",
    "--repo",
    "all",
    "--limit",
    "2",
    "--view",
    "public",
    "--cache-query",
    "--json",
  ]);
  assert.equal(cached.ok, true);
  assert.equal(cached.query_cache.ok, true);
  assert.equal(cached.query_cache.dimensions, 2);
  assert.equal(cached.semantic_result_cache.ok, true);
  assert.equal(cached.semantic_result_cache.count, 2);

  const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      COGENTIA_REGISTRY: path.join(tempRoot, ".cogentia.json"),
      COGENTIA_DATA_DIR: tempRoot,
      COGENTIA_DAEMON_VIEW: "public",
      COGENTIA_ALLOW_DIRECT_QUERY_EMBEDDINGS: "0",
      COGENTIA_RATE_LIMIT_MAX: "20",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let daemonLog = "";
  daemon.stdout.on("data", chunk => { daemonLog += chunk; });
  daemon.stderr.on("data", chunk => { daemonLog += chunk; });

  try {
    await waitForHealth(() => daemonLog);
    const semantic = await getJson("/api/context/search?q=alpha%20topic&mode=semantic&limit=2");
    assert.equal(semantic.ok, true);
    assert.equal(semantic.mode, "semantic");
    assert.equal(semantic.count, 2);
    assert.equal(semantic.results[0].path, "alpha.md");
    assert.match(semantic.warnings.join("\n"), /cached ranked results/);

    const missResponse = await fetch(`${base}/api/context/search?q=uncached%20query&mode=semantic&limit=2`);
    const miss = await missResponse.json();
    assert.equal(missResponse.status, 409);
    assert.equal(miss.error, "semantic_continuation_required");
    assert.match(miss.warnings.join("\n"), /cache miss/i);
  } finally {
    daemon.kill();
  }

  console.log(JSON.stringify({ ok: true, cached: cached.query_cache.query_hash, result_cache: cached.semantic_result_cache.count }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

async function runCogentia(args) {
  const { stdout } = await execFileAsync(process.execPath, ["scripts/cogentia.js", ...args], {
    cwd: root,
    env: {
      ...process.env,
      COGENTIA_REGISTRY: path.join(tempRoot, ".cogentia.json"),
      COGENTIA_DATA_DIR: tempRoot,
    },
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function createIndexFixture(dataRoot) {
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
    db.prepare("INSERT INTO index_state (key, value) VALUES (?, ?)").run("index_hash", "query-cache-fixture");
    db.prepare("INSERT INTO index_state (key, value) VALUES (?, ?)").run("indexing_policy_version", "test-v1");
    const insertChunk = db.prepare(`
      INSERT INTO chunks
      (id, repo, path, title, heading_path, start_line, end_line, text, word_estimate, content_hash, role, visibility, public_presence, trace_level, github_url, searchable_public)
      VALUES (?, 'demo', ?, ?, ?, 1, 3, ?, 4, ?, 'source', 'public', 'full', 'public', '', 1)
    `);
    insertChunk.run(1, "alpha.md", "Alpha", "Alpha", "Alpha topic public content.", "hash-alpha");
    insertChunk.run(2, "beta.md", "Beta", "Beta", "Beta topic public content.", "hash-beta");
    const insertEmbedding = db.prepare(`
      INSERT INTO embeddings
      (chunk_id, content_hash, provider, repo, path, start_line, end_line, embedding, model_name, dimensions, created_at)
      SELECT id, content_hash, 'openai', repo, path, start_line, end_line, ?, 'text-embedding-3-small', 2, '2026-06-30T00:00:00.000Z'
      FROM chunks WHERE id = ?
    `);
    insertEmbedding.run(JSON.stringify([1, 0]), 1);
    insertEmbedding.run(JSON.stringify([0, 1]), 2);
  } finally {
    db.close();
  }
}

async function waitForHealth(readDaemonLog) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${base}/api/context/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Daemon did not start: ${readDaemonLog()}`);
}

async function getJson(route) {
  const response = await fetch(`${base}${route}`);
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return body;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
