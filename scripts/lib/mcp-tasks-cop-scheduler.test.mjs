import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createSqliteCopEventStore as createPortableCopEventStore } from
  "../../../inseme/apps/platform/mcp/cop/sqliteRuntimeStore.js";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { createCopMcpTasksPilot } from "./mcp-tasks-cop-pilot.mjs";
import { createCopMcpTasksScheduledPilot } from "./mcp-tasks-cop-scheduler.mjs";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";

const META = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {
    extensions: { "io.modelcontextprotocol/tasks": {} },
  },
};
const rpc = (method, params = {}) => ({
  jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: META },
});
const AUTH = { auth: "none" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, timeout = 1800) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await pause(15);
  }
  throw new Error("timed_out_waiting_for_cop_scheduler");
}

function fixture(handler, { delay = 25 } = {}) {
  const root = mkdtempSync(join(tmpdir(), "mcp-tasks-cop-scheduler-"));
  const filename = join(root, "cop.sqlite");
  let store = createSqliteCopEventStore(filename);
  let dispatch, core, pilot;
  function start() {
    pilot = createCopMcpTasksPilot({ store, toolName: "cogentia_pattern_list",
      handler, allowAnonymous: true });
    dispatch = createCopMcpTasksScheduledPilot({
      pilot, store, startDelayMs: delay,
      authorizationForTask: async () => AUTH, // only in isolated fixture
    }).start();
    core = createMcpCore({ COGENTIA_MCP_VIEW: "public" },
      { mcpTasksAdapter: dispatch.adapter });
    return core;
  }
  start();
  return {
    core: () => core,
    dispatch: () => dispatch,
    audit: () => store.auditCommitments(),
    store: () => store,
    async restart() {
      dispatch.stop();
      store.close();
      store = createSqliteCopEventStore(filename);
      start();
      return dispatch.recover();
    },
    close() {
      dispatch.stop();
      store.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("MCP Tasks dispatch through COPJobScheduler and COPScheduler autonomously", async () => {
  let executions = 0;
  const f = fixture(async () => {
    executions++;
    return { content: [{ type: "text", text: "COP scheduled" }] };
  });
  try {
    const created = await f.core().handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    assert.equal(created.result.resultType, "task");
    const taskId = created.result.taskId;
    const repeat = await f.dispatch().schedule(taskId, AUTH);
    assert.deepEqual(repeat, { scheduled: false, reason: "already_registered" },
      "existing COP continuation must not gain duplicate timeout registrations");
    await until(async () => {
      const fetched = await f.core().handleJsonRpc(rpc("tasks/get", { taskId }));
      return fetched.result?.status === "completed" ? fetched : null;
    });
    assert.equal(executions, 1);
    assert.ok(f.dispatch().jobs.jobs.has(taskId));
    assert.equal(f.audit().ok, true);
    const recovered = await f.restart();
    assert.equal(recovered.scheduled, 0);
    assert.equal(executions, 1, "completed task cannot be dispatched on restart");
  } finally { f.close(); }
});

test("unscheduled COP creation recovers on restart, without duplicating work", async () => {
  let executions = 0;
  const f = fixture(async () => {
    executions++;
    return { content: [{ type: "text", text: "recovered" }] };
  }, { delay: 10_000 });
  try {
    const created = await f.core().handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    const taskId = created.result.taskId;
    const recovery = await f.restart();
    assert.equal(recovery.scheduled, 1);
    // Recovery uses new COPScheduler: run explicitly to avoid a 10s timer in test.
    await f.dispatch().scheduler.execute({
      continuationId: "recovery:" + taskId,
      resumeTo: "handler:mcp-tasks-cop-pilot",
      meta: { jobId: taskId },
    });
    assert.equal((await f.core().handleJsonRpc(rpc("tasks/get", { taskId }))).result.status,
      "completed");
    assert.equal(executions, 1);
    const again = await f.restart();
    assert.equal(again.scheduled, 0);
  } finally { f.close(); }
});

test("claimed outcome is not blindly replayed after a worker crash", async () => {
  let started;
  let release;
  const begun = new Promise(resolve => { started = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture(async () => {
    started();
    await wait;
    return { content: [{ type: "text", text: "late result" }] };
  });
  try {
    const created = await f.core().handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    const taskId = created.result.taskId;
    await until(async () => f.store().listTopic("mcp-task:" + taskId)
      .some(x => x.payload?.phase === "claimed"));
    // Stop scheduling while the original handler is still pending.
    f.dispatch().stop();
    // Underlying storage remains open until the old work ends; release it
    // to simulate a late receipt, then assert recovery does not rerun.
    release();
    await until(async () => f.store().listTopic("mcp-task:" + taskId)
      .some(x => x.payload?.phase === "completed"));
    const restart = await f.restart();
    assert.equal(restart.scheduled, 0);
    assert.equal(restart.unresolved, 0);
  } finally {
    release?.();
    f.close();
  }
});

test("input-required task remains parked across restart and resumes only after update", async () => {
  let executions = 0;
  const f = fixture(async () => {
    executions++;
    return { content: [{ type: "text", text: "resumed after input" }] };
  }, { delay: 30 });
  try {
    const created = await f.core().handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    const taskId = created.result.taskId;
    const pilotInput = createCopMcpTasksPilot({
      store: f.store(), toolName: "cogentia_pattern_list",
      handler: async () => null, allowAnonymous: true,
    });
    await pilotInput.requireInput(taskId, AUTH, {
      consent: { type: "text", prompt: "Continue this work?" },
    });
    await pause(120);
    assert.equal(executions, 0, "COP admission must not wake input_required work");
    const recovery = await f.restart();
    assert.equal(recovery.waiting_input, 1);
    assert.equal(recovery.scheduled, 0);
    assert.equal(executions, 0);
    const update = await f.core().handleJsonRpc(rpc("tasks/update", {
      taskId, inputResponses: { consent: { action: "accept", content: {} } },
    }));
    assert.equal(update.result.resultType, "complete");
    await until(async () => {
      const got = await f.core().handleJsonRpc(rpc("tasks/get", { taskId }));
      return got.result?.status === "completed";
    });
    assert.equal(executions, 1);
    assert.equal(f.audit().ok, true);
  } finally { f.close(); }
});

test("unknown claimed outcome is reported for reconciliation without duplicate dispatch", async () => {
  let executions = 0;
  const f = fixture(async () => {
    executions++;
    return { content: [] };
  }, { delay: 10_000 });
  try {
    const created = await f.core().handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    const taskId = created.result.taskId;
    const event = f.store().append({
      topic_id: "mcp-task:" + taskId,
      event_type: "cop.event/v1",
      actor_id: "cop:mcp-tasks-pilot",
      subject_ref: "mcp-task:" + taskId,
      epistemic_status: "observed",
      idempotency_key: "mcp-claimed:" + taskId,
      payload: { profile: "cogentia.mcp-tasks-cop-pilot/v1", phase: "claimed" },
    });
    assert.equal(event.ok, true);
    const recovered = await f.restart();
    assert.equal(recovered.unresolved, 1);
    assert.equal(recovered.scheduled, 0);
    const pending = await f.core().handleJsonRpc(rpc("tasks/get", { taskId }));
    assert.equal(pending.result.status, "working");
    assert.equal(pending.result.statusMessage, "outcome_unknown_reconciliation_required");
    await pause(70);
    assert.equal(executions, 0);
    assert.equal(f.audit().ok, true);
  } finally { f.close(); }
});

test("HTTP 2026-07-28 receives automatic COP delivery without manual run", async () => {
  const backend = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
  let calls = 0, httpServer;
  const f = fixture(async args => {
    calls++;
    const data = await backend.callTool("cogentia_pattern_list", args);
    return { content: [{ type: "text", text: JSON.stringify(data) }], isError: false };
  }, { delay: 35 });
  async function startHttp() {
    httpServer = createServer(async (req, res) => {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const reqBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const reply = await f.core().handleJsonRpc(reqBody, {
          protocolVersionHeader: req.headers["mcp-protocol-version"],
          mcpMethod: req.headers["mcp-method"],
          mcpName: req.headers["mcp-name"],
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(reply));
      } catch (error) {
        res.writeHead(500);
        res.end(String(error));
      }
    });
    await new Promise(resolve => httpServer.listen(0, "127.0.0.1", resolve));
    return "http://127.0.0.1:" + httpServer.address().port;
  }
  async function closeHttp() {
    if (httpServer) await new Promise(resolve => httpServer.close(resolve));
    httpServer = null;
  }
  async function mcp(url, method, params) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": "2026-07-28",
        "mcp-method": method,
        ...(method === "tools/call" ? { "mcp-name": params.name } :
          method.startsWith("tasks/") ? { "mcp-name": params.taskId } : {}),
      },
      body: JSON.stringify(rpc(method, params)),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  try {
    let url = await startHttp();
    const created = await mcp(url, "tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    });
    assert.equal(created.result.resultType, "task");
    const taskId = created.result.taskId;
    const delivered = await until(async () => {
      const read = await mcp(url, "tasks/get", { taskId });
      return read.result?.status === "completed" ? read : null;
    });
    assert.equal(calls, 1);
    assert.ok(JSON.parse(delivered.result.result.content[0].text).patterns);
    await closeHttp();
    const recovery = await f.restart();
    assert.equal(recovery.scheduled, 0);
    url = await startHttp();
    const receipt = await mcp(url, "tasks/get", { taskId });
    assert.equal(receipt.result.status, "completed");
    assert.equal(calls, 1);
    assert.equal(f.audit().ok, true);
  } finally {
    await closeHttp();
    f.close();
  }
});

test("MCP scheduled Tasks work with the existing Inseme portable COP SQLite store", async () => {
  const root = mkdtempSync(join(tmpdir(), "mcp-tasks-cop-portable-"));
  const migration = readFileSync(new URL(
    "../../../inseme/apps/platform/supabase/migrations/20260801120000_cop_runtime_portable_tables.sql",
    import.meta.url), "utf8");
  const filename = join(root, "cop-portable.sqlite");
  let db, store, dispatch, core, executions = 0;
  function start() {
    db = new DatabaseSync(filename);
    db.exec(migration);
    store = createPortableCopEventStore(db);
    const pilot = createCopMcpTasksPilot({
      store, toolName: "cogentia_pattern_list", allowAnonymous: true,
      handler: async () => {
        executions++;
        return { content: [{ type: "text", text: "portable COP store" }] };
      },
    });
    dispatch = createCopMcpTasksScheduledPilot({
      pilot, store, startDelayMs: 40,
      authorizationForTask: async () => AUTH,
    }).start();
    core = createMcpCore({ COGENTIA_MCP_VIEW: "public" },
      { mcpTasksAdapter: dispatch.adapter });
  }
  function close() {
    dispatch?.stop();
    db?.close();
  }
  try {
    start();
    const created = await core.handleJsonRpc(rpc("tools/call", {
      name: "cogentia_pattern_list", arguments: {},
    }));
    assert.equal(created.result.resultType, "task");
    const id = created.result.taskId;
    await until(async () => {
      const fetched = await core.handleJsonRpc(rpc("tasks/get", { taskId: id }));
      return fetched.result?.status === "completed";
    });
    assert.equal(executions, 1);
    assert.ok(store.listTopic("mcp-task:" + id).length >= 3);
    close();
    start();
    const recovered = await dispatch.recover();
    assert.equal(recovered.scheduled, 0);
    assert.equal((await core.handleJsonRpc(rpc("tasks/get", { taskId: id }))).result.status,
      "completed");
    assert.equal(executions, 1);
  } finally {
    close();
    rmSync(root, { recursive: true, force: true });
  }
});
