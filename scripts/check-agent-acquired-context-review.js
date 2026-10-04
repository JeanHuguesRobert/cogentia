#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import React from "../apps/personal/node_modules/react/index.js";
import { renderToStaticMarkup } from "../apps/personal/node_modules/react-dom/server.js";
import {
  REVIEW_VERDICTS,
  VERDICT_TO_STANCE,
  createItemReview,
  isSalientItem,
  reviewToAnnotation,
  salienceReasons,
  stanceToVerdict,
  verdictToStance,
} from "./lib/agent-acquired-context-review.js";
import { buildAgentAcquiredContextMirror } from "./lib/agent-acquired-context-mirror.js";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { validateAgentAcquiredContext } from "./lib/agent-acquired-context.js";
import { AgentClaimMirror } from "../apps/personal/src/components/AgentClaimMirror.js";
import { emptyLog, forwardIntent, recordParsedResponse, updateTurnReview } from "../apps/personal/src/lib/turns.js";
import { normalizeSnapshot } from "../apps/personal/src/lib/kys-snapshot.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = path.join(root, "prompts", "fixtures", "agent-acquired-context");

function readFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

// 1. Vocabulary reconciliation & stance mappings
assert.equal(verdictToStance("accepted"), "confirm");
assert.equal(verdictToStance("exact"), "confirm");
assert.equal(verdictToStance("nuanced"), "nuance");
assert.equal(verdictToStance("rejected"), "contest");
assert.equal(verdictToStance("false"), "contest");
assert.equal(verdictToStance("obsolete"), "obsolete");
assert.equal(verdictToStance("private"), "restrict");
assert.equal(verdictToStance("restrict-use"), "restrict");
assert.equal(verdictToStance("unknown"), "unknown");

assert.equal(stanceToVerdict("confirm"), "accepted");
assert.equal(stanceToVerdict("nuance"), "nuanced");
assert.equal(stanceToVerdict("contest"), "rejected");
assert.equal(stanceToVerdict("obsolete"), "obsolete");
assert.equal(stanceToVerdict("restrict"), "private");
assert.equal(stanceToVerdict("unknown"), "unknown");

assert.equal(REVIEW_VERDICTS.length, 6);
const verdictIds = REVIEW_VERDICTS.map((v) => v.id);
assert.deepEqual(verdictIds, ["accepted", "nuanced", "rejected", "obsolete", "private", "unknown"]);

// 2. Smallest compatible review record referencing a snapshot item
const sampleReview = createItemReview({
  captureId: "capture:example-rich-001",
  itemId: "item:morning-meetings",
  verdict: "accepted",
  note: "Toujours d'actualité en semaine.",
  annotatedAt: "2026-10-04T12:00:00.000Z",
});
assert.deepEqual(sampleReview.target, {
  capture_id: "capture:example-rich-001",
  item_id: "item:morning-meetings",
});
assert.equal(sampleReview.stance, "confirm");
assert.equal(sampleReview.verdict, "accepted");
assert.equal(sampleReview.note, "Toujours d'actualité en semaine.");

// Convert review to canonical agent_acquired_context_annotation and validate against schema
const annotation = reviewToAnnotation(sampleReview);
assert.equal(annotation.schema_version, "cogentia.agent-acquired-context.v0");
assert.equal(annotation.kind, "agent_acquired_context_annotation");
assert.equal(annotation.layer, "human_annotation");
assert.equal(annotation.claim_status, "human_annotation_not_a_rewrite");
assert.deepEqual(annotation.target, sampleReview.target);
assert.equal(annotation.stance, "confirm");
const validationReport = validateAgentAcquiredContext(annotation);
assert.equal(validationReport.ok, true, validationReport.errors?.join("; "));

// 3. Immutability of original snapshot capture when reviews are added/edited
const richYaml = readFixture("rich-memory.yaml");
const ingestion = ingestAgentAcquiredContext(richYaml);
assert.equal(ingestion.ok, true);

// Deep snapshot of original capture state
const originalNormalizedJson = JSON.stringify(ingestion.normalized);
const originalRawSha = ingestion.raw.sha256;
const originalRawText = ingestion.raw.text;
const originalItemCount = ingestion.normalized.items.length;

// Model construction
const model = buildAgentAcquiredContextMirror(ingestion);
const originalModelCategoriesJson = JSON.stringify(model.categories);

// Apply several review operations
let reviews = {};
const rev1 = createItemReview({
  captureId: ingestion.normalized.capture_id,
  itemId: "item:morning-meetings",
  verdict: "accepted",
});
reviews["item:morning-meetings"] = rev1;

const rev2 = createItemReview({
  captureId: ingestion.normalized.capture_id,
  itemId: "item:captain",
  verdict: "nuanced",
  note: "Seulement dans le cadre des simulations.",
});
reviews["item:captain"] = rev2;

const rev3 = createItemReview({
  captureId: ingestion.normalized.capture_id,
  itemId: "item:office",
  verdict: "rejected",
  note: "Travail à distance uniquement.",
});
reviews["item:office"] = rev3;

const rev4 = createItemReview({
  captureId: ingestion.normalized.capture_id,
  itemId: "item:workshop",
  verdict: "obsolete",
  note: "Le projet d'atelier s'est terminé en 2024.",
});
reviews["item:workshop"] = rev4;

const rev5 = createItemReview({
  captureId: ingestion.normalized.capture_id,
  itemId: "item:remote",
  verdict: "private",
  note: "Ne pas réutiliser cette information.",
});
reviews["item:remote"] = rev5;

// Verify original capture has NOT mutated
assert.equal(JSON.stringify(ingestion.normalized), originalNormalizedJson, "Ingestion normalized items must not mutate");
assert.equal(ingestion.raw.sha256, originalRawSha, "Raw sha256 must remain identical");
assert.equal(ingestion.raw.text, originalRawText, "Raw response text must remain identical");
assert.equal(ingestion.normalized.items.length, originalItemCount, "Item count must not change");
assert.equal(JSON.stringify(model.categories), originalModelCategoriesJson, "Mirror model categories must not mutate");

// 4. Person can express nuance with precision notes
assert.equal(reviews["item:captain"].stance, "nuance");
assert.equal(reviews["item:captain"].note, "Seulement dans le cadre des simulations.");
const nuanceAnnotation = reviewToAnnotation(reviews["item:captain"]);
assert.equal(nuanceAnnotation.stance, "nuance");
assert.equal(nuanceAnnotation.note, "Seulement dans le cadre des simulations.");
assert.equal(validateAgentAcquiredContext(nuanceAnnotation).ok, true);

// 5. Person can mark an item obsolete or restrict future use
assert.equal(reviews["item:workshop"].stance, "obsolete");
const obsoleteAnnotation = reviewToAnnotation(reviews["item:workshop"]);
assert.equal(obsoleteAnnotation.stance, "obsolete");
assert.equal(validateAgentAcquiredContext(obsoleteAnnotation).ok, true);

assert.equal(reviews["item:remote"].stance, "restrict");
const restrictAnnotation = reviewToAnnotation(reviews["item:remote"]);
assert.equal(restrictAnnotation.stance, "restrict");
assert.equal(validateAgentAcquiredContext(restrictAnnotation).ok, true);

// 6. Leaving all items unreviewed remains a valid completion path
const emptyReviews = {};
let turnLog = emptyLog("2026-10-04T12:00:00.000Z");
const kysPortrait = normalizeSnapshot({
  relationship_summary: "Résumé relation",
  known: [{ claim: "Affirmation A", confidence: "high" }],
  inferred: [{ claim: "Affirmation B", confidence: "low" }],
}, "Claude");

turnLog = recordParsedResponse(turnLog, 1, {
  text: '{"known":["Affirmation A"]}',
  pastedAt: "2026-10-04T12:01:00.000Z",
  agentStamp: null,
  snapshot: kysPortrait,
  keepReviews: false,
  advance: true,
});
assert.equal(Object.keys(turnLog.turns[0].reviews).length, 0, "No reviews required");
assert.equal(turnLog.cursor.step, 3);
// Forward intent works without error even with 0 reviews
const intent = forwardIntent(turnLog);
assert.notEqual(intent.kind, "error");

// 7. Salience prioritization: contradictions, sensitive items, high-impact uncertainty
const uncertainHeavy = ingestAgentAcquiredContext(readFixture("uncertainty-heavy.yaml"));
assert.equal(uncertainHeavy.ok, true);
const uncertainModel = buildAgentAcquiredContextMirror(uncertainHeavy);
const uncertainItems = uncertainModel.categories.flatMap((cat) => cat.items);

const salientList = uncertainItems.filter(isSalientItem);
assert.ok(salientList.length > 0, "Should detect salient items");

for (const item of salientList) {
  const reasons = salienceReasons(item);
  assert.ok(reasons.length > 0, "Salient items must have at least one salience reason");
}

// 8. UI separation: Agent assertions distinct from person's review
function renderMirror(m, revs = {}, onRev = () => {}) {
  return renderToStaticMarkup(React.createElement(AgentClaimMirror, {
    model: m,
    reviews: revs,
    onReview: onRev,
  }));
}

const renderedWithReviews = renderMirror(model, reviews);

// Explicit UI assertions
assert.equal(renderedWithReviews.includes("data-agent-assertion=\"item:morning-meetings\""), true);
assert.equal(renderedWithReviews.includes("data-human-review=\"item:morning-meetings\""), true);
assert.equal(renderedWithReviews.includes("data-user-review=\"accepted\""), true);
assert.equal(renderedWithReviews.includes("data-user-review=\"nuanced\""), true);
assert.equal(renderedWithReviews.includes("data-user-review=\"rejected\""), true);
assert.equal(renderedWithReviews.includes("data-user-review=\"obsolete\""), true);
assert.equal(renderedWithReviews.includes("data-user-review=\"private\""), true);
assert.equal(renderedWithReviews.includes("data-review-stance=\"confirm\""), true);
assert.equal(renderedWithReviews.includes("data-review-stance=\"nuance\""), true);
assert.equal(renderedWithReviews.includes("data-review-stance=\"obsolete\""), true);
assert.equal(renderedWithReviews.includes("data-review-stance=\"restrict\""), true);
assert.equal(renderedWithReviews.includes("data-verdict-button=\"obsolete\""), true);
assert.equal(renderedWithReviews.includes("data-verdict-button=\"unknown\""), true);
assert.equal(renderedWithReviews.includes("data-salience-banner=\"true\""), true);
assert.ok(renderedWithReviews.includes("prioritaires"));
assert.equal(renderedWithReviews.includes("Périmé / obsolète"), true);
assert.equal(renderedWithReviews.includes("Ne pas conserver"), true);

// Verify unreviewed rendering
const renderedEmpty = renderMirror(model, emptyReviews);
assert.equal(renderedEmpty.includes("data-user-review=\"unreviewed\""), true);
assert.equal(renderedEmpty.includes("Non examiné (optionnel)"), true);

console.log("agent-acquired-context review: ok");
