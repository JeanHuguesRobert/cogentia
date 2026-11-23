import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { createMcpCopTasksRuntime } from "./mcp-tasks-cop-runtime.mjs";
import {
  createCopMcpTasksPilot, packetTopicForMcpTask, packetRefForMcpTask,
} from "./mcp-tasks-cop-pilot.mjs";
import { validateFractalogActRecord } from "../../../inseme/packages/cop-core/src/fractalog.js";

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
  // An existing local COP store with per-topic cryptographic commitments.
  const store = createSqliteCopEventStore(path);
  store.close();
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

test("local COP work survives unavailable federated Supabase/daemon, dispatch and restart", async () => {
  const f = makeStore();
  let runtime, core;
  const env = {
    COGENTIA_MCP_VIEW: "public",
    COGENTIA_MCP_TASKS_COP_ENABLED: "1",
    COGENTIA_MCP_TASKS_COP_DATABASE: f.path,
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: TOKEN,
    COGENTIA_MCP_LOCAL_INSTANCE_REF: "instance:fracta2-mcp-test",
    COGENTIA_MCP_LOCAL_STORE_ID: "sqlite:fracta2-test",
    COGENTIA_DAEMON_URL: "http://127.0.0.1:1",
    SUPABASE_URL: "http://127.0.0.1:1",
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
    // The user-facing Task is not a separate authoritative work ledger.
    // Its canonical COP history is inside one packet-local topic.
    const packetRef = packetRefForMcpTask(taskId);
    const topicId = packetTopicForMcpTask(taskId);
    const localStore = createSqliteCopEventStore(f.path);
    const localEvents = localStore.listTopic(topicId);
    assert.equal(localEvents[0].payload.packet.packet_id, packetRef);
    assert.equal(localEvents[0].payload.continuation.packetRef, packetRef);
    assert.ok(localEvents.length >= 3);
    assert.ok(localEvents.every(e => e.payload.packet_ref === packetRef));
    assert.ok(localEvents.every(e =>
      validateFractalogActRecord(e.payload.fractalog).ok));
    assert.ok(localEvents.slice(1).every((e, i) =>
      e.payload.fractalog.trace.parent_event_ids[0] ===
        localEvents[i].event_id));
    assert.equal(localStore.auditTopicCommitment(topicId).ok, true);
    assert.equal(localStore.auditCommitments().ok, true);
    // Reconstruct the task's current state exclusively from local sources.
    const last = localEvents.at(-1);
    assert.equal(last.payload.phase, "completed");
    assert.ok(JSON.parse(last.payload.result.content[0].text).patterns);
    localStore.close();

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
    // A different node's store identity cannot silently take over an
    // existing packet simply by pointing at the same SQLite file.
    runtime.close();
    runtime = null;
    assert.throws(() => createMcpCopTasksRuntime({
      ...env, COGENTIA_MCP_LOCAL_STORE_ID: "sqlite:other-locality",
    }, { coreAccessor: () => core }), /local_commitments_invalid/);
  } finally {
    runtime?.close();
    f.close();
  }
});

test("locality: portable projection cannot masquerade as a FractaLog source store", () => {
  const f = makeStore();
  try {
    const external = join(f.root, "portable-projection.sqlite");
    const database = new DatabaseSync(external);
    const migration = readFileSync(new URL(
      "../../../inseme/apps/platform/supabase/migrations/20260801120000_cop_runtime_portable_tables.sql",
      import.meta.url), "utf8");
    database.exec(migration);
    database.close();
    assert.throws(() => createMcpCopTasksRuntime({
      COGENTIA_MCP_TASKS_COP_ENABLED: "1",
      COGENTIA_MCP_TASKS_COP_DATABASE: external,
      COGENTIA_MCP_JHN_MUTATE: "1",
      COGENTIA_MCP_JHN_TOKEN: TOKEN,
      COGENTIA_MCP_LOCAL_INSTANCE_REF: "instance:fracta2",
    COGENTIA_MCP_LOCAL_STORE_ID: "sqlite:fracta2-test",
    }, { coreAccessor: () => null }), /local_fractalog_commitment_store_required/);
  } finally { f.close(); }
});

test("locality: forged local trace is detected before a COP runtime restart", async () => {
  const f = makeStore();
  const env = {
    COGENTIA_MCP_TASKS_COP_ENABLED: "1",
    COGENTIA_MCP_TASKS_COP_DATABASE: f.path,
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: TOKEN,
    COGENTIA_MCP_LOCAL_INSTANCE_REF: "instance:fracta2",
    COGENTIA_MCP_LOCAL_STORE_ID: "sqlite:fracta2-test",
  };
  let runtime;
  try {
    let core;
    runtime = createMcpCopTasksRuntime(env, { coreAccessor: () => core });
    core = createMcpCore({ ...env, COGENTIA_MCP_VIEW: "public" }, runtime.extras);
    // No work is needed: test the store-integrity gate with a local act.
    const store = createSqliteCopEventStore(f.path);
    const pilot = createCopMcpTasksPilot({
      store, toolName: TOOL, allowAnonymous: true,
      handler: async () => ({ content: [] }),
      primaryStoreId: "sqlite:test-node-a",
    });
    const created = await pilot.adapter.create({
      name: TOOL, args: {}, auth: { auth: "none" },
    });
    const ownedTopic = packetTopicForMcpTask(created.taskId);
    assert.equal(pilot.auditPacket(created.taskId).ok, true);
    store.close();
    runtime.close();
    runtime = null;
    const database = new DatabaseSync(f.path);
    database.prepare(
      "UPDATE cop_events SET envelope = ? WHERE topic = ?"
    ).run('{"forged":"event"}', ownedTopic);
    database.close();
    assert.throws(() =>
      createMcpCopTasksRuntime(env, { coreAccessor: () => core }),
      /local_commitments_invalid/);
  } finally {
    runtime?.close();
    f.close();
  }
});

test("locality: unrelated corrupt topic does not make Task locality unavailable", async () => {
  const f = makeStore();
  const env = {
    COGENTIA_MCP_TASKS_COP_ENABLED: "1",
    COGENTIA_MCP_TASKS_COP_DATABASE: f.path,
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: TOKEN,
    COGENTIA_MCP_LOCAL_INSTANCE_REF: "instance:fracta2",
    COGENTIA_MCP_LOCAL_STORE_ID: "sqlite:fracta2-test",
  };
  let runtime;
  try {
    const store = createSqliteCopEventStore(f.path);
    assert.equal(store.append({
      topic_id: "packet:unrelated-history",
      event_type: "cop.event/v1",
      actor_id: "cop:unrelated",
      subject_ref: "unrelated-history",
      epistemic_status: "observed",
      payload: { kind: "unrelated" },
    }).ok, true);
    store.close();
    const database = new DatabaseSync(f.path);
    database.prepare("UPDATE cop_events SET envelope = ? WHERE topic = ?")
      .run('{"forged":"event"}', "packet:unrelated-history");
    database.close();
    let core;
    runtime = createMcpCopTasksRuntime(env, { coreAccessor: () => core });
    core = createMcpCore({ ...env, COGENTIA_MCP_VIEW: "public" }, runtime.extras);
    const recovered = await runtime.start();
    assert.equal(recovered.scheduled, 0);
    assert.equal(recovered.unresolved, 0);
  } finally {
    runtime?.close();
    f.close();
  }
});

test("FractaLog and COP envelope reject an altered Packet even after recalculated topic head", async () => {
  const f = makeStore();
  const env = {
    COGENTIA_MCP_TASKS_COP_ENABLED: "1",
    COGENTIA_MCP_TASKS_COP_DATABASE: f.path,
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: TOKEN,
    COGENTIA_MCP_LOCAL_INSTANCE_REF: "instance:fracta2",
    COGENTIA_MCP_LOCAL_STORE_ID: "sqlite:fracta2-test",
  };
  try {
    const store = createSqliteCopEventStore(f.path);
    const pilot = createCopMcpTasksPilot({
      store, toolName: TOOL, allowAnonymous: true,
      handler: async () => ({ content: [] }),
      primaryStoreId: "sqlite:test-node-a",
    });
    const { taskId } = await pilot.adapter.create({
      name: TOOL, args: {}, auth: { auth: "none" },
    });
    assert.equal(pilot.auditPacket(taskId).ok, true);
    const topicId = packetTopicForMcpTask(taskId);
    store.close();

    const database = new DatabaseSync(f.path);
    const before = database.prepare(
      "SELECT envelope FROM cop_events WHERE topic = ? AND seq = 1"
    ).get(topicId);
    const altered = JSON.parse(before.envelope);
    altered.payload.fractalog.effect.phase = "falsified";
    const serialized = JSON.stringify(altered);
    // Repair COP's outer topic commitment to test FractaLog's *own* hash.
    const head = "sha256:" + createHash("sha256")
      .update(serialized).digest("hex");
    database.prepare("UPDATE cop_events SET envelope = ? WHERE topic = ?")
      .run(serialized, topicId);
    database.prepare(
      "UPDATE cop_topic_commitments SET head = ? WHERE topic = ?"
    ).run(head, topicId);
    database.close();
    const validOuter = createSqliteCopEventStore(f.path);
    assert.equal(validateFractalogActRecord(altered.payload.fractalog).ok, false);
    assert.equal(validOuter.auditTopicCommitment(topicId).ok, false);
    validOuter.close();
    assert.throws(() => createMcpCopTasksRuntime(env, {
      coreAccessor: () => null,
    }), /local_commitments_invalid/);
  } finally { f.close(); }
});
