#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const daemonPort = await freePort();
const mcpPort = await freePort();
const daemonBase = `http://127.0.0.1:${daemonPort}`;
const mcpBase = `http://127.0.0.1:${mcpPort}`;
const seenEntries = [];
const seenPackQueries = [];
const seenChatPayloads = [];
const seenPlannerPayloads = [];

const daemon = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", daemonBase);
  seenEntries.push(String(req.headers["x-cogentia-entry"] || ""));
  if (req.method === "GET" && url.pathname === "/api/context/health") {
    return sendJson(res, 200, { ok: true, service: "mock-context-gateway" });
  }
  if (req.method === "GET" && url.pathname === "/api/context/pack") {
    seenPackQueries.push(url.searchParams.get("q") || "");
    return sendJson(res, 200, mockPack(url.searchParams.get("q") || ""));
  }
  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    const payload = JSON.parse(await readBody(req) || "{}");
    if (payload.metadata?.purpose === "guide_planner") {
      seenPlannerPayloads.push(payload);
      return sendJson(res, 200, {
        id: "chatcmpl_mock_planner",
        object: "chat.completion",
        model: payload.model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              objective: "Find public FractaVolta orientation sources.",
              queries: ["FractaVolta public Guide", "FractaVolta website"],
              notes: ["Use public corpus only."],
            }),
          },
          finish_reason: "stop",
        }],
        cogentia_context: {
          query: "planner",
          strategy: "context-disabled",
          sources: [],
          warnings: [],
        },
      });
    }
    seenChatPayloads.push(payload);
    const question = String(payload.messages?.findLast?.(message => message.role === "user")?.content || "");
    if (/fallback/i.test(question)) {
      return sendJson(res, 502, {
        error: { type: "ai_router_unavailable", message: "mock router down" },
        cogentia_context: mockPack(question),
      });
    }
    return sendJson(res, 200, {
      id: "chatcmpl_mock_guide",
      object: "chat.completion",
      model: payload.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: "FractaVolta is explained through the public corpus [1].",
        },
        finish_reason: "stop",
      }],
      cogentia_context: {
        query: question,
        pack_hash: "pack_mock",
        index_hash: "index_mock",
        retrieval_policy_version: "mock-v1",
        sources: mockPack(question).sources,
        warnings: [],
      },
    });
  }
  return sendJson(res, 404, { ok: false, error: "not_found" });
});

await listen(daemon, daemonPort);

const child = spawn(process.execPath, ["scripts/cogentia-mcp-http.js"], {
  cwd: root,
  env: {
    ...process.env,
    COGENTIA_DAEMON_URL: daemonBase,
    COGENTIA_MCP_VIEW: "public",
    COGENTIA_CORS_ORIGIN: "https://fractavolta.com",
    PORT: String(mcpPort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", chunk => { stderr += chunk; });

try {
  await waitForMcp();

  const healthResponse = await fetch(`${mcpBase}/guide/health`, {
    headers: { Origin: "https://fractavolta.com" },
  });
  assert.equal(healthResponse.headers.get("access-control-allow-origin"), "https://fractavolta.com");
  const health = await healthResponse.json();
  assert.equal(health.service, "fractavolta-guide");
  assert.equal(health.mandate.instance_id, "fractavolta-public-guide");
  assert.equal(health.mandate.maturity, "infant");
  assert.equal(health.mandate.corpus_view, "public");
  assert.equal(health.context.daemon.service, "mock-context-gateway");
  assert.equal(health.context.planner_enabled, true);

  const chat = await postJson(`${mcpBase}/guide/chat`, {
    question: "What is the FractaVolta public Guide digital twin?",
    locale: "en",
  });
  assert.equal(chat.ok, true);
  assert.equal(chat.mode, "conversational");
  assert.equal(chat.mandate.surface, "web-guide");
  assert.match(chat.answer, /FractaVolta/);
  assert.match(chat.answer, /\[mock:README\.md#L1-L4\]/);
  assert.doesNotMatch(chat.answer, /\[1\]/);
  assert.equal(chat.sources[0].source_id, "mock:README.md#L1-L4");
  assert.equal(seenPlannerPayloads.length, 1);
  assert.equal(seenPlannerPayloads[0].cogentia.context, false);
  assert.ok(seenPackQueries.includes("What is the FractaVolta public Guide digital twin?"));
  assert.ok(seenPackQueries.includes("FractaVolta public Guide"));
  assert.ok(seenPackQueries.includes("public Guide digital twin"));
  assert.ok(seenChatPayloads[0].messages.some(message => /Public Guide retrieval run/.test(message.content)));
  assert.equal(chat.context.guide_retrieval.strategy, "guide-retrieval-run-v1");
  assert.equal(chat.context.guide_retrieval.planner.source, "magistral");
  assert.ok(chat.context.guide_retrieval.source_ids.includes("mock:README.md#L1-L4"));

  const stream = await postSse(`${mcpBase}/guide/chat`, {
    question: "Stream the FractaVolta public Guide answer.",
    locale: "en",
    stream: true,
  });
  assert.ok(stream.some(event => event.name === "guide_status" && event.data.stage === "planning"));
  assert.ok(stream.some(event => event.name === "guide_retrieval_query"));
  const streamedAnswer = stream.find(event => event.name === "guide_answer")?.data;
  assert.equal(streamedAnswer.ok, true);
  assert.equal(streamedAnswer.mode, "conversational");
  assert.match(streamedAnswer.answer, /\[mock:README\.md#L1-L4\]/);

  const fallback = await postJson(`${mcpBase}/guide/chat`, {
    question: "fallback please",
    locale: "en",
  });
  assert.equal(fallback.ok, true);
  assert.equal(fallback.mode, "extractive_fallback");
  assert.equal(fallback.mandate.instance_id, "fractavolta-public-guide");
  assert.ok(fallback.warnings.includes("guide_chat_backend_unavailable"));
  assert.equal(fallback.sources[0].source_id, "mock:README.md#L1-L4");
  assert.ok(seenEntries.every(entry => entry === "public"));

  console.log(JSON.stringify({ ok: true, guide_chat: true, guide_stream: true, fallback: true, public_entry: true }, null, 2));
} finally {
  child.kill();
  daemon.close();
}

function mockPack(query) {
  return {
    ok: true,
    query,
    strategy: "mock-v1",
    retrieval_policy_version: "mock-v1",
    view: "public",
    pack_hash: "pack_mock",
    index_hash: "index_mock",
    sources: [{
      source_id: "mock:README.md#L1-L4",
      repo: "mock",
      path: "README.md",
      title: "Mock corpus",
      start_line: 1,
      end_line: 4,
      github_url: "https://example.invalid/mock/README.md#L1-L4",
    }],
    context: [{
      source_id: "mock:README.md#L1-L4",
      text: "FractaVolta public context.",
    }],
    warnings: [],
  };
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

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async response => {
    const parsed = await response.json();
    assert.equal(response.ok, true, JSON.stringify(parsed));
    return parsed;
  });
}

async function postSse(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  if (!response.ok) assert.fail(await response.text());
  assert.match(response.headers.get("content-type") || "", /text\/event-stream/);
  const text = await response.text();
  return text.trim().split(/\n\n+/).map(parseSseBlock).filter(Boolean);
}

function parseSseBlock(block) {
  let name = "message";
  const data = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) name = line.slice("event:".length).trim();
    if (line.startsWith("data:")) data.push(line.slice("data:".length).trim());
  }
  if (!data.length) return null;
  return { name, data: JSON.parse(data.join("\n")) };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}

async function waitForMcp() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${mcpBase}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Guide HTTP server did not start: ${stderr}`);
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
