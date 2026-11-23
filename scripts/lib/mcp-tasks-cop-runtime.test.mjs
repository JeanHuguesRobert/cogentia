import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { createMcpCopTasksRuntime } from "./mcp-tasks-cop-runtime.mjs";

const TOOL = "cogentia_pattern_list";
const TOKEN = "test-only-jhn-token";
const VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientCapabilities": {
    extensions: { "io.modelcontextprotocol/tasks": {} },
  },
  "cogentia.actor": "agent:jhn",
  "cogentia.principal_ref": "principal:jhn",
  "cogentia.jhn_token": TOKEN,
};
const rpc = (method, params = {}, meta = META) => ({
  jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: meta },
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  for (let n = 0; n < 90; n++) {
    const answer = await check();
    if (answer) return answer;
    await wait(20);
  }
  throw new Error("timeout_waiting_for_task");
}
function makeStore() {
  const root = mkdtempSync(join(tmpdir(), "mcp-cop-runtime-"));
  const path = join(root, "cop-runtime.sqlite");
  const db = new DatabaseSync(path);
  const migration = readFileSync(new URL(
    "../../../inseme/apps/platform/supabase/migrations/20260801120000_cop_runtime_portable_tables.sql",
    import.meta.url), "utf8");
  db.exec(migration);
  db.close();
  return { root, path, close: () => rmSync(root, { recursive: true, force: true }) };
}

test("runtime is disabled by default without opening a COP store", () => {
  const runtime = createMcpCopTasksRuntime({});
  assert.equal(runtime.enabled, false);
  assert.deepEqual(runtime.extras, {});
  runtime.close();
});

test("runtime refuses a missing or incompatible real COP store or JHN attestation", () => {
  const f = makeStore();
  try {
    const base = {
      COGENTIA_MCP_TASKS_COP_ENABLED: "1",
      COGENTIA_MCP_JHN_MUTATE: "1",
      COGENTIA_MCP_JHN_TOKEN: TOKEN,
    };
    assert.throws(() => createMcpCopTasksRuntime(base, {
      coreAccessor: () => null,
    }), /existing_cop_database_required/);
    assert.throws(() => createMcpCopTasksRuntime({
      ...base, COGENTIA_MCP_TASKS_COP_DATABASE: f.path,
      COGENTIA_MCP_JHN_TOKEN: "",
    }, { coreAccessor: () => null }), /existing_jhn_attestation_required/);
  } finally { f.close(); }
});

test("production composition uses attested caller, COP scheduler, and durable result across restart", async () => {
  const f = makeStore();
  let runtime, core;
  const env = {
    COGENTIA_MCP_VIEW: "public",
    COGENTIA_MCP_TASKS_COP_ENABLED: "1",
    COGENTIA_MCP_TASKS_COP_DATABASE: f.path,
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: TOKEN,
  };
  async function open() {
    runtime = createMcpCopTasksRuntime(env, { coreAccessor: () => core });
    core = createMcpCore(env, runtime.extras);
    return runtime.start();
  }
  try {
    await open();
    const notAuthenticated = await core.handleJsonRpc(rpc("tools/call", {
      name: TOOL, arguments: {},
    }, {
      "io.modelcontextprotocol/protocolVersion": VERSION,
      "io.modelcontextprotocol/clientCapabilities": META["io.modelcontextprotocol/clientCapabilities"],
    }));
    assert.equal(notAuthenticated.result.resultType, "complete",
      "public caller cannot create an asynchronous JHN task");

    const created = await core.handleJsonRpc(rpc("tools/call", {
      name: TOOL, arguments: {},
    }));
    assert.equal(created.result.resultType, "task");
    const taskId = created.result.taskId;
    const finished = await until(async () => {
      const response = await core.handleJsonRpc(rpc("tasks/get", { taskId }));
      return response.result?.status === "completed" ? response : null;
    });
    assert.equal(finished.result.status, "completed");
    assert.ok(JSON.parse(finished.result.result.content[0].text).patterns);

    runtime.close();
    const replay = await open();
    assert.equal(replay.scheduled, 0);
    const persisted = await core.handleJsonRpc(rpc("tasks/get", { taskId }));
    assert.equal(persisted.result.status, "completed");

    const outsider = await core.handleJsonRpc(rpc("tasks/get", { taskId }, {
      "io.modelcontextprotocol/protocolVersion": VERSION,
      "io.modelcontextprotocol/clientCapabilities": META["io.modelcontextprotocol/clientCapabilities"],
    }));
    assert.equal(outsider.error.code, -32602);
  } finally {
    runtime?.close();
    f.close();
  }
});
