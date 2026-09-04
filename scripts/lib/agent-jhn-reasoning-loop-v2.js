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

/**
 * Per-request V2 enablement for Guide eval A/B.
 * A request may set reasoning_loop_v2 true/false only when
 * COGENTIA_GUIDE_ALLOW_V2_PROBE=true (or the process already has V2 on).
 * Probe-true + explicit false keeps a V2-default process comparable to legacy.
 */
export function resolveGuideReasoningLoopV2(payload = {}, env = process.env) {
  const probe = String(env?.COGENTIA_GUIDE_ALLOW_V2_PROBE || "").trim().toLowerCase() === "true";
  const globalOn = String(env?.COGENTIA_REASONING_LOOP_V2 || "").trim().toLowerCase() === "true";
  if (payload.reasoning_loop_v2 === true) return probe || globalOn;
  if (payload.reasoning_loop_v2 === false) return probe ? false : globalOn;
  return globalOn;
}

export const STRATEGY_SCHEMA = "cogentia.hop_strategy/v1";

export const BUILTIN_STRATEGIES = Object.freeze({
  mayoral_inquiry: Object.freeze({
    id: "mayoral_inquiry",
    name: "Sénatoriales Mayoral Inquiry",
    description: "Oriented toward mayors and grands électeurs with political clarity, territorial capability grounding, and strict leak sanitization.",
    posture: "political_representative",
    phases: ["prologue", "admit", "orient", "evidence", "governance", "judgment", "act", "sanitize", "terminal"],
    required_signals: ["local_sovereignty", "traceability", "reversibility"],
    max_elapsed_ms: 15000,
    max_steps: 6,
    max_events: 32,
    strict_anti_leak: true,
  }),
  doctrinal_synthesis: Object.freeze({
    id: "doctrinal_synthesis",
    name: "Doctrinal Deep Synthesis",
    description: "Exhaustive exploration connecting foundational principles (Second Method, Potentics, JHN Architecture).",
    posture: "academic_doctrinal",
    phases: ["prologue", "admit", "classify", "orient", "evidence", "governance", "judgment", "act", "terminal"],
    required_signals: ["provenance", "non_claim_discipline", "corpus_consistency"],
    max_elapsed_ms: 25000,
    max_steps: 10,
    max_events: 48,
    strict_anti_leak: false,
  }),
  adversarial_verification: Object.freeze({
    id: "adversarial_verification",
    name: "Rossignol Adversarial Verification",
    description: "Subject proposed answers or continuations to reality checks and independent contradictory tests.",
    posture: "adversarial_critic",
    phases: ["admit", "orient", "evidence", "governance", "judgment", "terminal"],
    required_signals: ["synthetic_skin_in_the_game", "reality_response"],
    max_elapsed_ms: 10000,
    max_steps: 5,
    max_events: 24,
    strict_anti_leak: true,
  }),
  fast_reactive_dispatch: Object.freeze({
    id: "fast_reactive_dispatch",
    name: "Fast Reactive Dispatch",
    description: "Immediate lightweight transformation or routing hop for operational surfaces.",
    posture: "lightweight_router",
    phases: ["admit", "judgment", "terminal"],
    required_signals: [],
    max_elapsed_ms: 5000,
    max_steps: 3,
    max_events: 16,
    strict_anti_leak: true,
  }),
});

export function resolveHopStrategy({
  strategy = null,
  text = "",
  surface = "agent-john",
  mandate = null,
  packet = null,
} = {}) {
  if (typeof strategy === "string" && BUILTIN_STRATEGIES[strategy]) {
    return { schema: STRATEGY_SCHEMA, ...BUILTIN_STRATEGIES[strategy], source: "explicit" };
  }
  if (strategy && typeof strategy === "object" && strategy.id) {
    return { schema: STRATEGY_SCHEMA, ...strategy, source: "caller" };
  }

  // Packet continuation recommendation
  if (packet?.continuation?.recommended_strategy && BUILTIN_STRATEGIES[packet.continuation.recommended_strategy]) {
    return {
      schema: STRATEGY_SCHEMA,
      ...BUILTIN_STRATEGIES[packet.continuation.recommended_strategy],
      source: "packet_continuation",
    };
  }

  // Contextual inference
  const lower = String(text || "").toLowerCase();
  if (
    surface === "senat" ||
    surface === "senatoriales" ||
    lower.includes("maire") ||
    lower.includes("commune") ||
    lower.includes("sénat") ||
    lower.includes("délibération") ||
    lower.includes("dgf")
  ) {
    return { schema: STRATEGY_SCHEMA, ...BUILTIN_STRATEGIES.mayoral_inquiry, source: "inferred_mayoral" };
  }

  if (
    lower.includes("rossignol") ||
    lower.includes("falsifi") ||
    lower.includes("adversarial") ||
    lower.includes("critique")
  ) {
    return { schema: STRATEGY_SCHEMA, ...BUILTIN_STRATEGIES.adversarial_verification, source: "inferred_adversarial" };
  }

  if (
    lower.includes("doctrine") ||
    lower.includes("potentics") ||
    lower.includes("jhn") ||
    lower.includes("learning computer") ||
    lower.includes("cps")
  ) {
    return { schema: STRATEGY_SCHEMA, ...BUILTIN_STRATEGIES.doctrinal_synthesis, source: "inferred_doctrinal" };
  }

  return { schema: STRATEGY_SCHEMA, ...BUILTIN_STRATEGIES.mayoral_inquiry, source: "default" };
}

export function computeHopStrategyOut({
  strategyIn,
  preflight = null,
  governed = null,
  surfaceResult = null,
  continuation = null,
  error = null,
  elapsedMs = 0,
}) {
  const modifications = [];
  let recommendedNext = null;

  if (error) {
    modifications.push({ kind: "error_fallback", error: safeErrorCode(error) });
    recommendedNext = "fast_reactive_dispatch";
  } else if (continuation) {
    modifications.push({ kind: "continuation_emitted", continuation_id: continuation.continuation_id });
    recommendedNext = continuation.target_strategy || strategyIn.id;
  } else if (governed?.costUnits > 4) {
    modifications.push({ kind: "high_complexity_observed", cost_units: governed.costUnits });
    recommendedNext = "doctrinal_synthesis";
  } else {
    modifications.push({ kind: "nominal_completion" });
    recommendedNext = null;
  }

  return {
    schema: STRATEGY_SCHEMA,
    id: `${strategyIn.id}:out`,
    base_strategy: strategyIn.id,
    posture: strategyIn.posture,
    modifications,
    recommended_next_strategy: recommendedNext,
    telemetry: {
      elapsed_ms: elapsedMs,
      step_count: governed?.stepCount || 1,
      capability_calls: governed?.capabilityCalls || 0,
      cost_units: governed?.costUnits || 1,
      sanitized: Boolean(surfaceResult?._sanitizer_modified),
    },
    yield_classification: error ? "failure_residue" : continuation ? "continuation_yield" : "nominal_yield",
  };
}

export async function runAgentJohnV2SurfaceTurn({
  text,
  surface,
  legacyTurn,
  stages = null,
  enabled,
  forceFailure = false,
  env = process.env,
  mandate,
  view = "public",
  limits = {},
  strategy = null,
  packet = null,
  continuation = null,
} = {}) {
  if (typeof legacyTurn !== "function") throw new Error("legacyTurn is required");
  if (!reasoningLoopV2Enabled(env, { enabled })) {
    return { used: false, fallback: false, result: await legacyTurn() };
  }

  const startedAt = Date.now();
  const strategyIn = resolveHopStrategy({ strategy, text, surface, mandate, packet });

  try {
    if (forceFailure) throw new Error("forced_v2_failure");
    // Level 1/2 preflight: required events are ordered before any unrestricted
    // turn capability. The current projector is deliberately side-effect free.
    const preflight = await createReasoningLoop().run(
      { text: String(text || "") },
      {
        surface: surface || "agent-john",
        view,
        mandate,
        bounds: {
          maxEvents: strategyIn.max_events || 32,
          maxHandlerMs: Math.min(strategyIn.max_elapsed_ms || 15000, limits.maxHandlerMs || 8000),
        },
      },
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
    const maxElapsedMs = Math.min(strategyIn.max_elapsed_ms || 15000, limits.maxElapsedMs || 15000);
    const maxSteps = Math.min(strategyIn.max_steps || 6, limits.maxSteps || (activeStages.length + 1));
    const governed = await harness.run(
      { text: String(text || ""), surface },
      { allowedCapabilities: activeStages.map((stage, index) => String(stage.capability || `agent_john.stage_${index + 1}`)) },
      { maxSteps, maxCapabilityCalls: activeStages.length, maxCostUnits: activeStages.length, maxElapsedMs },
    );
    const surfaceResult = stageResults.at(-1);
    if (!governed.ok || surfaceResult === undefined) throw new Error(`governed_turn_${governed.stopReason || "failed"}`);
    sanitizeResultAnswer(surfaceResult);

    const elapsedMs = Date.now() - startedAt;
    const strategyOut = computeHopStrategyOut({
      strategyIn,
      preflight,
      governed,
      surfaceResult,
      continuation,
      elapsedMs,
    });

    // Record hop trace if a Cognitive Packet envelope is provided
    if (packet && packet.envelope && Array.isArray(packet.envelope.hops)) {
      packet.envelope.hops.push({
        hop_index: packet.envelope.hops.length + 1,
        surface: surface || "agent-john",
        strategy_in: strategyIn.id,
        strategy_out: strategyOut.id,
        posture: strategyOut.posture,
        yield_classification: strategyOut.yield_classification,
        recommended_next_strategy: strategyOut.recommended_next_strategy,
        timestamp: new Date().toISOString(),
        telemetry: strategyOut.telemetry,
      });
    }

    return {
      used: true,
      fallback: false,
      result: surfaceResult,
      reasoning: {
        protocol: "cogentia.agent_john_reasoning_loop.v2",
        surface: surface || "agent-john",
        strategy_in: strategyIn,
        strategy_out: strategyOut,
        preflight: { status: preflight.status, dispatched: preflight.dispatched },
        governed: {
          step_count: governed.stepCount,
          capability_calls: governed.capabilityCalls,
          cost_units: governed.costUnits,
          capabilities: activeStages.map(stage => stage.capability),
        },
        continuation: continuation || null,
        elapsed_ms: elapsedMs,
      },
    };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const strategyOut = computeHopStrategyOut({
      strategyIn,
      error,
      elapsedMs,
    });

    const fallbackResult = await legacyTurn();
    sanitizeResultAnswer(fallbackResult);

    if (packet && packet.envelope && Array.isArray(packet.envelope.hops)) {
      packet.envelope.hops.push({
        hop_index: packet.envelope.hops.length + 1,
        surface: surface || "agent-john",
        strategy_in: strategyIn.id,
        strategy_out: strategyOut.id,
        posture: strategyOut.posture,
        yield_classification: "failure_residue",
        timestamp: new Date().toISOString(),
        telemetry: strategyOut.telemetry,
      });
    }

    return {
      used: true,
      fallback: true,
      result: fallbackResult,
      reasoning: {
        protocol: "cogentia.agent_john_reasoning_loop.v2",
        surface: surface || "agent-john",
        strategy_in: strategyIn,
        strategy_out: strategyOut,
        error: safeErrorCode(error),
        elapsed_ms: elapsedMs,
      },
    };
  }
}

function sanitizeResultAnswer(target) {
  if (!target || typeof target !== "object") return;
  if (target.body && typeof target.body.answer === "string") {
    target.body.answer = sanitizeSurfaceAnswer(target.body.answer);
  }
  if (typeof target.answer === "string") {
    target.answer = sanitizeSurfaceAnswer(target.answer);
  }
}

/**
 * Post-synthesis anti-leak sanitizer for Agent John and public Guide surfaces.
 * Strips internal meta-commentary, local filesystem paths, and internal tooling paths
 * while preserving standard markdown links and source citations [repo:path#L1-L2].
 */
export function sanitizeSurfaceAnswer(rawText) {
  if (!rawText || typeof rawText !== "string") return rawText;
  let text = rawText;

  // Match sentences properly handling markdown brackets like [repo:file.md#L1]
  const sentenceBody = "(?:(?:\\[[^\\]]+\\])|[^.!?\\n])+?";

  // 1. Remove meta-reasoning boilerplate sentences (English & French)
  const metaPrefixes = [
    new RegExp(`^(?:I[’']m|I am)\\s+checking\\s+the\\s+public\\s+${sentenceBody}(?:so I can|to ground|before)[^.!?\\n]*?[.!?]\\s*`, "i"),
    new RegExp(`^(?:The\\s+current\\s+)?workspace\\s+does(?:n[’']t|\\s+not)\\s+expose\\s+${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:I[’']m|I am)\\s+locating\\s+the\\s+public\\s+corpus\\s+file${sentenceBody}[.!?]\\s*`, "i"),
    /^(?:Looking\s+at|Based\s+on)\s+the\s+(?:supplied|provided)\s+(?:context|snippets|sources)\s*[,:]\s*/i,
    new RegExp(`^(?:Je\\s+pars\\s+du|Je\\s+consulte\\s+(?:le\\s+)?|Je\\s+recherche\\s+dans\\s+(?:le\\s+)?|Je\\s+m[’']appuie\\s+sur\\s+(?:le\\s+|les\\s+)?)\\s*(?:corpus|br[ie]ef|principes?|sources?|fond|droit|cadre|texte|éléments?)${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Je\\s+pars\\s+du\\s+principe\\s+que)${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Je\\s+réponds\\s+(?:à\\s+partir|en\\s+mode|sur\\s+la\\s+base))${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Je\\s+formule\\s+(?:une\\s+réponse|ceci|cela))${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Je\\s+vais\\s+(?:répondre|distinguer|aller|convertir|rester|cadrer))${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Je\\s+vérifie|Je\\s+regarde)${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Le\\s+workspace|L[’']espace\\s+de\\s+travail)\\s+actuel\\s+ne\\s+contient\\s+pas${sentenceBody}[.!?]\\s*`, "i"),
    /^(?:D[’']après|Selon)\s+les\s+(?:extraits|sources|documents)\s+fourni(?:s|es)\s+dans\s+le\s+contexte\s*[,:]\s*/i,
  ];

  for (let i = 0; i < 5; i++) {
    for (const pat of metaPrefixes) {
      text = text.replace(pat, "");
    }
  }

  // 2. Strip embedded meta-clauses
  text = text.replace(/(?:The current workspace doesn’t expose [^,.;\n]+, so )/gi, "");
  text = text.replace(/(?:The current workspace does not expose [^,.;\n]+, so )/gi, "");
  text = text.replace(/\s*\([^\)]*workspace\s+doesn’t\s+expose[^\)]*\)/gi, "");
  text = text.replace(/\s*\([^\)]*workspace\s+does\s+not\s+expose[^\)]*\)/gi, "");

  // 3. Strip local filesystem paths (Windows drive and Unix absolute paths)
  text = text.replace(/[A-Za-z]:\\[a-zA-Z0-9_\-\.\\]+/g, "[corpus]");
  text = text.replace(/[A-Za-z]:\/[a-zA-Z0-9_\-\.\/]+/g, "[corpus]");
  text = text.replace(/\/(?:srv|Users|home|root|var|etc|opt)\/[a-zA-Z0-9_\-\.\/]+/g, "[corpus]");
  text = text.replace(/\.cogentia[/\\][a-zA-Z0-9_\-\.\/\\]+/g, "[system]");
  text = text.replace(/scripts\/[a-zA-Z0-9_\-\.\/]+\.js/g, "[script]");

  return text.trim();
}

function safeErrorCode(error) {
  return String(error?.message || "reasoning_loop_v2_failed").replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 120);
}
