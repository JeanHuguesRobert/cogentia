import test from "node:test";
import assert from "node:assert/strict";
import { decideMandateContinuation } from "./mandate-continuation.js";

test("clear authorized step continues without ritual human prompt", () => {
  assert.equal(decideMandateContinuation({next_step_clear:true,next_step_allowed:true}).action,"continue");
});
test("completed objective closes, rather than inventing more work", () => {
  assert.equal(decideMandateContinuation({objective_met:true,next_step_clear:true,next_step_allowed:true}).action,"complete");
});
test("material judgment stops and escalates despite an otherwise obvious next step", () => {
  assert.equal(decideMandateContinuation({next_step_clear:true,next_step_allowed:true,judgment_required:true}).action,"escalate");
});
test("blockers and budget exhaustion create handoffs, not false continuation", () => {
  for (const key of ["hard_blocker","budget_exhausted"]) {
    assert.equal(decideMandateContinuation({next_step_clear:true,next_step_allowed:true,[key]:true}).action,"handoff");
  }
});
test("unverified authority does not continue", () => {
  assert.equal(decideMandateContinuation({next_step_clear:true,next_step_allowed:false}).action,"escalate");
});
