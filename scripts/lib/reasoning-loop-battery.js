/**
 * Frozen Reality Tests for any reasoning-loop variant.
 *
 * Written against the scheduler contract, not against one implementation.
 * A variant that overfits a single kernel should fail here or look identical
 * to another variant — both outcomes are informative.
 */
import { createReasoningEvent } from "./reasoning-loop.js";

function pass(detail = "") {
  return { ok: true, detail };
}
function fail(detail) {
  return { ok: false, detail };
}

const KUDOS = { text: "How do Kudos affect Cognitive Packet routing?" };
const LEAVE = { text: "When should a Cogentia Agent leave the Corpus and perform external research?" };
const JOHN = { text: "Can John vote on behalf of Jean Hugues?" };
const PHATIC = { text: "ok thanks" };

function rogueAdmitAnswer() {
  return {
    id: "battery.rogue.answer",
    kinds: ["packet.admit"],
    run() {
      return { enqueue: [createReasoningEvent("answer.propose", { answer: "skip orientation" })] };
    },
  };
}

function judgmentPause() {
  return [
    {
      id: "battery.inject.judgment",
      kinds: ["need.classify"],
      run() {
        return { enqueue: [createReasoningEvent("judgment.required", { question: "May John vote?" })] };
      },
    },
    {
      id: "battery.judge",
      kinds: ["judgment.required"],
      run(event) {
        return {
          continuation: {
            protocol: "cogentia.continuation.v2",
            question: event.payload?.question || "need judgment",
          },
        };
      },
    },
  ];
}

export const LOOP_BATTERY = [
  {
    id: "prologue_first",
    intent: "AGENTS.shared is a dispatcher, not a prompt prefix",
    async run(variant) {
      const result = await variant.run(KUDOS);
      if (result.dispatched[0] === "session.prologue") return pass();
      return fail(`first dispatched=${result.dispatched[0] || "(empty)"}`);
    },
  },
  {
    id: "scheduler_is_not_a_model",
    intent: "structural turns must not require nextStep to choose event kinds",
    async run(variant) {
      const result = await variant.run(KUDOS);
      if (result.scheduler_was_model) return fail("scheduler_was_model=true");
      return pass(`status=${result.status}`);
    },
  },
  {
    id: "orientation_before_answer_kudos",
    intent: "Conceptual Gravity: Question → Concept before answer",
    async run(variant) {
      const result = await variant.run(KUDOS);
      const orient = result.dispatched.indexOf("orientation.required");
      const answer = result.dispatched.indexOf("answer.propose");
      if (orient < 0) return fail(`no orientation.required in ${result.dispatched.join(" → ")}`);
      if (answer >= 0 && orient > answer) return fail("answer.propose before orientation.required");
      return pass(`orient@${orient}`);
    },
  },
  {
    id: "rogue_cannot_skip_orientation",
    intent: "eager answer at packet.admit cannot starve orientation",
    async run(variant) {
      const result = await variant.run(KUDOS, { extraHandlers: [rogueAdmitAnswer()] });
      const orient = result.dispatched.indexOf("orientation.required");
      const answer = result.dispatched.indexOf("answer.propose");
      if (orient < 0) return fail("rogue path skipped orientation.required");
      if (answer >= 0 && orient > answer) return fail("rogue answer ran before orientation");
      return pass();
    },
  },
  {
    id: "continuation_is_pause",
    intent: "judgment boundary is a pause, not a completed answer",
    async run(variant) {
      const result = await variant.run(JOHN, { extraHandlers: judgmentPause() });
      if (result.status !== "paused") return fail(`status=${result.status} reason=${result.reason}`);
      if (result.reason !== "continuation") return fail(`reason=${result.reason}`);
      if (!result.continuation || result.continuation.protocol !== "cogentia.continuation.v2") {
        return fail("missing continuation protocol");
      }
      if (result.status === "completed") return fail("completed through a judgment boundary");
      return pass();
    },
  },
  {
    id: "living_evidence_on_leave_corpus",
    intent: "AGENTS.shared living-evidence invariant is an event, not a hope",
    async run(variant) {
      const result = await variant.run(LEAVE);
      const hasLive = result.dispatched.includes("living_evidence.required");
      const hasOrient = result.dispatched.includes("orientation.required");
      if (hasLive && hasOrient) return pass();
      return fail(`dispatched=${result.dispatched.join(" → ")}`);
    },
  },
  {
    id: "john_vote_requests_orientation",
    intent: "Q1 at loop level: the need must raise orientation, even if concepts are still missing",
    async run(variant) {
      const result = await variant.run(JOHN);
      if (result.dispatched.includes("orientation.required")) return pass();
      return fail(`dispatched=${result.dispatched.join(" → ")}`);
    },
  },
  {
    id: "phatic_does_not_force_orientation",
    intent: "smallest sufficient subgraph: 'ok thanks' is not a corpus question",
    async run(variant) {
      const result = await variant.run(PHATIC);
      if (result.dispatched.includes("orientation.required")) {
        return fail("orientation.required on phatic utterance");
      }
      if (result.dispatched.length > 16) return fail(`overexpanded ${result.dispatched.length} events`);
      return pass(`n=${result.dispatched.length}`);
    },
  },
];

export async function scoreVariant(variant) {
  const results = [];
  for (const test of LOOP_BATTERY) {
    let row;
    try {
      row = await test.run(variant);
    } catch (err) {
      row = fail(err.message || String(err));
    }
    results.push({
      test: test.id,
      intent: test.intent,
      ok: row.ok,
      detail: row.detail || "",
    });
  }
  const passed = results.filter((r) => r.ok).length;
  return {
    variant: variant.id,
    title: variant.title,
    scheduler: variant.scheduler,
    passed,
    total: results.length,
    results,
  };
}

export async function runReasoningLoopTournament(variants) {
  const scores = [];
  for (const variant of variants) {
    scores.push(await scoreVariant(variant));
  }
  return {
    schema: "cogentia.reasoning_loop_tournament/v1",
    total_tests: LOOP_BATTERY.length,
    scores,
    note: "Controls are expected to fail. Do not add event kinds to a pipeline just to turn its row green.",
  };
}
