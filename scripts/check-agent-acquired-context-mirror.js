#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "../apps/personal/node_modules/react/index.js";
import { renderToStaticMarkup } from "../apps/personal/node_modules/react-dom/server.js";
import * as yaml from "js-yaml";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { sha256Prefixed } from "./lib/agent-acquired-context.js";
import { buildAgentAcquiredContextMirror } from "./lib/agent-acquired-context-mirror.js";
import { ingestLearnedContext, mirrorLearnedContext } from "../apps/personal/src/lib/learned-context-ingest.js";
import {
  AgentClaimMirror,
  LearnedContextPasteForm,
  immediatePasteText,
} from "../apps/personal/src/components/AgentClaimMirror.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "prompts", "fixtures", "agent-acquired-context");

function read(name) {
  return fs.readFileSync(path.join(fixtureDir, name), "utf8");
}

function renderMirror(model) {
  return renderToStaticMarkup(React.createElement(AgentClaimMirror, { model }));
}

function renderForm(mirror) {
  return renderToStaticMarkup(React.createElement(LearnedContextPasteForm, {
    text: "",
    onText() {},
    onReveal() {},
    onPaste() {},
    mirror,
    pending: false,
    failure: null,
  }));
}

function assertNoAccountGate(html) {
  assert.equal(html.includes("type=\"email\""), false);
  assert.equal(html.includes("/auth"), false);
  assert.equal(html.toLowerCase().includes("créer un compte"), false);
  assert.equal(html.toLowerCase().includes("s'inscrire"), false);
}

function assertClaimBanner(html) {
  assert.equal(html.includes("data-claim-banner=\"agent_claim_not_fact\""), true);
  assert.equal(html.includes("pas une vérité objective"), true);
  assertNoAccountGate(html);
}

function assertClosedDetails(html) {
  assert.equal(html.includes("<details"), true);
  assert.equal(html.includes("<details open"), false);
}

const browserFiles = [
  "apps/personal/src/lib/learned-context-ingest.js",
  "apps/personal/src/components/AgentClaimMirror.js",
  "apps/personal/src/components/AssistedContact.js",
  "apps/personal/src/components/ContinuityPanel.js",
  "apps/personal/src/components/MultiAgentComparison.js",
  "apps/personal/src/pages/LearnedContextMirror.jsx",
  "scripts/lib/agent-acquired-context-mirror.js",
  "scripts/lib/agent-acquired-context-review.js",
  "scripts/lib/agent-acquired-context-alignment.js",
  "scripts/lib/agent-context-comparison.js",
  "scripts/lib/assisted-contact-intent.js",
  "scripts/lib/progressive-enrolment.js",
  "scripts/lib/kys-snapshot-mirror.js",
];
for (const relative of browserFiles) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  for (const forbidden of ["supabase", "localStorage", "writeFile", "fetch(", "node:fs", "node:crypto"]) {
    assert.equal(source.includes(forbidden), false, `${relative} mentions ${forbidden}`);
  }
}

const browserIngest = fs.readFileSync(path.join(root, "apps/personal/src/lib/learned-context-ingest.js"), "utf8");
assert.equal(browserIngest.includes("agent-acquired-context.js\""), false);
assert.equal(browserIngest.includes("agent-acquired-context-ingest.js\""), false);

const app = fs.readFileSync(path.join(root, "apps/personal/src/App.jsx"), "utf8");
const links = app.slice(app.indexOf("const links"), app.indexOf("return"));
assert.equal(links.includes("/mirror"), true);
assert.equal(links.includes("/auth"), false);
assert.equal(app.includes("path=\"/mirror\""), true);
const home = fs.readFileSync(path.join(root, "apps/personal/src/pages/Home.jsx"), "utf8");
assert.equal(home.includes("to=\"/mirror\""), true);
assert.equal(home.includes("to=\"/snapshot\""), true);
const supabaseClient = fs.readFileSync(path.join(root, "apps/personal/src/supabaseClient.js"), "utf8");
const authContext = fs.readFileSync(path.join(root, "apps/personal/src/context/AuthContext.jsx"), "utf8");
assert.equal(supabaseClient.includes("throw new Error"), false);
assert.equal(supabaseClient.includes("createClient(url, key) : null"), true);
assert.equal(authContext.includes("if (!supabase) return undefined"), true);

assert.equal(immediatePasteText("", "one reply"), "one reply");
assert.equal(immediatePasteText("   ", "one reply"), "one reply");
assert.equal(immediatePasteText("already there", "one reply"), null);
assert.equal(immediatePasteText("", "   "), null);

const emptyShell = renderForm(null);
assert.equal(emptyShell.includes("Afficher le miroir"), true);
assert.equal(emptyShell.includes("Sans compte"), true);
assert.equal(emptyShell.includes("data-mirror="), false);
assert.equal(emptyShell.includes("data-paste-form=\"learned-context\""), true);
assertNoAccountGate(emptyShell);

async function mirrorOf(name) {
  const text = read(name);
  const nodeResult = ingestAgentAcquiredContext(text);
  const browserResult = await ingestLearnedContext(text);
  assert.equal(browserResult.ok, nodeResult.ok, name);
  assert.equal(browserResult.raw.sha256, nodeResult.raw.sha256, name);
  assert.equal(browserResult.raw.text, text, name);
  assert.deepEqual(browserResult.normalized, nodeResult.normalized, name);
  assert.deepEqual(browserResult.extensions, nodeResult.extensions, name);
  assert.deepEqual(browserResult.diagnostics, nodeResult.diagnostics, name);
  const model = buildAgentAcquiredContextMirror(browserResult);
  assert.equal(Object.hasOwn(model.counts, "new"), false, name);
  return { text, model, html: renderMirror(model) };
}

const rich = await mirrorOf("rich-memory.yaml");
assert.equal(rich.model.ok, true);
assert.equal(rich.model.state, "claims");
assert.equal(rich.model.claim_status, "agent_claim_not_fact");
assert.deepEqual(rich.model.counts, {
  explicit_user_statement: 3,
  inference: 1,
  provider_memory: 1,
  unknown_origin: 1,
  uncertainty_stated: 2,
  contradictions: 2,
});
assert.deepEqual(rich.model.categories.map((category) => category.label), [
  "preferences",
  "career",
  "instructions",
  "identity",
]);
assertClaimBanner(rich.html);
assertClosedDetails(rich.html);
assert.equal(rich.html.includes("data-count=\"inference\""), true);
assert.equal(rich.html.includes("data-count=\"new\""), false);
assert.equal(rich.html.includes("data-origin=\"explicit_user_statement\""), true);
assert.equal(rich.html.includes("data-origin=\"inference\""), true);
assert.equal(rich.html.includes("data-origin=\"provider_memory\""), true);
assert.equal(rich.html.includes("data-origin=\"unknown\""), true);
assert.equal(rich.html.includes("data-absence-note=\"true\""), true);
assert.equal(rich.html.includes("Modèle : example-model-1"), true);
const workshop = rich.html.indexOf("data-item-id=\"item:workshop\"");
const workshopDetails = rich.html.indexOf("data-item-details=\"item:workshop\"");
const workshopNote = rich.html.indexOf("data-uncertainty-note=\"item:workshop\"");
assert.ok(workshop < workshopNote && workshopNote < workshopDetails);
assert.equal(rich.html.slice(workshop, workshopDetails).includes("Sensibilité"), false);
assert.equal(rich.html.slice(workshopDetails, rich.html.indexOf("</details>", workshopDetails)).includes("Sensibilité"), true);
const rawAt = rich.html.indexOf("data-raw-details=\"true\"");
assert.ok(rich.html.indexOf("I prefer morning meetings") < rawAt);
assert.ok(rich.html.slice(rawAt).includes(rich.model.raw.sha256));

const sparse = await mirrorOf("no-persistent-memory.yaml");
assert.equal(sparse.model.state, "claims");
assert.deepEqual(sparse.model.counts, { unknown_origin: 1 });
assert.deepEqual(sparse.model.categories.map((category) => category.label), ["capture-limit"]);
assertClaimBanner(sparse.html);
assert.equal(sparse.html.includes("data-count=\"inference\""), false);
assert.equal(sparse.html.includes("data-count=\"uncertainty_stated\""), false);
assert.equal(sparse.html.includes("data-count=\"explicit_user_statement\""), false);
assert.equal(sparse.html.includes("data-count=\"unknown_origin\""), true);
assert.equal(sparse.html.includes("data-category=\"capture-limit\""), true);
assert.equal(sparse.html.includes("Limite de la capture"), true);
assert.equal(sparse.html.includes("data-absence-note=\"true\""), true);
assert.equal(sparse.html.includes("Modèle non indiqué"), true);

const uncertain = await mirrorOf("uncertainty-heavy.yaml");
assert.equal(uncertain.model.state, "claims");
assert.deepEqual(uncertain.model.counts, {
  explicit_user_statement: 1,
  inference: 3,
  provider_memory: 1,
  unknown_origin: 2,
  uncertainty_stated: 6,
  contradictions: 2,
});
assertClaimBanner(uncertain.html);
assertClosedDetails(uncertain.html);
assert.equal(uncertain.html.includes("data-item-id=\"item:tea\""), true);
assert.equal(uncertain.html.includes("data-origin=\"explicit_user_statement\""), true);
assert.equal(uncertain.html.includes("data-uncertainty=\"unknown\""), true);
assert.equal(uncertain.html.includes("data-item-id=\"item:harbour-town\""), true);
assert.equal(uncertain.html.includes("data-origin=\"inference\""), true);
assert.equal(uncertain.html.includes("data-uncertainty=\"known\""), true);
assert.equal(uncertain.html.includes("data-count=\"uncertainty_stated\""), true);
assert.equal(uncertain.html.includes("data-count=\"new\""), false);
const tea = uncertain.html.indexOf("data-item-id=\"item:tea\"");
const teaDetails = uncertain.html.indexOf("data-item-details=\"item:tea\"");
assert.equal(uncertain.html.slice(tea, teaDetails).includes("data-uncertainty-note"), false);

const shown = renderForm(sparse.model);
assert.ok(shown.indexOf("data-paste-form=\"learned-context\"") < shown.indexOf("data-mirror=\"agent-claims\""));
assert.equal(shown.includes("Afficher le miroir"), true);
assertClaimBanner(shown);
assert.equal(shown.includes("data-category=\"capture-limit\""), true);

const prose = await ingestLearnedContext("This is a note from the agent, not one document.\n");
const proseMirror = buildAgentAcquiredContextMirror(prose);
assert.equal(proseMirror.state, "unreadable");
assert.equal(proseMirror.categories.length, 0);
const proseHtml = renderMirror(proseMirror);
assertClaimBanner(proseHtml);
assert.equal(proseHtml.includes("data-mirror-state=\"unreadable\""), true);
assert.equal(proseHtml.includes("data-absence-note"), false);
assert.equal(proseHtml.includes("data-diagnostics=\"true\""), true);
assert.equal(proseHtml.includes("ne dit pas ce que"), true);

const annotationText = fs.readFileSync(
  path.join(root, "schemas", "fixtures", "agent-acquired-context", "valid", "human-annotation.yaml"),
  "utf8",
);
const annotation = buildAgentAcquiredContextMirror(await ingestLearnedContext(annotationText));
assert.equal(annotation.state, "annotation");
assert.equal(annotation.categories.length, 0);
const annotationHtml = renderMirror(annotation);
assert.equal(annotationHtml.includes("data-mirror-state=\"annotation\""), true);
assert.equal(annotationHtml.includes("data-category="), false);
assert.equal(annotationHtml.includes("annotation humaine"), true);

const withBody = yaml.load(read("no-persistent-memory.yaml"));
withBody.raw_response.body = "exact body\n";
withBody.raw_response.media_type = "text/plain";
withBody.raw_response.body_sha256 = sha256Prefixed(withBody.raw_response.body);
const withBodyText = yaml.dump(withBody);
const withBodyNode = ingestAgentAcquiredContext(withBodyText);
const withBodyBrowser = await ingestLearnedContext(withBodyText);
assert.equal(withBodyNode.ok, true, withBodyNode.diagnostics.join("; "));
assert.equal(withBodyBrowser.ok, true, withBodyBrowser.diagnostics.join("; "));
assert.equal(withBodyBrowser.normalized.raw_response.body_sha256, withBodyNode.normalized.raw_response.body_sha256);
assert.equal(withBodyBrowser.raw.sha256, withBodyNode.raw.sha256);

const extended = buildAgentAcquiredContextMirror({
  ...ingestAgentAcquiredContext(read("rich-memory.yaml")),
  extensions: [{ path: "$.provider_note", value: "keep me" }],
});
const extendedHtml = renderMirror(extended);
const extendedRaw = extendedHtml.indexOf("data-raw-details=\"true\"");
assert.equal(extendedHtml.slice(0, extendedRaw).includes("$.provider_note"), false);
assert.equal(extendedHtml.slice(extendedRaw).includes("$.provider_note"), true);

const portraitText = read("kys-snapshot-portrait.json");
const portrait = await mirrorLearnedContext(portraitText);
assert.equal(portrait.state, "claims");
assert.equal(portrait.ok, true);
assert.equal(portrait.claim_status, "agent_claim_not_fact");
assert.deepEqual(portrait.diagnostics, []);
assert.equal(portrait.diagnostics.some((line) => String(line).includes("missing required property")), false);
assert.equal(Object.hasOwn(portrait.counts, "new"), false);
assert.deepEqual(portrait.counts, {
  inference: 2,
  unknown_origin: 5,
  uncertainty_stated: 2,
});
assert.deepEqual(portrait.categories.map((category) => category.label), [
  "known",
  "inferred",
  "working_style",
  "unknowns",
  "context_limits",
]);
assert.equal(portrait.summary, "Earlier exchanges were about concrete artifacts.");
assert.deepEqual(portrait.extensions.map((entry) => entry.path), [
  "$.status",
  "$.not_a_diagnosis",
  "$.not_a_definition_of_person",
  "$.human_review",
]);
assert.equal(JSON.stringify(portrait.categories).includes("Review note that must stay folded."), false);
assert.equal(JSON.stringify(portrait.categories).includes("human_review"), false);
const knownItems = portrait.categories[0].items;
assert.equal(knownItems[0].claimed_origin, "unknown");
assert.equal(knownItems[0].uncertainty_status, "unknown");
assert.equal(knownItems[0].detail, "Declared basis: Recorded preference");
assert.equal(knownItems[1].uncertainty_status, "known");
assert.equal(knownItems[1].uncertainty_note, "Declared confidence: medium.");
const inferredItem = portrait.categories[1].items[0];
assert.equal(inferredItem.claimed_origin, "inference");
assert.equal(inferredItem.uncertainty_status, "known");
assert.equal(portrait.categories[2].items[0].uncertainty_status, "unknown");
assert.equal(portrait.categories[4].items.map((item) => item.content).length, 2);
const portraitHtml = renderMirror(portrait);
assert.equal(portraitHtml.includes("missing required property"), false);
assert.equal(portraitHtml.includes("unexpected property"), false);
assert.equal(portraitHtml.includes("data-category=\"known\""), true);
assert.equal(portraitHtml.includes("pense savoir"), true);
assert.equal(portraitHtml.includes("data-origin=\"inference\""), true);
assert.equal(portraitHtml.includes("data-uncertainty=\"known\""), true);
assert.equal(portraitHtml.includes("data-basis=\"known-0\""), true);
assert.equal(portraitHtml.includes("Base déclarée : Recorded preference"), true);
assert.equal(portraitHtml.includes("Confiance déclarée : moyenne."), true);
assert.equal(portraitHtml.includes("data-relationship-summary=\"true\""), true);
assert.equal(portraitHtml.includes("Limites du contexte"), true);
assert.equal(portraitHtml.includes("data-count=\"new\""), false);
const portraitRaw = portraitHtml.indexOf("data-raw-details=\"true\"");
assert.equal(portraitHtml.slice(0, portraitRaw).includes("$.human_review"), false);
assert.equal(portraitHtml.slice(portraitRaw).includes("$.human_review"), true);
assert.equal(portraitHtml.slice(0, portraitRaw).includes("Review note that must stay folded."), false);
assert.equal(portraitHtml.slice(portraitRaw).includes("Review note that must stay folded."), true);
assertClaimBanner(portraitHtml);
assertClosedDetails(portraitHtml);

const portraitIngest = await ingestLearnedContext(portraitText);
assert.equal(portraitIngest.ok, false);
assert.equal(portraitIngest.normalized, null);

const fencedPortrait = `\`\`\`json\n${portraitText.trim()}\n\`\`\`\n`;
const fencedPortraitMirror = await mirrorLearnedContext(fencedPortrait);
assert.equal(fencedPortraitMirror.state, "claims");
assert.equal(fencedPortraitMirror.raw.text, fencedPortrait);
assert.equal(fencedPortraitMirror.categories[0].items[0].content, "French is the preferred language.");

const stringLimits = JSON.parse(portraitText);
stringLimits.context_limits = "Only this limit.";
stringLimits.inferred = [];
stringLimits.working_style = [];
stringLimits.unknowns = [];
stringLimits.known = [stringLimits.known[0]];
const stringMirror = await mirrorLearnedContext(JSON.stringify(stringLimits));
assert.deepEqual(stringMirror.categories.map((category) => category.label), ["known", "context_limits"]);
assert.equal(stringMirror.categories[1].items[0].id, "context-limits-0");
assert.equal(stringMirror.categories[1].items[0].content, "Only this limit.");

const emptyPortrait = await mirrorLearnedContext('{"snapshot_version":"kys-snapshot-0.2","known":[]}\n');
assert.equal(emptyPortrait.state, "unreadable");
assert.equal(emptyPortrait.diagnostics.some((line) => String(line).includes("missing required property")), false);

assert.deepEqual(await mirrorLearnedContext(rich.text), rich.model);
const annotationViaPage = await mirrorLearnedContext(annotationText);
assert.equal(annotationViaPage.state, "annotation");

const snapshotSource = fs.readFileSync(path.join(root, "apps/personal/src/pages/Snapshot.jsx"), "utf8");
const offerAt = snapshotSource.indexOf("correctionOffered &&");
const mirrorLinkAt = snapshotSource.indexOf('to="/mirror"', offerAt);
const pasteLabelAt = snapshotSource.indexOf("Coller la réponse", mirrorLinkAt);
const copyAt = snapshotSource.indexOf("Copier le prompt de correction");
assert.ok(offerAt !== -1 && mirrorLinkAt > offerAt && pasteLabelAt > mirrorLinkAt);
assert.ok(copyAt !== -1 && copyAt < pasteLabelAt);
assert.equal(snapshotSource.slice(mirrorLinkAt, pasteLabelAt).includes("ml-auto"), true);
assert.equal(snapshotSource.includes("if (label === 'correction') setCorrectionOffered(true)"), true);

const mirrorWithReview = renderToStaticMarkup(React.createElement(AgentClaimMirror, {
  model: rich.model,
  reviews: { "item:workshop": { verdict: "obsolete", stance: "obsolete", note: "Ancien atelier" } },
  onReview() {},
}));
assert.equal(mirrorWithReview.includes("data-user-review=\"obsolete\""), true);
assert.equal(mirrorWithReview.includes("data-review-stance=\"obsolete\""), true);
assert.equal(mirrorWithReview.includes("data-human-review=\"item:workshop\""), true);
assert.equal(mirrorWithReview.includes("data-agent-assertion=\"item:workshop\""), true);
assert.equal(mirrorWithReview.includes("data-verdict-button=\"obsolete\""), true);
assert.equal(mirrorWithReview.includes("data-verdict-button=\"private\""), true);
assert.equal(mirrorWithReview.includes("data-alignment-section=\"true\""), true);
assert.equal(mirrorWithReview.includes("data-bounded-memory-notice=\"true\""), true);
assert.equal(mirrorWithReview.includes("data-alignment-prompt-text=\"true\""), true);
assert.equal(mirrorWithReview.includes("data-copy-alignment-prompt=\"true\""), true);

const mirrorWithComparison = renderToStaticMarkup(React.createElement(AgentClaimMirror, {
  model: rich.model,
  comparison: {
    remediedCount: 2,
    conflictsCount: 1,
    retainedCount: 3,
    droppedCount: 2,
    addedCount: 1,
    epistemicDisclaimer: "Cette comparaison enregistre une différence de comportement observable.",
    reviewAdherence: [
      { claim: "Ancien atelier", outcome: "remedied", statusMessage: "Retiré avec succès" },
      { claim: "Télétravail", outcome: "persisting_conflict", statusMessage: "Toujours affirmé" },
    ],
  },
}));
assert.equal(mirrorWithComparison.includes("data-reobservation-comparison=\"true\""), true);
assert.equal(mirrorWithComparison.includes("data-epistemic-disclaimer=\"true\""), true);
assert.equal(mirrorWithComparison.includes("data-metric=\"remedied\""), true);
assert.equal(mirrorWithComparison.includes("data-metric=\"conflicts\""), true);

console.log("agent-acquired-context mirror: ok");
