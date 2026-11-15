import test from "node:test";
import assert from "node:assert/strict";
import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createJohnMandateTurnContinuity} from "./john-mandate-turn-continuity.js";
import {createMcpCore} from "./cogentia-mcp-core.js";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";

test("MCP pending journal is JHN-private and reconstructs an open parent",async()=>{
  const store=createSqliteCopEventStore(":memory:");
  try{
    const journal=createJohnMandateTurnContinuity({store});
    const req={request_id:"jhn-mcp-test-01",principal:{id:"principal:jhn"},
      mandate:{id:"mandate:chatgpt-corpus-coding"},input:{
        continuity:{goal_ref:"goal-one",acceptance:["delivery"]},
      }};
    const record=journal.record({request:req,events:[{type:"john.run.completed"}],
      actor:"agent:jhn",principal_ref:"principal:jhn"});
    assert.equal(record.ok,true);
    const env={COGENTIA_MCP_VIEW:"public",
      COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:"fixture-token"};
    const core=createMcpCore(env,{mandateTurnContinuity:journal});
    const anon=core.tools.map(x=>x.name);
    assert.equal(anon.includes("cogentia_john_mandate_pending"),false);
    const auth=resolveCallerAuth(env,{headers:{authorization:"Bearer fixture-token"},
      meta:{"cogentia.actor":"agent:jhn",
        "cogentia.mandate_ref":"mandate:chatgpt-corpus-coding"}});
    const result=await core.callTool("cogentia_john_mandate_pending",{goal_ref:"goal-one"},{auth});
    assert.equal(result.ok,true);
    assert.equal(result.pending.length,1);
    assert.equal(result.pending[0].needs_continuation,true);
    assert.equal(result.pending[0].mandate_status,"open");
    assert.equal(result.pending[0].receipt_ref,record.receipt_ref);
    await assert.rejects(()=>core.callTool("cogentia_john_mandate_pending",{}),/forbidden|private|auth/i);
  }finally{store.close();}
});
