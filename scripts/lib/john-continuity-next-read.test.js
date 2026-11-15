import test from "node:test";
import assert from "node:assert/strict";
import {admissibleJohnContinuationReadHop} from "./john-continuity-next-read.js";

const parent={
 request_id:"p1",principal:{id:"principal:jhn"},
 mandate:{id:"mandate:chatgpt-corpus-coding"},budget:{id:"budget:john"},
 exposure:"none",input:{continuity:{goal_ref:"goal-1",acceptance:["complete"]}},
};
const child={
 version:"john.request.v1",request_id:"c1",
 principal:{id:"principal:jhn"},mandate:{id:"mandate:chatgpt-corpus-coding"},
 budget:{id:"budget:john"},exposure:"read_only",
 capability:"browser.navigation.instances",
 handler:{kind:"capability_once",allowed_capabilities:["browser.navigation.instances"]},
 execution_budget:{max_steps:3,max_tool_calls:1,max_external_effects:0,max_subagents:0,max_elapsed_ms:9000},
 input:{prompt:"Read browser status",arguments:{action:"status"},
  continuity:{goal_ref:"goal-1",acceptance:["complete"]}},
};
test("known signed read capability is eligible for independently admitted next John run",()=>{
 assert.deepEqual(admissibleJohnContinuationReadHop(parent,child,0),{ok:true});
});
test("no unbounded chains or scope expansion",()=>{
 assert.equal(admissibleJohnContinuationReadHop(parent,child,2).reason,"continuation_hop_limit");
 assert.equal(admissibleJohnContinuationReadHop(parent,{...child,request_id:"p1"}).reason,"next_request_id_invalid");
 assert.equal(admissibleJohnContinuationReadHop(parent,{...child,exposure:"bounded"}).reason,"next_read_capability_required");
 assert.equal(admissibleJohnContinuationReadHop(parent,{...child,capability:"workspace.write"}).reason,"next_read_capability_required");
 assert.equal(admissibleJohnContinuationReadHop(parent,{...child,budget:{id:"other"}}).reason,"next_authority_scope_mismatch");
 assert.equal(admissibleJohnContinuationReadHop(parent,{...child,execution_budget:{...child.execution_budget,max_external_effects:1}}).reason,"next_budget_not_bounded");
 assert.equal(admissibleJohnContinuationReadHop(parent,{...child,input:{...child.input,continuity:{goal_ref:"other",acceptance:["complete"]}}}).reason,"next_continuity_mismatch");
});
