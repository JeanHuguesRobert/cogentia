#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  runAgentJohnV2SurfaceTurn,
  reasoningLoopV2Enabled,
  resolveGuideReasoningLoopV2,
  sanitizeSurfaceAnswer,
  resolveHopStrategy,
  computeHopStrategyOut,
  BUILTIN_STRATEGIES,
  STRATEGY_SCHEMA,
} from "./lib/agent-jhn-reasoning-loop-v2.js";

assert.equal(reasoningLoopV2Enabled({}), false);
assert.equal(reasoningLoopV2Enabled({ COGENTIA_REASONING_LOOP_V2: "true" }), true);
assert.equal(resolveGuideReasoningLoopV2({}, {}), false);
assert.equal(resolveGuideReasoningLoopV2({ reasoning_loop_v2: true }, {}), false);
assert.equal(resolveGuideReasoningLoopV2({ reasoning_loop_v2: true }, { COGENTIA_GUIDE_ALLOW_V2_PROBE: "true" }), true);
assert.equal(resolveGuideReasoningLoopV2({ reasoning_loop_v2: false }, { COGENTIA_REASONING_LOOP_V2: "true" }), true);
assert.equal(resolveGuideReasoningLoopV2({ reasoning_loop_v2: false }, { COGENTIA_REASONING_LOOP_V2: "true", COGENTIA_GUIDE_ALLOW_V2_PROBE: "true" }), false);

// Anti-leak sanitizer tests
const leakedAnswer = "I’m checking the public FractaVolta corpus to ground the answer in its own partner framing, then I’ll give the shortest useful recommendation with limits. The current workspace doesn’t expose the FractaVolta repo at this path, so I’m locating the public corpus file that the supplied source_ids reference and using that instead of guessing. A first FractaVolta partner should be a territorial pilot sponsor: a public actor on C:\\tweesic\\cogentia\\scripts\\test.js [barons-Mariani:research/cas_edf.md#L240-L265].";
const cleaned = sanitizeSurfaceAnswer(leakedAnswer);
assert.ok(!cleaned.includes("checking the public"));
assert.ok(!cleaned.includes("workspace doesn’t expose"));
assert.ok(!cleaned.includes("C:\\tweesic"));
assert.ok(cleaned.includes("A first FractaVolta partner should be a territorial pilot sponsor"));
assert.ok(cleaned.includes("[barons-Mariani:research/cas_edf.md#L240-L265]"));

const frenchLeak = "Je consulte le corpus public pour vérifier les informations. D'après les documents fournis dans le contexte, la DGF est sanctuarisée. Voir /srv/cogentia/repos/note.md.";
const cleanedFr = sanitizeSurfaceAnswer(frenchLeak);
assert.ok(!cleanedFr.includes("Je consulte"));
assert.ok(!cleanedFr.includes("D'après les documents"));
assert.ok(!cleanedFr.includes("/srv/cogentia"));
assert.ok(cleanedFr.includes("la DGF est sanctuarisée"));

const liveV2Leak = "Je pars du corpus public fourni et je vais répondre sur le point précis de garantie, pas sur une promesse politique générale. Je vérifie d’abord ce que le texte dit explicitement des garde-fous, puis j’indique ce qui reste non tranché.Personne ne le garantit automatiquement, à ce stade.";
const cleanedLive = sanitizeSurfaceAnswer(liveV2Leak);
assert.ok(!cleanedLive.includes("Je pars du corpus"));
assert.ok(!cleanedLive.includes("Je vérifie"));
assert.ok(cleanedLive.startsWith("Personne ne le garantit"));

// Methodological preambles and bracketed citations
const samplePreamble1 = "Je réponds à partir du corpus public FractaVolta, en séparant ce qui est documenté de ce qui relève d’une inférence opérationnelle. Je vais aller droit au levier immédiat: ce qui peut baisser la facture avant toute grande instruction réseau, puis ce qui reste à vérifier localement.La voie immédiate est de traiter la mairie";
assert.equal(sanitizeSurfaceAnswer(samplePreamble1), "La voie immédiate est de traiter la mairie");

const samplePreamble2 = "Je m’appuie sur le corpus public fourni pour rester au plus près du droit constant et éviter les faux remèdes. Je vais distinguer ce qui est documenté, ce qui relève d’une inférence prudente, et le point qui reste juridiquement à sécuriser.Oui: il faut sortir du faux débat";
assert.equal(sanitizeSurfaceAnswer(samplePreamble2), "Oui: il faut sortir du faux débat");

const samplePreamble3 = "Je pars du principe que vous cherchez un levier politique concret, pas une théorie générale: je vais répondre en termes d’outils sénatoriaux et de séquence d’action, en m’adossant au corpus public disponible sur l’autonomie territoriale [FractaVolta:research/fractavolta_paper.md#L38-L65].Oui, mais pas en “arrêtant”";
assert.equal(sanitizeSurfaceAnswer(samplePreamble3), "Oui, mais pas en “arrêtant”");

const samplePreamble4 = "Je m’appuie sur le brief public disponible pour formuler une réponse de méthode, pas une promesse d’appareil. Je vais rester sur le terrain des leviers réels d’un sénateur isolé et marquer clairement ce qui relève de l’inférence.Oui, s’il n’a pas un grand groupe";
assert.equal(sanitizeSurfaceAnswer(samplePreamble4), "Oui, s’il n’a pas un grand groupe");

const samplePreamble5 = "Je formule une réponse opérationnelle en restant dans le corpus public FractaVolta, avec le point central suivant: agir d’abord derrière le compteur, pas via l’attente du raccordement.Par la voie courte, votre mairie doit d’abord réduire l’énergie achetée";
assert.equal(sanitizeSurfaceAnswer(samplePreamble5), "Par la voie courte, votre mairie doit d’abord réduire l’énergie achetée");

const samplePreamble6 = "Je vérifie le cadre juridique exact avant de proposer des leviers concrets à droit constant, puis je vous donne une architecture de solutions qui évite le faux pas du statut de résident.Si la voie du « statut de résident » est fermée, la solution sûre consiste à viser l’usage du sol";
assert.equal(sanitizeSurfaceAnswer(samplePreamble6), "Si la voie du « statut de résident » est fermée, la solution sûre consiste à viser l’usage du sol");

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
assert.equal(recovered.reasoning.strategy_out.yield_classification, "failure_residue");

// Dynamic Hop Strategy (sigma_in -> sigma_out) tests
const mayoralStrat = resolveHopStrategy({ text: "Question du maire de Corte sur la DGF", surface: "senatoriales" });
assert.equal(mayoralStrat.id, "mayoral_inquiry");
assert.equal(mayoralStrat.posture, "political_representative");
assert.equal(mayoralStrat.strict_anti_leak, true);

const doctrinalStrat = resolveHopStrategy({ text: "Quel est le lien entre Potentics et le Learning Computer ?", surface: "agent-john" });
assert.equal(doctrinalStrat.id, "doctrinal_synthesis");
assert.equal(doctrinalStrat.posture, "academic_doctrinal");

const adversarialStrat = resolveHopStrategy({ text: "Appliquons le critère Rossignol pour falsifier", surface: "agent-john" });
assert.equal(adversarialStrat.id, "adversarial_verification");

const ctnStrat = resolveHopStrategy({
  packet: { continuation: { recommended_strategy: "fast_reactive_dispatch" } },
});
assert.equal(ctnStrat.id, "fast_reactive_dispatch");

// Hop execution recording with Cognitive Packet envelope
const testPacket = {
  envelope: {
    id: "pkt:test:001",
    hops: [],
  },
};
const hopTurn = await runAgentJohnV2SurfaceTurn({
  text: "Question de la commune sur l'autonomie",
  surface: "senat",
  enabled: true,
  packet: testPacket,
  legacyTurn: async () => ({ answer: "L'autonomie de capacité protège les compétences communales." }),
});
assert.equal(hopTurn.used, true);
assert.ok(hopTurn.reasoning.strategy_in);
assert.equal(hopTurn.reasoning.strategy_in.id, "mayoral_inquiry");
assert.ok(hopTurn.reasoning.strategy_out);
assert.equal(hopTurn.reasoning.strategy_out.yield_classification, "nominal_yield");
assert.equal(testPacket.envelope.hops.length, 1);
assert.equal(testPacket.envelope.hops[0].strategy_in, "mayoral_inquiry");
assert.equal(testPacket.envelope.hops[0].posture, "political_representative");

console.log("ok - Agent John V2 is feature-gated, governed, and falls back to the legacy surface turn");
console.log("ok - Agent John V2 output sanitizer strips workspace leaks and meta-commentary");
console.log("ok - Agent John V2 agile hop strategy (sigma_in -> sigma_out) resolves and logs to packet hops");

