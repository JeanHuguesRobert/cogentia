import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
