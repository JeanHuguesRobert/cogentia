/**
 * Provider-neutral governed step harness.
 * The reasoner freely proposes steps; this kernel only validates, authorizes,
 * executes, records, and enforces bounds.
 *
 * F1.2: required events run before unrestricted nextStep via a real handler
 * receipt. Capability-backed required events use the same governedInvokeCapability
 * path as reasoner capability_call. Structural handlers are explicit and must
 * not perform governed external effects. RequiredEvent receipts are not
 * ReasoningSteps. F1.2 DOES NOT TEST Closed(p,h,E).
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
      const init = options.initialState || authorization.initialState || {};
      const state = {
        input: init.input || input,
        observations: Array.isArray(init.observations) ? [...init.observations] : [],
        steps: Array.isArray(init.steps) ? [...init.steps] : [],
        requiredEventReceipts: Array.isArray(init.requiredEventReceipts) ? [...init.requiredEventReceipts] : [],
        sequence: typeof init.sequence === "number" ? init.sequence : 0,
        requiredEventCount: typeof init.requiredEventCount === "number" ? init.requiredEventCount : (init.requiredEventReceipts ? init.requiredEventReceipts.length : 0),
        capabilityCalls: typeof init.capabilityCalls === "number" ? init.capabilityCalls : 0,
        costUnits: typeof init.costUnits === "number" ? init.costUnits : 0,
      };
      const pendingRequired = (state.sequence > 0 || (state.requiredEventReceipts && state.requiredEventReceipts.length > 0))
        ? []
        : requiredEventsForTurn(input, options);
      const capabilityFingerprints = [];
      const invokeCtx = {
        registry, bounds, allowed, confirmed, authorization, turnInput: input, clock, noProgressHeuristic, capabilityFingerprints,
      };

      while (true) {
        if (clock() - startedAt >= bounds.maxElapsedMs) return stopped("time_budget", state, startedAt, clock);

        if (pendingRequired.length) {
          const kind = pendingRequired.shift();
          const descriptor = resolveRequiredEventDescriptor(kind, requiredEventHandlers, registry);
          if (!descriptor) {
            recordRequiredReceipt(state, {
              kind,
              policy: REQUIRED_EVENT_POLICY,
              handlerType: null,
              status: "failed",
              observation: { type: "required_event_handler_missing", kind, policy: REQUIRED_EVENT_POLICY },
            });
            return stopped("required_event_handler_missing", state, startedAt, clock);
          }
          const outcome = await runRequiredEvent(kind, descriptor, state, invokeCtx);
          if (outcome.stopReason) return stopped(outcome.stopReason, state, startedAt, clock);
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

        const invoked = await governedInvokeCapability({
          ...invokeCtx,
          state,
          requestedName: step.capability,
          input: step.input || {},
        });
        if (invoked.status === "budget") return stopped(invoked.reason, state, startedAt, clock);
        if (invoked.status === "no_progress") {
          appendStep(state, step, stepResult(step, "failed", { observation: invoked.observation }));
          return stopped("no_progress", state, startedAt, clock);
        }
        if (invoked.status === "denied") {
          appendStep(state, step, stepResult(step, "denied", { observation: invoked.observation }));
          state.observations.push(invoked.observation);
          continue;
        }
        appendStep(state, step, stepResult(step, invoked.status === "completed" ? "completed" : "failed", {
          observation: summarizeCapabilityObservation(invoked.observation),
          elapsed_ms: invoked.elapsed_ms,
          error: invoked.error,
        }));
        state.observations.push(invoked.observation);
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
    input: state.input,
    observations: state.observations.map((item) => observationForReasoner(item, registry)),
    steps: state.steps.slice(),
    requiredEventReceipts: (state.requiredEventReceipts || []).slice(),
    nextSequence: state.sequence,
    capabilityCalls: state.capabilityCalls,
    costUnits: state.costUnits,
    requiredEventCount: state.requiredEventCount || 0,
    capabilities: registry.list(),
    bounds,
  };
}
function completed(answer, state, startedAt, clock) { return terminal(true, "answer_accepted", answer, state, startedAt, clock); }
function stopped(reason, state, startedAt, clock) { return terminal(false, safeName(reason) || "stopped", "", state, startedAt, clock); }
function terminal(ok, stopReason, answer, state, startedAt, clock, extra = {}) {
  return {
    ok, answer, stopReason, observations: state.observations, steps: state.steps,
    stepCount: state.sequence, requiredEventCount: state.requiredEventCount || 0,
    requiredEventReceipts: state.requiredEventReceipts || [],
    capabilityCalls: state.capabilityCalls, costUnits: state.costUnits,
    latencyMs: clock() - startedAt, ...extra,
  };
}

async function governedInvokeCapability({
  state, requestedName, input, turnInput, registry, bounds, allowed, confirmed, authorization, clock,
  noProgressHeuristic, capabilityFingerprints,
}) {
  const capability = registry.get(requestedName);
  const denial = authorize(capability, requestedName, allowed, confirmed);
  if (denial) {
    return {
      status: "denied",
      observation: { type: "capability_denied", capability: safeName(requestedName), reason: denial },
    };
  }
  if (state.capabilityCalls >= bounds.maxCapabilityCalls) {
    return { status: "budget", reason: "capability_call_budget" };
  }
  if (state.costUnits + capability.costUnits > bounds.maxCostUnits) {
    return { status: "budget", reason: "cost_budget" };
  }
  if (noProgressHeuristic) {
    const fingerprint = `${capability.name}:${JSON.stringify(input || {})}`;
    const repeats = capabilityFingerprints.filter((item) => item === fingerprint).length;
    capabilityFingerprints.push(fingerprint);
    if (repeats >= 1) {
      return {
        status: "no_progress",
        observation: {
          type: "no_progress_heuristic",
          capability: capability.name,
          note: "F1 test heuristic only. Legitimate repetition may occur when Reality changed, freshness expired, evidence was incomplete, retry policy authorizes another attempt, or causal context materially changed.",
        },
      };
    }
  }
  state.capabilityCalls += 1;
  state.costUnits += capability.costUnits;
  const callStartedAt = clock();
  try {
    const value = await capability.execute(input || {}, { turnInput, authorization });
    return {
      status: "completed",
      elapsed_ms: clock() - callStartedAt,
      observation: { type: "capability_result", capability: capability.name, ok: true, value },
    };
  } catch (error) {
    return {
      status: "failed",
      elapsed_ms: clock() - callStartedAt,
      error,
      observation: {
        type: "capability_result",
        capability: capability.name,
        ok: false,
        error: { name: safeName(error?.name) || "Error", code: safeName(error?.code) },
      },
    };
  }
}

function resolveRequiredEventDescriptor(kind, handlers, registry) {
  const raw = handlers[kind];
  if (typeof raw === "function") return { type: "structural", run: raw };
  if (raw && raw.type === "structural" && typeof raw.run === "function") return raw;
  if (raw && (raw.type === "capability" || raw.capability)) {
    return { type: "capability", capability: raw.capability, input: raw.input };
  }
  const capName = DEFAULT_REQUIRED_EVENT_CAPABILITIES[kind];
  if (capName && registry.get(capName)) return { type: "capability", capability: capName };
  return null;
}

async function runRequiredEvent(kind, descriptor, state, ctx) {
  if (descriptor.type === "structural") {
    try {
      const observation = await descriptor.run({ kind, input: ctx.turnInput, authorization: ctx.authorization, registry: ctx.registry });
      if (!observation || observation.ok === false) return { stopReason: "required_event_failed" };
      recordRequiredReceipt(state, {
        kind,
        policy: REQUIRED_EVENT_POLICY,
        handlerType: "structural",
        status: "completed",
        observation: { ...observation, kind, policy: REQUIRED_EVENT_POLICY, discharged: true },
      });
      return {};
    } catch (error) {
      recordRequiredReceipt(state, {
        kind,
        policy: REQUIRED_EVENT_POLICY,
        handlerType: "structural",
        status: "failed",
        observation: {
          type: "required_event_failed",
          kind,
          error: { name: safeName(error?.name) || "Error", code: safeName(error?.code) },
        },
      });
      return { stopReason: "required_event_failed" };
    }
  }

  const query = String(ctx.turnInput?.text || ctx.turnInput?.prompt || "");
  const capInput = typeof descriptor.input === "function"
    ? descriptor.input(ctx.turnInput)
    : descriptor.input || { query, subject: query };
  const invoked = await governedInvokeCapability({
    ...ctx,
    state,
    requestedName: descriptor.capability,
    input: capInput,
  });
  if (invoked.status === "budget") return { stopReason: invoked.reason };
  if (invoked.status === "denied" || invoked.status === "failed" || invoked.status === "no_progress") {
    recordRequiredReceipt(state, {
      kind,
      policy: REQUIRED_EVENT_POLICY,
      handlerType: "capability",
      capability: descriptor.capability,
      status: "failed",
      observation: invoked.observation,
    });
    return { stopReason: invoked.status === "denied" ? "required_event_failed" : invoked.status === "no_progress" ? "no_progress" : "required_event_failed" };
  }
  recordRequiredReceipt(state, {
    kind,
    policy: REQUIRED_EVENT_POLICY,
    handlerType: "capability",
    capability: descriptor.capability,
    status: "completed",
    observation: {
      type: kind === "orientation.required" ? "orientation_result" : "required_event_result",
      kind,
      policy: REQUIRED_EVENT_POLICY,
      discharged: true,
      ok: true,
      capability: descriptor.capability,
      value: invoked.observation?.value,
    },
  });
  return {};
}

function recordRequiredReceipt(state, receipt) {
  state.requiredEventCount = (state.requiredEventCount || 0) + (receipt.status === "completed" ? 1 : 0);
  state.requiredEventReceipts.push(receipt);
  if (receipt.observation) state.observations.push(receipt.observation);
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
