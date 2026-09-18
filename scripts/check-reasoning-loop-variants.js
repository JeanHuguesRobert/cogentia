#!/usr/bin/env node
import assert from "node:assert/strict";
import { LOOP_BATTERY, runReasoningLoopTournament } from "./lib/reasoning-loop-battery.js";
import { listReasoningLoopVariants } from "./lib/reasoning-loop-variants.js";

const tournament = await runReasoningLoopTournament(listReasoningLoopVariants());

const byId = Object.fromEntries(tournament.scores.map((s) => [s.variant, s]));

function cell(ok) {
  return ok ? "PASS" : "fail";
}

const testIds = LOOP_BATTERY.map((t) => t.id);
const header = ["variant", "passed", ...testIds].join("\t");
console.log(`\nReasoning-loop tournament (${tournament.total_tests} tests)\n`);
console.log(header);
for (const score of tournament.scores) {
  const flags = score.results.map((r) => cell(r.ok)).join("\t");
  console.log(`${score.variant}\t${score.passed}/${score.total}\t${flags}`);
}
console.log("");

for (const score of tournament.scores) {
  const misses = score.results.filter((r) => !r.ok);
  if (!misses.length) {
    console.log(`ok - ${score.variant} passed all battery tests`);
    continue;
  }
  console.log(`${score.variant} misses:`);
  for (const miss of misses) {
    console.log(`  - ${miss.test}: ${miss.detail}`);
  }
}

assert.ok(byId.pipeline_guide, "pipeline control missing");
assert.ok(byId.next_step_greedy, "nextStep control missing");
assert.ok(byId.fifo_queue, "fifo contrast missing");
assert.equal(
  byId.pipeline_guide.results.find((r) => r.test === "orientation_before_answer_kudos").ok,
  false,
  "pipeline control must fail orientation-before-answer (otherwise the battery is not discriminating)"
);
assert.equal(
  byId.next_step_greedy.results.find((r) => r.test === "scheduler_is_not_a_model").ok,
  false,
  "greedy nextStep must fail scheduler_is_not_a_model"
);

assert.equal(
  byId.fifo_queue.results.find((r) => r.test === "rogue_cannot_skip_orientation").ok,
  false,
  "FIFO must fail rogue_cannot_skip_orientation (events without a scheduler policy are not enough)"
);

const eventVariants = tournament.scores.filter((s) =>
  ["phase_queue", "barrier_set", "packet_switch"].includes(s.variant)
);
const perfect = eventVariants.filter((s) => s.passed === s.total);
assert.ok(
  perfect.length >= 1,
  `expected at least one event-kernel variant to pass all tests, got ${eventVariants.map((s) => `${s.variant}:${s.passed}/${s.total}`).join(", ")}`
);

if (perfect.length > 1) {
  console.log(
    `\nNote: ${perfect.map((s) => s.variant).join(", ")} are currently equivalent on this battery. Add a test that splits them before treating them as the same kernel.`
  );
}

console.log("\nTournament runner checks passed.");
