#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(root, "..");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const token = "test-session-entities";

const daemon = spawn(process.execPath, ["scripts/agent-gateway.js", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    AGENT_GATEWAY_ALLOW_ANY_CWD: "1",
    AGENT_GATEWAY_REPO_ROOTS: workspace,
    AGENT_GATEWAY_MAX_CONCURRENT: "12",
    AGENT_GATEWAY_REPL_BOOTSTRAP_TIMEOUT_MS: "60000",
    AGENT_GATEWAY_REPL_TURN_TIMEOUT_MS: "60000",
    AGENT_GATEWAY_TOKEN: token,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let daemonLog = "";
daemon.stdout.on("data", chunk => { daemonLog += chunk; });
daemon.stderr.on("data", chunk => { daemonLog += chunk; });

const results = { ok: true, port, entities: {} };

try {
  await waitForHealth();

  const health = await getJson("/health");
  const tools = await getJson("/v1/tools");
  assert.equal(tools.schema, "agent-gateway.tools.v1");
  results.tool_count = tools.data.length;

  for (const entity of ["python", "nodejs", "inox", "shell", "sqlite", "psql", "ipython"]) {
    results.entities[entity] = { probe: health.adapters?.[entity] || null };
  }

  if (health.adapters?.python?.ok) {
    const py = await replTurn("python-repl", "print(42)", /42/);
    results.entities.python.turn1_ms = py.wall_ms;
    const py2 = await replTurn("python-repl", "print(43)", /43/, py.session_id);
    results.entities.python.turn2_ms = py2.wall_ms;
    results.entities.python.reused = py2.headers.get("x-agent-gateway-timing-session-reused");
    assert.equal(py2.headers.get("x-agent-gateway-timing-session-reused"), "1");
  } else {
    results.entities.python.skipped = "probe_failed";
  }

  if (health.adapters?.nodejs?.ok) {
    const node = await replTurn("nodejs-repl", "1+1", /2/);
    results.entities.nodejs.turn1_ms = node.wall_ms;
    const node2 = await replTurn("nodejs-repl", "2+2", /4/, node.session_id);
    results.entities.nodejs.turn2_ms = node2.wall_ms;
    assert.equal(node2.headers.get("x-agent-gateway-timing-session-reused"), "1");
  } else {
    results.entities.nodejs.skipped = "probe_failed";
  }

  if (health.adapters?.inox?.ok) {
    const inox = await replTurn("inox-repl", "2 2 + .", /4/);
    results.entities.inox.turn1_ms = inox.wall_ms;
    const inox2 = await replTurn("inox-repl", "3 1 + .", /4/, inox.session_id);
    results.entities.inox.turn2_ms = inox2.wall_ms;
    assert.equal(inox2.headers.get("x-agent-gateway-timing-session-reused"), "1");

    const sig = await postJson(`/v1/sessions/${inox.session_id}/signal`, { signal: "interrupt" });
    assert.equal(sig.status, 200);
    assert.equal(sig.body.ok, true);
    results.entities.inox.signal = sig.body.signal.signal;
  } else {
    results.entities.inox.skipped = "probe_failed";
  }

  if (health.adapters?.shell?.ok) {
    const sh = await replTurn("shell-repl", "echo shell-tool-ok", /shell-tool-ok/);
    results.entities.shell.turn1_ms = sh.wall_ms;
  } else {
    results.entities.shell.skipped = "probe_failed";
  }

  if (health.adapters?.sqlite?.ok) {
    const sql = await replTurn("sqlite-repl", "select 42;", /42/);
    results.entities.sqlite.turn1_ms = sql.wall_ms;
    const sql2 = await replTurn("sqlite-repl", "select 43;", /43/, sql.session_id);
    results.entities.sqlite.turn2_ms = sql2.wall_ms;
    assert.equal(sql2.headers.get("x-agent-gateway-timing-session-reused"), "1");
  } else {
    results.entities.sqlite.skipped = "probe_failed";
  }

  if (health.adapters?.psql?.ok) {
    results.entities.psql.skipped = "probe_only";
  } else {
    results.entities.psql.skipped = "probe_failed";
  }

  if (health.adapters?.ipython?.ok) {
    const ipy = await replTurn("ipython-repl", "print(99)", /99/);
    results.entities.ipython.turn1_ms = ipy.wall_ms;
  } else {
    results.entities.ipython.skipped = "probe_failed";
  }

  const ran = ["python", "nodejs", "inox", "shell", "sqlite"].some(id => !results.entities[id].skipped);
  assert.ok(ran, `no session entities available: ${daemonLog}`);

  console.log(JSON.stringify(results, null, 2));
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
  return { status: response.status, body, headers: response.headers };
}

async function replTurn(model, prompt, pattern, sessionId = null) {
  const t0 = Date.now();
  const metadata = { adapter_mode: "repl" };
  if (sessionId) metadata.session_id = sessionId;
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      metadata,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const content = body.choices?.[0]?.message?.content || "";
  assert.match(content, pattern, `${model} content: ${content.slice(0, 200)}`);
  return {
    session_id: body.metadata?.session_id,
    wall_ms: Date.now() - t0,
    transport: body.metadata?.transport,
    headers: response.headers,
  };
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