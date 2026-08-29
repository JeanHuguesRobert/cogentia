/**
 * Intentional scheduler variants behind one run() contract.
 *
 * The independent variable is *who decides the next kind of work*.
 * Handlers, prompts, and retrieval quality are held constant or omitted.
 */
import {
  classifyNeed,
  createHandlerRegistry,
  createReasoningEvent,
  createReasoningLoop,
  defaultStructuralHandlers,
  sharedAgentsPrologue,
} from "./reasoning-loop.js";

function textOf(need) {
  return String(need?.text || need?.question || need?.prompt || "").trim();
}

function resultShape(partial) {
  return {
    ok: false,
    status: "stopped",
    reason: null,
    answer: "",
    continuation: null,
    dispatched: [],
    pending: [],
    traces: [],
    scheduler_was_model: false,
    ...partial,
  };
}

function mergeExtra(extraHandlers) {
  return createHandlerRegistry([...(extraHandlers || []), ...defaultStructuralHandlers()]);
}

/** Control: today's Guide-shaped pipeline. Scripted stages, no prologue dispatcher. */
export function createPipelineGuideVariant() {
  return {
    id: "pipeline_guide",
    title: "Guide-shaped pipeline (control)",
    scheduler: "scripted stages",
    async run(need) {
      const text = textOf(need);
      return resultShape({
        ok: true,
        status: "completed",
        answer: text ? `pipeline answer: ${text.slice(0, 80)}` : "",
        dispatched: ["intent.parse", "retrieve", "llm.complete", "answer.propose"],
        scheduler_was_model: false,
      });
    },
  };
}

/**
 * Control: governed-harness shape. A replaceable reasoner picks the next kind.
 * Default reasoner is greedy (answer immediately) — the failure mode of
 * "the model is the loop" even when a prompt could have mentioned orientation.
 */
export function createNextStepVariant(options = {}) {
  const reasoner =
    options.reasoner ||
    {
      async nextStep() {
        return { kind: "answer.propose", answer: "greedy nextStep answer" };
      },
    };
  return {
    id: options.id || "next_step_greedy",
    title: options.title || "reasoner.nextStep greedy (control)",
    scheduler: "reasoner.nextStep(state)",
    async run(need, runOptions = {}) {
      const dispatched = [];
      const traces = [];
      let continuation = null;
      const max = 8;
      for (let i = 0; i < max; i += 1) {
        const step = await reasoner.nextStep({ need, dispatched, extraHandlers: runOptions.extraHandlers });
        const kind = step?.kind || "turn.stop";
        dispatched.push(kind);
        if (kind === "answer.propose") {
          return resultShape({
            ok: true,
            status: "completed",
            answer: step.answer || "",
            dispatched,
            traces,
            scheduler_was_model: true,
          });
        }
        if (kind === "judgment.required" && runOptions.extraHandlers) {
          const judge = runOptions.extraHandlers.find((h) => h.kinds?.includes("judgment.required"));
          if (judge) {
            const result = await judge.run(createReasoningEvent("judgment.required", step));
            if (result?.continuation) {
              continuation = result.continuation;
              return resultShape({
                status: "paused",
                reason: "continuation",
                continuation,
                dispatched,
                traces,
                scheduler_was_model: true,
              });
            }
          }
        }
        if (kind === "turn.stop" || kind === "stop") break;
      }
      return resultShape({
        status: "stopped",
        reason: "step_budget",
        dispatched,
        traces,
        scheduler_was_model: true,
      });
    },
  };
}

/** Candidate: phase-ordered event queue (scripts/lib/reasoning-loop.js). */
export function createPhaseQueueVariant() {
  return {
    id: "phase_queue",
    title: "Phase-ordered reasoning events",
    scheduler: "runtime phases",
    async run(need, runOptions = {}) {
      const loop = createReasoningLoop({ extraHandlers: runOptions.extraHandlers || [] });
      const result = await loop.run(need, runOptions);
      return resultShape({ ...result, scheduler_was_model: false });
    },
  };
}

/**
 * Contrast: same events and handlers as phase_queue, but FIFO dequeue
 * and no starvation of terminal events. Having events is not enough
 * if the scheduler still lets an eager answer run first.
 */
export function createFifoQueueVariant() {
  return {
    id: "fifo_queue",
    title: "FIFO event queue (no phase starvation)",
    scheduler: "FIFO",
    async run(need, runOptions = {}) {
      const loop = createReasoningLoop({
        extraHandlers: runOptions.extraHandlers || [],
        scheduler: "fifo",
      });
      const result = await loop.run(need, runOptions);
      return resultShape({ ...result, scheduler_was_model: false });
    },
  };
}

/**
 * Candidate: required-set barriers, not a total phase order.
 * Classification produces a set of kinds that must all complete before terminal.
 * Order inside the set is unspecified.
 */
export function createBarrierSetVariant() {
  return {
    id: "barrier_set",
    title: "Required-set barriers",
    scheduler: "required-set drain",
    async run(need, runOptions = {}) {
      const extra = runOptions.extraHandlers || [];
      const handlers = mergeExtra(extra);
      const text = textOf(need);
      const dispatched = [];
      const traces = [];
      const flags = classifyNeed(text);
      const required = new Set(
        sharedAgentsPrologue(need, runOptions).map((e) => e.kind)
      );
      required.add("need.classify");
      if (flags.corpusLike) required.add("orientation.required");
      if (flags.livingLike) required.add("living_evidence.required");
      if (flags.exploratory) required.add("open_possible.check");
      required.add("measured_risk.check");

      const ctx = { need, traces, dispatched, bounds: {} };

      for (const handler of extra) {
        if (handler.kinds?.includes("packet.admit")) {
          const event = createReasoningEvent("packet.admit", { text });
          dispatched.push("packet.admit");
          const result = (await handler.run(event, ctx)) || {};
          for (const ev of result.enqueue || []) {
            if (ev.kind === "answer.propose") traces.push({ type: "answer_deferred", waiting_for: "required_set" });
            else required.add(ev.kind);
          }
          if (result.continuation) {
            return resultShape({
              status: "paused",
              reason: "continuation",
              continuation: result.continuation,
              dispatched,
              traces,
            });
          }
        }
      }

      const order = [
        "session.prologue",
        "mandate.bind",
        "privacy.view",
        "language.select",
        "packet.admit",
        "need.classify",
        "orientation.required",
        "living_evidence.required",
        "open_possible.check",
        "measured_risk.check",
        "judgment.required",
      ];
      for (const kind of order) {
        if (!required.has(kind)) continue;
        required.delete(kind);
        if (!dispatched.includes(kind)) dispatched.push(kind);
        const matched = handlers.match(kind);
        for (const handler of matched) {
          const event = createReasoningEvent(kind, { text });
          const result = (await handler.run(event, ctx)) || {};
          for (const ev of result.enqueue || []) {
            if (ev.kind === "answer.propose") traces.push({ type: "answer_deferred", waiting_for: "required_set" });
            else if (ev.kind) required.add(ev.kind);
          }
          if (result.continuation) {
            return resultShape({
              status: "paused",
              reason: "continuation",
              continuation: result.continuation,
              dispatched,
              traces,
            });
          }
        }
      }

      if (required.has("judgment.required") || dispatched.includes("judgment.required")) {
        const judge = extra.find((h) => h.kinds?.includes("judgment.required"));
        if (judge && !dispatched.includes("judgment.required")) {
          dispatched.push("judgment.required");
          const result = await judge.run(createReasoningEvent("judgment.required", { text }), ctx);
          if (result?.continuation) {
            return resultShape({
              status: "paused",
              reason: "continuation",
              continuation: result.continuation,
              dispatched,
              traces,
            });
          }
        }
      }

      return resultShape({
        ok: false,
        status: "stopped",
        reason: "idle",
        dispatched,
        traces,
      });
    },
  };
}

/**
 * Candidate: packet-native dispatch. The kernel reads only the envelope.
 * Payload is opaque. Required work is listed on the envelope, not chosen by a model.
 */
export function createPacketSwitchVariant() {
  return {
    id: "packet_switch",
    title: "Envelope-first packet dispatch",
    scheduler: "packet envelope + required list",
    async run(need, runOptions = {}) {
      const extra = runOptions.extraHandlers || [];
      const text = textOf(need);
      const dispatched = [];
      const traces = [];
      const flags = classifyNeed(text);
      const requires = [
        "session.prologue",
        "mandate.bind",
        "privacy.view",
        "language.select",
        "packet.admit",
        "need.classify",
      ];
      if (flags.corpusLike) requires.push("orientation.required");
      if (flags.livingLike) requires.push("living_evidence.required");
      if (flags.exploratory) requires.push("open_possible.check");
      requires.push("measured_risk.check");

      const packet = {
        envelope: {
          packet_kind: "need",
          transmission: "by copy",
          requires,
        },
        payload: { text },
      };

      const handlers = mergeExtra(extra);
      const ctx = { need, traces, dispatched, packet };

      for (const kind of packet.envelope.requires) {
        dispatched.push(kind);
        for (const handler of extra) {
          if (handler.kinds?.includes(kind) || (kind === "packet.admit" && handler.kinds?.includes("packet.admit"))) {
            const result = (await handler.run(createReasoningEvent(kind, packet.payload), ctx)) || {};
            if (result.continuation) {
              return resultShape({
                status: "paused",
                reason: "continuation",
                continuation: result.continuation,
                dispatched,
                traces,
              });
            }
            for (const ev of result.enqueue || []) {
              if (ev.kind === "answer.propose") {
                traces.push({ type: "answer_deferred", waiting_for: "envelope.requires" });
              } else if (ev.kind && !packet.envelope.requires.includes(ev.kind)) {
                packet.envelope.requires.push(ev.kind);
              }
            }
          }
        }
        const matched = handlers.match(kind);
        for (const handler of matched) {
          const result = (await handler.run(createReasoningEvent(kind, packet.payload), ctx)) || {};
          if (result.continuation) {
            return resultShape({
              status: "paused",
              reason: "continuation",
              continuation: result.continuation,
              dispatched,
              traces,
            });
          }
          for (const ev of result.enqueue || []) {
            if (ev.kind === "answer.propose") {
              traces.push({ type: "answer_deferred", waiting_for: "envelope.requires" });
            } else if (ev.kind && !packet.envelope.requires.includes(ev.kind)) {
              packet.envelope.requires.push(ev.kind);
            }
          }
        }
      }

      return resultShape({
        status: "stopped",
        reason: "idle",
        dispatched,
        traces,
      });
    },
  };
}

export function listReasoningLoopVariants() {
  return [
    createPipelineGuideVariant(),
    createNextStepVariant(),
    createPhaseQueueVariant(),
    createFifoQueueVariant(),
    createBarrierSetVariant(),
    createPacketSwitchVariant(),
  ];
}
