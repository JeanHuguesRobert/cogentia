#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { test, mock } from "node:test";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createMcpCore, transportFromHttpRequest } from "./lib/cogentia-mcp-core.js";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { MEMORY_CAPTURE_MAX_BYTES, readMemoryCaptureStdin } from "./lib/memory-capture-surface.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env, COGENTIA_MCP_VIEW: "full", COGENTIA_ADMIN_TOKEN: "synthetic-capture-admin",
  COGENTIA_MCP_ALLOW_MUTATE: "0", COGENTIA_MCP_JHN_MUTATE: "0", COGENTIA_MCP_JHN_TOKEN: "",
  COGENTIA_DAEMON_URL: "http://127.0.0.1:9" };
const full = createMcpCore(env);
const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
const fixture = (name) => fs.readFileSync(new URL(`../prompts/fixtures/agent-acquired-context/${name}`, import.meta.url), "utf8");
const rich = fixture("rich-memory.yaml");
const message = (text, meta) => ({ jsonrpc: "2.0", id: 1, method: "tools/call",
  params: { name: "cogentia_memory_capture", arguments: { text }, _meta: meta } });
const http = (headers = {}) => transportFromHttpRequest({ headers });
const cli = (text, args = ["memory", "capture", "--stdin", "--json"]) => spawnSync(process.execPath,
  ["scripts/cogentia.js", ...args], { cwd: root, env, input: text, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 15000 });
const runCli = (text) => {
  const result = cli(text);
  assert.equal(result.error, undefined);
  assert.equal(result.stderr, "");
  return { status: result.status, data: JSON.parse(result.stdout) };
};

test("CLI and private MCP return exactly the core's synthetic ingestion outcomes", async () => {
  for (const name of ["rich-memory.yaml", "limited-memory.yaml", "no-persistent-memory.yaml",
    "ingestion/extra-fields.yaml", "ingestion/missing-source.json", "ingestion/malformed.json"]) {
    const text = fixture(name);
    const expected = ingestAgentAcquiredContext(text);
    const result = runCli(text);
    assert.equal(result.status, expected.ok ? 0 : 2);
    assert.deepEqual(result.data, expected, name);
    const response = await full.handleJsonRpc(message(text));
    assert.deepEqual(response.result.structuredContent.data, expected, name);
    assert.equal(response.result.structuredContent.view, "full");
  }
});

test("public discovery hides capture; public calls fail without reading arguments or echoing input", async () => {
  const listed = await publicCore.handleJsonRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(listed.result.tools.some((tool) => tool.name === "cogentia_memory_capture"), false);
  assert.equal(publicCore.tools.some((tool) => tool.name === "cogentia_memory_capture"), false);
  const args = { get text() { throw new Error("private text was read"); } };
  await assert.rejects(() => publicCore.callTool("cogentia_memory_capture", args),
    (error) => error.error_class === "tier_forbidden");
  const denied = await publicCore.handleJsonRpc(message(rich, { "cogentia.actor": "agent:jhn", auth: "admin" }), http());
  assert.equal(denied.result.isError, true);
  assert.equal(denied.result.structuredContent.error_class, "tier_forbidden");
  assert.equal(JSON.stringify(denied).includes("Person Example"), false);
});

test("HTTP cannot inherit full-server static admin rights, even when mutation is enabled", async () => {
  const core = createMcpCore({ ...env, COGENTIA_MCP_ALLOW_MUTATE: "1" });
  for (const headers of [{}, { authorization: "Bearer wrong" }, { "x-cogentia-actor": "agent:jhn" }]) {
    const denied = await core.handleJsonRpc(message(rich), http(headers));
    assert.equal(denied.result.structuredContent.error_class, "tier_forbidden");
    assert.equal(JSON.stringify(denied).includes("Person Example"), false);
    const listed = await core.handleJsonRpc({ jsonrpc: "2.0", id: 3, method: "tools/list" }, http(headers));
    assert.equal(listed.result.tools.some((tool) => tool.name === "cogentia_memory_capture"), false);
    // Preserve existing tool catalogue semantics outside this capture.
    assert.equal(listed.result.tools.some((tool) => tool.name === "cogentia_continuation_resolve"), true);
  }
  const allowed = await core.handleJsonRpc(message(rich), http({ authorization: `Bearer ${env.COGENTIA_ADMIN_TOKEN}` }));
  assert.deepEqual(allowed.result.structuredContent.data, ingestAgentAcquiredContext(rich));
  const listed = await core.handleJsonRpc({ jsonrpc: "2.0", id: 4, method: "tools/list" }, http({ authorization: env.COGENTIA_ADMIN_TOKEN }));
  assert.equal(listed.result.tools.some((tool) => tool.name === "cogentia_memory_capture"), true);
});

test("attested JHN requests work on a public server; wrong token and actor fail", async () => {
  const core = createMcpCore({ COGENTIA_MCP_JHN_MUTATE: "1", COGENTIA_MCP_JHN_TOKEN: "synthetic-jhn-token" });
  for (const [actor, token, ok] of [["agent:jhn", "synthetic-jhn-token", true],
    ["agent:jhn", "wrong", false], ["stranger", "synthetic-jhn-token", false]]) {
    const response = await core.handleJsonRpc(message(rich), http({ authorization: `Bearer ${token}`, "x-cogentia-actor": actor }));
    if (ok) {
      assert.deepEqual(response.result.structuredContent.data, ingestAgentAcquiredContext(rich));
      assert.equal(response.result.structuredContent.view, "full");
      const listed = await core.handleJsonRpc({ jsonrpc: "2.0", id: 5, method: "tools/list" },
        { ...http({ authorization: `Bearer ${token}`, "x-cogentia-actor": actor }), protocolVersionHeader: "2026-07-28" });
      assert.equal(listed.result.cacheScope, "private");
      assert.equal(listed.result.tools.some((tool) => tool.name === "cogentia_memory_capture"), true);
    } else {
      assert.equal(response.result.structuredContent.error_class, "tier_forbidden");
      assert.equal(JSON.stringify(response).includes("Person Example"), false);
    }
  }
});

test("bounded UTF-8 input and safe errors agree across CLI and MCP", async () => {
  const text = "é".repeat(MEMORY_CAPTURE_MAX_BYTES / 2 + 1);
  const result = runCli(text);
  assert.equal(result.status, 1);
  assert.equal(result.data.error_class, "payload_too_large");
  const response = await full.handleJsonRpc(message(text));
  assert.equal(response.result.structuredContent.error_class, result.data.error_class);
  assert.deepEqual(response.result.structuredContent.error, result.data.error);
  assert.equal(JSON.stringify(response).includes("é"), false);
  const exact = "x".repeat(MEMORY_CAPTURE_MAX_BYTES);
  assert.equal((await full.callTool("cogentia_memory_capture", { text: exact })).raw.text, exact);
  for (const args of [{}, { text: 7 }, { text: rich, unexpected: "private" }]) {
    await assert.rejects(() => full.callTool("cogentia_memory_capture", args), (error) => error.error_class === "invalid_input");
  }
  const deniedArg = cli("", ["memory", "capture", "private-synthetic-argument"]);
  assert.equal(deniedArg.status, 1);
  assert.equal(deniedArg.stdout.includes("private-synthetic-argument"), false);
  assert.equal(deniedArg.stderr, "");
  const bytes = Buffer.from("é\r\n");
  assert.equal(await readMemoryCaptureStdin(Readable.from([bytes.subarray(0, 1), bytes.subarray(1)])), "é\r\n");
});

test("private MCP normalization neither forwards nor logs nor writes captures", async () => {
  const spies = [];
  const unexpected = () => { throw new Error("unexpected side effect"); };
  try {
    spies.push(mock.method(globalThis, "fetch", unexpected));
    for (const key of ["log", "error", "warn", "debug", "info"]) spies.push(mock.method(console, key, unexpected));
    for (const key of ["writeFileSync", "appendFileSync", "createWriteStream"]) spies.push(mock.method(fs, key, unexpected));
    for (const text of [rich, "{synthetic-private-broken-json"]) {
      const response = await full.handleJsonRpc(message(text));
      assert.deepEqual(response.result.structuredContent.data, ingestAgentAcquiredContext(text));
    }
    for (const spy of spies) assert.equal(spy.mock.callCount(), 0);
  } finally {
    for (const spy of spies) spy.mock.restore();
  }
});

test("cold stdio subprocess invokes the same registered capability without daemon access", () => {
  const child = spawnSync(process.execPath, ["scripts/cogentia-mcp.js"], {
    cwd: root, env, input: `${JSON.stringify(message(rich))}\n`, encoding: "utf8", timeout: 15000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0);
  assert.equal(child.stderr, "");
  const response = JSON.parse(child.stdout.trim());
  assert.deepEqual(response.result.structuredContent.data, ingestAgentAcquiredContext(rich));
  assert.equal(child.stdout.trim().split("\n").length, 1);
});

test("real loopback HTTP transport denies anonymous capture and its legacy shortcut", async () => {
  const reserve = net.createServer();
  await new Promise((resolve, reject) => { reserve.once("error", reject); reserve.listen(0, "127.0.0.1", resolve); });
  const port = reserve.address().port;
  await new Promise((resolve) => reserve.close(resolve));
  const child = spawn(process.execPath, ["scripts/cogentia-mcp-http.js"], {
    cwd: root, env: { ...env, PORT: String(port), COGENTIA_MCP_HOST: "127.0.0.1",
      COGENTIA_MCP_ENV_FILE: "", COGENTIA_GUIDE_ENV_FILE: "", COGENTIA_WEB_SEARCH_ENV_FILE: "", COGENTIA_ENV_FILE: "" },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs += chunk; });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("HTTP fixture did not start")), 15000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", () => { clearTimeout(timeout); reject(new Error("HTTP fixture exited before ready")); });
      child.stderr.on("data", (chunk) => {
        logs += chunk;
        if (logs.includes("server listening")) { clearTimeout(timeout); resolve(); }
      });
    });
    const post = (route, body, headers = {}) => fetch(`http://127.0.0.1:${port}${route}`, {
      method: "POST", headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    const denied = await (await post("/mcp", message(rich))).json();
    assert.equal(denied.result.structuredContent.error_class, "tier_forbidden");
    assert.equal(JSON.stringify(denied).includes("Person Example"), false);
    const allowedResponse = await post("/mcp", message(rich), { authorization: `Bearer ${env.COGENTIA_ADMIN_TOKEN}` });
    assert.equal(allowedResponse.headers.get("cache-control"), "no-store");
    const allowed = await allowedResponse.json();
    assert.deepEqual(allowed.result.structuredContent.data, ingestAgentAcquiredContext(rich));
    const shortcut = await post("/tools/cogentia_memory_capture", { text: rich });
    assert.equal(shortcut.status, 403);
    assert.equal((await shortcut.json()).error_class, "tier_forbidden");
    assert.equal(logs.includes("Person Example"), false);
  } finally {
    child.kill();
    await exited;
  }
});
