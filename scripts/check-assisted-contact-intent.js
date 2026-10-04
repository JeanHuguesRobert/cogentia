#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "../apps/personal/node_modules/react/index.js";
import { renderToStaticMarkup } from "../apps/personal/node_modules/react-dom/server.js";
import {
  CONTACT_INTENTIONS,
  DEFAULT_CONTACT_RECIPIENT,
  buildContactEmailDraft,
  findIntention,
} from "./lib/assisted-contact-intent.js";
import { AssistedContactCard } from "../apps/personal/src/components/AssistedContact.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1. Catalogue completeness and neutrality
assert.ok(CONTACT_INTENTIONS.length >= 7, "Must offer multiple distinct intentions");
const ids = CONTACT_INTENTIONS.map((i) => i.id);
assert.ok(ids.includes("feedback"), "Must have feedback intention");
assert.ok(ids.includes("question"), "Must have question intention");
assert.ok(ids.includes("testing"), "Must have testing intention");
assert.ok(ids.includes("follow"), "Must have follow intention");
assert.ok(ids.includes("twin"), "Must have twin exploration intention");
assert.ok(ids.includes("data_governance"), "Must have data governance intention");
assert.ok(ids.includes("unsure_or_other"), "Must have open/unsure option");
assert.ok(ids.includes("no_contact"), "Must have explicit no-contact option");

// Feedback and shallow options are first-class
assert.equal(CONTACT_INTENTIONS[0].id, "feedback", "Feedback-only option is listed first");
const noContactIntention = findIntention("no_contact");
assert.ok(noContactIntention);
assert.equal(noContactIntention.category, "none");

// 2. Draft generation for feedback
const draftFeedback = buildContactEmailDraft({
  intentionId: "feedback",
  customNotes: "Le miroir m'a surpris sur les préférences de travail.",
  context: {
    provider: "Claude",
    turnNumber: 2,
    reviewedCount: 3,
    hasAlignmentPrompt: true,
  },
});

assert.equal(draftFeedback.noContact, false);
assert.equal(draftFeedback.recipient, DEFAULT_CONTACT_RECIPIENT);
assert.equal(DEFAULT_CONTACT_RECIPIENT, "jhr@baronsmariani.org");
assert.ok(draftFeedback.subject.startsWith("[KYS][Cogentia][feedback]"));
assert.ok(draftFeedback.subject.includes("Retour d'expérience"));
assert.ok(draftFeedback.body.includes("Le miroir m'a surpris"));
assert.ok(draftFeedback.body.includes("Origine : KYS — miroir agentique Cogentia"));
assert.ok(draftFeedback.body.includes("Intention déclarée : Partager un retour d'expérience"));
assert.ok(draftFeedback.body.includes("Code de routage : feedback"));
assert.ok(draftFeedback.body.includes("Agent examiné : Claude"));
assert.ok(draftFeedback.body.includes("Parcours : 2 tours"));
assert.ok(draftFeedback.body.includes("Assertions examinées : 3"));
assert.ok(draftFeedback.body.includes("Alignement effectué : oui"));
assert.ok(draftFeedback.body.includes("Aucune donnée personnelle issue du miroir n’est jointe automatiquement."));
assert.ok(draftFeedback.mailtoUrl.startsWith("mailto:"));
assert.ok(draftFeedback.mailtoUrl.includes(encodeURIComponent(draftFeedback.subject)));

// 3. Draft generation for no_contact
const draftNoContact = buildContactEmailDraft({ intentionId: "no_contact" });
assert.equal(draftNoContact.noContact, true);
assert.equal(draftNoContact.body, "");
assert.equal(draftNoContact.mailtoUrl, "");

// 4. Non-injection of private or unreviewed items
// Ensure that passing extra context with private claims does NOT leak them into the email body
const draftWithPrivateInput = buildContactEmailDraft({
  intentionId: "question",
  customNotes: "Comment fonctionne la mémoire ?",
  context: {
    provider: "Mistral",
    privateClaims: ["Secret fact 1", "Sensitive detail 2"],
    rawPersona: "Secret unreviewed persona",
  },
});
assert.equal(draftWithPrivateInput.body.includes("Secret fact"), false);
assert.equal(draftWithPrivateInput.body.includes("Sensitive detail"), false);
assert.equal(draftWithPrivateInput.body.includes("Secret unreviewed persona"), false);

// 5. Open / unsure intention
const draftOpen = buildContactEmailDraft({
  intentionId: "unsure_or_other",
  customNotes: "Remarque libre et spontanée.",
});
assert.ok(draftOpen.subject.startsWith("[KYS][Cogentia][other]"));
assert.ok(draftOpen.subject.includes("Message libre"));
assert.ok(draftOpen.body.includes("Remarque libre et spontanée."));

// 6. Browser purity check (no forbidden tokens)
const browserFiles = [
  "scripts/lib/assisted-contact-intent.js",
  "apps/personal/src/components/AssistedContact.js",
];
for (const rel of browserFiles) {
  const content = fs.readFileSync(path.join(root, rel), "utf8");
  for (const forbidden of ["supabase", "localStorage", "writeFile", "fetch(", "node:fs", "node:crypto"]) {
    assert.equal(content.includes(forbidden), false, `${rel} mentions forbidden token ${forbidden}`);
  }
}

// 7. Component static markup render test
const html = renderToStaticMarkup(React.createElement(AssistedContactCard, {
  context: { provider: "Claude", turnNumber: 2, reviewedCount: 3 },
}));

assert.ok(html.includes("data-assisted-contact=\"true\""));
assert.ok(html.includes("data-intention=\"feedback\""));
assert.ok(html.includes("data-intention=\"no_contact\""));
assert.ok(html.includes("data-action=\"open-mail-client\""));
assert.ok(html.includes("data-action=\"copy-body\""));
assert.ok(html.includes("data-contact-subject=\"true\""));
assert.ok(html.includes("data-contact-body=\"true\""));
assert.ok(html.includes("Pas de contact"));

// No account gate
assert.equal(html.includes("type=\"email\""), false);
assert.equal(html.includes("/auth"), false);
assert.equal(html.toLowerCase().includes("créer un compte"), false);
assert.equal(html.toLowerCase().includes("s'inscrire"), false);

console.log("assisted-contact-intent: ok");
