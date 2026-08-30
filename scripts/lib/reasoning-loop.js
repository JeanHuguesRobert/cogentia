/**
 * Experimental required-event policy for the inner reasoning cycle (Level 3).
 *
 * This kernel borrows event-dispatch techniques from event-loop runtimes.
 * It is NOT the architectural analogue of the JavaScript Event Loop.
 * That role belongs to the outer COP completion/wake runtime (Level 1).
 *
 * The kernel is the inner scheduler of required cognitive events.
 * A model is a handler for judgment events, never the thing that chooses
 * whether orientation / living-evidence / prologue may be skipped.
 *
 * Prologue: instructions/AGENTS.shared.md (read order + invariants).
 *
 * This module does not import WhatsApp, Guide, or OpenAI.
 */

import { classifyNeed } from "./required-events.js";

export { classifyNeed } from "./required-events.js";

export const REASONING_EVENT_SCHEMA = "cogentia.reasoning_event/v1";
export const REASONING_LOOP_SCHEMA = "cogentia.reasoning_loop/v1";

/** How today's surfaces actually iterate. They are not this loop. */
export const CURRENT_LOOPS = Object.freeze({
  guide_turn: Object.freeze({
    file: "scripts/cogentia-mcp-http.js#produceGuideTurn",
    shape: "pipeline",
    scheduler: "scripted stages",
    ticks: "cache → intent → plan → retrieve → optional web → one LLM completion → answer",
    defect: "AGENTS.shared is prompt decoration, not a dispatcher of required events",
  }),
  answer_engine: Object.freeze({
    file: "scripts/lib/agent-jhn-whatsapp/answer-core.js",
    shape: "pipeline",
    scheduler: "scripted stages",
    ticks: "analyze → retrieve → synthesize → critique → render",
    defect: "fixed retrieve-then-generate; no orientation, continuation, or living-evidence events",
  }),
  librarian: Object.freeze({
    file: "scripts/lib/corpus-librarian/pipeline.js",
    shape: "pipeline",
    scheduler: "scripted stages",
    ticks: "explore tools → evidence packet → synthesizer",
    defect: "search-first bag of passages, not Question → Concept → Source",
  }),
  whatsapp_inbound: Object.freeze({
    file: "scripts/lib/agent-jhn-whatsapp/pipeline.js",
    shape: "channel pipeline",
    scheduler: "inbound event",
    ticks: "normalize → policy → draft (Guide or librarian) → outbound gate",
    defect: "a transport loop; reasoning is delegated to the pipelines above",
  }),
  governed_harness: Object.freeze({
    file: "scripts/lib/agent-jhn-whatsapp/governed-harness.js",
    shape: "reasoner-driven step loop",
    scheduler: "reasoner.nextStep(state)",
    ticks: "while budget: model proposes step → kernel authorizes/executes → observation",
    defect:
      "the model chooses the next step kind. Bounds and authorization are real; required cognition (orientation, living evidence) is not kernel-discharged before unrestricted nextStep",
  }),
});

/**
 * Dispatch phases for required inner-cycle events.
 * Lower index runs first. A blocking event in an earlier phase starves later ones.
 * These are not COP Scheduler phases and not JS event-loop phases.
 */
export const PHASES = Object.freeze([
  "prologue",
  "admit",
  "classify",
  "orient",
  "evidence",
  "governance",
  "judgment",
  "act",
  "terminal",
]);

/**
 * Event kinds derived from AGENTS.shared.md, Cognitive Packets, and Conceptual Gravity.
 * Adding a kind is cheap. Making a kind *required* is a governance decision.
 */
export const EVENT_KINDS = Object.freeze({
  "session.prologue": { phase: "prologue", blocking: true, source: "instructions/AGENTS.shared.md#Read order" },
  "mandate.bind": { phase: "prologue", blocking: true, source: "instructions/AGENTS.shared.md#Monotonic mandate attenuation" },
  "packet.admit": { phase: "admit", blocking: true, source: "research/cognitive_packets.md" },
  "need.classify": { phase: "classify", blocking: true, source: "instructions/AGENTS.shared.md" },
  "orientation.required": { phase: "orient", blocking: true, source: "research/conceptual_gravity.md" },
  "living_evidence.required": { phase: "evidence", blocking: true, source: "instructions/AGENTS.shared.md#Living evidence" },
  "open_possible.check": { phase: "evidence", blocking: false, source: "instructions/AGENTS.shared.md#Open-Possible" },
  "privacy.view": { phase: "governance", blocking: true, source: "instructions/AGENTS.shared.md#Invariants" },
  "language.select": { phase: "governance", blocking: true, source: "instructions/AGENTS.shared.md#Language and audience selection" },
  "measured_risk.check": { phase: "governance", blocking: true, source: "instructions/AGENTS.shared.md#Measured Risk" },
  "continuation.emit": { phase: "judgment", blocking: true, source: "skills/continuation-handling/SKILL.md" },
  "continuation.resume": { phase: "judgment", blocking: true, source: "skills/continuation-handling/SKILL.md" },
  "judgment.required": { phase: "judgment", blocking: true, source: "research/cognitive_packets.md" },
  "capability.invoke": { phase: "act", blocking: false, source: "instructions/AGENTS.shared.md#Tools, Skills, Patterns" },
  "answer.propose": { phase: "terminal", blocking: false, source: "docs/agent-jhn-governed-step-harness.md" },
  "turn.clarify": { phase: "terminal", blocking: false, source: "docs/agent-jhn-governed-step-harness.md" },
  "turn.complete": { phase: "terminal", blocking: false, source: null },
  "turn.stop": { phase: "terminal", blocking: false, source: null },
});

export const DEFAULT_BOUNDS = Object.freeze({
  maxEvents: 32,
  maxHandlerMs: 8000,
  maxJudgmentCalls: 2,
});

function normKind(kind) {
  return String(kind || "").trim();
}

function phaseOf(kind) {
  return EVENT_KINDS[kind]?.phase || "act";
}

function isBlocking(kind) {
  return EVENT_KINDS[kind]?.blocking === true;
}

export function createReasoningEvent(kind, payload = {}, options = {}) {
  const clean = normKind(kind);
  if (!EVENT_KINDS[clean]) {
    throw new Error(`Unknown reasoning event kind: ${clean}`);
  }
  return {
    schema: REASONING_EVENT_SCHEMA,
    id: options.id || `evt:${clean}:${options.seq || 0}`,
    kind: clean,
    phase: phaseOf(clean),
    blocking: isBlocking(clean),
    ts: options.ts || new Date(0).toISOString(),
    source: options.source || EVENT_KINDS[clean].source || "runtime",
    payload: payload && typeof payload === "object" ? payload : { value: payload },
  };
}

/**
 * Prologue: the shared agent instructions as the first events of a turn.
 * Does not parse the markdown at runtime. The file is the source of truth;
 * this is the operational projection of its read order.
 */
export function sharedAgentsPrologue(need = {}, options = {}) {
  const view = options.view || "public";
  const text = String(need.text || need.question || need.prompt || "").trim();
  return [
    createReasoningEvent(
      "session.prologue",
      {
        entry: "instructions/AGENTS.shared.md",
        read_order: [
          "instructions/AGENTS.shared.md",
          "docs/continuations_and_cognitive_packets_for_agents.md",
          "nearest AGENTS.md",
          "monotonic composition of constraints",
          "source documents when operational rules cannot settle the question",
          "skill continuation-handling on any continuation/packet handoff",
        ],
        invariants: [
          "corpus_source_of_truth",
          "anti_capture",
          "working_memory_not_archive",
          "provenance",
          "human_principal_retains_mandate",
          "public_default_does_not_cancel_privacy",
        ],
      },
      { source: "prologue", seq: 1 }
    ),
    createReasoningEvent(
      "mandate.bind",
      { mandate: options.mandate || { id: "inherited", mode: "read_public" } },
      { source: "prologue", seq: 2 }
    ),
    createReasoningEvent(
      "privacy.view",
      { view },
      { source: "prologue", seq: 3 }
    ),
    createReasoningEvent(
      "language.select",
      { conversation_language: options.conversationLanguage || null },
      { source: "prologue", seq: 4 }
    ),
    createReasoningEvent(
      "packet.admit",
      {
        packet_kind: options.packetKind || "need",
        text,
        surface: options.surface || "unspecified",
      },
      { source: "prologue", seq: 5 }
    ),
    createReasoningEvent("need.classify", { text }, { source: "prologue", seq: 6 }),
  ];
}

export function createHandlerRegistry(definitions = []) {
  const list = [];
  for (const def of definitions) {
    if (!def?.id || typeof def.run !== "function") {
      throw new Error("Handler requires id and run()");
    }
    const kinds = Array.isArray(def.kinds) ? def.kinds.map(normKind) : [];
    if (!kinds.length) throw new Error(`Handler ${def.id} must declare kinds`);
    for (const kind of kinds) {
      if (!EVENT_KINDS[kind]) throw new Error(`Handler ${def.id} registers unknown kind ${kind}`);
    }
    list.push(
      Object.freeze({
        id: String(def.id),
        kinds: Object.freeze(kinds),
        run: def.run,
      })
    );
  }
  return Object.freeze({
    list() {
      return list.map((h) => ({ id: h.id, kinds: [...h.kinds] }));
    },
    match(kind) {
      const clean = normKind(kind);
      return list.filter((h) => h.kinds.includes(clean));
    },
  });
}

function dequeue(queue) {
  for (const phase of PHASES) {
    const index = queue.findIndex((event) => event.phase === phase);
    if (index >= 0) return queue.splice(index, 1)[0];
  }
  return queue.shift() || null;
}

function pendingBlocking(queue, beforePhase) {
  const limit = PHASES.indexOf(beforePhase);
  return queue.some((event) => {
    if (!event.blocking) return false;
    const idx = PHASES.indexOf(event.phase);
    return idx >= 0 && idx < limit;
  });
}

function defaultClassifyHandler() {
  return {
    id: "classify.need",
    kinds: ["need.classify"],
    run(event) {
      const text = String(event.payload?.text || "");
      const flags = classifyNeed(text);
      const enqueue = [];
      if (flags.corpusLike) {
        enqueue.push(createReasoningEvent("orientation.required", { text }, { source: "handler:classify.need" }));
      }
      if (flags.livingLike) {
        enqueue.push(createReasoningEvent("living_evidence.required", { text }, { source: "handler:classify.need" }));
      }
      if (flags.exploratory) {
        enqueue.push(createReasoningEvent("open_possible.check", { text }, { source: "handler:classify.need" }));
      }
      enqueue.push(createReasoningEvent("measured_risk.check", { text }, { source: "handler:classify.need" }));
      return { enqueue };
    },
  };
}

function passThroughHandlers() {
  const kinds = [
    "session.prologue",
    "mandate.bind",
    "privacy.view",
    "language.select",
    "packet.admit",
    "orientation.required",
    "living_evidence.required",
    "open_possible.check",
    "measured_risk.check",
  ];
  return kinds.map((kind) => ({
    id: `trace.${kind}`,
    kinds: [kind],
    run() {
      return { enqueue: [] };
    },
  }));
}

/**
 * Built-in handlers: classification + no-op traces for prologue/governance.
 * Judgment and answer handlers are injected by the caller (LLM, human, test double).
 */
export function defaultStructuralHandlers() {
  return [defaultClassifyHandler(), ...passThroughHandlers()];
}

export function createReasoningLoop(options = {}) {
  const handlers =
    options.handlers ||
    createHandlerRegistry([...(options.extraHandlers || []), ...defaultStructuralHandlers()]);
  const clock = typeof options.clock === "function" ? options.clock : Date.now;
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : (kind, seq) => `evt:${kind}:${seq}`;
  const fifo = options.scheduler === "fifo";

  return {
    schema: REASONING_LOOP_SCHEMA,
    handlers,
    async run(need = {}, runOptions = {}) {
      const bounds = { ...DEFAULT_BOUNDS, ...(runOptions.bounds || {}) };
      const queue = sharedAgentsPrologue(need, runOptions);
      const dispatched = [];
      const traces = [];
      let seq = queue.length;
      let judgmentCalls = 0;
      const startedAt = clock();

      const enqueueAll = (events, source) => {
        for (const event of events || []) {
          seq += 1;
          const next =
            event.schema === REASONING_EVENT_SCHEMA
              ? { ...event, id: event.id || idFactory(event.kind, seq) }
              : createReasoningEvent(event.kind, event.payload, { source, seq });
          queue.push(next);
        }
      };

      while (queue.length && dispatched.length < bounds.maxEvents) {
        if (clock() - startedAt > bounds.maxHandlerMs) {
          return stopped("time_budget", { dispatched, traces, queue, startedAt, clock });
        }
        const event = fifo ? queue.shift() : dequeue(queue);
        if (!event) break;

        if (!fifo && event.kind === "answer.propose" && pendingBlocking(queue.concat(event), "terminal")) {
          queue.push(event);
          const blocker = queue.find((e) => e.blocking && e.phase !== "terminal");
          traces.push({ type: "answer_deferred", waiting_for: blocker?.kind || "blocking_event" });
          if (!blocker) break;
          continue;
        }

        const matched = handlers.match(event.kind);
        if (!matched.length) {
          traces.push({ type: "unhandled", kind: event.kind });
          dispatched.push({ event, results: [] });
          if (event.blocking && event.phase !== "terminal") {
            return paused("unhandled_blocking_event", { dispatched, traces, queue, event, startedAt, clock });
          }
          continue;
        }

        if (event.phase === "judgment") {
          judgmentCalls += 1;
          if (judgmentCalls > bounds.maxJudgmentCalls) {
            return stopped("judgment_budget", { dispatched, traces, queue, startedAt, clock });
          }
        }

        const results = [];
        for (const handler of matched) {
          const result = (await handler.run(event, { need, traces, dispatched, bounds })) || {};
          results.push({ handler: handler.id, ...summarizeResult(result) });
          enqueueAll(result.enqueue, `handler:${handler.id}`);
          if (result.continuation) {
            dispatched.push({ event, results });
            return paused("continuation", {
              dispatched,
              traces,
              queue,
              continuation: result.continuation,
              event,
              startedAt,
              clock,
            });
          }
          if (result.terminal) {
            dispatched.push({ event, results });
            return terminalState(result.terminal, { dispatched, traces, queue, startedAt, clock });
          }
        }
        dispatched.push({ event, results });
      }

      if (queue.length) return stopped("event_budget", { dispatched, traces, queue, startedAt, clock });
      const answered = dispatched.find((row) => row.event.kind === "answer.propose" || row.event.kind === "turn.complete");
      if (answered) {
        return terminalState(
          { kind: "turn.complete", answer: answered.event.payload?.answer || answered.results?.[0]?.answer || "" },
          { dispatched, traces, queue, startedAt, clock }
        );
      }
      return stopped("idle", { dispatched, traces, queue, startedAt, clock });
    },
  };
}

function summarizeResult(result) {
  return {
    enqueued: (result.enqueue || []).map((e) => e.kind),
    continuation: Boolean(result.continuation),
    terminal: result.terminal?.kind || null,
  };
}

function stopped(reason, bag) {
  return terminalState({ kind: "turn.stop", reason }, bag);
}

function paused(reason, bag) {
  return {
    ok: false,
    schema: REASONING_LOOP_SCHEMA,
    status: "paused",
    reason,
    continuation: bag.continuation || null,
    event: bag.event || null,
    dispatched: kindsOf(bag.dispatched),
    pending: (bag.queue || []).map((e) => e.kind),
    traces: bag.traces,
    elapsed_ms: bag.clock() - bag.startedAt,
  };
}

function terminalState(terminal, bag) {
  const ok = terminal.kind === "turn.complete";
  return {
    ok,
    schema: REASONING_LOOP_SCHEMA,
    status: ok ? "completed" : terminal.kind === "turn.stop" ? "stopped" : terminal.kind,
    reason: terminal.reason || null,
    answer: terminal.answer || "",
    continuation: null,
    dispatched: kindsOf(bag.dispatched),
    pending: (bag.queue || []).map((e) => e.kind),
    traces: bag.traces,
    elapsed_ms: bag.clock() - bag.startedAt,
  };
}

function kindsOf(dispatched) {
  return (dispatched || []).map((row) => row.event.kind);
}
