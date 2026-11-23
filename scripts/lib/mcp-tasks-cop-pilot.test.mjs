import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { createCopMcpTasksPilot, packetTopicForMcpTask } from "./mcp-tasks-cop-pilot.mjs";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";

const VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientCapabilities": {
    extensions: { "io.modelcontextprotocol/tasks": {} },
  },
};
function rpc(method, params = {}, id = 1) {
  return { jsonrpc: "2.0", id, method, params: { ...params, _meta: META } };
}
function fixture(handler) {
  const root = mkdtempSync(join(tmpdir(), "mcp-cop-reality-"));
  const file = join(root, "cop.sqlite");
  let store = createSqliteCopEventStore(file);
  let pilot;
  function open() {
    pilot = createCopMcpTasksPilot({
      store, toolName: "cogentia_pattern_list",
      handler, allowAnonymous: true, primaryStoreId: "sqlite:test-node-a", // Only for this isolated test.
    });
    return createMcpCore({ COGENTIA_MCP_VIEW: "public" }, {
      mcpTasksAdapter: pilot.adapter,
    });
  }
  const core = open();
  return {
    core,
    pilot: () => pilot,
    audit: () => store.auditCommitments(),
    reopen() {
      store.close();
      store = createSqliteCopEventStore(file);
      return open();
    },
    close() { store.close(); rmSync(root, { recursive: true, force: true }); },
  };
}

test("MCP task -> COP events -> restart -> input -> result delivered", async () => {
  // Actual read-only Cogentia tool; not a fabricated return value.
  const backend = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
  let executions = 0;
  const f = fixture(async args => {
    executions++;
    const data = await backend.callTool("cogentia_pattern_list", args);
    return { content: [{ type: "text", text: JSON.stringify(data) }], isError: false };
  });
  try {
    const advertised = await f.core.handleJsonRpc(rpc("server/discover"));
    assert.deepEqual(advertised.result.capabilities.extensions["io.modelcontextprotocol/tasks"], {});

    const created = await f.core.handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    assert.equal(created.result.resultType, "task");
    assert.equal(created.result.status, "working");
    const id = created.result.taskId;
    assert.match(id, /^task:[0-9a-f-]{36}$/);

    let newCore = f.reopen(); // Simulate an MCP server restart.
    const pending = await newCore.handleJsonRpc(rpc("tasks/get", { taskId: id }));
    assert.equal(pending.result.status, "working");

    const input = await f.pilot().requireInput(id, { auth: "none" }, {
      question: { type: "text", prompt: "Continue?" },
    });
    assert.equal(input.status, "input_required");
    const answered = await newCore.handleJsonRpc(rpc("tasks/update", {
      taskId: id,
      inputResponses: { question: { action: "accept", content: { yes: true } } },
    }));
    assert.equal(answered.result.resultType, "complete");
    const working = await newCore.handleJsonRpc(rpc("tasks/get", { taskId: id }));
    assert.equal(working.result.status, "working");

    const done = await f.pilot().run(id, { auth: "none" });
    assert.equal(done.status, "completed");
    assert.equal(executions, 1);
    const finalCore = f.reopen();
    const delivered = await finalCore.handleJsonRpc(rpc("tasks/get", { taskId: id }));
    assert.equal(delivered.result.status, "completed");
    const result = JSON.parse(delivered.result.result.content[0].text);
    assert.equal(result.ok, true);
    assert.ok(Array.isArray(result.patterns));
    assert.equal(f.audit().ok, true);
    assert.equal((await f.pilot().run(id, { auth: "none" })).status, "completed");
    assert.equal(executions, 1, "replay cannot duplicate completed work");
  } finally { f.close(); }
});

test("MCP task cancellation is a durable request, not fictitious termination", async () => {
  let executions = 0;
  const f = fixture(async () => { executions++; return { content: [{ type: "text", text: "done" }] }; });
  try {
    const created = await f.core.handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    const id = created.result.taskId;
    const cancel = await f.core.handleJsonRpc(rpc("tasks/cancel", { taskId: id }));
    assert.equal(cancel.result.resultType, "complete");
    const newCore = f.reopen();
    const pending = await newCore.handleJsonRpc(rpc("tasks/get", { taskId: id }));
    assert.equal(pending.result.status, "working");
    assert.equal(pending.result.statusMessage, "cancellation_requested");
    const stopped = await f.pilot().run(id, { auth: "none" });
    assert.equal(stopped.status, "cancelled");
    assert.equal(executions, 0, "cancelled before dispatch means no execution");
    const afterRestart = f.reopen();
    const persisted = await afterRestart.handleJsonRpc(rpc("tasks/get", { taskId: id }));
    assert.equal(persisted.result.status, "cancelled");
    const denied = await afterRestart.handleJsonRpc(rpc("tasks/get", { taskId: "task:" + "0".repeat(36) }));
    assert.equal(denied.error.code, -32602);
    assert.equal(f.audit().ok, true);
  } finally { f.close(); }
});

test("COP Task pilot does not activate for arbitrary tools", async () => {
  const f = fixture(async () => ({ content: [] }));
  try {
    const call = await f.core.handleJsonRpc(rpc("tools/call", {
      name: "cogentia_skill_list", arguments: {},
    }));
    assert.equal(call.result.resultType, "complete");
    const restricted = createCopMcpTasksPilot({
      store: { append() {}, listTopic() {}, transaction() {} },
      toolName: "cogentia_pattern_list", handler: async () => null,
      primaryStoreId: "sqlite:test-node-a",
    });
    assert.equal(await restricted.adapter.shouldCreate({ name: "cogentia_pattern_list", auth: { auth: "none" } }), false);
  } finally { f.close(); }
});

test("COP adapter binds task inspection to the effective authenticated caller", async () => {
  const root = mkdtempSync(join(tmpdir(), "mcp-cop-identity-"));
  const store = createSqliteCopEventStore(join(root, "events.sqlite"));
  try {
    const pilot = createCopMcpTasksPilot({
      store, toolName: "cogentia_pattern_list",
      handler: async () => ({ content: [] }),
      primaryStoreId: "sqlite:test-node-a",
    });
    const owner = { auth: "jhn", actor: "agent:jhn" };
    const other = { auth: "jhn", actor: "agent:jhn.subagent:other" };
    const { taskId } = await pilot.adapter.create({ name: "cogentia_pattern_list",
      args: {}, auth: owner });
    assert.equal((await pilot.adapter.get({ taskId, auth: owner })).status, "working");
    await assert.rejects(pilot.adapter.get({ taskId, auth: other }), /unknown_task/);
    await assert.rejects(pilot.adapter.cancel({ taskId, auth: other }), /unknown_task/);
    await assert.rejects(pilot.adapter.update({
      taskId, auth: other, inputResponses: {},
    }), /unknown_task/);
    assert.equal(await pilot.adapter.shouldCreate({
      name: "cogentia_pattern_list", auth: { auth: "none" },
    }), false);
    assert.equal(store.auditCommitments().ok, true);
  } finally { store.close(); rmSync(root, { recursive: true, force: true }); }
});

test("real HTTP MCP round trip survives server restart and returns COP result", async () => {
  const f = fixture(async () => ({
    content: [{ type: "text", text: "COP delivered through HTTP" }],
    isError: false,
  }));
  let server;
  async function start(core) {
    server = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const msg = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const output = await core.handleJsonRpc(msg, {
        protocolVersionHeader: req.headers["mcp-protocol-version"],
        mcpMethod: req.headers["mcp-method"],
        mcpName: req.headers["mcp-name"],
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(output));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return "http://127.0.0.1:" + server.address().port;
  }
  async function stop() {
    if (server) await new Promise((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()));
    server = null;
  }
  async function call(url, method, params) {
    const request = rpc(method, params);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": VERSION,
        "mcp-method": method,
        ...(method === "tools/call" ? { "mcp-name": params.name } :
          method.startsWith("tasks/") ? { "mcp-name": params.taskId } : {}),
      },
      body: JSON.stringify(request),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  try {
    let url = await start(f.core);
    const created = await call(url, "tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    });
    assert.equal(created.result.resultType, "task");
    const taskId = created.result.taskId;
    await stop();
    url = await start(f.reopen());
    const pending = await call(url, "tasks/get", { taskId });
    assert.equal(pending.result.status, "working");
    await f.pilot().run(taskId, { auth: "none" });
    const done = await call(url, "tasks/get", { taskId });
    assert.equal(done.result.status, "completed");
    assert.equal(done.result.result.content[0].text, "COP delivered through HTTP");
    assert.equal(f.audit().ok, true);
  } finally {
    await stop();
    f.close();
  }
});
