/**
 * Provider-neutral governed step harness.
 * The reasoner freely proposes steps; this kernel only validates, authorizes,
 * executes, records, and enforces bounds.
 */

export const AGENT_STEP_PROTOCOL = "cogentia.agent_step/v1";
export const STEP_RESULT_PROTOCOL = "cogentia.step_result/v1";

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
      const state = { input, observations: [], steps: [], sequence: 0, capabilityCalls: 0, costUnits: 0 };

      while (state.sequence < bounds.maxSteps) {
        if (clock() - startedAt >= bounds.maxElapsedMs) return stopped("time_budget", state, startedAt, clock);
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
          return terminal(false, "clarification_required", "", state, startedAt, clock, { question: step.question });
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
        try {
          const value = await capability.execute(step.input || {}, { turnInput: input, step, authorization });
          const observation = { type: "capability_result", capability: capability.name, ok: true, value };
          appendStep(state, step, stepResult(step, "completed", { observation, elapsed_ms: clock() - callStartedAt }));
          state.observations.push(observation);
        } catch (error) {
          const observation = {
            type: "capability_result", capability: capability.name, ok: false,
            error: { name: safeName(error?.name) || "Error", code: safeName(error?.code) },
          };
          appendStep(state, step, stepResult(step, "failed", { observation, elapsed_ms: clock() - callStartedAt, error }));
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
    input: state.input, observations: state.observations.slice(), steps: state.steps.slice(),
    nextSequence: state.sequence, capabilityCalls: state.capabilityCalls, costUnits: state.costUnits,
    capabilities: registry.list(), bounds,
  };
}
function completed(answer, state, startedAt, clock) { return terminal(true, "answer_accepted", answer, state, startedAt, clock); }
function stopped(reason, state, startedAt, clock) { return terminal(false, safeName(reason) || "stopped", "", state, startedAt, clock); }
function terminal(ok, stopReason, answer, state, startedAt, clock, extra = {}) {
  return {
    ok, answer, stopReason, observations: state.observations, steps: state.steps,
    stepCount: state.sequence, capabilityCalls: state.capabilityCalls, costUnits: state.costUnits,
    latencyMs: clock() - startedAt, ...extra,
  };
}
function normalizeNames(values) { return Array.isArray(values) ? values.map(safeName).filter(Boolean) : []; }
function safeName(value) {
  const name = String(value || "").trim();
  return /^[A-Za-z0-9_.:-]{1,120}$/.test(name) ? name : null;
}
function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
function defaultIdFactory(sequence) { return `step-${sequence}`; }
