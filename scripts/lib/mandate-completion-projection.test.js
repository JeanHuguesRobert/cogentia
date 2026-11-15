import test from "node:test";
import assert from "node:assert/strict";
import {projectCognitivePacketProgress as projectMandateProgress} from "./cognitive-packet-progress.js";
test("agent's untrusted completed claim cannot complete a packet without acceptance evidence",()=>{
  assert.equal(projectMandateProgress({agentClaim:"completed"}).status,"open");
  assert.equal(projectMandateProgress({acceptance:["build","deploy"],
    evidence:[{criterion:"build",verified:true,receipt_ref:"commit:a"}],
    agentClaim:"completed"}).status,"open");
});
test("verified receipts, not approval theatre, can complete an actual packet",()=>{
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
test("only concrete verified blocker can suspend an incomplete packet",()=>{
  assert.equal(projectMandateProgress({acceptance:["deploy"],
    blocker:{verified:true,prevents_progress:true}}).status,"open");
  assert.equal(projectMandateProgress({acceptance:["deploy"],
    blocker:{verified:true,prevents_progress:true,evidence_ref:"ops:denied"}}).status,"blocked");
});

test("mandated agent completion is accepted under optimistic locking, no second judge",()=>{
  const verdict=projectMandateProgress({acceptance:["build","deploy"],
    trustAgentJudgment:true,agentClaim:"completed"});
  assert.equal(verdict.status,"completed");
  assert.equal(verdict.acceptance_basis,"agent_judgment");
  assert.deepEqual(verdict.missing,[]);
  assert.equal(projectMandateProgress({trustAgentJudgment:true,
    agentClaim:"completed"}).status,"completed");
});
test("agent next step is a bounded proposal, not an executable grant",()=>{
  const verdict=projectMandateProgress({trustAgentJudgment:true,
    agentClaim:"continue",agentNextAction:"inspect-commit"});
  assert.equal(verdict.status,"continue");
  assert.equal(verdict.next_action,"inspect-commit");
  assert.equal(projectMandateProgress({agentNextAction:"inspect-commit"}).status,"open");
});
