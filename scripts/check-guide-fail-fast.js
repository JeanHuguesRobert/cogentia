#!/usr/bin/env node

/**
 * Guide fail-fast when AI router reports llm:false:
 * no intent/planner/synthesis chat calls; extractive answer from corpus packs.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const daemonPort = await freePort();
const routerPort = await freePort();
const mcpPort = await freePort();
const daemonBase = `http://127.0.0.1:${daemonPort}`;
const routerBase = `http://127.0.0.1:${routerPort}`;
const mcpBase = `http://127.0.0.1:${mcpPort}`;
const seenChatPayloads = [];

const router = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, {
      status: "ok",
      service: "mock-magistral-router-only",
      llm: false,
      mode: "router_only",
      capabilities: { chat_completions: false, embeddings: true },
    });
  }
  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    return sendJson(res, 503, { error: { type: "llm_false", message: "no llm" } });
  }
  return sendJson(res, 404, { error: "not_found" });
});
await listen(router, routerPort);

const daemon = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", daemonBase);
  if (req.method === "GET" && url.pathname === "/api/context/health") {
    return sendJson(res, 200, { ok: true, service: "mock-context-gateway" });
  }
  if (req.method === "POST" && url.pathname === "/api/context/pack-batch") {
    const payload = JSON.parse(await readBody(req) || "{}");
    const queries = Array.isArray(payload.queries) ? payload.queries : [];
    return sendJson(res, 200, {
      ok: true,
      strategy: "context-pack-batch-v1",
      packs: queries.map(query => ({
        query,
        ok: true,
        strategy: "mock-v1",
        sources: [{
          source_id: "mock:README.md#L1-L4",
          title: "Mock README",
          repo: "mock",
          path: "README.md",
          start_line: 1,
          end_line: 4,
          github_url: "https://example.invalid/README.md",
        }],
        context: "FractaVolta public context.",
        warnings: [],
      })),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/context/pack") {
    return sendJson(res, 200, {
      ok: true,
      query: url.searchParams.get("q") || "",
      strategy: "mock-v1",
      sources: [{
        source_id: "mock:README.md#L1-L4",
        title: "Mock README",
        repo: "mock",
        path: "README.md",
        start_line: 1,
        end_line: 4,
      }],
      context: "FractaVolta public context.",
      warnings: [],
    });
  }
  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    seenChatPayloads.push(JSON.parse(await readBody(req) || "{}"));
    return sendJson(res, 503, {
      error: { type: "ai_router_chat_unavailable", message: "llm_false" },
    });
  }
  return sendJson(res, 404, { ok: false, error: "not_found" });
});
await listen(daemon, daemonPort);

const envDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-guide-ff-"));
const envFile = path.join(envDir, ".env");
fs.writeFileSync(envFile, "", "utf8");

const child = spawn(process.execPath, ["scripts/cogentia-mcp-http.js"], {
  cwd: root,
  env: {
    ...process.env,
    COGENTIA_DAEMON_URL: daemonBase,
    COGENTIA_AI_ROUTER_URL: routerBase,
    COGENTIA_MCP_VIEW: "public",
    COGENTIA_GUIDE_ENV_FILE: envFile,
    COGENTIA_GUIDE_WEB_SEARCH: "0",
    COGENTIA_GUIDE_PLANNER: "1",
    COGENTIA_GUIDE_CHAT_PROBE_TTL_MS: "1000",
    PORT: String(mcpPort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", chunk => { stderr += chunk; });

try {
  await waitForMcp();

  const health = await (await fetch(`${mcpBase}/guide/health`)).json();
  assert.equal(health.context.chat.available, false);
  assert.equal(health.context.chat.fail_fast, true);
  assert.match(String(health.context.chat.reason), /llm_false|chat/);

  const started = Date.now();
  const chat = await postJson(`${mcpBase}/guide/chat`, {
    question: "What is the FractaVolta public Guide digital twin?",
    locale: "en",
  });
  const elapsed = Date.now() - started;

  assert.equal(chat.ok, true);
  assert.equal(chat.mode, "extractive_fallback");
  assert.ok(chat.warnings.includes("guide_chat_fail_fast") || chat.warnings.includes("guide_chat_llm_unavailable"));
  assert.equal(chat.chat?.available, false);
  assert.ok(chat.sources?.length >= 1);
  assert.ok(elapsed < 15000, `fail-fast took too long: ${elapsed}ms; stderr=${stderr}`);
  assert.equal(seenChatPayloads.length, 0, `unexpected chat calls: ${seenChatPayloads.length}`);

  console.log(JSON.stringify({
    ok: true,
    guide_fail_fast: true,
    elapsed_ms: elapsed,
    chat_calls: seenChatPayloads.length,
    mode: chat.mode,
    reason: health.context.chat.reason,
  }, null, 2));
} finally {
  child.kill();
  fs.rmSync(envDir, { recursive: true, force: true });
  daemon.close();
  router.close();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function waitForMcp() {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`${mcpBase}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`MCP did not start: ${stderr}`);
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
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
