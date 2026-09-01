/**
 * Agent John V2 surface adapter.
 *
 * Agent John is the canonical cognitive runtime. Guide and WhatsApp call this
 * adapter as surface projections; their legacy turn remains the reversible
 * capability until its stages are individually migrated.
 */
import { createCapabilityRegistry, createGovernedHarness } from "./agent-jhn-whatsapp/governed-harness.js";
import { createReasoningLoop } from "./reasoning-loop.js";

export function reasoningLoopV2Enabled(env = process.env, options = {}) {
  if (typeof options.enabled === "boolean") return options.enabled;
  return String(env?.COGENTIA_REASONING_LOOP_V2 || "").trim().toLowerCase() === "true";
}

export async function runAgentJohnV2SurfaceTurn({
  text,
  surface,
  legacyTurn,
  stages = null,
  enabled,
  env = process.env,
  mandate,
  view = "public",
  limits = {},
} = {}) {
  if (typeof legacyTurn !== "function") throw new Error("legacyTurn is required");
  if (!reasoningLoopV2Enabled(env, { enabled })) {
    return { used: false, fallback: false, result: await legacyTurn() };
  }

  const startedAt = Date.now();
  try {
    // Level 1/2 preflight: required events are ordered before any unrestricted
    // turn capability. The current projector is deliberately side-effect free.
    const preflight = await createReasoningLoop().run(
      { text: String(text || "") },
      { surface: surface || "agent-john", view, mandate, bounds: { maxEvents: 32, maxHandlerMs: 8000 } },
    );
    if (preflight.status === "paused") throw new Error(`reasoning_preflight_${preflight.reason || "paused"}`);

    const activeStages = Array.isArray(stages) && stages.length ? stages : [{
      capability: "agent_john.legacy_turn",
      description: "Reversible legacy implementation of this Agent John surface turn.",
      execute: legacyTurn,
    }];
    const stageResults = [];
    const registry = createCapabilityRegistry(activeStages.map((stage, index) => ({
      name: String(stage.capability || `agent_john.stage_${index + 1}`),
      kind: "tool",
      risk: "read_only",
      resultVisibility: "private",
      costUnits: 1,
      description: String(stage.description || "Agent John V2 governed surface stage."),
      execute: async () => {
        const result = await stage.execute(stageResults.slice());
        stageResults.push(result);
        return { completed: true };
      },
    })));
    let proposed = 0;
    const harness = createGovernedHarness({
      registry,
      // Preflight already discharged structural requirements. Re-running them
      // inside the legacy bridge would duplicate orientation rather than share it.
      requiredEvents: false,
      reasoner: {
        async nextStep() {
          if (proposed < activeStages.length) {
            const capability = String(activeStages[proposed++].capability || "");
            return { kind: "capability_call", capability, input: {} };
          }
          return { kind: "answer", answer: "legacy_turn_completed" };
        },
      },
    });
    const governed = await harness.run(
      { text: String(text || ""), surface },
      { allowedCapabilities: activeStages.map((stage, index) => String(stage.capability || `agent_john.stage_${index + 1}`)) },
      { maxSteps: activeStages.length + 1, maxCapabilityCalls: activeStages.length, maxCostUnits: activeStages.length, maxElapsedMs: limits.maxElapsedMs || 15000 },
    );
    const surfaceResult = stageResults.at(-1);
    if (!governed.ok || surfaceResult === undefined) throw new Error(`governed_turn_${governed.stopReason || "failed"}`);
    return {
      used: true,
      fallback: false,
      result: surfaceResult,
      reasoning: {
        protocol: "cogentia.agent_john_reasoning_loop.v2",
        surface: surface || "agent-john",
        preflight: { status: preflight.status, dispatched: preflight.dispatched },
        governed: { step_count: governed.stepCount, capability_calls: governed.capabilityCalls, cost_units: governed.costUnits, capabilities: activeStages.map(stage => stage.capability) },
        elapsed_ms: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      used: true,
      fallback: true,
      result: await legacyTurn(),
      reasoning: {
        protocol: "cogentia.agent_john_reasoning_loop.v2",
        surface: surface || "agent-john",
        error: safeErrorCode(error),
        elapsed_ms: Date.now() - startedAt,
      },
    };
  }
}

function safeErrorCode(error) {
  return String(error?.message || "reasoning_loop_v2_failed").replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 120);
}
