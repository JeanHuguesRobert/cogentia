#!/usr/bin/env node

/**
 * Opt-in local end-to-end test:
 * public Guide -> local Magistral -> locally authenticated Codex ACP.
 *
 * RUN_GUIDE_MAGISTRAL_CODEX_INTEGRATION=1 \
 * CODEX_ACP_COMMAND=/absolute/path/to/codex-acp.cmd \
 * node scripts/test-guide-magistral-codex-local.js
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.RUN_GUIDE_MAGISTRAL_CODEX_INTEGRATION !== "1") {
  console.log(JSON.stringify({ ok: true, skipped: "set RUN_GUIDE_MAGISTRAL_CODEX_INTEGRATION=1" }));
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const magistralRoot = path.resolve(root, "..", "inseme", "packages", "magistral");
const pilot = path.join(magistralRoot, "pilots", "reference-js", "src", "main.js");
const configuredCommand = process.env.CODEX_ACP_COMMAND;
assert.ok(configuredCommand, "CODEX_ACP_COMMAND must identify the local Codex ACP launcher");
const acp = resolveWindowsCodexAcpShim(configuredCommand);
const contextPort = await freePort();
const magistralPort = await freePort();
const guidePort = await freePort();
const contextBase = `http://127.0.0.1:${contextPort}`;
const magistralBase = `http://127.0.0.1:${magistralPort}`;
const guideBase = `http://127.0.0.1:${guidePort}`;
const token = "guide-local-thinkpad-acp-test";
const publicCwd = fs.mkdtempSync(path.join(os.tmpdir(), "magistral-guide-public-"));
fs.writeFileSync(
  path.join(publicCwd, "PUBLIC_CONTEXT.md"),
  "The public verification marker is GUIDE_MAGISTRAL_CODEX_READONLY_OK.\n",
  "utf8",
);

const context = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", contextBase);
  if (req.method === "GET" && url.pathname === "/api/context/health") {
    return json(res, 200, { ok: true, service: "local-public-context-fixture" });
  }
  if ((req.method === "POST" && url.pathname === "/api/context/pack-batch") ||
      (req.method === "GET" && url.pathname === "/api/context/pack")) {
    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req) || "{}");
      const queries = Array.isArray(body.queries) ? body.queries : ["FractaVolta"];
      return json(res, 200, { ok: true, strategy: "context-pack-batch-v1", packs: queries.map(publicPack) });
    }
    return json(res, 200, publicPack(url.searchParams.get("q") || "FractaVolta"));
  }
  return json(res, 404, { ok: false, error: "not_found" });
});
await listen(context, contextPort);

const magistral = spawn("deno", ["run", "-A", "--no-lock", pilot], {
  cwd: magistralRoot,
  stdio: ["pipe", "pipe", "pipe"],
});
let magistralOutput = "";
magistral.stdout.on("data", (chunk) => { magistralOutput += String(chunk); });
magistral.stderr.on("data", (chunk) => { magistralOutput += String(chunk); });
magistral.stdin.end(JSON.stringify({
  runtime: { host: "127.0.0.1", port: magistralPort },
  input: { map: [{
    id: "local-thinkpad-codex-acp",
    adapter: "acp_stdio",
    command: acp.command,
    args: acp.args,
    cwd: publicCwd,
    model: "codex-local",
    // Magistral selects by the OpenAI `model` value used by the Guide.
    tier: "fractavolta-guide",
    blueprint_id: "public-guide",
    weight: 1,
    prompt_timeout_ms: 120_000,
  }] },
  secrets: { MAGISTRAL_API_KEY: token },
}));

const guide = spawn(process.execPath, ["scripts/cogentia-mcp-http.js"], {
  cwd: root,
  env: {
    ...process.env,
    COGENTIA_DAEMON_URL: contextBase,
    COGENTIA_GUIDE_MAGISTRAL_URL: magistralBase,
    COGENTIA_GUIDE_MAGISTRAL_API_KEY: token,
    COGENTIA_GUIDE_AGENT_GATEWAY: "0",
    COGENTIA_GUIDE_PLANNER: "0",
    COGENTIA_GUIDE_WEB_SEARCH: "0",
    COGENTIA_GUIDE_OPENROUTER_FREE_FALLBACK: "0",
    COGENTIA_GUIDE_INJECT_PRIMARY_STYLE: "0",
    COGENTIA_GUIDE_INJECT_PUBLIC_AGENTS: "0",
    COGENTIA_MCP_VIEW: "public",
    PORT: String(guidePort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let guideOutput = "";
guide.stdout.on("data", (chunk) => { guideOutput += String(chunk); });
guide.stderr.on("data", (chunk) => { guideOutput += String(chunk); });

try {
  await waitFor(() => magistralOutput.includes("MAGISTRAL_READY:"), 10_000, () => magistralOutput);
  await waitForGuide();
  const response = await fetch(`${guideBase}/guide/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      question: "Read PUBLIC_CONTEXT.md using a read-only command, then reply with exactly its public verification marker. Do not make changes.",
      locale: "en",
      stream: true,
    }),
  });
  assert.equal(response.status, 200, guideOutput);
  assert.match(response.headers.get("content-type") || "", /text\/event-stream/);
  const events = await readSse(response);
  const delta = events.map((event) => event.name === "guide_delta" ? event.data.content || "" : "").join("");
  assert.ok(delta.trim(), JSON.stringify({
    message: "Guide must expose a streamed visible response",
    events,
    guide_output: guideOutput.slice(-2_000),
    magistral_output: magistralOutput.slice(-2_000),
  }));
  assert.ok(events.some((event) => event.name === "guide_trace" && event.data.step === "provider.acp.session_update"), "Guide must expose ACP operational progress");
  assert.ok(events.some((event) => event.name === "guide_answer" && event.data.ok), "Guide must close with a structured answer");
  assert.match(delta, /GUIDE_MAGISTRAL_CODEX_READONLY_OK/, "Codex must read only the isolated public fixture");
  assert.equal(events.some((event) => {
    const trace = event.data?.provider_trace;
    return trace?.step === "acp.reasoning" && trace.visibility !== "withheld";
  }), false, "public trace must not disclose model reasoning");
  console.log(JSON.stringify({ ok: true, guide_sse: true, magistral_acp: true, public_trace: true }));
} finally {
  await stopProcess(guide);
  await stopProcess(magistral);
  await closeServer(context);
  fs.rmSync(publicCwd, { recursive: true, force: true });
}

function resolveWindowsCodexAcpShim(command) {
  if (!/\.cmd$/i.test(command)) return { command, args: [] };
  return {
    command: process.execPath,
    args: [path.join(path.dirname(command), "node_modules", "@agentclientprotocol", "codex-acp", "dist", "index.js")],
  };
}

function publicPack(query) {
  return {
    ok: true,
    query,
    strategy: "local-fixture",
    view: "public",
    sources: [{
      source_id: "FractaVolta:README.md#L1-L2",
      title: "FractaVolta public fixture",
      text: "FractaVolta is a public local energy and compute initiative.",
      github_url: "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/README.md#L1-L2",
    }],
    context: [{ source_id: "FractaVolta:README.md#L1-L2", text: "FractaVolta is public." }],
    warnings: [],
  };
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.once("end", () => resolve(body));
    req.once("error", reject);
  });
}

function stopProcess(child) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5_000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
    child.kill("SIGTERM");
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function listen(server, port) {
  return new Promise((resolve, reject) => server.listen(port, "127.0.0.1", (error) => error ? reject(error) : resolve()));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForGuide() {
  await waitFor(async () => {
    try { return (await fetch(`${guideBase}/guide/health`)).ok; } catch { return false; }
  }, 15_000, () => guideOutput);
}

async function waitFor(predicate, timeoutMs, describe) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`startup_timeout:${describe()}`);
}

async function readSse(response) {
  const text = await response.text();
  return text.split("\n\n").filter(Boolean).map((block) => {
    const name = block.match(/^event: (.+)$/m)?.[1] || "message";
    const raw = block.match(/^data: (.+)$/m)?.[1] || "{}";
    return raw === "[DONE]" ? { name, done: true } : { name, data: JSON.parse(raw) };
  });
}
