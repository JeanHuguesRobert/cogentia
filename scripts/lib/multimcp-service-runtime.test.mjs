import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createMcpCore as ritornu} from "../../../inseme/packages/brique-ritornu/src/mcp/core.js";
import {createRegistryAwareMcpCore} from "./cogentia-mcp-registries.js";
import {createMcpCopTasksRuntime} from "./mcp-tasks-cop-runtime.mjs";
import {createMultiMcpServiceRuntime} from "./multimcp-service-runtime.mjs";
import {composeMcpTasksAdapters} from "./mcp-tasks-adapter-compose.mjs";

const VERSION="2026-07-28";
const TOKEN="test-only-both-runtimes";
const META={
  "io.modelcontextprotocol/protocolVersion":VERSION,
  "io.modelcontextprotocol/clientCapabilities":{
    extensions:{"io.modelcontextprotocol/tasks":{}}},
  "cogentia.actor":"agent:jhn",
  "cogentia.principal_ref":"principal:jhn",
  "cogentia.jhn_token":TOKEN,
};
const request=(method,params={},auth=true)=>({
  jsonrpc:"2.0",id:1,method,
  params:{...params,_meta:auth?META:{
    "io.modelcontextprotocol/protocolVersion":VERSION,
    "io.modelcontextprotocol/clientCapabilities":{
      extensions:{"io.modelcontextprotocol/tasks":{}}},
  }},
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn) {
  for(let i=0;i<100;i++){
    const v=await fn();if(v)return v;
    await pause(20);
  }
  throw new Error("scheduled_task_not_completed");
}

test("service runtime is truly inert until explicitly enabled",()=>{
  const disabled=createMultiMcpServiceRuntime({});
  assert.equal(disabled.enabled,false);
  assert.deepEqual(disabled.extras,{});
  disabled.close();
  assert.throws(()=>createMultiMcpServiceRuntime({
    COGENTIA_MCP_MULTIMCP_ENABLED:"1",
  },{coreAccessor:()=>null}),/existing_local_cop_store_required/);
});

test("existing pattern-list and MultiMCP Tasks coexist in one local committed COP journal across restarts",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"multimcp-two-families-"));
  const db=join(dir,"source.sqlite");
  createSqliteCopEventStore(db).close();
  const env={
    COGENTIA_MCP_VIEW:"public",
    COGENTIA_DAEMON_URL:"http://127.0.0.1:1",
    COGENTIA_MCP_TASKS_COP_ENABLED:"1",
    COGENTIA_MCP_MULTIMCP_ENABLED:"1",
    COGENTIA_MCP_TASKS_COP_DATABASE:db,
    COGENTIA_MCP_LOCAL_INSTANCE_REF:"instance:fracta2-dual-test",
    COGENTIA_MCP_LOCAL_STORE_ID:"sqlite:fracta2-dual-test",
    COGENTIA_MCP_JHN_MUTATE:"1",
    COGENTIA_MCP_JHN_TOKEN:TOKEN,
  };
  let oldRuntime,newRuntime,core;
  async function start() {
    const coreAccessor=()=>core;
    oldRuntime=createMcpCopTasksRuntime(env,{coreAccessor});
    newRuntime=createMultiMcpServiceRuntime(env,{
      coreAccessor,
      additionalProviders:{ritornu:ritornu({})},
    });
    const adapters=[oldRuntime.extras.mcpTasksAdapter,
      newRuntime.extras.mcpTasksAdapter].filter(Boolean);
    core=createRegistryAwareMcpCore(env,{
      ...oldRuntime.extras,...newRuntime.extras,
      mcpTasksAdapter:composeMcpTasksAdapters(adapters),
    });
    await oldRuntime.start();
    await newRuntime.start();
    return core;
  }
  function stop() {
    newRuntime?.close();oldRuntime?.close();
    newRuntime=oldRuntime=null;core=null;
  }
  try {
    await start();
    const oldCreated=await core.handleJsonRpc(request("tools/call",{
      name:"cogentia_pattern_list",arguments:{},
    }));
    assert.equal(oldCreated.result?.resultType,"task");
    const multiCreated=await core.handleJsonRpc(request("tools/call",{
      name:"multimcp_program_execute",
      arguments:{
        language:"javascript",
        code:"return await tools.ritornu.ritornu_boundaries({});",
      },
    }));
    assert.equal(multiCreated.result?.resultType,"task");
    const ids=[oldCreated.result.taskId,multiCreated.result.taskId];
    for(const taskId of ids){
      const finished=await until(async()=>{
        const x=await core.handleJsonRpc(request("tasks/get",{taskId}));
        return x.result?.status==="completed"?x:null;
      });
      assert.equal(finished.result.status,"completed");
    }
    stop();
    await start();
    for(const taskId of ids){
      const resumed=await core.handleJsonRpc(request("tasks/get",{taskId}));
      assert.equal(resumed.result?.status,"completed");
      const anonymous=await core.handleJsonRpc(
        request("tasks/get",{taskId},false));
      assert.equal(anonymous.error?.code,-32602);
    }
    const local=createSqliteCopEventStore(db);
    assert.equal(local.auditCommitments().ok,true);
    local.close();
  }finally{stop();rmSync(dir,{recursive:true,force:true});}
});
