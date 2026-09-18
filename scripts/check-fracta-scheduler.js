import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createSchedulerRunContext, runFractaCycle, SCHEDULER_CYCLE_MODES, SCHEDULER_STAGE_STATUS } from "./lib/fracta-scheduler.js";
import { invokeCapability } from "./lib/v3-modules.js";

console.log("Running FractaScheduler test suite...");

// Unit 1: createSchedulerRunContext
const ctx = createSchedulerRunContext({}, { mode: SCHEDULER_CYCLE_MODES.SLEEP, dryRun: true });
assert.equal(ctx.mode, "sleep");
assert.equal(ctx.dryRun, true);
assert.equal(ctx.stages.length, 0);
console.log("  ✓ Unit 1 passed: createSchedulerRunContext defaults");

// Unit 2: runFractaCycle mock execution
const mockHooks = {
  converge: async () => ({ docs: 10, chunks: 50, edges: 20 }),
  checkMutations: async () => ({ total_scanned: 10, passed: 10, warnings: 0, blocked: 0 }),
  syncIssues: async () => ({ synced: 5 }),
  maintainContinuations: async () => ({ aliveCount: 0 }),
  exportViews: async () => ({ ok: true }),
  auditGit: async () => ([{ name: "cogentia", clean: true }]),
};

const result = await runFractaCycle(ctx, mockHooks);
assert.equal(result.ok, true);
assert.equal(result.stages.length, 6);
assert.equal(result.stages.every(s => s.status === SCHEDULER_STAGE_STATUS.SUCCESS), true);
assert.equal(result.metrics.docsCount, 10);
assert.equal(result.metrics.chunksCount, 50);
console.log("  ✓ Unit 2 passed: runFractaCycle stage execution and metrics");

// CLI 1: cogentia scheduler status
const statusOut = execFileSync(process.execPath, ["scripts/cogentia.js", "scheduler", "status", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
});
const statusJson = JSON.parse(statusOut);
assert.equal(statusJson.ok, true);
assert.equal(statusJson.scheduler, "FractaScheduler");
console.log("  ✓ CLI 1 passed: cogentia scheduler status --json");

console.log("\nAll FractaScheduler tests passed successfully!");
