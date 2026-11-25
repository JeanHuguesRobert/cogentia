import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createMultiMcpProgramRuntime} from "./multimcp-program.mjs";
import {createMultiMcpCopBridge,MULTIMCP_PROGRAM_TOOL} from "./multimcp-cop-bridge.mjs";
import {createMcpCore as cogentia} from "./cogentia-mcp-core.js";
import {packetTopicForMcpTask} from "./mcp-tasks-cop-pilot.mjs";

const AUTH={auth:"none"};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){
  for(let n=0;n<90;n++){const x=await fn();if(x)return x;await delay(20)}
  throw Error("task_did_not_reach_expected_state");
}
const CODE=[
  "alan 0.2", "use std.mcp",
  "extern cogentia.cogentia_pattern_list",
  "  kind tool", "  effect read_only", "  data public",
  "  policy P1", "  input { }", "  output { value: any }", "end",
  "extern chatgpt.delegate",
  "  kind tool", "  effect private_data_access", "  data private",
  "  policy P3", "  input { prompt: string }", "  output { value: any }", "end",
  "fn main",
  "  before = mcp cogentia.cogentia_pattern_list",
  "  answer = mcp chatgpt.delegate prompt=\"Summarize these findings\"",
  "  return pre=$before.value result=$answer.value",
  "end",
].join("\n");

test("governed Alan call persists without effect; verified result resumes after process restart",async()=>{
  const root=mkdtempSync(join(tmpdir(),"multimcp-suspended-"));
  const path=join(root,"cop.sqlite");
  let store,bridge;
  let reads=0,delegations=0,verifications=0;
  const providers={
    cogentia:{
      async handleJsonRpc(request){
        if(request.method==="tools/list")return {result:{tools:[{
          name:"cogentia_pattern_list",
          inputSchema:{type:"object"},
          annotations:{readOnlyHint:true},
        }]}};
        reads++;
        return {result:{structuredContent:{results:["source-record"]}}};
      },
    },
    chatgpt:{
      async handleJsonRpc(request){
        if(request.method==="tools/list")return {result:{tools:[{
          name:"delegate",inputSchema:{type:"object"},
          annotations:{readOnlyHint:false},
        }]}};
        delegations++;
        throw new Error("UNAUTHORIZED_PROVIDER_DISPATCH");
      },
    },
  };
  function open(){
    store=createSqliteCopEventStore(path);
    const runtime=createMultiMcpProgramRuntime({providers,
      authorizeCall:async()=>true});
    bridge=createMultiMcpCopBridge({
      runtime,store,allowAnonymous:true,
      ownerInstanceRef:"instance:multimcp-test",
      primaryStoreId:"sqlite:multimcp-test",
      authorizationForTask:async()=>AUTH,
      verifyExternalResult:async({taskId,packetRef,candidate,pending,suspension})=>{
        verifications++;
        if(candidate?.receipt_ref!=="cps:fixture:verified"||
           pending.capability!=="chatgpt.delegate"||
           pending.input.prompt!=="Summarize these findings"||
           !packetRef.startsWith("pkt-mcp-")||
           suspension?.type!=="alan.suspension")
          return {verified:false};
        return {verified:true,receipt_ref:candidate.receipt_ref,
          value:{value:{answer:"externally proven answer"}}};
      },
    });
    bridge.start();
  }
  const close=()=>{bridge?.stop();store?.close()};
  try{
    open();
    const {taskId}=await bridge.adapter.create({
      name:MULTIMCP_PROGRAM_TOOL,auth:AUTH,
      args:{language:"alan",code:CODE},
    });
    const suspended=await until(async()=>{
      const result=await bridge.adapter.get({taskId,auth:AUTH});
      return result.status==="input_required"?result:null;
    });
    assert.equal(reads,1);
    assert.equal(delegations,0);
    assert.equal(suspended.result,undefined);
    assert.equal(bridge.pilot.auditPacket(taskId).ok,true);
    const packet=store.listTopic(packetTopicForMcpTask(taskId));
    const checkpoint=packet.findLast(e=>e.payload?.phase==="input_required");
    assert.equal(checkpoint.payload.checkpoint.type,"alan.suspension");
    assert.equal(checkpoint.payload.pending.capability,"chatgpt.delegate");
    await assert.rejects(bridge.adapter.update({
      taskId,auth:AUTH,inputResponses:{value:{answer:"forged"}},
    }),/trusted_cps_return_required/);
    assert.equal(delegations,0);
    close();
    open();
    const recovered=await bridge.recover();
    assert.equal(recovered.waiting_input,1);
    assert.equal(recovered.unresolved,0);
    assert.equal(reads,1);
    await assert.rejects(bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{
      receipt_ref:"fabricated",
    }),/verified_cps_result_required/);
    const accepted=await bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{
      receipt_ref:"cps:fixture:verified",
    });
    assert.equal(accepted.ok,true);
    const completed=await until(async()=>{
      const result=await bridge.adapter.get({taskId,auth:AUTH});
      if(result.status==="failed")throw Error("RESUME_FAILED:"+JSON.stringify(result));
      return result.status==="completed"?result:null;
    });
    assert.equal(completed.result.structuredContent.language,"alan");
    assert.equal(completed.result.structuredContent.value.result.answer,
      "externally proven answer");
    assert.equal(reads,1,"saved Alan frames, no prior tool replay");
    assert.equal(delegations,0,"never execute governed ChatGPT capability implicitly");
    assert.equal(verifications,2);
    const duplicate=await bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{
      receipt_ref:"cps:fixture:verified",
    });
    assert.equal(duplicate.duplicate,true);
    assert.equal(store.auditTopicCommitment(packetTopicForMcpTask(taskId)).ok,true);
    close();open();const last=await bridge.recover();
    assert.equal(last.scheduled,0);
    assert.equal((await bridge.adapter.get({taskId,auth:AUTH})).status,"completed");
    assert.equal(reads,1);
  }finally{close();rmSync(root,{recursive:true,force:true})}
});

test("two governed continuations retain positional slots and one total program budget",async()=>{
  const root=mkdtempSync(join(tmpdir(),"multimcp-multi-stage-"));
  const path=join(root,"store.sqlite");
  let store=createSqliteCopEventStore(path),bridge;
  const code=[
    "alan 0.2", "use std.mcp",
    "extern chatgpt.delegate", "  kind tool",
    "  effect private_data_access","  data private","  policy P3",
    "  input { prompt: string }","  output { value: any }","end",
    "fn main",
    "  a = mcp chatgpt.delegate prompt=\"First step\"",
    "  b = mcp chatgpt.delegate prompt=\"Second step\"",
    "  return first=$a.value second=$b.value",
    "end",
  ].join("\n");
  const delegated={
    async handleJsonRpc(message){
      if(message.method==="tools/list")return {result:{tools:[{
        name:"delegate",annotations:{readOnlyHint:false},
        inputSchema:{type:"object"},
      }]}};
      throw Error("external dispatch without authority");
    },
  };
  let checked=0;
  function open(){
    const runtime=createMultiMcpProgramRuntime({providers:{chatgpt:delegated}});
    bridge=createMultiMcpCopBridge({
      runtime,store,allowAnonymous:true,
      ownerInstanceRef:"instance:multi-stage",
      primaryStoreId:"sqlite:multi-stage",
      authorizationForTask:async()=>AUTH,
      verifyExternalResult:async({candidate,pending})=>{
        checked++;
        if(candidate?.receipt_ref!=="cps:slot:"+pending.slot_ordinal)
          return {verified:false};
        return {verified:true,receipt_ref:candidate.receipt_ref,
          value:{value:{response:pending.input.prompt}}};
      },
    });
    bridge.start();
  }
  try{
    open();
    const {taskId}=await bridge.adapter.create({
      name:MULTIMCP_PROGRAM_TOOL,auth:AUTH,
      args:{language:"alan",code,maxCalls:2},
    });
    await until(async()=>{
      const s=await bridge.adapter.get({taskId,auth:AUTH});
      return s.status==="input_required"?s:null;
    });
    let history=store.listTopic(packetTopicForMcpTask(taskId));
    assert.equal(history.findLast(e=>e.payload?.phase==="input_required")
      .payload.pending.slot_ordinal,0);
    await bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{
      receipt_ref:"cps:slot:0",
    });
    await until(async()=>{
      const history=store.listTopic(packetTopicForMcpTask(taskId));
      return history.filter(e=>e.payload?.phase==="input_required").length===2;
    });
    history=store.listTopic(packetTopicForMcpTask(taskId));
    const second=history.findLast(e=>e.payload?.phase==="input_required");
    assert.equal(second.payload.pending.slot_ordinal,1);
    assert.equal(second.payload.checkpoint.saved_state.slots[0].state,"resolved");
    assert.equal(second.payload.checkpoint.saved_state.slots[1].state,"pending");
    await bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{
      receipt_ref:"cps:slot:1",
    });
    const finished=await until(async()=>{
      const s=await bridge.adapter.get({taskId,auth:AUTH});
      return s.status==="completed"?s:null;
    });
    assert.deepEqual(finished.result.structuredContent.value,{
      first:{response:"First step"},second:{response:"Second step"},
    });
    assert.equal(checked,2);
    assert.equal(store.auditTopicCommitment(packetTopicForMcpTask(taskId)).ok,true);
  }finally{bridge?.stop();store.close();rmSync(root,{recursive:true,force:true})}
});
