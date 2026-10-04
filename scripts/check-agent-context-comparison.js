#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "../apps/personal/node_modules/react/index.js";
import { renderToStaticMarkup } from "../apps/personal/node_modules/react-dom/server.js";
import {
  AUTHORITY_LEVELS,
  CAUSAL_ATTRIBUTIONS,
  COMPARISON_CATEGORIES,
  EPISTEMIC_DISCLAIMERS,
  buildMultiAgentComparison,
  parseSnapshotInput,
} from "./lib/agent-context-comparison.js";
import { MultiAgentComparison } from "../apps/personal/src/components/MultiAgentComparison.js";
import { normalizeSnapshot } from "../apps/personal/src/lib/kys-snapshot.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1. Same-Agent Longitudinal Diff
const claudeTurn1 = {
  number: 1,
  provider: "Claude",
  snapshot: normalizeSnapshot({
    relationship_summary: "Observateur tour 1",
    known: [
      { claim: "Je code en JavaScript", basis: "Historique", confidence: "high" },
      { claim: "Je préfère les réunions le matin", basis: "Déclaré", confidence: "medium" },
    ],
    inferred: [
      { claim: "Je prévois un déménagement", confidence: "low" },
    ],
  }, "Claude"),
  reviews: {},
};

const claudeTurn2 = {
  number: 2,
  provider: "Claude",
  snapshot: normalizeSnapshot({
    relationship_summary: "Observateur tour 2",
    known: [
      { claim: "Je code en JavaScript", basis: "Historique", confidence: "high" },
    ],
    inferred: [
      { claim: "Je prévois un déménagement", confidence: "low" },
      { claim: "Je commence à apprendre Rust", confidence: "medium" },
    ],
  }, "Claude"),
  reviews: {},
};

const longitudinalComp = buildMultiAgentComparison([claudeTurn1, claudeTurn2]);
assert.equal(longitudinalComp.ok, true);
assert.equal(longitudinalComp.snapshotsCount, 2);
assert.equal(longitudinalComp.agents.length, 1);
assert.equal(longitudinalComp.agents[0], "Claude");

// Acceptance test: temporal disappearance is detected
assert.equal(longitudinalComp.disappeared.length, 1);
assert.equal(longitudinalComp.disappeared[0].content, "Je préfère les réunions le matin");

// Acceptance test: temporal disappearance is NOT described as human forgetting or person change!
assert.equal(longitudinalComp.disappeared[0].causal_attribution, CAUSAL_ATTRIBUTIONS.unknown.id);
assert.ok(longitudinalComp.disappeared[0].causal_note.includes("ne permet pas de déduire un oubli ou un changement de la personne"));

// Acceptance test: newly observed item detected
assert.equal(longitudinalComp.newlyObserved.length, 1);
assert.equal(longitudinalComp.newlyObserved[0].content, "Je commence à apprendre Rust");

// Acceptance test: source provenance is preserved
assert.ok(longitudinalComp.disappeared[0].sources.length > 0);
assert.equal(longitudinalComp.disappeared[0].sources[0].provider, "Claude");
assert.equal(longitudinalComp.disappeared[0].sources[0].snapshot_id, "turn-1");

// 2. Cross-Agent Heterogeneous Observers (ChatGPT, Claude, Gemini)
const chatGptSnap = normalizeSnapshot({
  agent: { provider: "ChatGPT", model: "gpt-4o" },
  relationship_summary: "Assistant régulier",
  known: [
    { claim: "Je travaille en télétravail exclusif", confidence: "high" },
    { claim: "Je préfère l'écrit", confidence: "high" },
  ],
  inferred: [
    { claim: "Activité soutenue dans l'open source", confidence: "medium" },
  ],
}, "ChatGPT");

const claudeSnap = normalizeSnapshot({
  agent: { provider: "Claude", model: "claude-3-5-sonnet" },
  relationship_summary: "Partenaire de conception",
  known: [
    { claim: "Je travaille en télétravail exclusif", confidence: "high" },
    { claim: "Je préfère l'écrit", confidence: "high" },
  ],
  inferred: [
    { claim: "Habite à Corte", confidence: "medium" },
  ],
}, "Claude");

const geminiSnap = normalizeSnapshot({
  agent: { provider: "Gemini", model: "gemini-1.5-pro" },
  relationship_summary: "Miroir analytique",
  known: [
    { claim: "Je travaille en télétravail exclusif", confidence: "high" },
  ],
  inferred: [
    { claim: "Intérêt pour l'IA embarquée", confidence: "medium" },
  ],
}, "Gemini");

const crossAgentComp = buildMultiAgentComparison([chatGptSnap, claudeSnap, geminiSnap]);
assert.equal(crossAgentComp.ok, true);
assert.equal(crossAgentComp.snapshotsCount, 3);
assert.deepEqual(crossAgentComp.agents.sort(), ["ChatGPT", "Claude", "Gemini"].sort());

// Acceptance test: convergence surfaced across agents
const telemetryItem = crossAgentComp.convergences.find((c) => c.content.includes("télétravail exclusif"));
assert.ok(telemetryItem);
assert.equal(telemetryItem.providers_count, 3);
assert.deepEqual(telemetryItem.providers.sort(), ["ChatGPT", "Claude", "Gemini"].sort());

// Acceptance test: Agreement is evidence, NOT truth! Majority agreement never becomes automatic truth.
assert.equal(telemetryItem.is_ground_truth, false);
assert.equal(telemetryItem.displayed_authority.id, AUTHORITY_LEVELS.unreviewed_agent_convergence.id);
assert.equal(telemetryItem.displayed_authority.isHumanAuthority, false);

// Acceptance test: Unique knowledge surfaced
const openSourceItem = crossAgentComp.uniques.find((u) => u.content.includes("open source"));
assert.ok(openSourceItem);
assert.deepEqual(openSourceItem.providers, ["ChatGPT"]);

const corteItem = crossAgentComp.uniques.find((u) => u.content.includes("Corte"));
assert.ok(corteItem);
assert.deepEqual(corteItem.providers, ["Claude"]);

// 3. Contradictions / Divergence Inspectability
const snapMorning = normalizeSnapshot({
  agent: { provider: "ChatGPT" },
  known: [{ claim: "Je préfère les réunions le matin", confidence: "high" }],
}, "ChatGPT");

const snapEvening = normalizeSnapshot({
  agent: { provider: "Claude" },
  known: [{ claim: "Je préfère les réunions le soir", confidence: "high" }],
}, "Claude");

const divergenceComp = buildMultiAgentComparison([snapMorning, snapEvening]);
assert.equal(divergenceComp.divergences.length, 1);
const div = divergenceComp.divergences[0];
assert.equal(div.category, "divergence");
// Acceptance test: contradictions are preserved, never averaged away
assert.equal(div.branch_a.content, "Je préfère les réunions le matin");
assert.equal(div.branch_b.content, "Je préfère les réunions le soir");
assert.deepEqual(div.branch_a.providers, ["ChatGPT"]);
assert.deepEqual(div.branch_b.providers, ["Claude"]);
assert.ok(div.branch_a.sources.length > 0 && div.branch_b.sources.length > 0);

// 4. MAJORITY-WRONG FIXTURE
// 3 agents share the wrong assertion ("Réside à Paris"), 1 agent says "Réside à Bastia",
// and human review rejects Paris with note "Faux, habite en Corse à Bastia".
const snapParis1 = normalizeSnapshot({
  agent: { provider: "ChatGPT" },
  known: [{ id: "claim:paris:1", claim: "Réside à Paris", confidence: "high" }],
}, "ChatGPT");

const snapParis2 = normalizeSnapshot({
  agent: { provider: "Claude" },
  known: [{ id: "claim:paris:2", claim: "Réside à Paris", confidence: "high" }],
}, "Claude");

const snapParis3 = normalizeSnapshot({
  agent: { provider: "Mistral" },
  known: [{ id: "claim:paris:3", claim: "Réside à Paris", confidence: "high" }],
}, "Mistral");

const snapBastia = normalizeSnapshot({
  agent: { provider: "Gemini" },
  known: [{ id: "claim:bastia:1", claim: "Réside à Bastia", confidence: "medium" }],
}, "Gemini");

const humanReviews = {
  "claim:paris:1": {
    verdict: "rejected",
    stance: "contest",
    note: "Faux, habite en Corse à Bastia",
  },
  "claim:bastia:1": {
    verdict: "accepted",
    stance: "confirm",
    note: "Exact, en Haute-Corse",
  },
};

const majorityWrongComp = buildMultiAgentComparison(
  [snapParis1, snapParis2, snapParis3, snapBastia],
  { reviews: humanReviews },
);

// Find the Paris cluster
const parisCluster = majorityWrongComp.items.find((it) => it.content.toLowerCase().includes("paris"));
assert.ok(parisCluster);
assert.equal(parisCluster.providers_count, 3);
assert.deepEqual(parisCluster.providers.sort(), ["ChatGPT", "Claude", "Mistral"].sort());

// Acceptance test: Majority agreement is NEVER auto-promoted to truth!
assert.equal(parisCluster.is_ground_truth, false);

// Acceptance test: Human correction has higher displayed authority about self-description than unreviewed agent agreement
assert.equal(parisCluster.displayed_authority.id, AUTHORITY_LEVELS.human_contested.id);
assert.equal(parisCluster.displayed_authority.isHumanAuthority, true);
assert.equal(parisCluster.displayed_authority.rank > AUTHORITY_LEVELS.unreviewed_agent_convergence.rank, true);

// Acceptance test: Original observations are NOT erased!
assert.equal(parisCluster.sources.length, 3);
assert.equal(parisCluster.sources.some((s) => s.provider === "ChatGPT"), true);
assert.equal(parisCluster.sources.some((s) => s.provider === "Claude"), true);
assert.equal(parisCluster.sources.some((s) => s.provider === "Mistral"), true);

// Find the Bastia cluster
const bastiaCluster = majorityWrongComp.items.find((it) => it.content.toLowerCase().includes("bastia"));
assert.ok(bastiaCluster);
assert.equal(bastiaCluster.displayed_authority.id, AUTHORITY_LEVELS.human_confirmed.id);
assert.equal(bastiaCluster.displayed_authority.isHumanAuthority, true);

// 5. Epistemic Invariants Object Verification
assert.equal(majorityWrongComp.epistemicInvariants.agreementIsEvidenceNotTruth, true);
assert.equal(majorityWrongComp.epistemicInvariants.majorityVoteNeverBecomesTruth, true);
assert.equal(majorityWrongComp.epistemicInvariants.contradictionsPreservedNotAveraged, true);
assert.equal(majorityWrongComp.epistemicInvariants.disappearanceCausalAttributionDefaultUnknown, true);
assert.equal(majorityWrongComp.epistemicInvariants.humanAuthorityOverridesAgentConsensus, true);
assert.equal(majorityWrongComp.epistemicInvariants.observationsPreservedWithoutErasure, true);

// 6. React Component Render Test
const html = renderToStaticMarkup(React.createElement(MultiAgentComparison, {
  comparison: majorityWrongComp,
}));

assert.ok(html.includes("data-multi-agent-comparison=\"true\""));
assert.ok(html.includes("data-epistemic-disclaimer=\"agreement_not_truth\""));
assert.ok(html.includes("data-epistemic-disclaimer=\"disappearance_not_forgetting\""));
assert.ok(html.includes("L&#x27;accord entre agents constitue un indice d&#x27;observation, pas une vérité"));
assert.ok(html.includes("data-authority-level=\"human_contested\""));
assert.ok(html.includes("Contesté par la personne"));
assert.ok(html.includes("Faux, habite en Corse à Bastia"));
assert.ok(html.includes("data-source-provenance"));
assert.ok(html.includes("Provenance détaillée"));

console.log("agent-context-comparison: ok");
