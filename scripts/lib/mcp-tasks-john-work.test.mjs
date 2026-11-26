import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { isResolvedCallerAuth, resolveCallerAuth } from "./cogentia-mcp-auth.js";
import { createCopMcpTasksPilot, packetTopicForMcpTask } from "./mcp-tasks-cop-pilot.mjs";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { projectPacketWorkAssignment } from "../../../inseme/packages/cop-core/src/packet-work-assignment.js";

const name="cogentia_john_run";
const prompt="contrat de confiance capacitaire";
const request={
  version:"john.request.v1",request_id:"ccc-work-fixture-01",
  principal:{id:"principal:jhn"},mandate:{id:"mandate:fixture",version:"1"},
  budget:{id:"budget:fixture"},
  execution_budget:{max_steps:3,max_tool_calls:1,max_subagents:0,max_elapsed_ms:15000,max_external_effects:0,max_internal_effects:0},
  exposure:"read_only",capability:"corpus.search",
  input:{prompt,arguments:{query:prompt,repo:"privai",limit:3,mode:"keyword"}},
  handler:{id:"capability.once",kind:"capability_once",allowed_capabilities:["corpus.search"]},
};
const env={COGENTIA_MCP_VIEW:"public",COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:"fixture-only"};
const meta={
  "io.modelcontextprotocol/protocolVersion":"2026-07-28",
  "io.modelcontextprotocol/clientCapabilities":{extensions:{"io.modelcontextprotocol/tasks":{}}},
  "cogentia.actor":"agent:jhn","cogentia.principal_ref":"principal:jhn",
  "cogentia.mandate_ref":"mandate:chatgpt-corpus-coding",
  "cogentia.jhn_token":"fixture-only",
};
const auth=resolveCallerAuth(env,{view:"public",meta});
const rpc=(method,params,metadata=meta)=>({jsonrpc:"2.0",id:1,method,params:{...params,_meta:metadata}});

test("John public-source work: atomic assignment, durable result, duplicate submission, restart and isolation",async()=>{
  // Real daemon optional for a local Reality Test; no private corpus or live COP store.
  const real=process.env.COGENTIA_342_REALITY_DAEMON_URL;
  const server=real?null:createServer((req,res)=>{
    const url=new URL(req.url,"http://localhost");
    assert.equal(url.pathname,"/api/context/search");
    assert.equal(url.searchParams.get("view"),"public");
    assert.equal(url.searchParams.get("repo"),"privai");
    assert.equal(url.searchParams.get("q"),prompt);
    assert.equal(req.headers.authorization,undefined);
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify({ok:true,view:"public",count:1,results:[{id:"privai:contracts/contrat_confiance_capacitaire.md#L33-L34",snippet:"fixture"}]}));
  });
  if(server)await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const daemon=real||"http://127.0.0.1:"+server.address().port;
  const dir=mkdtempSync(join(tmpdir(),"john-ccc-work-"));
  const file=join(dir,"cop.sqlite");
  let store, pilot, core, calls=0;
  // Explicit fixture commissioning, not production mandate issuance.
  // The adapter is not installed in the production composition.
  const prepareCreation=({args,auth:caller})=>{
    if(!isResolvedCallerAuth(caller)||caller.auth!=="jhn"||
        caller.principal_ref!=="principal:jhn"||caller.actor!=="agent:jhn"||
        args?.request?.request_id!==request.request_id||
        args.request.capability!=="corpus.search"||args.request.exposure!=="read_only")
      return {admitted:false};
    return {admitted:true,submission_key:request.request_id,assignment:{
      responsible_agent_ref:"agent:jhn",commissioned_by_principal_ref:"principal:jhn",
    }};
  };
  const backend=createMcpCore({COGENTIA_MCP_VIEW:"public",COGENTIA_DAEMON_URL:daemon});
  function open(){
    store=createSqliteCopEventStore(file);
    pilot=createCopMcpTasksPilot({
      store,toolName:name,primaryStoreId:"sqlite:ccc-fixture",ownerInstanceRef:"instance:ccc-fixture",
      prepareCreation,
      handler:async args=>{
        calls++;
        const result=await backend.callTool(name,args);
        assert.equal(result.ok,true);
        const data=JSON.parse(result.text);
        assert.equal(data.view,"public");
        assert.ok(data.results.length);
        return {content:[{type:"text",text:JSON.stringify(result)}],isError:false};
      },
    });
    core=createMcpCore({...env,COGENTIA_DAEMON_URL:daemon},{mcpTasksAdapter:pilot.adapter});
  }
  const submit=()=>core.handleJsonRpc(rpc("tools/call",{name,arguments:{request}}));
  try{
    open();
    const [first,retry]=await Promise.all([submit(),submit()]);
    assert.equal(first.result?.resultType,"task",JSON.stringify(first.error));
    const id=first.result.taskId;
    assert.equal(retry.result?.taskId,id);
    const topic=packetTopicForMcpTask(id);
    let rows=store.listTopic(topic);
    assert.equal(rows.filter(x=>x.payload?.phase==="created").length,1);
    const assignment=projectPacketWorkAssignment(store,{packet_ref:topic});
    assert.equal(assignment.responsible_agent_ref,"agent:jhn");
    assert.equal(assignment.commissioned_by_principal_ref,"principal:jhn");
    assert.equal(assignment.revision,1);
    assert.equal(pilot.auditPacket(id).ok,true);
    const conflict=await core.handleJsonRpc(rpc("tools/call",{name,arguments:{
      request:{...request,input:{...request.input,prompt:"different"}}}}));
    assert.ok(conflict.error);
    // Recover from SQLite before dispatch, with no volatile task state.
    store.close();open();
    assert.equal((await core.handleJsonRpc(rpc("tasks/get",{taskId:id}))).result.status,"working");
    const done=await pilot.run(id,auth);
    assert.equal(done.status,"completed");
    assert.equal(calls,1);
    store.close();open();
    const delivered=await core.handleJsonRpc(rpc("tasks/get",{taskId:id}));
    assert.equal(delivered.result?.status,"completed");
    const response=JSON.parse(delivered.result.result.content[0].text);
    assert.equal(response.accounting.ithaca_returned,true);
    const data=JSON.parse(response.text);
    assert.ok(data.results.length);
    assert.equal((await submit()).result.taskId,id);
    assert.equal((await pilot.run(id,auth)).status,"completed");
    assert.equal(calls,1);
    const outsider=await core.handleJsonRpc(rpc("tasks/get",{taskId:id},{
      "io.modelcontextprotocol/protocolVersion":meta["io.modelcontextprotocol/protocolVersion"],
      "io.modelcontextprotocol/clientCapabilities":meta["io.modelcontextprotocol/clientCapabilities"],
    }));
    assert.equal(outsider.error?.code,-32602);
    assert.equal(pilot.auditPacket(id).ok,true);
    rows=store.listTopic(topic);
    assert.equal(rows.filter(e=>e.payload?.phase==="completed").length,1);
    if(real)console.log("CCC_REAL_DAEMON_FIXTURE",JSON.stringify({results:data.results.length,view:data.view,assignment:assignment.status,provider_calls:calls,events:rows.length,commitment_verified:true}));
  }finally{
    store?.close();rmSync(dir,{recursive:true,force:true});
    if(server)await new Promise(resolve=>server.close(resolve));
  }
});


test("failed explicit assignment rolls back packet creation; denied admission writes nothing",async()=>{
  const store=createSqliteCopEventStore(":memory:");
  let permit=false;
  try{
    const pilot=createCopMcpTasksPilot({store,toolName:name,primaryStoreId:"sqlite:ccc-fixture",
      prepareCreation:()=>({admitted:permit,submission_key:"bad-assignment",
        assignment:{responsible_agent_ref:"agent:jhn",commissioned_by_agent_ref:"agent:jhn"}}),
      handler:async()=>{throw Error("must not dispatch");}});
    await assert.rejects(pilot.adapter.create({name,args:{request},auth}),/work_creation_not_admitted/);
    assert.equal(store.replay().length,0);
    permit=true;
    await assert.rejects(pilot.adapter.create({name,args:{request},auth}));
    assert.equal(store.replay().length,0,"creation and assignment commit atomically");
  }finally{store.close();}
});
