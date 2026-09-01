#!/usr/bin/env node
import assert from "node:assert/strict";
import { runAgentJohnV2SurfaceTurn, reasoningLoopV2Enabled } from "./lib/agent-jhn-reasoning-loop-v2.js";

assert.equal(reasoningLoopV2Enabled({}), false);
assert.equal(reasoningLoopV2Enabled({ COGENTIA_REASONING_LOOP_V2: "true" }), true);

let calls = 0;
const enabled = await runAgentJohnV2SurfaceTurn({
  text: "What is a Cognitive Packet?",
  surface: "agent-john",
  enabled: true,
  legacyTurn: async () => ({ ok: true, answer: `legacy-${++calls}` }),
});
assert.equal(enabled.used, true);
assert.equal(enabled.fallback, false);
assert.equal(enabled.result.answer, "legacy-1");
assert.ok(enabled.reasoning.preflight.dispatched.includes("orientation.required"));
assert.equal(enabled.reasoning.governed.capability_calls, 1);

const stages = [];
const split = await runAgentJohnV2SurfaceTurn({
  text: "What is a Cognitive Packet?", surface: "guide", enabled: true,
  stages: [
    { capability: "corpus.orient", execute: async () => { stages.push("orient"); return { route: ["packets"] }; } },
    { capability: "corpus.search", execute: async () => { stages.push("search"); return { excerpts: ["evidence"] }; } },
    { capability: "agent_john.surface_synthesis", execute: async () => { stages.push("synthesis"); return { answer: "grounded" }; } },
  ],
  legacyTurn: async () => ({ answer: "unused" }),
});
assert.deepEqual(stages, ["orient", "search", "synthesis"]);
assert.deepEqual(split.reasoning.governed.capabilities, ["corpus.orient", "corpus.search", "agent_john.surface_synthesis"]);

const disabled = await runAgentJohnV2SurfaceTurn({ text: "x", enabled: false, legacyTurn: async () => ({ answer: "legacy" }) });
assert.equal(disabled.used, false);
assert.equal(disabled.result.answer, "legacy");

const recovered = await runAgentJohnV2SurfaceTurn({
  text: "x", enabled: true,
  legacyTurn: async () => ({ answer: "fallback" }),
  forceFailure: true,
});
assert.equal(recovered.result.answer, "fallback");
assert.equal(recovered.fallback, true);
assert.equal(recovered.reasoning.error, "forced_v2_failure");
console.log("ok - Agent John V2 is feature-gated, governed, and falls back to the legacy surface turn");
