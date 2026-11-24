import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMultiMcpProgramRuntime } from "./multimcp-program.mjs";
import {
  createMultiMcpCopBridge, MULTIMCP_PROGRAM_TOOL,
} from "./multimcp-cop-bridge.mjs";
import {
  createSqliteCopEventStore,
} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { createMcpCore as cogentia } from "./cogentia-mcp-core.js";
import { createMcpCore as ritornu } from "../../../inseme/packages/brique-ritornu/src/mcp/core.js";

const AUTH = { auth: "none" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, timeoutMs = 3000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const next = await fn();
    if (next) return next;
    await pause(20);
  }
  throw new Error("cop_multimcp_task_not_completed");
}

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "multimcp-cop-"));
  const db = join(dir, "source.sqlite");
  let store, bridge;
  let executionAllowed = true;
  let verified = true;
  let calls = 0;
  function open() {
    store = createSqliteCopEventStore(db);
    const runtime = createMultiMcpProgramRuntime({
      providers: {
        cogentia: cogentia({ COGENTIA_MCP_VIEW:"public" }),
        ritornu: ritornu({}),
      },
      authorizeCall: async ({context}) => {
        calls++;
        return executionAllowed && context?.auth === AUTH &&
          typeof context?.taskId === "string";
      },
    });
    bridge = createMultiMcpCopBridge({
      runtime, store,
      primaryStoreId: "sqlite:fracta2-multimcp-test",
      ownerInstanceRef: "instance:fracta2-multimcp-test",
      allowAnonymous: true, // isolated test fixture only
      authorizationForTask: async () => verified ? AUTH : null,
      startDelayMs: 20,
    });
    bridge.start();
    return bridge;
  }
  open();
  return {
    get bridge() { return bridge; },
    get store() { return store; },
    get calls() { return calls; },
    set allowed(value) { executionAllowed = value; },
    set verified(value) { verified = value; },
    async restart() {
      bridge.stop();
      store.close();
      open();
      return bridge.recover();
    },
    close() {
      bridge.stop(); store.close();
      rmSync(dir, {recursive:true,force:true});
    },
  };
}

test("real JavaScript MultiMCP program is a packet-local COP scheduled Task", async () => {
  const fixture = createFixture();
  try {
    const created = await fixture.bridge.adapter.create({
      name: MULTIMCP_PROGRAM_TOOL,
      args: {
        language: "javascript",
        code: [
          "const patterns=await tools.cogentia.cogentia_pattern_list({});",
          "const health=await tools.ritornu.ritornu_health({});",
          "return {patterns:typeof patterns,health:typeof health};"
        ].join("\n"),
      },
      auth: AUTH,
    });
    const finished = await until(async () => {
      const state = await fixture.bridge.adapter.get({
        taskId:created.taskId, auth:AUTH
      });
      return state.status === "completed" ? state : null;
    });
    const payload = JSON.parse(finished.result.content[0].text);
    assert.equal(payload.language, "javascript");
    assert.deepEqual(payload.value,{patterns:"object",health:"object"});
    assert.equal(payload.calls,2);
    assert.equal(fixture.calls,2);
    assert.equal(fixture.bridge.pilot.auditPacket(created.taskId).ok,true);
    const recovered = await fixture.restart();
    assert.equal(recovered.scheduled,0);
    const again = await fixture.bridge.adapter.get({
      taskId:created.taskId,auth:AUTH
    });
    assert.equal(again.status,"completed");
    assert.deepEqual(again.result,finished.result);
    assert.equal(fixture.calls,2,"restart must not replay a completed job");
  } finally { fixture.close(); }
});

test("real Alan suspensions are mediated and saved under the same COP Packet", async () => {
  const fixture = createFixture();
  try {
    const code = [
      "alan 0.2", "use std.mcp",
      "extern cogentia.cogentia_pattern_list",
      "  kind tool", "  effect read_only", "  data public",
      "  policy P1", "  input { }", "  output { value: any }", "end",
      "extern ritornu.ritornu_health",
      "  kind tool", "  effect read_only", "  data public",
      "  policy P1", "  input { }", "  output { value: any }", "end",
      "fn main",
      "  a = mcp cogentia.cogentia_pattern_list",
      "  b = mcp ritornu.ritornu_health",
      "  return result=$b.value",
      "end",
    ].join("\n");
    const {taskId} = await fixture.bridge.adapter.create({
      name:MULTIMCP_PROGRAM_TOOL,
      args:{language:"alan",code},auth:AUTH,
    });
    const finished = await until(async () => {
      const state = await fixture.bridge.adapter.get({taskId,auth:AUTH});
      return state.status === "completed" ? state : null;
    });
    const payload = JSON.parse(finished.result.content[0].text);
    assert.equal(payload.language,"alan");
    assert.equal(payload.calls,2);
    assert.equal(fixture.calls,2);
    assert.equal(fixture.bridge.pilot.auditPacket(taskId).ok,true);
  } finally {fixture.close();}
});

test("verified dispatch authority and per-capability admission are independent", async () => {
  const f = createFixture();
  try {
    f.verified = false;
    const {taskId} = await f.bridge.adapter.create({
      name:MULTIMCP_PROGRAM_TOOL,auth:AUTH,
      args:{language:"javascript",
        code:"return await tools.ritornu.ritornu_boundaries({});"},
    });
    await pause(90);
    assert.equal(f.calls,0);
    assert.equal((await f.bridge.adapter.get({taskId,auth:AUTH})).status,"working");
    f.verified = true;
    f.allowed = false;
    const recovered = await f.restart();
    assert.equal(recovered.scheduled,1);
    const failure = await until(async()=>{
      const state=await f.bridge.adapter.get({taskId,auth:AUTH});
      return state.status==="failed"?state:null;
    });
    assert.match(failure.error.message,/program_tool_authority_denied/);
    assert.equal(f.calls,1);
    assert.equal(f.bridge.pilot.auditPacket(taskId).ok,true);
  } finally {f.close();}
});

test("recovery never claims a foreign tool's Packet from the shared COP source", async () => {
  const f = createFixture();
  try {
    // A different local tool is entitled to use this same canonical
    // event store without being adopted by the program executor.
    const { createCopMcpTasksPilot } = await import("./mcp-tasks-cop-pilot.mjs");
    const foreign = createCopMcpTasksPilot({
      store: f.store, toolName: "cogentia_pattern_list",
      handler: async () => {throw new Error("must_never_execute");},
      primaryStoreId: "sqlite:fracta2-multimcp-test",
      ownerInstanceRef: "instance:fracta2-multimcp-test",
      allowAnonymous:true,
    });
    const {taskId} = await foreign.adapter.create({
      name:"cogentia_pattern_list",auth:AUTH,args:{},
    });
    await assert.rejects(f.bridge.adapter.get({taskId,auth:AUTH}),
      /unknown_task/);
    const before = f.store.listTopic(
      (await import("./mcp-tasks-cop-pilot.mjs"))
        .packetTopicForMcpTask(taskId)).length;
    const recovered = await f.restart();
    assert.equal(recovered.scheduled,0);
    assert.equal(recovered.unresolved,0);
    assert.equal(f.calls,0);
    const after = f.store.listTopic(
      (await import("./mcp-tasks-cop-pilot.mjs"))
        .packetTopicForMcpTask(taskId)).length;
    assert.equal(after,before);
  } finally {f.close();}
});
