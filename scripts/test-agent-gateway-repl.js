#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const token = "test-gateway-repl-token";

const daemon = spawn(process.execPath, ["scripts/agent-gateway.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    AGENT_GATEWAY_TEST_MOCK: "1",
    AGENT_GATEWAY_ALLOW_ANY_CWD: "1",
    AGENT_GATEWAY_MAX_CONCURRENT: "4",
    AGENT_GATEWAY_REPL_BOOTSTRAP_TIMEOUT_MS: "15000",
    AGENT_GATEWAY_REPL_TURN_TIMEOUT_MS: "30000",
    AGENT_GATEWAY_TOKEN: token,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let daemonLog = "";
daemon.stdout.on("data", chunk => { daemonLog += chunk; });
daemon.stderr.on("data", chunk => { daemonLog += chunk; });

try {
  await waitForHealth();

  const health = await getJson("/health");
  assert.equal(health.repl_sessions, 0);

  const first = await postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    metadata: { adapter_mode: "repl" },
    messages: [{ role: "user", content: "turn one" }],
  });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.match(first.body.metadata.session_id, /^agw-sess-/);
  assert.match(first.body.choices[0].message.content, /repl-mock:turn one/);
  const sessionId = first.body.metadata.session_id;

  const healthAfter = await getJson("/health");
  assert.equal(healthAfter.repl_sessions, 1);

  const second = await postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    metadata: { session_id: sessionId },
    messages: [{ role: "user", content: "turn two" }],
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.metadata.session_id, sessionId);
  assert.match(second.body.choices[0].message.content, /repl-mock:turn two/);

  const streamText = await streamCompletion({
    model: "grok-build",
    stream: true,
    metadata: { adapter_mode: "repl" },
    messages: [{ role: "user", content: "stream repl" }],
  });
  assert.match(streamText, /repl-mock:stream repl/);

  const holdSession = await postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    metadata: { adapter_mode: "repl" },
    messages: [{ role: "user", content: "init session" }],
  });
  const holdSessionId = holdSession.body.metadata.session_id;

  const slow = postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    metadata: { session_id: holdSessionId },
    messages: [{ role: "user", content: "hold repl" }],
  });
  await new Promise(resolve => setTimeout(resolve, 200));
  const busy = await postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    metadata: { session_id: holdSessionId },
    messages: [{ role: "user", content: "blocked" }],
  });
  await slow;
  assert.equal(busy.status, 409);
  assert.equal(busy.body.error.code, "session_busy");

  const unknown = await postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    metadata: { session_id: "agw-sess-deadbeef" },
    messages: [{ role: "user", content: "nope" }],
  });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, "session_not_found");

  console.log(JSON.stringify({
    ok: true,
    port,
    multi_turn: true,
    stream_repl: streamText.slice(0, 32),
    session_busy_409: true,
  }, null, 2));
} finally {
  daemon.kill();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${base}/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Gateway did not start: ${daemonLog}`);
}

async function getJson(route) {
  const response = await fetch(`${base}${route}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return body;
}

async function postJson(route, payload) {
  const response = await fetch(`${base}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function streamCompletion(payload) {
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  assert.equal(response.ok, true, text);
  let content = "";
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6);
    if (data === "[DONE]") break;
    const chunk = JSON.parse(data);
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) content += delta;
  }
  return content;
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