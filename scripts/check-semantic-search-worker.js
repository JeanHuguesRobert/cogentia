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

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-semantic-worker-"));
const registryPath = path.join(tempRoot, ".cogentia.json");
const stateDir = path.join(tempRoot, ".cogentia");
const continuationsDir = path.join(stateDir, "continuations");
const continuationId = "ctn_semantic";
const routerPort = await freePort();
const routerBase = `http://127.0.0.1:${routerPort}`;
const router = await startMockRouter(routerPort);

try {
  fs.mkdirSync(continuationsDir, { recursive: true });
  fs.writeFileSync(registryPath, `${JSON.stringify({ repos: [] }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(continuationsDir, `${continuationId}.json`), `${JSON.stringify(testContinuation(), null, 2)}\n`, "utf8");

  const list = await execFileAsync(process.execPath, [
    "scripts/semantic-search-worker.js",
    "list",
    "--id",
    continuationId,
  ], testEnv());
  assert.match(list.stdout, /ctn_semantic: Fracta VPS Caddy Cogentia MCP/);

  const run = await execFileAsync(process.execPath, [
    "scripts/semantic-search-worker.js",
    "run",
    "--id",
    continuationId,
    "--no-search",
    "--no-resolve",
  ], testEnv());
  assert.match(run.stdout, /Processing continuation: ctn_semantic/);
  assert.match(run.stdout, /Result written:/);
  assert.doesNotMatch(run.stdout, /Continuation resolved/);

  const resultPath = path.join(stateDir, `semantic_search_result_${continuationId}.json`);
  assert.equal(fs.existsSync(resultPath), true);
  const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  assert.equal(result.continuation_id, continuationId);
  assert.equal(result.query, "Fracta VPS Caddy Cogentia MCP");
  assert.equal(result.provider, "openai");
  assert.equal(result.model_name, "text-embedding-3-small");
  assert.equal(result.dimensions, 4);
  assert.deepEqual(result.query_embedding, [0.25, 0.5, 0.75, 1]);

  const continuation = JSON.parse(fs.readFileSync(path.join(continuationsDir, `${continuationId}.json`), "utf8"));
  assert.equal(continuation.status, "active");

  console.log(JSON.stringify({ ok: true, continuation_id: continuationId, dimensions: result.dimensions }, null, 2));
} finally {
  await new Promise(resolve => router.close(resolve));
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function testEnv() {
  return {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COGENTIA_REGISTRY: registryPath,
      COGENTIA_AI_ROUTER_URL: routerBase,
    },
    maxBuffer: 1024 * 1024,
  };
}

function testContinuation() {
  const now = new Date().toISOString();
  return {
    type: "continuation",
    protocol: "cogentia.continuation.v2",
    id: continuationId,
    continuation_id: continuationId,
    status: "active",
    kind: "semantic-search",
    title: "Semantic search for Fracta VPS Caddy Cogentia MCP",
    question: "Generate a vector embedding for the query.",
    priority: 1,
    dedupe_key: "test-semantic-search-worker",
    subject: { repo: "all", path: "" },
    context: {
      query: "Fracta VPS Caddy Cogentia MCP",
      view: "public",
      repo: "all",
      limit: 5,
      indexed_count: 3,
      embedding_profile: {
        provider: "openai",
        model_name: "text-embedding-3-small",
        dimensions: 4,
      },
    },
    expected_response: {
      format: "json",
      required: ["query_embedding", "model_name", "dimensions"],
    },
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
    if (req.method === "POST" && url.pathname === "/v1/embeddings") {
      const payload = await readJson(req);
      const dimensions = Number(payload.dimensions || 4) || 4;
      return json(res, 200, {
        object: "list",
        model: payload.model || "mock-embed",
        data: [{
          object: "embedding",
          index: 0,
          embedding: Array.from({ length: dimensions }, (__, i) => Number(((i + 1) / dimensions).toFixed(6))),
        }],
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
