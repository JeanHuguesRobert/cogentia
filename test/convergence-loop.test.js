import { test } from "node:test";
import assert from "node:assert/strict";
import { runConvergenceLoop } from "../scripts/lib/convergence-loop.js";

// cogentia#121: "cycle/stage executed successfully" != "corpus actually
// converged to a fixed point". This is the regression fixture #121 asked
// for: a deterministic propagation chain that needs more passes than
// --max-iterations allows, asserting the loop never reports a fixed point
// it didn't reach.
test("reports max_iterations, not fixed_point, when the limit is hit before convergence", () => {
  // Each pass "discovers" one more pending write until pass 3, simulating a
  // generated-view regeneration that reveals new downstream changes each
  // time it runs (e.g. corpus-status.md -> backlinks -> corpus-status.md).
  const passWriteCounts = [1, 1, 1]; // would need 3 passes to reach 0 (fixed point)
  let callCount = 0;
  const applied = [];

  const result = runConvergenceLoop({
    maxIterations: 2, // fixture needs 3 passes; capped at 2
    dryRun: false,
    computePlan: () => {
      const count = passWriteCounts[callCount] ?? 0;
      callCount++;
      return Array.from({ length: count }, (_, i) => ({
        repo: "fixture-repo",
        path: `file-${callCount}-${i}.md`,
        full_path: `/fixture/file-${callCount}-${i}.md`,
        before: "",
        after: "content",
        allowed: true,
        type: "update",
      }));
    },
    writeFile: (write) => applied.push(write),
  });

  assert.equal(result.iterations, 2, "must stop at the configured limit, not silently keep going");
  assert.equal(result.reachedFixedPoint, false, "2 iterations against a 3-pass fixture must not claim convergence");
  assert.equal(result.terminationReason, "max_iterations");
  assert.equal(result.allApplied.length, 2, "one write applied per pass for 2 passes");
  assert.equal(applied.length, 2, "writeFile must have actually been called for the applied writes");
});

// Positive fixture: convergence really is reached, and reported as such.
test("reports fixed_point when the propagation chain actually settles", () => {
  const passWriteCounts = [1, 1, 0]; // settles to 0 pending changes on pass 3
  let callCount = 0;

  const result = runConvergenceLoop({
    maxIterations: 5,
    dryRun: false,
    computePlan: () => {
      const count = passWriteCounts[callCount] ?? 0;
      callCount++;
      return Array.from({ length: count }, (_, i) => ({
        repo: "fixture-repo",
        path: `file-${callCount}-${i}.md`,
        full_path: `/fixture/file-${callCount}-${i}.md`,
        before: "",
        after: "content",
        allowed: true,
        type: "update",
      }));
    },
    writeFile: () => {},
  });

  assert.equal(result.iterations, 3, "must stop as soon as a pass proposes zero writes");
  assert.equal(result.reachedFixedPoint, true);
  assert.equal(result.terminationReason, "fixed_point");
  assert.equal(result.allApplied.length, 2, "only the 2 passes with real writes count toward allApplied");
});

// Dry run must never call writeFile and must only ever evaluate one pass,
// since it has no way to see what a second pass would look like without
// having actually written the first pass's changes.
test("dry run evaluates exactly one pass and never writes", () => {
  let writeCalls = 0;
  let planCalls = 0;

  const result = runConvergenceLoop({
    maxIterations: 5,
    dryRun: true,
    computePlan: () => {
      planCalls++;
      return [{ repo: "fixture-repo", path: "always-pending.md", full_path: "/fixture/always-pending.md", before: "", after: "content", allowed: true, type: "update" }];
    },
    writeFile: () => { writeCalls++; },
  });

  assert.equal(planCalls, 1, "dry run must not iterate past the first pass");
  assert.equal(writeCalls, 0, "dry run must never actually write");
  assert.equal(result.iterations, 1);
  assert.equal(result.reachedFixedPoint, false, "1 pending write on the single evaluated pass is not a fixed point");
});

// Integration with the real semantic-mutation checker: a write that trips a
// BLOCK (document_role demotion from "source" without explicit override,
// the same class of real violation surfaced live during the 2026-09-14/15
// session) must be filtered out of "allowed" by the loop itself, not just
// reported after the fact — a pass whose only candidate write is blocked
// must count as a fixed point (nothing left that's actually allowed to move).
test("a BLOCKed mutation is excluded from allowed writes, not silently applied", () => {
  const before = "---\ndocument_role: \"source\"\nupdate_policy: \"UP-DEFAULT-REVIEWED\"\n---\n\nbody";
  const after = "---\ndocument_role: \"index\"\nupdate_policy: \"UP-DEFAULT-REVIEWED\"\n---\n\nbody";
  let writeCalls = 0;

  const result = runConvergenceLoop({
    maxIterations: 5,
    dryRun: false,
    computePlan: () => [{ repo: "fixture-repo", path: "demoted.md", full_path: "/fixture/demoted.md", before, after, allowed: true, type: "update" }],
    writeFile: () => { writeCalls++; },
  });

  assert.equal(writeCalls, 0, "a BLOCKed write must never reach writeFile");
  assert.equal(result.reachedFixedPoint, true, "once the only candidate write is blocked, there is nothing left the loop is allowed to apply");
  assert.equal(result.allApplied.length, 0);
});
