import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createMcpCore} from "./cogentia-mcp-core.js";
import {createMcpCore as createRitornu} from "../../../inseme/packages/brique-ritornu/src/mcp/core.js";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";
import {createMultiMcpProgramRuntime} from "./multimcp-program.mjs";
import {createMultiMcpMcpSurface} from "./multimcp-mcp-surface.mjs";
import {createMultiMcpCopBridge} from "./multimcp-cop-bridge.mjs";
import {createCopMcpTasksPilot} from "./mcp-tasks-cop-pilot.mjs";
import {composeMcpTasksAdapters} from "./mcp-tasks-adapter-compose.mjs";

const env={COGENTIA_MCP_VIEW:"public",COGENTIA_MCP_JHN_MUTATE:"1",
  COGENTIA_MCP_JHN_TOKEN:"test-only-opaque-token"};
const v="2026-07-28";
const meta={
  "io.modelcontextprotocol/protocolVersion":v,
  "io.modelcontextprotocol/clientCapabilities":{
    extensions:{"io.modelcontextprotocol/tasks":{}}},
  "cogentia.actor":"agent:jhn",
  "cogentia.principal_ref":"principal:jhn",
  "cogentia.jhn_token":env.COGENTIA_MCP_JHN_TOKEN,
};
const rpc=(method,params={},m=meta)=>({jsonrpc:"2.0",id:1,method,
  params:{...params,_meta:m}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check) {
  for(let i=0;i<90;i++){const value=await check();if(value)return value;await wait(20);}
  throw new Error("task_not_delivered");
}

test("one MCP Core advertises source discovery and a strictly Task-backed program",async()=>{
  const root=mkdtempSync(join(tmpdir(),"multimcp-core-surface-"));
  const store=createSqliteCopEventStore(join(root,"cop.sqlite"));
  let bridge;
  try {
    const providers={
      cogentia:createMcpCore({COGENTIA_MCP_VIEW:"public"}),
      ritornu:createRitornu({}),
    };
    const runtime=createMultiMcpProgramRuntime({
      providers,
      authorizeCall:async({context})=>context?.auth?.auth==="jhn" &&
        context.auth.reason==="jhn_attested",
    });
    const surface=createMultiMcpMcpSurface({runtime});
    const verified=()=>resolveCallerAuth(env,{
      view:"public",meta,
    });
    bridge=createMultiMcpCopBridge({
      runtime,store,primaryStoreId:"sqlite:multimcp-core-test",
      ownerInstanceRef:"instance:multimcp-core-test",
      authorizationForTask:async()=>verified(),
    });
    bridge.start();

    const legacy=createCopMcpTasksPilot({
      store,primaryStoreId:"sqlite:multimcp-core-test",
      ownerInstanceRef:"instance:multimcp-core-test",
      toolName:"cogentia_pattern_list",
      handler:async()=>({content:[{type:"text",text:"existing task"}]}),
    });

    const core=createMcpCore(env,{
      mcpProgramSurface:surface,
      mcpTasksAdapter:composeMcpTasksAdapters([
        legacy.adapter,bridge.adapter]),
    });

    const anonymous=await core.handleJsonRpc(rpc("tools/list",{},{
      "io.modelcontextprotocol/protocolVersion":v,
      "io.modelcontextprotocol/clientCapabilities":{extensions:
        {"io.modelcontextprotocol/tasks":{}}},
    }));
    assert.deepEqual(
      ["multimcp_search","multimcp_describe"].map(name=>
        Boolean(anonymous.result.tools.find(t=>t.name===name))),[true,true]);
    assert.equal(anonymous.result.tools.some(t=>
      t.name==="multimcp_program_execute"),false);

    const listed=await core.handleJsonRpc(rpc("tools/list"));
    assert.equal(listed.result.tools.some(t=>
      t.name==="multimcp_program_execute"),true);
    const found=await core.handleJsonRpc(rpc("tools/call",{
      name:"multimcp_search",arguments:{query:"ritornu_boundaries"},
    }));
    assert.match(JSON.stringify(found),/ritornu_boundaries/);

    // A caller without attestation may not create or obtain a Task.
    const denied=await core.handleJsonRpc(rpc("tools/call",{
      name:"multimcp_program_execute",
      arguments:{language:"javascript",code:"return 1"},
    },{
      "io.modelcontextprotocol/protocolVersion":v,
      "io.modelcontextprotocol/clientCapabilities":{extensions:
        {"io.modelcontextprotocol/tasks":{}}},
    }));
    assert.equal(denied.result?.resultType==="task",false);

    const created=await core.handleJsonRpc(rpc("tools/call",{
      name:"multimcp_program_execute",
      arguments:{language:"javascript",
        code:"return await tools.ritornu.ritornu_boundaries({});"},
    }));
    assert.equal(created.result?.resultType,"task");
    const taskId=created.result.taskId;
    const completed=await until(async()=>{
      const got=await core.handleJsonRpc(rpc("tasks/get",{taskId}));
      return got.result?.status==="completed"?got:null;
    });
    assert.equal(completed.result.result.structuredContent.value.git_write_forbidden,true);
    assert.equal(bridge.pilot.auditPacket(taskId).ok,true);

    // Composed adapter remains able to look up an older tool family.
    const old=await legacy.adapter.create({
      name:"cogentia_pattern_list",auth:verified(),args:{},
    });
    const oldGot=await core.handleJsonRpc(rpc("tasks/get",{taskId:old.taskId}));
    assert.equal(oldGot.result?.status,"working");
    const unknown=await core.handleJsonRpc(rpc("tasks/get",{
      taskId:"task:"+"0".repeat(36)}));
    assert.equal(unknown.error?.code,-32602);
  }finally{bridge?.stop();store.close();rmSync(root,{recursive:true,force:true});}
});
