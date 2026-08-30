/**
 * Provider-neutral governed step harness.
 * The reasoner freely proposes steps; this kernel only validates, authorizes,
 * executes, records, and enforces bounds.
 *
 * F1.1 (packet_required_events): kernel runs an admissible required-event
 * handler and records its receipt before unrestricted nextStep. Required
 * work does not consume maxSteps (reasoning-step budget). Missing blocking
 * handler is fail/escalate, never silent discharge. Clarify yield is
 * continuation-shaped and DOES NOT TEST CONTINUATION CLOSURE / Closed(p,h,E).
 */

import {
  DEFAULT_REQUIRED_EVENT_CAPABILITIES,
  REQUIRED_EVENT_POLICY,
  requiredEventsForTurn,
} from "../required-events.js";

export const AGENT_STEP_PROTOCOL = "cogentia.agent_step/v1";
export const STEP_RESULT_PROTOCOL = "cogentia.step_result/v1";
export { REQUIRED_EVENT_POLICY, requiredEventsForTurn } from "../required-events.js";

const RISKS = new Set(["read_only", "external_write"]);
const KINDS = new Set(["tool", "skill", "mcp", "model"]);
const STEP_KINDS = new Set(["reason", "capability_call", "answer", "clarify", "stop"]);

export function createCapabilityRegistry(definitions = []) {
  const entries = new Map();
  for (const definition of definitions) {
    const capability = normalizeCapability(definition);
    if (entries.has(capability.name)) throw new Error(`Duplicate capability: ${capability.name}`);
    entries.set(capability.name, capability);
  }
  return Object.freeze({
    get(name) { return entries.get(String(name || "").trim()) || null; },
    list() { return [...entries.values()].map(({ execute: _execute, ...item }) => ({ ...item })); },
  });
}

export function createGovernedHarness(options = {}) {
  if (!options.registry || typeof options.registry.get !== "function") throw new Error("A capability registry is required");
  if (!options.reasoner || typeof options.reasoner.nextStep !== "function") throw new Error("A reasoner with nextStep() is required");
  const registry = options.registry;
  const reasoner = options.reasoner;
  const reviewer = typeof options.reviewer === "function" ? options.reviewer : async ({ answer }) => ({ accepted: true, answer });
  const clock = typeof options.clock === "function" ? options.clock : Date.now;
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultIdFactory;
  const noProgressHeuristic = options.noProgressHeuristic === true;
  const requiredEventHandlers = options.requiredEventHandlers || {};

  return {
    async run(input = {}, authorization = {}, limits = {}) {
      const startedAt = clock();
      const bounds = {
        maxSteps: boundedInteger(limits.maxSteps, 4, 1, 12),
        maxCapabilityCalls: boundedInteger(limits.maxCapabilityCalls, 3, 0, 10),
        maxElapsedMs: boundedInteger(limits.maxElapsedMs, 15000, 100, 120000),
        maxCostUnits: boundedInteger(limits.maxCostUnits, 10, 0, 1000),
      };
      const allowed = new Set(normalizeNames(authorization.allowedCapabilities));
      const confirmed = new Set(normalizeNames(authorization.confirmedCapabilities));
      const state = {
        input,
        observations: [],
        steps: [],
        sequence: 0,
        requiredEventCount: 0,
        capabilityCalls: 0,
        costUnits: 0,
      };
      const pendingRequired = requiredEventsForTurn(input, options);
      const capabilityFingerprints = [];

      while (true) {
        if (clock() - startedAt >= bounds.maxElapsedMs) return stopped("time_budget", state, startedAt, clock);

        if (pendingRequired.length) {
          const kind = pendingRequired.shift();
          const handler = resolveRequiredEventHandler(kind, requiredEventHandlers, registry);
          if (!handler) {
            const observation = { type: "required_event_handler_missing", kind, policy: REQUIRED_EVENT_POLICY };
            const missStep = systemStep(`req-${state.requiredEventCount + 1}`, idFactory, "stop");
            missStep.note = kind;
            appendStep(state, missStep, stepResult(missStep, "failed", { observation }));
            return stopped("required_event_handler_missing", state, startedAt, clock);
          }
          try {
            const observation = await handler({
              kind,
              input,
              authorization,
              registry,
            });
            if (!observation || observation.ok === false) {
              return stopped("required_event_failed", state, startedAt, clock);
            }
            state.requiredEventCount += 1;
            const reqStep = systemStep(`req-${state.requiredEventCount}`, idFactory, "reason");
            reqStep.note = kind;
            const receipt = {
              ...observation,
              kind,
              policy: REQUIRED_EVENT_POLICY,
              discharged: true,
            };
            appendStep(state, reqStep, stepResult(reqStep, "completed", { observation: summarizeRequiredObservation(receipt) }));
            state.observations.push(receipt);
          } catch (error) {
            const observation = {
              type: "required_event_failed",
              kind,
              error: { name: safeName(error?.name) || "Error", code: safeName(error?.code) },
            };
            const failStep = systemStep(`req-${state.requiredEventCount + 1}`, idFactory, "stop");
            appendStep(state, failStep, stepResult(failStep, "failed", { observation, error }));
            return stopped("required_event_failed", state, startedAt, clock);
          }
          continue;
        }

        if (state.sequence >= bounds.maxSteps) return stopped("step_budget", state, startedAt, clock);
        state.sequence += 1;

        let step;
        try {
          step = normalizeStep(await reasoner.nextStep(snapshot(state, registry, bounds)), state.sequence, idFactory);
        } catch (error) {
          appendStep(state, systemStep(state.sequence, idFactory, "stop"), stepResult(null, "failed", { error }));
          return stopped("reasoner_error", state, startedAt, clock);
        }

        if (step.kind === "reason") {
          const result = stepResult(step, "completed", { observation: { type: "reason_recorded" } });
          appendStep(state, step, result);
          state.observations.push(result.observation);
          continue;
        }

        if (step.kind === "answer") {
          const review = await reviewer({ answer: step.answer, state: snapshot(state, registry, bounds) });
          const answer = String(review?.answer || step.answer || "").trim();
          const issues = normalizeNames(review?.issues).slice(0, 12);
          const accepted = review?.accepted !== false && Boolean(answer);
          const result = stepResult(step, accepted ? "completed" : "rejected", {
            observation: { type: "answer_review", accepted, issues },
          });
          appendStep(state, step, result);
          if (accepted) return completed(answer, state, startedAt, clock);
          state.observations.push(result.observation);
          continue;
        }

        if (step.kind === "clarify") {
          appendStep(state, step, stepResult(step, "requires_input", { observation: { type: "clarification", question: step.question } }));
          return terminal(false, "clarification_required", "", state, startedAt, clock, {
            question: step.question,
            continuation: f1ContinuationShape(step.question),
          });
        }

        if (step.kind === "stop") {
          appendStep(state, step, stepResult(step, "completed", { observation: { type: "stopped", reason: step.reason } }));
          return stopped(step.reason || "reasoner_stop", state, startedAt, clock);
        }

        const capability = registry.get(step.capability);
        const denial = authorize(capability, step.capability, allowed, confirmed);
        if (denial) {
          const observation = { type: "capability_denied", capability: safeName(step.capability), reason: denial };
          appendStep(state, step, stepResult(step, "denied", { observation }));
          state.observations.push(observation);
          continue;
        }
        if (state.capabilityCalls >= bounds.maxCapabilityCalls) return stopped("capability_call_budget", state, startedAt, clock);
        if (state.costUnits + capability.costUnits > bounds.maxCostUnits) return stopped("cost_budget", state, startedAt, clock);

        state.capabilityCalls += 1;
        state.costUnits += capability.costUnits;
        const callStartedAt = clock();
        if (noProgressHeuristic) {
          const fingerprint = `${capability.name}:${JSON.stringify(step.input || {})}`;
          const repeats = capabilityFingerprints.filter((item) => item === fingerprint).length;
          capabilityFingerprints.push(fingerprint);
          if (repeats >= 1) {
            const observation = {
              type: "no_progress_heuristic",
              capability: capability.name,
              note: "F1 test heuristic only. Legitimate repetition may occur when Reality changed, freshness expired, evidence was incomplete, retry policy authorizes another attempt, or causal context materially changed.",
            };
            appendStep(state, step, stepResult(step, "failed", { observation }));
            return stopped("no_progress", state, startedAt, clock);
          }
        }
        try {
          const value = await capability.execute(step.input || {}, { turnInput: input, step, authorization });
          const observation = { type: "capability_result", capability: capability.name, ok: true, value };
          appendStep(state, step, stepResult(step, "completed", { observation: summarizeCapabilityObservation(observation), elapsed_ms: clock() - callStartedAt }));
          state.observations.push(observation);
        } catch (error) {
          const observation = {
            type: "capability_result", capability: capability.name, ok: false,
            error: { name: safeName(error?.name) || "Error", code: safeName(error?.code) },
          };
          appendStep(state, step, stepResult(step, "failed", { observation: summarizeCapabilityObservation(observation), elapsed_ms: clock() - callStartedAt, error }));
          state.observations.push(observation);
        }
      }
      return stopped("step_budget", state, startedAt, clock);
    },
  };
}

function normalizeCapability(definition = {}) {
  const name = safeName(definition.name);
  if (!name) throw new Error("Capability name is invalid");
  const kind = String(definition.kind || "tool");
  const risk = String(definition.risk || "read_only");
  if (!KINDS.has(kind)) throw new Error(`Capability kind is invalid: ${name}`);
  if (!RISKS.has(risk)) throw new Error(`Capability risk is invalid: ${name}`);
  if (typeof definition.execute !== "function") throw new Error(`Capability executor is required: ${name}`);
  return Object.freeze({
    name, kind, risk, description: String(definition.description || "").slice(0, 500),
    inputSchema: definition.inputSchema && typeof definition.inputSchema === "object" ? definition.inputSchema : null,
    resultVisibility: definition.resultVisibility === "reasoner" ? "reasoner" : "private",
    costUnits: boundedInteger(definition.costUnits, 1, 0, 100), execute: definition.execute,
  });
}

function normalizeStep(value = {}, sequence, idFactory) {
  const kind = STEP_KINDS.has(String(value.kind)) ? String(value.kind) : "stop";
  const base = { protocol: AGENT_STEP_PROTOCOL, step_id: safeName(value.step_id) || idFactory(sequence), sequence, kind };
  if (kind === "capability_call") return { ...base, capability: String(value.capability || ""), input: value.input };
  if (kind === "answer") return { ...base, answer: String(value.answer || "") };
  if (kind === "clarify") return { ...base, question: String(value.question || "").slice(0, 2000) };
  if (kind === "stop") return { ...base, reason: safeName(value.reason) || "invalid_step" };
  return { ...base, note: String(value.note || "").slice(0, 500) };
}

function stepResult(step, status, details = {}) {
  return {
    protocol: STEP_RESULT_PROTOCOL,
    step_id: step?.step_id || null,
    status,
    observation: details.observation || null,
    elapsed_ms: Number.isFinite(details.elapsed_ms) ? details.elapsed_ms : null,
    error_name: safeName(details.error?.name),
    error_code: safeName(details.error?.code),
  };
}

function appendStep(state, step, result) { state.steps.push({ step, result }); }
function systemStep(sequence, idFactory, kind) { return { protocol: AGENT_STEP_PROTOCOL, step_id: idFactory(sequence), sequence, kind }; }
function authorize(capability, requested, allowed, confirmed) {
  if (!capability) return "unknown_capability";
  if (capability.name !== requested) return "invalid_capability_name";
  if (!allowed.has(capability.name)) return "not_in_authorization_envelope";
  if (capability.risk === "external_write" && !confirmed.has(capability.name)) return "confirmation_required";
  return null;
}
function snapshot(state, registry, bounds) {
  return {
    input: state.input, observations: state.observations.map(item => observationForReasoner(item, registry)), steps: state.steps.slice(),
    nextSequence: state.sequence, capabilityCalls: state.capabilityCalls, costUnits: state.costUnits,
    capabilities: registry.list(), bounds,
  };
}
function completed(answer, state, startedAt, clock) { return terminal(true, "answer_accepted", answer, state, startedAt, clock); }
function stopped(reason, state, startedAt, clock) { return terminal(false, safeName(reason) || "stopped", "", state, startedAt, clock); }
function terminal(ok, stopReason, answer, state, startedAt, clock, extra = {}) {
  return {
    ok, answer, stopReason, observations: state.observations, steps: state.steps,
    stepCount: state.sequence, requiredEventCount: state.requiredEventCount || 0,
    capabilityCalls: state.capabilityCalls, costUnits: state.costUnits,
    latencyMs: clock() - startedAt, ...extra,
  };
}

function resolveRequiredEventHandler(kind, handlers, registry) {
  if (typeof handlers[kind] === "function") return handlers[kind];
  const capName = DEFAULT_REQUIRED_EVENT_CAPABILITIES[kind];
  const capability = capName ? registry.get(capName) : null;
  if (!capability) return null;
  return async (ctx) => {
    const allowed = new Set(normalizeNames(ctx.authorization?.allowedCapabilities));
    const confirmed = new Set(normalizeNames(ctx.authorization?.confirmedCapabilities));
    const denial = authorize(capability, capName, allowed, confirmed);
    if (denial) {
      const error = new Error(denial);
      error.code = denial;
      throw error;
    }
    const query = String(ctx.input?.text || ctx.input?.prompt || "");
    const value = await capability.execute({ query, subject: query }, { turnInput: ctx.input });
    return {
      type: kind === "orientation.required" ? "orientation_result" : "required_event_result",
      ok: true,
      value,
    };
  };
}

function summarizeRequiredObservation(observation) {
  return {
    type: observation.type,
    kind: observation.kind,
    policy: observation.policy,
    discharged: true,
    ok: observation.ok !== false,
  };
}
function normalizeNames(values) { return Array.isArray(values) ? values.map(safeName).filter(Boolean) : []; }
function safeName(value) {
  const name = String(value || "").trim();
  return /^[A-Za-z0-9_.:-]{1,120}$/.test(name) ? name : null;
}
function observationForReasoner(observation, registry) {
  if (observation?.type !== "capability_result" || !observation.ok) return observation;
  const capability = registry.get(observation.capability);
  if (capability?.resultVisibility === "reasoner") return observation;
  return {
    type: observation.type,
    capability: observation.capability,
    ok: true,
    value: { redacted: true, reason: "capability_result_private" },
  };
}
function summarizeCapabilityObservation(observation) {
  return {
    type: "capability_result",
    capability: safeName(observation?.capability),
    ok: Boolean(observation?.ok),
    error: observation?.ok ? undefined : observation?.error,
  };
}
function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
function defaultIdFactory(sequence) { return `step-${sequence}`; }

/**
 * F1 DOES NOT TEST CONTINUATION CLOSURE.
 * This object is a continuation-shaped yield, not Closed(p,h,E),
 * not durable, not materializable across process death.
 */
function f1ContinuationShape(question) {
  return {
    protocol: "cogentia.continuation.v2",
    status: "active",
    kind: "clarification",
    question: String(question || "").slice(0, 2000),
    f1_does_not_test_continuation_closure: true,
    closed: false,
  };
}
