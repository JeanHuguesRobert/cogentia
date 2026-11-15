import test from "node:test";
import assert from "node:assert/strict";
import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createJohnMandateTurnContinuity} from "./john-mandate-turn-continuity.js";

const base={request_id:"john-turn-001",mandate:{id:"mandate:chatgpt-corpus-coding"},
  principal:{id:"principal:jhn"},
  input:{prompt:"secret should never be stored",
    continuity:{goal_ref:"cogentia-330",acceptance:["CPS-dispatch","parent-closure"]}}};
const called={request:base,events:[{type:"john.run.completed",data:{result:{text:"secret answer"}}}],
  actor:"agent:jhn",principal_ref:"principal:jhn"};

test("real canonical journal never equates a completed turn with completed mandate",()=>{
  const store=createSqliteCopEventStore(":memory:");
  try{
    const bridge=createJohnMandateTurnContinuity({store});
    const first=bridge.record(called);
    assert.equal(first.ok,true);
    assert.equal(first.mandate_status,"open");
    assert.equal(first.needs_continuation,true);
    assert.equal(first.duplicate,false);
    const replay=bridge.record(called);
    assert.equal(replay.ok,true);
    assert.equal(replay.duplicate,true);
    assert.equal(replay.receipt_ref,first.receipt_ref);
    const records=store.listTopic("john-mandate:cogentia-330");
    assert.equal(records.length,1);
    assert.equal(records[0].payload.turn_status,"completed");
    assert.equal(records[0].payload.mandate_status,"open");
    assert.equal(JSON.stringify(records).includes("secret"),false);
  } finally {store.close();}
});

test("untrusted actor, malformed context, and reused conflicting request refuse journal writes",()=>{
  const store=createSqliteCopEventStore(":memory:");
  try{
    const bridge=createJohnMandateTurnContinuity({store});
    assert.equal(bridge.record({...called,actor:"agent:other"}).ok,false);
    assert.equal(bridge.record({...called,request:{...base,
      input:{...base.input,continuity:{...base.input.continuity,
        acceptance:["bad space"]}}}}).ok,false);
    assert.equal(bridge.record(called).ok,true);
    assert.equal(bridge.record({...called,request:{...base,input:{...base.input,
      continuity:{...base.input.continuity,goal_ref:"different-goal"}}}}).reason,
      "request_idempotency_conflict");
  }finally{store.close();}
});

test("nonterminal turn and missing contract do not falsely complete the parent",()=>{
  const store=createSqliteCopEventStore(":memory:");
  try{
    const bridge=createJohnMandateTurnContinuity({store});
    assert.equal(bridge.record({...called,events:[]}).reason,"turn_not_terminal");
    assert.equal(bridge.record({...called,request:{...base,input:{prompt:"hi"}}}),null);
  }finally{store.close();}
});
