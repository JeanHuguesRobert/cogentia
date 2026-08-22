#!/usr/bin/env node
/**
 * get_lines / health must not walk the full markdown inventory.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    COGENTIA_DAEMON_VIEW: "public",
    COGENTIA_RATE_LIMIT_MAX: "40",
    COGENTIA_AI_ROUTER_URL: "http://127.0.0.1:9",
    COGENTIA_AI_ROUTER_TIMEOUT_MS: "1000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let daemonLog = "";
daemon.stdout.on("data", chunk => { daemonLog += chunk; });
daemon.stderr.on("data", chunk => { daemonLog += chunk; });

try {
  await waitForHealth();
  const health1 = await timedJson("/api/context/health?quick=1");
  assert.equal(health1.body.ok, true);
  const health2 = await timedJson("/api/context/health?quick=1");
  assert.equal(health2.body.ok, true);
  assert.ok(health2.ms < 2000, `cached health should be <2s, got ${health2.ms}ms`);

  const lines = await timedJson("/api/context/lines?ref=cogentia:docs/cogentia-mcp.md&start=1&end=5");
  assert.equal(lines.body.ok, true, JSON.stringify(lines.body));
  assert.match(lines.body.source_id, /^cogentia:docs\/cogentia-mcp\.md#L1-L5$/);
  assert.ok(lines.body.text.length > 20);
  assert.ok(lines.ms < 8000, `get_lines should be <8s without inventory walk, got ${lines.ms}ms`);

  const doc = await timedJson("/api/context/doc?ref=cogentia:docs/cogentia-mcp.md");
  assert.equal(doc.body.ok, true);
  assert.equal(Object.hasOwn(doc.body.document, "full_path"), false);
  assert.ok(doc.ms < 8000, `context doc should be <8s, got ${doc.ms}ms`);

  const escapeRes = await fetch(`${base}/api/context/lines?ref=${encodeURIComponent("cogentia:../FractaVolta/README.md")}&start=1&end=2`);
  const escapeBody = await escapeRes.json();
  assert.equal(escapeRes.status, 404);
  assert.equal(escapeBody.ok, false);
  assert.equal(escapeBody.error, "document_not_found");

  const privateRes = await fetch(`${base}/api/context/lines?ref=${encodeURIComponent("registre-mariani:README.md")}&start=1&end=2`);
  const privateBody = await privateRes.json();
  assert.equal(privateRes.status, 404);
  assert.equal(privateBody.ok, false);
  assert.equal(privateBody.error, "document_not_found");

  console.log(JSON.stringify({
    ok: true,
    port,
    health1_ms: health1.ms,
    health2_ms: health2.ms,
    get_lines_ms: lines.ms,
    doc_ms: doc.ms,
  }));
} finally {
  daemon.kill();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`${base}/api/context/health?quick=1`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Daemon did not start: ${daemonLog}`);
}

async function timedJson(route) {
  const t0 = Date.now();
  const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return { ms: Date.now() - t0, status: response.status, body };
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
