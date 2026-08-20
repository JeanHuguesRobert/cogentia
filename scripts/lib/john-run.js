import {
  createCapabilityRegistry,
  createGovernedHarness,
} from "./agent-jhn-whatsapp/governed-harness.js";
import { createOpenAiStepReasoner } from "./agent-jhn-whatsapp/openai-step-reasoner.js";

const REQUEST_VERSION = "john.request.v1";
const TERMINAL_EVENTS = new Set([
  "john.run.completed",
  "john.run.failed",
  "john.run.cancelled",
]);

const ALLOWED_HANDLER_KINDS = new Set([
  "mock",
  "governed_reasoner",
  "step_reasoner",
  "model",
]);

function nowIso() {
  return new Date().toISOString();
}

function problem(path, message) {
  return { path, message };
}

export function validateJohnRequest(request) {
  const problems = [];
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return [problem("$", "must be an object")];
  }
  const allowed = new Set([
    "version",
    "request_id",
    "principal",
    "mandate",
    "budget",
    "execution_budget",
    "exposure",
    "capability",
    "input",
    "handler",
    "ithaca",
  ]);
  for (const key of Object.keys(request)) {
    if (!allowed.has(key)) problems.push(problem(`$.${key}`, "is not allowed"));
  }
  if (request.version !== REQUEST_VERSION) problems.push(problem("$.version", `must equal ${REQUEST_VERSION}`));
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(String(request.request_id || ""))) {
    problems.push(problem("$.request_id", "must be a non-empty portable identifier"));
  }
  for (const name of ["principal", "budget"]) {
    if (!request[name] || typeof request[name] !== "object" || !String(request[name].id || "").trim()) {
      problems.push(problem(`$.${name}.id`, "is required"));
    }
  }
  const limits = request.execution_budget;
  for (const name of ["max_steps", "max_tool_calls", "max_subagents", "max_elapsed_ms", "max_external_effects"]) {
    if (!Number.isInteger(limits?.[name]) || limits[name] < (name === "max_steps" || name === "max_elapsed_ms" ? 1 : 0)) {
      problems.push(problem(`$.execution_budget.${name}`, "must be a non-negative integer (positive for steps and elapsed time)"));
    }
  }
  if (!request.mandate || typeof request.mandate !== "object" || !String(request.mandate.id || "").trim()) {
    problems.push(problem("$.mandate.id", "is required"));
  }
  if (!request.mandate || !String(request.mandate.version || "").trim()) {
    problems.push(problem("$.mandate.version", "is required"));
  }
  if (!["none", "read_only", "bounded", "consequential"].includes(request.exposure)) {
    problems.push(problem("$.exposure", "must be none, read_only, bounded, or consequential"));
  }
  if (!String(request.capability || "").trim()) problems.push(problem("$.capability", "is required"));
  if (!request.input || typeof request.input !== "object" || !String(request.input.prompt || "").trim()) {
    problems.push(problem("$.input.prompt", "is required"));
  }
  if (!request.handler || typeof request.handler !== "object" || !String(request.handler.id || "").trim()) {
    problems.push(problem("$.handler.id", "is required"));
  } else if (!ALLOWED_HANDLER_KINDS.has(request.handler.kind)) {
    problems.push(problem("$.handler.kind", "must be one of mock, governed_reasoner, step_reasoner, model"));
  }
  if (request.ithaca !== undefined) {
    if (typeof request.ithaca !== "object" || request.ithaca === null || Array.isArray(request.ithaca)) {
      problems.push(problem("$.ithaca", "must be an object"));
    } else {
      if (request.ithaca.return_target !== undefined && typeof request.ithaca.return_target !== "string") {
        problems.push(problem("$.ithaca.return_target", "must be a string"));
      }
      if (request.ithaca.description !== undefined && typeof request.ithaca.description !== "string") {
        problems.push(problem("$.ithaca.description", "must be a string"));
      }
    }
  }
  return problems;
}

/**
 * Builds an authoritative COP Cognitive Packet representation from a validated John request.
 */
export function buildCognitivePacketFromJohnRequest(request) {
  const now = nowIso();
  const packetId = `urn:cop:packet:john:${request.request_id}`;
  const ithaca = request.ithaca
    ? {
        description: request.ithaca.description || "Caller standard response target",
        return_target: request.ithaca.return_target || request.principal.id,
        response_channel: request.ithaca.response_channel || "john-cli-stream",
        return_conditions: request.ithaca.return_conditions || ["run.completed"],
      }
    : {
        description: "Caller stream (Ithaca)",
        return_target: request.principal.id,
        response_channel: "john-cli-stream",
        return_conditions: ["run.completed"],
      };

  return {
    packetKind: "cognitive_packet",
    envelope: {
      protocol: "cognitive_packet.v0",
      id: packetId,
      packet_id: packetId,
      createdAt: now,
      status: "dispatched",
      principal_id: request.principal.id,
      mandate_id: request.mandate.id,
      budget_id: request.budget.id,
      exposure: request.exposure,
      capability: request.capability,
      ithaca,
      hops: [
        {
          hop_index: 0,
          node_id: "node:workstation:john-cli",
          instance_id: "john:logical-agent",
          interface: "cli",
          timestamp: now,
          route_reason: "stimulus-admitted-to-cop",
        },
      ],
      residue: [],
    },
    payload: {
      request_id: request.request_id,
      input: request.input,
      capability: request.capability,
      handler: request.handler,
    },
  };
}

/**
 * Reconstructs the complete Odyssey journey trace from the Cognitive Packet.
 */
export function reconstructJohnOdyssey(packet) {
  if (!packet?.envelope) throw new Error("reconstructJohnOdyssey: invalid packet");
  const env = packet.envelope;
  const hops = env.hops || [];
  const status = env.status || "unknown";
  const departure = hops.length > 0 ? hops[0] : { timestamp: env.createdAt };
  const lastHop = hops.length > 0 ? hops[hops.length - 1] : null;

  return {
    packetId: env.id,
    intent: packet.payload?.input?.prompt || "unspecified",
    ithaca: env.ithaca,
    lifecycle: {
      status,
      isSolved: status === "solved" || status === "returned" || status === "assimilated",
      isReturned: status === "returned" || status === "assimilated",
      isAssimilated: status === "assimilated",
    },
    journey: {
      departureTimestamp: departure.timestamp,
      returnTimestamp: status === "returned" || status === "assimilated" ? lastHop?.timestamp : null,
      hopsCount: hops.length,
      hopsChain: hops.map((h) => ({
        hopIndex: h.hop_index,
        node: h.node_id,
        instance: h.instance_id,
        reason: h.route_reason,
        timestamp: h.timestamp,
      })),
    },
    yield: packet.yield || null,
    residue: env.residue || [],
  };
}

function event(request, sequence, type, data = {}) {
  return {
    version: "john.event.v1",
    event_id: `${request.request_id}:${sequence}`,
    sequence,
    run_id: request.request_id,
    type,
    principal_id: request.principal.id,
    mandate: request.mandate,
    budget_id: request.budget.id,
    exposure: request.exposure,
    data,
  };
}

/**
 * Executes the John request through the COP Cognitive Packet roundtrip and returns canonical events.
 */
export async function runJohnRequest(request, options = {}) {
  const problems = validateJohnRequest(request);
  if (problems.length) {
    return [
      {
        version: "john.event.v1",
        event_id: "invalid:1",
        sequence: 1,
        run_id: String(request?.request_id || "invalid"),
        type: "john.run.failed",
        data: { code: "invalid_request", problems, terminal: true },
      },
    ];
  }

  const packet = buildCognitivePacketFromJohnRequest(request);
  const ithaca = packet.envelope.ithaca;
  const startTime = Date.now();
  const events = [];
  let seq = 1;

  // Event 1: started
  events.push(
    event(request, seq++, "john.run.started", {
      mode: "headless",
      handler_mode: request.handler.kind,
      execution_budget: request.execution_budget,
      ithaca,
    })
  );

  // Event 2: packet admitted under COP rules
  events.push(
    event(request, seq++, "john.packet.admitted", {
      admission_mode: "cop_admitted",
      packet_id: packet.envelope.id,
      consequential_effects: request.exposure === "consequential",
      reserved_limits: {
        max_steps: request.execution_budget.max_steps,
        max_tool_calls: request.execution_budget.max_tool_calls,
        max_subagents: request.execution_budget.max_subagents,
        max_external_effects: request.execution_budget.max_external_effects,
      },
      ithaca,
      note: "Admitted under COP boundary rules as an authoritative Cognitive Packet.",
    })
  );

  // Event 3: capability resolved
  events.push(
    event(request, seq++, "john.capability.resolved", {
      capability: request.capability,
      provider: request.handler.id,
    })
  );

  // Event 4: handler started
  events.push(
    event(request, seq++, "john.handler.started", {
      handler: request.handler,
      hop_index: 1,
    })
  );

  // Hop 1: Execution at the handler
  const handlerStartTime = nowIso();
  packet.envelope.hops.push({
    hop_index: 1,
    node_id: `node:handler:${request.handler.kind}`,
    instance_id: request.handler.id,
    interface: "in-process",
    timestamp: handlerStartTime,
    route_reason: "capability-execution",
  });

  let outputText = "";
  let observedSteps = 1;
  let capabilityCallsCount = 0;
  let costUnits = 0;
  let executionSuccess = true;
  let failureReason = null;
  let harnessResult = null;

  if (request.handler.kind === "mock") {
    outputText = `Mock handler received: ${request.input.prompt}`;
    events.push(event(request, seq++, "john.assistant.delta", { delta: outputText }));
  } else if (
    request.handler.kind === "governed_reasoner" ||
    request.handler.kind === "step_reasoner" ||
    request.handler.kind === "model"
  ) {
    const registry = options.registry || createCapabilityRegistry(options.capabilities || []);
    let reasoner = options.reasoner;

    if (!reasoner) {
      if (request.handler.id === "openai.step_reasoner" || request.handler.kind === "model") {
        const apiKey = options.apiKey || process.env.OPENAI_API_KEY || request.handler.options?.api_key;
        if (!apiKey) {
          throw new Error("API key is required for OpenAI step reasoner handler");
        }
        reasoner = createOpenAiStepReasoner({
          apiKey,
          model: request.handler.model || request.handler.options?.model || "gpt-5.6-terra",
          fetch: options.fetch,
          timeoutMs: request.execution_budget.max_elapsed_ms,
        });
      } else {
        reasoner = {
          nextStep: async () => ({
            kind: "answer",
            answer: `Governed step processed: ${request.input.prompt}`,
          }),
        };
      }
    }

    const harness = createGovernedHarness({
      registry,
      reasoner,
      reviewer: options.reviewer,
      clock: options.clock || Date.now,
    });

    const allowedCaps = request.handler.allowed_capabilities || options.allowedCapabilities || [];
    const confirmedCaps = request.handler.confirmed_capabilities || options.confirmedCapabilities || [];

    const authorization = {
      allowedCapabilities: allowedCaps,
      confirmedCapabilities: confirmedCaps,
    };

    const limits = {
      maxSteps: request.execution_budget.max_steps,
      maxCapabilityCalls: request.execution_budget.max_tool_calls,
      maxElapsedMs: request.execution_budget.max_elapsed_ms,
    };

    try {
      harnessResult = await harness.run(
        { text: request.input.prompt, input: request.input },
        authorization,
        limits
      );

      observedSteps = harnessResult.stepCount || 1;
      capabilityCallsCount = harnessResult.capabilityCalls || 0;
      costUnits = harnessResult.costUnits || 0;

      if (Array.isArray(harnessResult.steps)) {
        for (const stepEntry of harnessResult.steps) {
          const step = stepEntry.step;
          const result = stepEntry.result;
          if (step?.kind === "capability_call") {
            events.push(
              event(request, seq++, "john.tool.requested", {
                step_id: step.step_id,
                capability: step.capability,
                input: step.input,
              })
            );
            if (result?.status === "completed") {
              events.push(
                event(request, seq++, "john.tool.receipt", {
                  step_id: step.step_id,
                  capability: step.capability,
                  status: "completed",
                  elapsed_ms: result.elapsed_ms,
                })
              );
            } else if (result?.status === "denied") {
              events.push(
                event(request, seq++, "john.tool.rejected", {
                  step_id: step.step_id,
                  capability: step.capability,
                  status: "denied",
                  reason: result.observation?.reason,
                })
              );
            }
          }
        }
      }

      if (harnessResult.ok) {
        outputText = harnessResult.answer || "";
        events.push(event(request, seq++, "john.assistant.delta", { delta: outputText }));
      } else if (harnessResult.stopReason === "clarification_required") {
        outputText = `Clarification requested: ${harnessResult.question}`;
        events.push(event(request, seq++, "john.assistant.delta", { delta: outputText }));
      } else {
        executionSuccess = false;
        failureReason = harnessResult.stopReason || "harness_stopped";
        outputText = `Harness stopped: ${failureReason}`;
      }
    } catch (err) {
      executionSuccess = false;
      failureReason = err.message;
      outputText = `Execution error: ${err.message}`;
    }
  }

  const packetYield = {
    semantic_yield: outputText,
    operational_yield: {
      observed_steps: observedSteps,
      capability_calls: capabilityCallsCount,
      cost_units: costUnits,
      elapsed_ms: Math.max(1, Date.now() - startTime),
      handler_id: request.handler.id,
      stop_reason: harnessResult?.stopReason || (executionSuccess ? "completed" : failureReason),
    },
    produced_at: nowIso(),
    produced_by: request.handler.id,
  };
  packet.yield = packetYield;
  packet.envelope.status = executionSuccess ? "solved" : "failed";

  // Hop 2: Return to Ithaca
  const returnTime = nowIso();
  packet.envelope.hops.push({
    hop_index: 2,
    node_id: "ithaca-node",
    instance_id: ithaca.return_target || "caller",
    interface: "cli-return",
    timestamp: returnTime,
    route_reason: "yield-returned-to-ithaca",
  });
  if (executionSuccess) {
    packet.envelope.status = "returned";
  }

  const odyssey = reconstructJohnOdyssey(packet);

  // Event 6: Accounting settled
  events.push(
    event(request, seq++, "john.accounting.settled", {
      settlement_mode: "exact",
      provider_cost: costUnits,
      external_effects: 0,
      observed_steps: observedSteps,
      tool_calls_count: capabilityCallsCount,
      hops_count: packet.envelope.hops.length,
      ithaca_returned: executionSuccess,
    })
  );

  // Event 7: Terminal completion or failure
  if (executionSuccess) {
    events.push(
      event(request, seq++, "john.run.completed", {
        terminal: true,
        result: {
          text: outputText,
          handler: request.handler.id,
          packet_id: packet.envelope.id,
          status: packet.envelope.status,
          yield: packetYield,
          odyssey,
        },
      })
    );
  } else {
    events.push(
      event(request, seq++, "john.run.failed", {
        terminal: true,
        data: {
          code: failureReason || "execution_failed",
          text: outputText,
          packet_id: packet.envelope.id,
          status: packet.envelope.status,
          odyssey,
        },
      })
    );
  }

  return events;
}

export function isTerminalEvent(item) {
  return Boolean(item?.data?.terminal || item?.result) && TERMINAL_EVENTS.has(item.type);
}

export function renderJohnEventHuman(item) {
  if (item.type === "john.assistant.delta") return item.data.delta;
  if (isTerminalEvent(item)) return `[${item.type}]`;
  return `[${item.type}] ${JSON.stringify(item.data)}`;
}

export { REQUEST_VERSION, TERMINAL_EVENTS };


