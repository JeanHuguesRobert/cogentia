/**
 * John headless runner with COP Cognitive Packet lifecycle integration.
 *
 * Projecting the LogicalAgent command surface (cogentia#112) while building
 * directly on the COP Cognitive Packet lifecycle invariants (inseme#54).
 *
 * The canonical event vocabulary is the contract that later COP, accounting,
 * MCP, SSE, OpenAI-compatible and Inseme projections share.
 */

const REQUEST_VERSION = "john.request.v1";
const TERMINAL_EVENTS = new Set([
  "john.run.completed",
  "john.run.failed",
  "john.run.cancelled",
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
  if (!request.handler || request.handler.id !== "mock.echo" || request.handler.kind !== "mock") {
    problems.push(problem("$.handler", "v0 accepts only { id: 'mock.echo', kind: 'mock' }"));
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
export function runJohnRequest(request) {
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

  // Hop 1: Execution at the handler
  const handlerStartTime = nowIso();
  const output = `Mock handler received: ${request.input.prompt}`;
  
  packet.envelope.hops.push({
    hop_index: 1,
    node_id: "node:handler:mock",
    instance_id: request.handler.id,
    interface: "in-process",
    timestamp: handlerStartTime,
    route_reason: "capability-execution",
  });

  const packetYield = {
    semantic_yield: output,
    operational_yield: {
      observed_steps: 1,
      elapsed_ms: Math.max(1, Date.now() - startTime),
      provider_cost: 0,
      handler_id: request.handler.id,
    },
    produced_at: nowIso(),
    produced_by: request.handler.id,
  };
  packet.yield = packetYield;
  packet.envelope.status = "solved";

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
  packet.envelope.status = "returned";

  const odyssey = reconstructJohnOdyssey(packet);

  return [
    event(request, 1, "john.run.started", {
      mode: "headless",
      handler_mode: "safe_mock",
      execution_budget: request.execution_budget,
      ithaca,
    }),
    event(request, 2, "john.packet.admitted", {
      admission_mode: "cop_admitted",
      packet_id: packet.envelope.id,
      consequential_effects: false,
      reserved_limits: {
        max_steps: 1,
        max_tool_calls: 0,
        max_subagents: 0,
        max_external_effects: 0,
      },
      ithaca,
      note: "Admitted under COP boundary rules as an authoritative Cognitive Packet.",
    }),
    event(request, 3, "john.capability.resolved", {
      capability: request.capability,
      provider: request.handler.id,
    }),
    event(request, 4, "john.handler.started", {
      handler: request.handler,
      hop_index: 1,
    }),
    event(request, 5, "john.assistant.delta", { delta: output }),
    event(request, 6, "john.accounting.settled", {
      settlement_mode: "exact",
      provider_cost: 0,
      external_effects: 0,
      observed_steps: 1,
      hops_count: packet.envelope.hops.length,
      ithaca_returned: true,
    }),
    event(request, 7, "john.run.completed", {
      terminal: true,
      result: {
        text: output,
        handler: request.handler.id,
        packet_id: packet.envelope.id,
        status: packet.envelope.status,
        yield: packetYield,
        odyssey,
      },
    }),
  ];
}

export function isTerminalEvent(item) {
  return Boolean(item?.data?.terminal) && TERMINAL_EVENTS.has(item.type);
}

export function renderJohnEventHuman(item) {
  if (item.type === "john.assistant.delta") return item.data.delta;
  if (isTerminalEvent(item)) return `[${item.type}]`;
  return `[${item.type}] ${JSON.stringify(item.data)}`;
}

export { REQUEST_VERSION, TERMINAL_EVENTS };

