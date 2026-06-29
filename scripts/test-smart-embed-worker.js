#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-smart-embed-"));
const registryPath = path.join(tempRoot, ".cogentia.json");
const stateDir = path.join(tempRoot, ".cogentia");
const continuationsDir = path.join(stateDir, "continuations");
const continuationId = "ctn_deadbeef";
const routerPort = await freePort();
const routerBase = `http://127.0.0.1:${routerPort}`;
const router = await startMockRouter(routerPort);

try {
  fs.mkdirSync(continuationsDir, { recursive: true });
  fs.writeFileSync(registryPath, `${JSON.stringify({ repos: [] }, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(continuationsDir, `${continuationId}.json`),
    `${JSON.stringify(testContinuation(), null, 2)}\n`,
    "utf8",
  );

  const worker = await execFileAsync(process.execPath, [
    "scripts/smart-embed-worker.js",
    "run",
    "--id",
    continuationId,
    "--max-chunks",
    "1",
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COGENTIA_REGISTRY: registryPath,
      COGENTIA_AI_ROUTER_URL: routerBase,
      COGENTIA_EMBEDDINGS_MAX_ITEMS_PER_BATCH: "1",
      COGENTIA_EMBEDDINGS_MAX_CHARS_PER_BATCH: "1000",
    },
    maxBuffer: 1024 * 1024,
  });

  assert.match(worker.stdout, /Batch 1\/1/);
  assert.match(worker.stdout, /Continuation kept active with 1 remaining chunks/);

  const partialResultPath = listResultFiles()[0];
  assert.ok(partialResultPath);
  const partialResult = JSON.parse(fs.readFileSync(partialResultPath, "utf8"));
  assert.equal(partialResult.total_embeddings, 1);
  assert.equal(partialResult.partial, true);
  assert.equal(partialResult.remaining_chunks, 1);

  const importDryRun = await execFileAsync(process.execPath, [
    "scripts/import-embeddings.js",
    "--dry-run",
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COGENTIA_REGISTRY: registryPath,
      COGENTIA_EMBEDDINGS_RESULTS_DIR: stateDir,
    },
    maxBuffer: 1024 * 1024,
  });
  assert.match(importDryRun.stdout, /Found 1 result files/);
  assert.match(importDryRun.stdout, /Valid dry-run/);
  assert.match(importDryRun.stdout, /Valid: 1 embeddings/);

  const activeContinuation = JSON.parse(fs.readFileSync(path.join(continuationsDir, `${continuationId}.json`), "utf8"));
  assert.equal(activeContinuation.status, "active");
  assert.equal(activeContinuation.context.chunks.length, 1);

  const finalWorker = await execFileAsync(process.execPath, [
    "scripts/smart-embed-worker.js",
    "run",
    "--id",
    continuationId,
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COGENTIA_REGISTRY: registryPath,
      COGENTIA_AI_ROUTER_URL: routerBase,
      COGENTIA_EMBEDDINGS_MAX_ITEMS_PER_BATCH: "1",
      COGENTIA_EMBEDDINGS_MAX_CHARS_PER_BATCH: "1000",
    },
    maxBuffer: 1024 * 1024,
  });

  assert.match(finalWorker.stdout, /Batch 1\/1/);
  assert.match(finalWorker.stdout, /Continuation resolved/);

  const finalResultPath = path.join(stateDir, `embeddings_result_${continuationId}.json`);
  assert.equal(fs.existsSync(finalResultPath), true);
  const result = JSON.parse(fs.readFileSync(finalResultPath, "utf8"));
  assert.equal(result.total_embeddings, 1);
  assert.equal(result.providers[0].provider, "openai");
  assert.equal(result.providers[0].modelId, "text-embedding-3-small");
  assert.equal(result.providers[0].dimensions, 4);
  assert.deepEqual(result.embeddings[0].embedding, [0.25, 0.5, 0.75, 1]);

  const continuation = JSON.parse(fs.readFileSync(path.join(continuationsDir, `${continuationId}.json`), "utf8"));
  assert.equal(continuation.status, "resolved");
  assert.equal(continuation.resolution.decision, "multi_provider_embeddings_generated");

  console.log(JSON.stringify({ ok: true, continuation_id: continuationId, partial_embeddings: partialResult.total_embeddings, final_embeddings: result.total_embeddings }, null, 2));
} finally {
  await new Promise(resolve => router.close(resolve));
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function listResultFiles() {
  return fs.readdirSync(stateDir)
    .filter(file => file.startsWith(`embeddings_result_${continuationId}`) && file.endsWith(".json"))
    .map(file => path.join(stateDir, file))
    .sort();
}

function testContinuation() {
  const now = new Date().toISOString();
  return {
    type: "continuation",
    protocol: "cogentia.continuation.v2",
    id: continuationId,
    continuation_id: continuationId,
    status: "active",
    kind: "embeddings-index",
    title: "Generate embeddings for 2 chunks",
    question: "Generate vector embeddings for 2 text chunks.",
    priority: 1,
    dedupe_key: "test-smart-embed-worker",
    subject: { repo: "all", path: "" },
    context: {
      chunks: [
        {
          chunk_id: 1,
          content_hash: "hash-one",
          repo: "demo",
          path: "README.md",
          start_line: 1,
          end_line: 2,
          text: "First chunk",
        },
        {
          chunk_id: 2,
          content_hash: "hash-two",
          repo: "demo",
          path: "README.md",
          start_line: 3,
          end_line: 4,
          text: "Second chunk",
        },
      ],
      view: "public",
      repo: "all",
      limit: 2,
      force: false,
      embedding_profile: {
        name: "openai",
        provider: "openai",
        model_name: "text-embedding-3-small",
        dimensions: 4,
        policy: "test-openai-4d-v1",
      },
    },
    expected_response: { format: "json", required: ["embeddings"] },
    requester: { command: "test", cwd: process.cwd(), registry: registryPath },
    created_at: now,
    updated_at: now,
    resolution: null,
    history: [{ at: now, event: "emitted" }],
    resume: {
      command: `node scripts/cogentia.js continuation resolve ${continuationId} <result.json>`,
    },
  };
}

function startMockRouter(port) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        status: "ok",
        service: "mock-router",
        capabilities: { embeddings: true },
      });
    }
    if (req.method === "POST" && url.pathname === "/v1/embeddings") {
      const payload = await readJson(req);
      const dimensions = Number(payload.dimensions || 4) || 4;
      const inputs = Array.isArray(payload.input) ? payload.input : [payload.input];
      return json(res, 200, {
        object: "list",
        model: payload.model || "mock-embed",
        data: inputs.map((_, index) => ({
          object: "embedding",
          index,
          embedding: Array.from({ length: dimensions }, (__, i) => Number(((i + 1) / dimensions).toFixed(6))),
        })),
      });
    }
    return json(res, 404, { error: "not_found" });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(`${JSON.stringify(body)}\n`);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("error", reject);
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
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
