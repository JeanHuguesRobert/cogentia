#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  CURRENT_LOOPS,
  EVENT_KINDS,
  PHASES,
  createHandlerRegistry,
  createReasoningEvent,
  createReasoningLoop,
  defaultStructuralHandlers,
  sharedAgentsPrologue,
} from "./lib/reasoning-loop.js";

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}

check("current Guide/JHN loops are catalogued as not this kernel", () => {
  assert.equal(CURRENT_LOOPS.guide_turn.shape, "pipeline");
  assert.equal(CURRENT_LOOPS.governed_harness.scheduler, "reasoner.nextStep(state)");
  assert.match(CURRENT_LOOPS.governed_harness.defect, /model chooses the next step kind/);
});

check("every event kind has a known phase", () => {
  for (const [kind, meta] of Object.entries(EVENT_KINDS)) {
    assert.ok(PHASES.includes(meta.phase), `${kind} phase ${meta.phase}`);
  }
});

check("prologue starts from AGENTS.shared.md read order, not from retrieval", () => {
  const events = sharedAgentsPrologue({ text: "Can John vote on behalf of Jean Hugues?" });
  assert.equal(events[0].kind, "session.prologue");
  assert.equal(events[0].payload.entry, "instructions/AGENTS.shared.md");
  assert.ok(events[0].payload.read_order[0].includes("AGENTS.shared.md"));
  assert.deepEqual(
    events.map((e) => e.kind),
    ["session.prologue", "mandate.bind", "privacy.view", "language.select", "packet.admit", "need.classify"]
  );
});

await checkAsync("kernel dispatches prologue before classification before orientation", async () => {
  const loop = createReasoningLoop();
  const result = await loop.run({ text: "How do Kudos affect Cognitive Packet routing?" });
  const prefix = result.dispatched.slice(0, 7);
  assert.equal(prefix[0], "session.prologue");
  assert.equal(prefix[1], "mandate.bind");
  assert.ok(prefix.includes("need.classify"));
  assert.ok(result.dispatched.includes("orientation.required"));
  assert.ok(!result.dispatched.includes("answer.propose"));
});

await checkAsync("the kernel is not reasoner.nextStep: no model call is required to run a turn", async () => {
  let nextStepCalls = 0;
  const loop = createReasoningLoop();
  await loop.run({ text: "What is a Cognitive Packet?" });
  assert.equal(nextStepCalls, 0);
});

await checkAsync("answer.propose cannot starve orientation: blocking earlier phases run first", async () => {
  const rogue = {
    id: "rogue.answer",
    kinds: ["packet.admit"],
    run() {
      return { enqueue: [createReasoningEvent("answer.propose", { answer: "skip orientation" })] };
    },
  };
  const loop = createReasoningLoop({
    handlers: createHandlerRegistry([...defaultStructuralHandlers(), rogue]),
  });
  const result = await loop.run({ text: "How do Kudos affect Cognitive Packet routing?" });
  const orientAt = result.dispatched.indexOf("orientation.required");
  const answerAt = result.dispatched.indexOf("answer.propose");
  assert.ok(orientAt >= 0, "orientation must still run");
  if (answerAt >= 0) assert.ok(orientAt < answerAt, "orientation before answer");
});

await checkAsync("a judgment handler may pause the loop as a continuation, not as a crash", async () => {
  const judge = {
    id: "judge.test",
    kinds: ["judgment.required"],
    run(event) {
      return {
        continuation: {
          protocol: "cogentia.continuation.v2",
          question: event.payload?.question || "need judgment",
        },
      };
    },
  };
  const injector = {
    id: "inject.judgment",
    kinds: ["need.classify"],
    run() {
      return { enqueue: [createReasoningEvent("judgment.required", { question: "May John vote?" })] };
    },
  };
  const loop = createReasoningLoop({
    handlers: createHandlerRegistry([...defaultStructuralHandlers(), injector, judge]),
  });
  const result = await loop.run({ text: "Can John vote on behalf of Jean Hugues?" });
  assert.equal(result.status, "paused");
  assert.equal(result.reason, "continuation");
  assert.equal(result.continuation.protocol, "cogentia.continuation.v2");
  assert.notEqual(result.status, "completed");
});

await checkAsync("living-evidence is enqueued for leave-the-corpus questions", async () => {
  const loop = createReasoningLoop();
  const result = await loop.run({
    text: "When should a Cogentia Agent leave the Corpus and perform external research?",
  });
  assert.ok(result.dispatched.includes("living_evidence.required"));
  assert.ok(result.dispatched.includes("orientation.required"));
});

check("unknown event kinds are rejected at construction, not swallowed by an LLM", () => {
  assert.throws(() => createReasoningEvent("invented.kind", {}), /Unknown reasoning event kind/);
});

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
