#!/usr/bin/env node

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
  env: { ...process.env, COGENTIA_DAEMON_VIEW: "public", COGENTIA_RATE_LIMIT_MAX: "20" },
  stdio: ["ignore", "pipe", "pipe"],
});
let daemonLog = "";
daemon.stdout.on("data", chunk => { daemonLog += chunk; });
daemon.stderr.on("data", chunk => { daemonLog += chunk; });

try {
  await waitForHealth();
  const health = await getJson("/api/context/health");
  assert.equal(health.service, "cogentia-context-gateway");
  assert.equal(health.write_routes_public, false);
  assert.deepEqual(health.modes, ["keyword", "hybrid", "semantic"]);
  assert.equal(health.semantic_requires_ai_router_embeddings, true);
  const healthResponse = await fetch(`${base}/api/context/health`, { headers: { Origin: "https://untrusted.example" } });
  assert.equal(healthResponse.headers.has("access-control-allow-origin"), false);

  const indexStatus = await getJson("/api/index/status");
  assert.equal(Object.hasOwn(indexStatus, "path"), false);
  assert.equal(Object.hasOwn(indexStatus, "registry"), false);

  const search = await getJson("/api/context/search?q=autonomie%20de%20capacit%C3%A9&limit=3");
  assert.equal(search.ok, true);
  assert.ok(search.results.length > 0);
  assert.match(search.results[0].id, /^[^:]+:.+#L\d+-L\d+$/);
  assert.equal(JSON.stringify(search).includes(`${path.parse(root).root.replace(/\\/g, "\\\\")}`), false);

  const packPath = "/api/context/pack?q=autonomie%20de%20capacit%C3%A9&budget=8000&limit=3";
  const firstPack = await getJson(packPath);
  const secondPack = await getJson(packPath);
  assert.equal(firstPack.pack_hash, secondPack.pack_hash);
  assert.equal(firstPack.index_hash, secondPack.index_hash);
  assert.ok(firstPack.sources.every(source => source.source_id));

  const first = search.results[0];
  const ref = `${first.repo}:${first.path}`;
  const document = await getJson(`/api/context/doc?ref=${encodeURIComponent(ref)}`);
  assert.equal(document.ok, true);
  assert.equal(Object.hasOwn(document.document, "full_path"), false);

  const lines = await getJson(`/api/context/lines?ref=${encodeURIComponent(ref)}&start=${first.start_line}&end=${Math.min(first.end_line, first.start_line + 2)}`);
  assert.equal(lines.ok, true);
  assert.match(lines.source_id, /#L\d+-L\d+$/);

  assert.equal(await responseStatus("/api/index/rebuild", { method: "POST" }), 403);
  assert.equal(await responseStatus("/api/cli/docs/inspect?ref=x"), 403);
  assert.equal(await responseStatus("/api/state"), 403);
  assert.equal(await responseStatus("/api/state?view=full", { headers: { "X-Cogentia-Entry": "public" } }), 403);

  const mcp = await runMcp([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "cogentia_health", arguments: {} } },
  ]);
  assert.equal(mcp[0].result.serverInfo.name, "cogentia-mcp");
  assert.equal(mcp[1].result.tools.length, 5);
  assert.equal(mcp[2].result.structuredContent.ok, true);

  const rateStatuses = [];
  for (let request = 0; request < 25; request++) rateStatuses.push(await responseStatus("/api/context/health"));
  assert.ok(rateStatuses.includes(429));

  console.log(JSON.stringify({ ok: true, port, search_results: search.count, pack_hash: firstPack.pack_hash, mcp_tools: 5, rate_limit: 429 }, null, 2));
} finally {
  daemon.kill();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${base}/api/context/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Daemon did not start: ${daemonLog}`);
}

async function getJson(route) {
  const response = await fetch(`${base}${route}`);
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return body;
}

async function responseStatus(route, options = {}) {
  return (await fetch(`${base}${route}`, options)).status;
}

async function runMcp(messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/cogentia-mcp.js"], {
      cwd: root,
      env: { ...process.env, COGENTIA_DAEMON_URL: base, COGENTIA_MCP_VIEW: "public" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(`MCP exited ${code}: ${stderr}`));
      resolve(stdout.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse));
    });
    child.stdin.end(`${messages.map(message => JSON.stringify(message)).join("\n")}\n`);
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
