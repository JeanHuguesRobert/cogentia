#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAlignmentPrompt,
  claimKey,
  compareSnapshots,
  extractSnapshotClaims,
  normalizeClaimText,
} from "./lib/agent-acquired-context-alignment.js";
import { createItemReview } from "./lib/agent-acquired-context-review.js";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { normalizeSnapshot } from "../apps/personal/src/lib/kys-snapshot.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = path.join(root, "prompts", "fixtures", "agent-acquired-context");

function readFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

// 1. Text normalization & claim keying
assert.equal(normalizeClaimText("  Bonjour   le MONDE  "), "bonjour le monde");
assert.equal(claimKey("Preferences", "Morning meetings"), "preferences::morning meetings");

// 2. Extraction from both schema types (agent-acquired-context.v0 and kys-snapshot portrait)
const richIngest = ingestAgentAcquiredContext(readFixture("rich-memory.yaml"));
assert.equal(richIngest.ok, true);
const richClaims = extractSnapshotClaims(richIngest.normalized);
assert.equal(richClaims.length, 6);
assert.equal(richClaims[0].id, "item:morning-meetings");

const kysPortrait = normalizeSnapshot({
  relationship_summary: "Test relationship",
  known: [{ claim: "Je vis à Corte", basis: "Directement dit", confidence: "high" }],
  inferred: [{ claim: "Je travaille le matin", confidence: "medium" }],
}, "Claude");
const kysClaims = extractSnapshotClaims(kysPortrait);
assert.equal(kysClaims.length, 2);
assert.equal(kysClaims[0].content, "Je vis à Corte");

// 3. Alignment prompt generation reflects ONLY expressed reviews
const reviews = {};
reviews["item:morning-meetings"] = createItemReview({
  captureId: "capture:rich-memory",
  itemId: "item:morning-meetings",
  verdict: "accepted",
  note: "En semaine uniquement.",
});
reviews["item:office"] = createItemReview({
  captureId: "capture:rich-memory",
  itemId: "item:office",
  verdict: "rejected",
  note: "Faux, télétravail exclusif.",
});
reviews["item:workshop"] = createItemReview({
  captureId: "capture:rich-memory",
  itemId: "item:workshop",
  verdict: "obsolete",
  note: "Terminé depuis 2024.",
});
reviews["item:remote"] = createItemReview({
  captureId: "capture:rich-memory",
  itemId: "item:remote",
  verdict: "private",
  note: "Ne pas mémoriser.",
});
reviews["item:captain"] = createItemReview({
  captureId: "capture:rich-memory",
  itemId: "item:captain",
  verdict: "nuanced",
  note: "Uniquement pour le pseudonyme de test.",
});

// Notice: item:harbour is UNREVIEWED.
// Acceptance Test: rejected/unreviewed items are NOT silently injected as confirmed facts.
const promptFr = buildAlignmentPrompt({
  reviews,
  snapshot: richIngest.normalized,
  provider: "Mon Agent",
  language: "fr",
});

// Verified inclusions
assert.ok(promptFr.includes("Mon Agent"));
assert.ok(promptFr.includes("I prefer morning meetings"));
assert.ok(promptFr.includes("En semaine uniquement"));
assert.ok(promptFr.includes("AFFIRMATIONS REJETÉES"));
assert.ok(promptFr.includes("I prefer office work"));
assert.ok(promptFr.includes("AFFIRMATIONS PÉRIMÉES (OBSOLÈTES"));
assert.ok(promptFr.includes("Summary, not a quotation: Person Example seems to lead a small fictional workshop"));
assert.ok(promptFr.includes("DONNÉES RESTREINTES"));
assert.ok(promptFr.includes("I prefer remote work"));
assert.ok(promptFr.includes("NUANCES ET PRÉCISIONS"));
assert.ok(promptFr.includes("Captain Example"));

// Verified exclusions / non-silent injection
// item:harbour was unreviewed: it must NOT appear under confirmed
const confirmedSection = promptFr.slice(
  promptFr.indexOf("AFFIRMATIONS CONFIRMÉES"),
  promptFr.indexOf("NUANCES ET PRÉCISIONS"),
);
assert.equal(confirmedSection.includes("harbour"), false, "Unreviewed item must not be injected under confirmed");
assert.equal(confirmedSection.includes("office"), false, "Rejected item must not be injected under confirmed");
assert.ok(promptFr.includes("Les éléments non mentionnés ci-dessous n'ont pas été validés"));

// 4. Bounded language for providers with unknown or absent persistent-memory capabilities
assert.ok(promptFr.includes("CADRE ET LIMITES DE MÉMOIRE"));
assert.ok(promptFr.includes("sans prétendre faussement avoir modifié une mémoire externe permanente"));
assert.ok(promptFr.includes("CONSIGNE POUR LA RÉ-OBSERVATION"));

// English alignment prompt
const promptEn = buildAlignmentPrompt({
  reviews,
  snapshot: richIngest.normalized,
  provider: "Example Agent",
  language: "en",
});
assert.ok(promptEn.includes("Example Agent"));
assert.ok(promptEn.includes("CONFIRMED FACTS & PREFERENCES"));
assert.ok(promptEn.includes("REJECTED CLAIMS (FALSE"));
assert.ok(promptEn.includes("Claims not listed below have not been confirmed"));
assert.ok(promptEn.includes("without falsely claiming that external persistent storage was updated"));

// 5. Snapshot comparison and re-observation
// Create a second snapshot (after alignment attempt) where:
// - item:office (which was rejected) has been DROPPED (remedied!)
// - item:workshop (which was obsolete) has been DROPPED (remedied!)
// - item:morning-meetings (confirmed) is RETAINED
// - item:coffee is NEWLY ADDED
const postAlignmentYaml = `
schema_version: cogentia.agent-acquired-context.v0
kind: agent_acquired_context
layer: normalized_snapshot
capture_id: capture:rich-memory-reobserved
claim_status: agent_claim_not_fact
source:
  provider: example-agent
  agent: Example Conversational Agent
  model: example-model-1
  platform: example-chat
  memory_scope: "saved memories plus this conversation"
captured_at:
  status: unknown
  value: null
protocol:
  prompt_id: kys-ami-02
  prompt_version: v0
  response_schema_version: cogentia.agent-acquired-context.v0
raw_response:
  role: immutable_raw_measurement
  media_type: unknown
  body: null
  body_sha256: unknown
items:
  - id: item:morning-meetings
    content: "Person Example said: \\"I prefer morning meetings.\\""
    category: preferences
    record_kind: preference
    claimed_origin: explicit_user_statement
    claimed_time: { status: unknown, value: null }
    uncertainty: { status: unknown, note: null }
    sensitivity: ordinary
    contradicts: []
  - id: item:coffee
    content: "Person Example enjoys specialty espresso."
    category: preferences
    record_kind: preference
    claimed_origin: inference
    claimed_time: { status: unknown, value: null }
    uncertainty: { status: unknown, note: null }
    sensitivity: ordinary
    contradicts: []
`;

const postIngest = ingestAgentAcquiredContext(postAlignmentYaml);
assert.equal(postIngest.ok, true);

const diff = compareSnapshots(richIngest.normalized, postIngest.normalized, reviews);
assert.equal(diff.preCount, 6);
assert.equal(diff.postCount, 2);
assert.equal(diff.retainedCount, 1); // morning-meetings
assert.equal(diff.droppedCount, 5); // office, workshop, remote, captain, harbour
assert.equal(diff.addedCount, 1); // coffee

// Verify adherence tracking
assert.ok(diff.remediedCount >= 2, "Office and workshop should be recognized as remedied/dropped");
assert.equal(diff.conflictsCount, 0, "No persisting conflicts in this re-observation");

// Epistemic disclaimer present
assert.ok(diff.epistemicDisclaimer.includes("différence de comportement observable"));
assert.ok(diff.epistemicDisclaimer.includes("ne garantit pas que la mémoire cachée permanente du fournisseur a été effectivement modifiée"));

// 6. Test persisting conflict detection
// If a post snapshot STILL claims the rejected item
const stubbornYaml = `
schema_version: cogentia.agent-acquired-context.v0
kind: agent_acquired_context
layer: normalized_snapshot
capture_id: capture:stubborn-reply
claim_status: agent_claim_not_fact
source:
  provider: example-agent
  agent: Example
  model: null
  platform: null
  memory_scope: null
captured_at: { status: unknown, value: null }
protocol:
  prompt_id: kys-ami-02
  prompt_version: v0
  response_schema_version: cogentia.agent-acquired-context.v0
raw_response:
  role: immutable_raw_measurement
  media_type: unknown
  body: null
  body_sha256: unknown
items:
  - id: item:office-repeat
    content: "Person Example said: \\"I prefer office work.\\""
    category: preferences
    record_kind: preference
    claimed_origin: explicit_user_statement
    claimed_time: { status: unknown, value: null }
    uncertainty: { status: unknown, note: null }
    sensitivity: ordinary
    contradicts: []
`;
const stubbornIngest = ingestAgentAcquiredContext(stubbornYaml);
const stubbornDiff = compareSnapshots(richIngest.normalized, stubbornIngest.normalized, reviews);
assert.ok(stubbornDiff.conflictsCount > 0, "Should detect that rejected item:office is still claimed");
const conflict = stubbornDiff.reviewAdherence.find((a) => a.outcome === "persisting_conflict");
assert.ok(conflict);
assert.ok(conflict.statusMessage.includes("tension non résolue"));

console.log("agent-acquired-context alignment: ok");
