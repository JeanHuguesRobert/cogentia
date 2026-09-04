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
} = {}) {
  if (typeof legacyTurn !== "function") throw new Error("legacyTurn is required");
  if (!reasoningLoopV2Enabled(env, { enabled })) {
    return { used: false, fallback: false, result: await legacyTurn() };
  }

  const startedAt = Date.now();
  try {
    if (forceFailure) throw new Error("forced_v2_failure");
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
    sanitizeResultAnswer(surfaceResult);
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
    const fallbackResult = await legacyTurn();
    sanitizeResultAnswer(fallbackResult);
    return {
      used: true,
      fallback: true,
      result: fallbackResult,
      reasoning: {
        protocol: "cogentia.agent_john_reasoning_loop.v2",
        surface: surface || "agent-john",
        error: safeErrorCode(error),
        elapsed_ms: Date.now() - startedAt,
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
    new RegExp(`^(?:Je\\s+vais\\s+(?:répondre|distinguer|aller|convertir|rester|cadrer))${sentenceBody}[.!?]\\s*`, "i"),
    new RegExp(`^(?:Je\\s+vérifie|Je\\s+regarde)\\s+(?:d[’']abord)${sentenceBody}[.!?]\\s*`, "i"),
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
