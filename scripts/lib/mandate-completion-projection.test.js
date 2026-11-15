import test from "node:test";
import assert from "node:assert/strict";
import {projectMandateProgress} from "./mandate-completion-projection.js";
test("agent's completed claim cannot close a mandate without acceptance evidence",()=>{
  assert.equal(projectMandateProgress({agentClaim:"completed"}).status,"open");
  assert.equal(projectMandateProgress({acceptance:["build","deploy"],
    evidence:[{criterion:"build",verified:true,receipt_ref:"commit:a"}],
    agentClaim:"completed"}).status,"open");
});
test("verified receipts, not approval theatre, can close an actual mandate",()=>{
  const verdict=projectMandateProgress({acceptance:["build","deploy"],
    evidence:[{criterion:"build",verified:true,receipt_ref:"commit:a"},
      {criterion:"deploy",verified:true,receipt_ref:"cop:event:b"}]});
  assert.equal(verdict.status,"completed");
});
test("known feasible next action overrides speculative or unverified blockers",()=>{
  const verdict=projectMandateProgress({acceptance:["deploy"],
    nextActions:[{id:"deploy-now",admissible:true,available:true}],
    blocker:{verified:true,prevents_progress:true,evidence_ref:"claim:failed"}});
  assert.equal(verdict.status,"continue");
  assert.equal(verdict.next_action,"deploy-now");
});
test("only concrete verified blocker can suspend an incomplete mandate",()=>{
  assert.equal(projectMandateProgress({acceptance:["deploy"],
    blocker:{verified:true,prevents_progress:true}}).status,"open");
  assert.equal(projectMandateProgress({acceptance:["deploy"],
    blocker:{verified:true,prevents_progress:true,evidence_ref:"ops:denied"}}).status,"blocked");
});
