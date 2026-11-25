import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createMcpCore} from "./cogentia-mcp-core.js";
import {createMultiMcpServiceRuntime} from "./multimcp-service-runtime.mjs";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";

import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {issueVerifiedJohnRoot} from "./john-root-issuance.js";
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,
  proposalHash,publicKeyFingerprint} from "./john-root-mandate.js";
import {prepareAssignedChatgptCpsContinuation} from "./chatgpt-cps-assignment.js";
import {createEventSourcedExecutionBudgetLedger} from "../../../inseme/packages/cop-core/src/execution-budget.js";
import {assignedCpsReference,createCanonicalChatgptCpsReturnVerifier} from "./multimcp-cps-return.js";

const REF="mandate:jhn:john-root";
function signedCpsStore(path=":memory:"){
  const s=createSqliteCopEventStore(path);
  const kp=generateKeyPairSync("ed25519");
  const pem=kp.publicKey.export({type:"spki",format:"pem"});
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:REF,version:"v1",
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    valid_from:"2026-01-01T00:00:00Z",valid_until:"2027-01-01T00:00:00Z",
    scope:{allowed_actions:["browser.chatgpt.turn"],
      forbidden_actions:[...RESERVED_ACTIONS],
      chatgpt_turn_policy:{origin:"https://chatgpt.com",
        browser_instance_id:"fracta2-hosted",
        max_consecutive_turns:8,require_cop_result_receipt:true}},
    max_delegation_depth:1,budget_limits:{max_steps:40}};
  const approval={kind:"cogentia.principal-signature/v1",
    principal_ref:"principal:jhn",payload_hash:proposalHash(proposal),
    key_fingerprint:publicKeyFingerprint(pem),
    signature_base64:sign(null,canonicalProposalBytes(proposal),kp.privateKey)
      .toString("base64")};
  const issued=issueVerifiedJohnRoot({store:s,proposal,approval,
    trustedPublicKeyPem:pem,now:new Date("2026-11-15T12:00:00Z")});
  assert.equal(issued.ok,true);
  return s;
}
test("CPS verifier accepts only an assigned, accepted, budget-settled return (synthetic receipts)",async()=>{
  const s=signedCpsStore();
  try{
    const packetRef="pkt-mcp-12345678-1234-1234-1234-123456789abc";
    const pending={capability:"chatgpt.delegate",
      slot_ordinal:1,
      input:{prompt:"Produce a source-grounded answer"},
      policy:{level:"P3",effect:"private_data_access"}};
    const suspension={type:"alan.suspension",
      pending_call:{capability:"chatgpt.delegate",
        slot_ordinal:1,input:{...pending.input}}};
    const {task_ref,continuation_id}=assignedCpsReference({packetRef,pending});
    const verifier=createCanonicalChatgptCpsReturnVerifier({cpsStore:s});
    const candidate={continuation_id,answer:"FORGED CLIENT ANSWER"};
    assert.equal((await verifier({packetRef,pending,suspension,candidate})).verified,false);
    const declared=await prepareAssignedChatgptCpsContinuation({
      store:s,task_ref,question:pending.input.prompt,
    });
    assert.equal(declared.ok,true,JSON.stringify(declared));
    assert.equal(declared.continuation_id,continuation_id);
    assert.equal((await verifier({packetRef,pending,suspension,candidate})).verified,false);
    const c=s.listTopic("continuation:"+continuation_id).find(e=>
      e.payload?.profile==="cop/continuation").payload.continuation;
    function append(phase,profile,extra={},key=phase){
      const r=s.append({
        topic_id:"continuation:"+continuation_id,
        event_type:"cop.event/v1",
        actor_id:"cop:synthetic-test",subject_ref:"continuation:"+continuation_id,
        visibility:"restricted",epistemic_status:"observed",
        idempotency_key:"fixture:"+continuation_id+":"+key,
        payload:{profile,phase,continuation_id,...extra},
      });
      assert.equal(r.ok,true,JSON.stringify(r));
      return r.event;
    }
    const click=s.append({
      topic_id:"continuation:"+continuation_id,
      event_type:"cop.event/v1",
      actor_id:"cop:synthetic-test",subject_ref:"continuation:"+continuation_id,
      visibility:"restricted",epistemic_status:"observed",
      idempotency_key:"chatgpt-browser:"+continuation_id+":first-dispatch-receipt",
      payload:{profile:"cop.continuation-browser-dispatch/v1",
        phase:"ui_click_dispatched_not_model_result",continuation_id},
    });
    assert.equal(click.ok,true);
    const validity={observation_key:"fixture-observation-1",
      correlation_valid:true,schema_valid:true};
    append("accepted","cop.continuation-result/v1",validity);
    const returned=append("returned","cop.continuation-result/v1",{
      ...validity,
      candidate_result:{status:"answered",result:{
        answer:"Verified source answer",packet_status:"completed",
      }},
    });
    assert.equal((await verifier({packetRef,pending,suspension,candidate})).verified,false);
    append("handler_completed","cop.continuation-dispatch/v1");
    append("pending_scheduler_review","cop.continuation-scheduler-wake/v1",
      {returned_receipt_ref:returned.idempotency_key});
    assert.equal((await verifier({packetRef,pending,suspension,candidate})).verified,false);
    const ledger=createEventSourcedExecutionBudgetLedger({
      store:s,budget_id:"budget:"+REF,require_authority_grant:true});
    const settle=ledger.settle({
      reservation_id:c.budget_reservation_id,
      expected_version:ledger.snapshot().version,
      idempotency_key:"fixture-settlement:"+continuation_id,
      usage:{max_steps:1},
    });
    assert.equal(settle.ok,true,JSON.stringify(settle));
    const verified=await verifier({packetRef,pending,suspension,candidate});
    assert.equal(verified.verified,true,JSON.stringify(verified));
    assert.equal(verified.receipt_ref,returned.idempotency_key);
    assert.equal(verified.value.value.answer,"Verified source answer");
    assert.equal(verified.value.value.packet_status,"completed");
    const altered=await verifier({packetRef,pending:{
      ...pending,input:{prompt:"Different effect"},
    },suspension,candidate});
    assert.equal(altered.verified,false);
    assert.equal(s.auditCommitments().ok,true);
  }finally{s.close()}
});


test("two independent COP localities: MCP Alan suspension -> signed CPS assignment -> verified return -> resumed Task",async()=>{
  const root=mkdtempSync(join(tmpdir(),"multimcp-cross-locality-"));
  const taskPath=join(root,"task.sqlite");
  const cpsPath=join(root,"cps.sqlite");
  createSqliteCopEventStore(taskPath).close();
  let cps=signedCpsStore(cpsPath);
  let live,core;
  const token="test-only-cross-locality-token";
  const env={
    COGENTIA_MCP_VIEW:"public",
    COGENTIA_MCP_MULTIMCP_ENABLED:"1",
    COGENTIA_MCP_TASKS_COP_DATABASE:taskPath,
    COGENTIA_MCP_LOCAL_INSTANCE_REF:"instance:program-locality",
    COGENTIA_MCP_LOCAL_STORE_ID:"sqlite:program-locality",
    COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:token,
  };
  const meta={
    "io.modelcontextprotocol/protocolVersion":"2026-07-28",
    "io.modelcontextprotocol/clientCapabilities":{
      extensions:{"io.modelcontextprotocol/tasks":{}}},
    "cogentia.actor":"agent:jhn",
    "cogentia.principal_ref":"principal:jhn",
    "cogentia.jhn_token":token,
  };
  const auth=resolveCallerAuth(env,{meta,view:"public"});
  const request=(method,params={})=>({
    jsonrpc:"2.0",id:1,method,params:{...params,_meta:meta},
  });
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){
    for(let i=0;i<90;i++){const x=await fn();if(x)return x;await wait(20)}
    throw Error("cross_locality_task_not_reached");
  }
  const delegate={
    async handleJsonRpc(req){
      if(req.method==="tools/list")return {result:{tools:[{
        name:"delegate",inputSchema:{type:"object"},
        annotations:{readOnlyHint:false},
      }]}};
      throw Error("browser_was_not_authorized_by_this_test");
    },
  };
  const code=[
    "alan 0.2","use std.mcp",
    "extern chatgpt.delegate",
    "  kind tool","  effect private_data_access","  data private",
    "  policy P3","  input { prompt: string }",
    "  output { value: any }","end",
    "fn main",
    '  step = mcp chatgpt.delegate prompt="Compute a bounded answer"',
    "  return answer=$step.value",
    "end",
  ].join("\n");
  function appendReceipt(phase,profile,id,extra={},suffix=phase){
    const a=cps.append({
      topic_id:"continuation:"+id,event_type:"cop.event/v1",
      actor_id:"cop:synthetic-delivery",subject_ref:"continuation:"+id,
      visibility:"restricted",epistemic_status:"observed",
      idempotency_key:"fixture:"+id+":"+suffix,
      payload:{profile,phase,continuation_id:id,...extra},
    });
    assert.equal(a.ok,true,JSON.stringify(a));
    return a.event;
  }
  try{
    live=createMultiMcpServiceRuntime(env,{
      coreAccessor:()=>core,
      additionalProviders:{chatgpt:delegate},
      cpsStore:cps,
    });
    core=createMcpCore(env,live.extras);
    await live.start();
    const created=await core.handleJsonRpc(request("tools/call",{
      name:"multimcp_program_execute",arguments:{
        language:"alan",code,maxCalls:1,
      },
    }));
    assert.equal(created.result?.resultType,"task",JSON.stringify(created).slice(0,400));
    const taskId=created.result.taskId;
    const pending=await until(async()=>{
      const x=await live.pendingCps({taskId,auth});
      return x||null;
    });
    assert.equal(pending.question,"Compute a bounded answer");
    const preparation=await prepareAssignedChatgptCpsContinuation({
      store:cps,task_ref:pending.task_ref,question:pending.question,
    });
    assert.equal(preparation.ok,true,JSON.stringify(preparation));
    assert.equal(preparation.continuation_id,pending.continuation_id);
    await assert.rejects(live.acceptCanonicalCpsReturn({
      taskId,auth,continuation_id:pending.continuation_id,
    }),/verified_cps_result_required/);
    // No real browser dispatch is performed in this fixture. Only the CPS
    // acceptance receipts are synthesized in the separate source locality.
    const id=pending.continuation_id;
    const click=cps.append({
      topic_id:"continuation:"+id,event_type:"cop.event/v1",
      actor_id:"cop:synthetic-delivery",subject_ref:"continuation:"+id,
      visibility:"restricted",epistemic_status:"observed",
      idempotency_key:"chatgpt-browser:"+id+":first-dispatch-receipt",
      payload:{profile:"cop.continuation-browser-dispatch/v1",
        phase:"ui_click_dispatched_not_model_result",continuation_id:id},
    });
    assert.equal(click.ok,true);
    const validity={observation_key:"fixture-observation-2",
      correlation_valid:true,schema_valid:true};
    appendReceipt("accepted","cop.continuation-result/v1",id,validity);
    const returned=appendReceipt("returned","cop.continuation-result/v1",id,{
      ...validity,
      candidate_result:{status:"answered",result:{
        answer:"Answer from synthetic accepted CPS turn",
        packet_status:"completed",
      }},
    });
    appendReceipt("handler_completed","cop.continuation-dispatch/v1",id);
    appendReceipt("pending_scheduler_review",
      "cop.continuation-scheduler-wake/v1",id,{
        returned_receipt_ref:returned.idempotency_key,
      });
    const c=cps.listTopic("continuation:"+id).find(e=>
      e.payload?.profile==="cop/continuation").payload.continuation;
    const ledger=createEventSourcedExecutionBudgetLedger({
      store:cps,budget_id:"budget:"+REF,require_authority_grant:true,
    });
    const settled=ledger.settle({
      reservation_id:c.budget_reservation_id,
      expected_version:ledger.snapshot().version,
      idempotency_key:"fixture-settlement:"+id,
      usage:{max_steps:1},
    });
    assert.equal(settled.ok,true);
    const accepted=await live.acceptCanonicalCpsReturn({
      taskId,auth,continuation_id:id,
    });
    assert.equal(accepted.ok,true);
    const finished=await until(async()=>{
      const x=await core.handleJsonRpc(request("tasks/get",{taskId}));
      return x.result?.status==="completed"?x:null;
    });
    assert.equal(finished.result.result.structuredContent.value.answer.answer,
      "Answer from synthetic accepted CPS turn");
    assert.equal(await live.pendingCps({taskId,auth}),null);
    assert.equal(cps.auditCommitments().ok,true);
    const taskStore=createSqliteCopEventStore(taskPath);
    assert.equal(taskStore.auditCommitments().ok,true);
    taskStore.close();
  }finally{live?.close();cps.close();rmSync(root,{recursive:true,force:true})}
});
