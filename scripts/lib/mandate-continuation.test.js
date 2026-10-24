import test from "node:test";
import assert from "node:assert/strict";
import { decideMandateContinuation, runMandateToBoundary } from "./mandate-continuation.js";

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

test("runner completes a three-step mandate without any human continue prompt", async () => {
  let count = 0;
  const result = await runMandateToBoundary({
    inspect: () => count === 3 ? { objective_met: true } : {
      next_step_clear: true, next_step_allowed: true,
    },
    execute: async () => { count++; return { ok: true }; },
  });
  assert.equal(result.action, "complete");
  assert.equal(result.steps_completed, 3);
  assert.equal(count, 3);
});
test("runner refuses an unapproved or consequential step", async () => {
  let calls = 0;
  const result = await runMandateToBoundary({
    inspect: () => ({ next_step_clear: true, next_step_allowed: true, judgment_required: true }),
    execute: async () => { calls++; return { ok: true }; },
  });
  assert.equal(result.action, "escalate");
  assert.equal(calls, 0);
});
test("runner contains repeated attempts with hard bounded budget", async () => {
  let count = 0;
  const result = await runMandateToBoundary({
    inspect: () => ({ next_step_clear: true, next_step_allowed: true }),
    execute: async () => { count++; return { ok: true }; },
    max_steps: 2,
  });
  assert.equal(result.reason, "step_limit");
  assert.equal(count, 2);
});
test("runner stops on failed step rather than spinning", async () => {
  const result = await runMandateToBoundary({
    inspect: () => ({ next_step_clear: true, next_step_allowed: true }),
    execute: async () => ({ ok: false, code: "synthetic_failure" }),
  });
  assert.equal(result.action, "handoff");
  assert.equal(result.reason, "step_failed");
  assert.equal(result.steps_completed, 0);
});
