#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "../apps/personal/node_modules/react/index.js";
import { renderToStaticMarkup } from "../apps/personal/node_modules/react-dom/server.js";
import {
  EPISTEMIC_LAYERS,
  KNOWN_TRANSPARENCY_GAPS,
  inspectCogentiaSelfModel,
} from "./lib/cogentia-introspection.js";
import { CogentiaIntrospectionPanel } from "../apps/personal/src/components/CogentiaIntrospectionPanel.js";
import { normalizeSnapshot } from "../apps/personal/src/lib/kys-snapshot.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1. Setup mock turnLog and preferences
const mockTurnLog = {
  cursor: { turn: 1, step: 3 },
  turns: [
    {
      number: 1,
      provider: "Claude",
      prompt: {
        role: "initial",
        text: "Tu es Claude. Produis un instantané KYS...",
        produced_at: "2026-10-04T12:00:00Z",
      },
      response: {
        text: '{"snapshot_version":"kys-snapshot-0.1","known":[{"id":"item-1","claim":"Je vis à Paris","confidence":"high"}]}',
        pasted_at: "2026-10-04T12:05:00Z",
        parsed_text: '{"snapshot_version":"kys-snapshot-0.1","known":[{"id":"item-1","claim":"Je vis à Paris","confidence":"high"}]}',
      },
      snapshot: normalizeSnapshot({
        relationship_summary: "Partenaire de test",
        known: [
          { id: "item-1", claim: "Je vis à Paris", basis: "Directement dit", confidence: "high" },
          { id: "item-2", claim: "Je code en JavaScript", basis: "Historique", confidence: "high" },
        ],
        inferred: [
          { id: "item-3", claim: "Sensible aux données privées", confidence: "low" },
        ],
      }, "Claude"),
      reviews: {
        "item-1": {
          verdict: "rejected",
          stance: "contest",
          note: "Faux, habite en Corse",
          annotated_at: "2026-10-04T12:10:00Z",
        },
        "item-2": {
          verdict: "accepted",
          stance: "confirm",
          note: "Exact",
          annotated_at: "2026-10-04T12:11:00Z",
        },
      },
    },
  ],
};

const mockPreferences = {
  statedIntention: "feedback",
  contactEmail: "test@example.com",
  disableLocalPersistence: false,
  updatedAt: "2026-10-04T12:12:00Z",
};

// 2. Acceptance Test 1: Person can answer: What do you know, why do you think it, and what are you using now?
const model = inspectCogentiaSelfModel({
  turnLog: mockTurnLog,
  preferences: mockPreferences,
});

assert.equal(model.ok, true);

// What do you know? (All 5 layers present)
assert.ok(model.knows.source_data.length >= 2); // Prompt + Raw response
assert.ok(model.knows.explicit_self_description.length >= 3); // 2 reviews + stated intention + email
assert.ok(model.knows.external_agent_assertion.length >= 3); // 3 claims from Claude
assert.ok(model.knows.cogentia_inference.length >= 2); // Relationship state + salience / alignment
assert.ok(model.knows.current_working_context);

// Why do you think it?
assert.ok(model.why_cogentia_thinks_it.length >= 3);
assert.ok(model.why_cogentia_thinks_it.some((item) => item.topic.includes("Modèle de la personne")));
assert.ok(model.why_cogentia_thinks_it.some((item) => item.topic.includes("Priorité de l'autorité")));

// What are you using now?
assert.equal(model.what_is_being_used_now.active_turn, 1);
assert.equal(model.what_is_being_used_now.active_step, 3);
assert.equal(model.what_is_being_used_now.active_provider, "Claude");
assert.equal(model.what_is_being_used_now.has_active_snapshot, true);

// 3. Acceptance Test 2: External-agent and Cogentia assertions are NOT conflated
const externalClaims = model.knows.external_agent_assertion;
const inferences = model.knows.cogentia_inference;

// External items must all be attributed to external providers (Claude)
for (const ext of externalClaims) {
  assert.equal(ext.layer, "external_agent_assertion");
  assert.equal(ext.provider, "Claude");
  assert.equal(ext.kind, undefined); // Inferences have 'kind', external assertions don't
}

// Inferences must be attributed to Cogentia rules
for (const inf of inferences) {
  assert.equal(inf.layer, "cogentia_inference");
  assert.ok(inf.derivation_rule);
  assert.ok(inf.derived_from);
}

// 4. Acceptance Test 3: Person can correct/restrict supported retained representations
assert.equal(model.governance_affordances.can_correct, true);
assert.equal(model.governance_affordances.can_restrict, true);
assert.equal(model.governance_affordances.can_export, true);
assert.equal(model.governance_affordances.can_purge, true);
assert.ok(model.governance_affordances.actions.some((a) => a.id === "correct"));
assert.ok(model.governance_affordances.actions.some((a) => a.id === "restrict"));
assert.ok(model.governance_affordances.actions.some((a) => a.id === "purge"));

// 5. Acceptance Test 4: Historical provenance survives correction
// item-1 was reviewed as 'rejected' ("Faux, habite en Corse")
const contestedItem = externalClaims.find((c) => c.content.includes("Paris"));
assert.ok(contestedItem);
assert.equal(contestedItem.is_contested_or_obsolete, true);
assert.equal(contestedItem.active_in_current_truth, false); // No longer presented as current truth!
assert.equal(contestedItem.historical_observation_preserved, true); // Still preserved as an observation artifact!
assert.ok(contestedItem.historical_provenance.includes("Claude"));
assert.equal(contestedItem.human_review.note, "Faux, habite en Corse");

// item-2 was reviewed as 'accepted'
const confirmedItem = externalClaims.find((c) => c.content.includes("JavaScript"));
assert.ok(confirmedItem);
assert.equal(confirmedItem.is_contested_or_obsolete, false);
assert.equal(confirmedItem.active_in_current_truth, true);

// 6. Acceptance Test 5: Known transparency gaps are explicit rather than hidden
assert.ok(model.known_transparency_gaps.length >= 3);
const gapIds = model.known_transparency_gaps.map((g) => g.id);
assert.ok(gapIds.includes("browser_runtime_allocator"));
assert.ok(gapIds.includes("external_model_weights_and_cot"));
assert.ok(gapIds.includes("virtual_dom_reconciliation"));
for (const gap of model.known_transparency_gaps) {
  assert.ok(gap.explanation.length > 20);
  assert.ok(gap.area);
  assert.ok(gap.status);
}

// 7. React Component Render Test
const html = renderToStaticMarkup(React.createElement(CogentiaIntrospectionPanel, {
  model,
  onExport() {},
  onPurge() {},
}));

assert.ok(html.includes("data-cogentia-introspection=\"true\""));
assert.ok(html.includes("data-symmetric-doctrine=\"true\""));
assert.ok(html.includes("data-layer-box=\"source_data\""));
assert.ok(html.includes("data-layer-box=\"explicit_self_description\""));
assert.ok(html.includes("data-layer-box=\"external_agent_assertion\""));
assert.ok(html.includes("data-layer-box=\"cogentia_inference\""));
assert.ok(html.includes("data-historical-archive=\"true\""));
assert.ok(html.includes("data-action=\"export-introspection\""));
assert.ok(html.includes("data-action=\"purge-introspection\""));

console.log("cogentia-introspection: ok");
