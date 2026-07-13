#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const token = "test-gateway-token";

const daemon = spawn(process.execPath, ["scripts/agent-gateway.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    AGENT_GATEWAY_TEST_MOCK: "1",
    AGENT_GATEWAY_ALLOW_ANY_CWD: "1",
    AGENT_GATEWAY_MAX_CONCURRENT: "1",
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
  assert.equal(health.ok, true);
  assert.equal(health.service, "agent-cli-gateway");
  assert.equal(health.schema, "agent-gateway.health.v1");
  assert.equal(health.trust_boundary.schema, "agent-gateway.trust-boundary.v1");
  assert.equal(health.trust_boundary.plane, "action");
  assert.equal(health.trust_boundary.public_internet, false);
  assert.equal(health.trust_boundary.default_exposure, "local");
  assert.equal(health.trust_boundary.authority, "admin");
  assert.equal(health.adapters.mock.ok, true);

  const models = await getJson("/v1/models");
  assert.equal(models.object, "list");
  assert.equal(models.data.length, 7);
  const modelIds = models.data.map(m => m.id).sort();
  assert.deepEqual(modelIds, ["agy", "antigravity", "claude", "claude-code", "codex", "grok", "grok-build"]);

  const noAuth = await fetch(`${base}/v1/models`);
  assert.equal(noAuth.status, 401);

  const cors = await fetch(`${base}/health`, { headers: { Origin: "https://example.test" } });
  assert.equal(cors.headers.get("access-control-allow-origin"), "https://example.test");

  for (const model of ["grok-build", "grok", "claude-code", "claude", "codex", "antigravity", "agy"]) {
    const res = await postJson("/v1/chat/completions", {
      model,
      stream: false,
      messages: [{ role: "user", content: `hello ${model}` }],
    }, { Authorization: `Bearer ${token}` });
    assert.equal(res.status, 200, model);
    assert.match(res.body.choices[0].message.content, /^mock:hello /, model);
  }

  const completionRes = await postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    messages: [{ role: "user", content: "hello gateway" }],
  }, { Authorization: `Bearer ${token}` });
  assert.equal(completionRes.status, 200);
  const completion = completionRes.body;
  assert.match(completion.id, /^agw-/);
  assert.equal(completion.object, "chat.completion");
  assert.equal(completion.model, "grok-build");
  assert.match(completion.choices[0].message.content, /^mock:hello gateway/);

  const streamText = await streamCompletion({
    model: "claude-code",
    stream: true,
    messages: [{ role: "user", content: "stream test" }],
  });
  assert.match(streamText, /^mock:stream test/);

  const unknown = await postJson("/v1/chat/completions", {
    model: "unknown-model",
    messages: [{ role: "user", content: "x" }],
  }, { Authorization: `Bearer ${token}` });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, "model_not_found");

  const blocked = await postJson("/v1/chat/completions", {
    model: "codex",
    messages: [{ role: "user", content: "slow" }],
    metadata: { cwd: "C:\\outside\\repos" },
  }, { Authorization: `Bearer ${token}` }, { AGENT_GATEWAY_ALLOW_ANY_CWD: "0" });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, "cwd_forbidden");

  const slow = postJson("/v1/chat/completions", {
    model: "grok-build",
    stream: false,
    messages: [{ role: "user", content: "hold" }],
  }, { Authorization: `Bearer ${token}` });
  await new Promise(resolve => setTimeout(resolve, 100));
  const busy = await postJson("/v1/chat/completions", {
    model: "claude-code",
    stream: false,
    messages: [{ role: "user", content: "second" }],
  }, { Authorization: `Bearer ${token}` });
  await slow;
  assert.equal(busy.status, 409);
  assert.equal(busy.body.error.code, "concurrency_limit");

  console.log(JSON.stringify({
    ok: true,
    port,
    health: health.schema,
    models: models.data.map(m => m.id),
    completion: completion.choices[0].message.content.slice(0, 32),
    stream: streamText.slice(0, 32),
    concurrency_409: true,
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

async function getJson(route, headers = {}) {
  const response = await fetch(`${base}${route}`, {
    headers: { Authorization: `Bearer ${token}`, ...headers },
  });
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return body;
}

async function postJson(route, payload, headers = {}, envOverrides = null) {
  if (envOverrides) {
    return postJsonWithEnv(route, payload, headers, envOverrides);
  }
  const response = await fetch(`${base}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function postJsonWithEnv(route, payload, headers, envOverrides) {
  const childPort = await freePort();
  const child = spawn(process.execPath, ["scripts/agent-gateway.js", "--host", "127.0.0.1", "--port", String(childPort)], {
    cwd: root,
    env: {
      ...process.env,
      AGENT_GATEWAY_TEST_MOCK: "1",
      AGENT_GATEWAY_MAX_CONCURRENT: "1",
      AGENT_GATEWAY_TOKEN: token,
      ...envOverrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${childPort}/health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
      if (attempt === 49) throw new Error("secondary gateway did not start");
    }
    const response = await fetch(`http://127.0.0.1:${childPort}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return { status: response.status, body };
  } finally {
    child.kill();
  }
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
