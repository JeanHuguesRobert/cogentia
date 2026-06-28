#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { createAiRouterClient, aiRouterHealth } from "./lib/ai-router-client.js";

const routerPort = await freePort();
const routerBase = `http://127.0.0.1:${routerPort}`;
const router = await startMockRouter(routerPort);

try {
  const client = createAiRouterClient({ baseUrl: routerBase, apiKey: "test-key" });

  const health = await client.health();
  assert.equal(health.ok, true);
  assert.equal(health.body.service, "mock-magistral");

  const summarized = await aiRouterHealth({ baseUrl: routerBase });
  assert.equal(summarized.ok, true);
  assert.equal(summarized.available, true);
  assert.equal(summarized.service, "mock-magistral");
  assert.equal(summarized.router.loopback, true);
  assert.equal(Object.hasOwn(summarized.health, "api_key"), false);

  const models = await client.models();
  assert.equal(models.ok, true);
  assert.equal(models.body.data[0].id, "mock-fast");

  const chat = await client.chatCompletions({
    model: "mock-fast",
    messages: [{ role: "user", content: "hello" }],
  });
  assert.equal(chat.ok, true);
  assert.equal(chat.body.choices[0].message.content, "mock answer");

  const embeddings = await client.embeddings({
    model: "mock-embed",
    input: ["hello"],
  });
  assert.equal(embeddings.ok, true);
  assert.deepEqual(embeddings.body.data[0].embedding, [0.1, 0.2, 0.3]);

  assert.throws(
    () => createAiRouterClient({ baseUrl: "http://user:pass@127.0.0.1:8880" }),
    /must not embed credentials/
  );

  const daemonPort = await freePort();
  const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(daemonPort)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COGENTIA_DAEMON_VIEW: "public",
      COGENTIA_AI_ROUTER_URL: routerBase,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let daemonLog = "";
  daemon.stdout.on("data", chunk => { daemonLog += chunk; });
  daemon.stderr.on("data", chunk => { daemonLog += chunk; });

  try {
    await waitForDaemon(daemonPort, daemonLog);
    const response = await fetch(`http://127.0.0.1:${daemonPort}/api/agent/health`);
    assert.equal(response.ok, true);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.ai_router.available, true);
    assert.equal(body.ai_router.service, "mock-magistral");
    assert.equal(body.ai_router.router.loopback, true);
    assert.equal(Object.hasOwn(body.ai_router.router, "origin"), false);
  } finally {
    daemon.kill();
  }

  console.log(JSON.stringify({ ok: true, router: routerBase, daemon_agent_health: true }, null, 2));
} finally {
  await new Promise(resolve => router.close(resolve));
}

function startMockRouter(port) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        status: "ok",
        service: "mock-magistral",
        api_key: "must-not-leak",
        capabilities: {
          chat_completions: true,
          embeddings: true,
        },
      });
    }
    if (req.method === "GET" && url.pathname === "/v1/models") {
      return json(res, 200, {
        object: "list",
        data: [{ id: "mock-fast", object: "model", owned_by: "mock-magistral" }],
      });
    }
    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      return json(res, 200, {
        id: "chatcmpl_mock",
        object: "chat.completion",
        choices: [{ index: 0, message: { role: "assistant", content: "mock answer" }, finish_reason: "stop" }],
      });
    }
    if (req.method === "POST" && url.pathname === "/v1/embeddings") {
      return json(res, 200, {
        object: "list",
        data: [{ object: "embedding", index: 0, embedding: [0.1, 0.2, 0.3] }],
        model: "mock-embed",
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

async function waitForDaemon(port, daemonLog) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/status`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Cogentia daemon did not start: ${daemonLog}`);
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
