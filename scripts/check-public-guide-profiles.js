#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultSuicideCorseManifestPath,
  filterRetrievalForProfile,
  preparePublicGuideAct,
  resolveProfileWebSearch,
  resolvePublicGuideProfile,
  sourceAllowedByProfile,
  SUICIDE_CORSE_PROFILE_PROMPT,
} from "./lib/public-guide-profiles.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.resolve(root, "../suicide-corse");

const absent = resolvePublicGuideProfile("");
assert.equal(absent.ok, true);
assert.equal(absent.profile, null);

const unknown = resolvePublicGuideProfile("other-guide");
assert.equal(unknown.ok, false);
assert.equal(unknown.error, "unknown_profile");

const fracta = resolvePublicGuideProfile("FractaVolta");
assert.equal(fracta.ok, true);
assert.equal(fracta.profile.id, "fractavolta");
assert.equal(fracta.profile.webSearch, "inherit");
assert.equal(fracta.profile.bindsSurface, false);
assert.equal(fracta.profile.mandate.instance_id, "fractavolta-public-guide");
assert.equal(fracta.profile.sourceScope, null);
assert.deepEqual(fracta.profile.act_templates.map(item => item.id), ["technical-report", "pilot-contact"]);
assert.equal(fracta.profile.act_templates[0].to, "jhr@baronsmariani.org");
assert.equal(resolveProfileWebSearch(fracta.profile, "What is the latest price?").mode, "inherit");

const closed = resolvePublicGuideProfile("suicide-corse", {
  manifestPath: path.join(root, "missing-suicide-corse-corpus.yml"),
});
assert.equal(closed.profile.sourceScopeSummary.mode, "fail_closed");
assert.equal(closed.profile.mandate.instance_id, "suicide-corse-public-guide");
assert.equal(closed.profile.bindsSurface, true);
assert.equal(closed.profile.usesCanonicalCache, false);
assert.deepEqual(closed.profile.act_templates.map(item => item.id), ["submit-testimony", "report-correction"]);
assert.equal(closed.profile.act_templates[0].to, "institutmariani@gmail.com");
assert.equal(sourceAllowedByProfile({
  repo: "barons-Mariani",
  path: "projects/suicide-corse/corpus.yml",
  source_id: "barons-Mariani:projects/suicide-corse/corpus.yml#L1-L4",
}, closed.profile), true);
assert.equal(sourceAllowedByProfile({
  repo: "barons-Mariani",
  path: "memory/marie-louise/carte.md",
  source_id: "barons-Mariani:memory/marie-louise/carte.md#L1-L4",
}, closed.profile), false);
assert.equal(sourceAllowedByProfile({
  repo: "FractaVolta",
  path: "README.md",
  source_id: "FractaVolta:README.md#L1-L4",
}, closed.profile), false);

const liveManifest = defaultSuicideCorseManifestPath();
const live = resolvePublicGuideProfile("suicide-corse");
if (fs.existsSync(liveManifest)) {
  assert.equal(live.profile.sourceScopeSummary.mode, "manifest");
  assert.ok(live.profile.sourceScopeSummary.issue_numbers.includes(50));
  assert.equal(sourceAllowedByProfile({
    repo: "barons-Mariani",
    path: "memory/marie-louise/carte.md",
  }, live.profile), true);
  assert.equal(sourceAllowedByProfile({
    repo: "cogentia",
    path: ".cogentia/issues/50.md",
    source_id: "issue:barons-Mariani#50",
    title: "suicide-corse conversational agent",
  }, live.profile), true);
} else {
  assert.equal(live.profile.sourceScopeSummary.mode, "fail_closed");
}
assert.equal(sourceAllowedByProfile({
  repo: "cogentia",
  path: "research/unrelated.md",
  source_id: "cogentia:research/unrelated.md#L1-L4",
}, live.profile), false);

const manifestProfile = resolvePublicGuideProfile("suicide-corse", {
  manifestText: [
    "sources:",
    "  - id: map",
    "    path: memory/marie-louise/carte.md",
    "issues:",
    "  conversational_agent: 50",
  ].join("\n"),
});
const mixed = filterRetrievalForProfile({
  sources: [
    { source_id: "barons-Mariani:projects/suicide-corse/architecture.md#L1-L2", repo: "barons-Mariani", path: "projects/suicide-corse/architecture.md" },
    { source_id: "barons-Mariani:memory/marie-louise/carte.md#L1-L2", repo: "barons-Mariani", path: "memory/marie-louise/carte.md" },
    { source_id: "FractaVolta:README.md#L1-L4", repo: "FractaVolta", path: "README.md" },
    { source_id: "issue:barons-Mariani#999", repo: "cogentia", path: ".cogentia/issues/999.md", title: "suicide-corse other" },
  ],
  context: [
    { source_id: "barons-Mariani:projects/suicide-corse/architecture.md#L1-L2", text: "in scope" },
    { source_id: "FractaVolta:README.md#L1-L4", text: "FOREIGN_PUBLIC_SOURCE_MARKER" },
  ],
  s7: { ok: true, canonical_repo: "FractaVolta", canonical_rel: "README.md", ref: "FractaVolta:README.md" },
  warnings: [],
}, manifestProfile.profile);
assert.deepEqual(mixed.sources.map(source => source.source_id), [
  "barons-Mariani:projects/suicide-corse/architecture.md#L1-L2",
  "barons-Mariani:memory/marie-louise/carte.md#L1-L2",
]);
assert.equal(mixed.context.length, 1);
assert.equal(mixed.s7.ok, false);
assert.ok(mixed.warnings.some(warning => warning.startsWith("profile_source_filtered:")));
assert.equal(filterRetrievalForProfile(mixed, null), mixed);

assert.equal(resolveProfileWebSearch(live.profile, "Que sait-on de Marie-Louise ?").mode, "off");
assert.equal(resolveProfileWebSearch(live.profile, "Quelle est la situation actuelle de l'enquête ?").mode, "off");
assert.equal(resolveProfileWebSearch(live.profile, "Vérifie sur le web les actualités d'aujourd'hui").mode, "on");
assert.equal(resolveProfileWebSearch(live.profile, "Qui est Marie-Louise ?", { web_search: true }).mode, "on");
assert.equal(resolveProfileWebSearch(live.profile, "Verify on the web today", { web_search: false }).mode, "off");
assert.match(SUICIDE_CORSE_PROFILE_PROMPT, /Never write in her voice/);

const draft = preparePublicGuideAct({
  profile: "suicide-corse",
  act: "submit-testimony",
  locale: "fr",
  context: "Je ne sais pas la date.",
  executed: true,
  history: [
    { role: "assistant", content: "Marie-Louise a dit « je voulais partir »." },
    { role: "user", content: "Je ne connais pas le lieu." },
  ],
});
assert.equal(draft.status, 200);
assert.equal(draft.body.prepared_act.executed, false);
assert.equal(draft.body.prepared_act.draft, true);
assert.equal(draft.body.prepared_act.to, "institutmariani@gmail.com");
assert.equal(draft.body.prepared_act.notice, "Brouillon — non envoyé");
assert.match(draft.body.prepared_act.body, /Je ne sais pas la date/);
assert.doesNotMatch(draft.body.prepared_act.body, /Je ne connais pas le lieu/);
assert.match(draft.body.prepared_act.body, /n'est pas un témoignage/);
assert.match(draft.body.prepared_act.body, /ne parle pas à la place de Marie-Louise/);
assert.doesNotMatch(draft.body.prepared_act.body, /je voulais partir/);
assert.doesNotMatch(draft.body.prepared_act.body, /\d{4}-\d{2}-\d{2}/);

const correction = preparePublicGuideAct({
  profile: "suicide-corse",
  template: "report-correction",
  locale: "en",
  context: "The published date is wrong.",
});
assert.equal(correction.body.prepared_act.kind, "report-correction");
assert.equal(correction.body.prepared_act.notice, "Draft — not sent");
assert.match(correction.body.prepared_act.body, /not testimony/);

assert.equal(preparePublicGuideAct({
  profile: "suicide-corse",
  act: "technical-report",
  context: "hello",
}).body.error, "unknown_act");
assert.equal(preparePublicGuideAct({
  profile: "nope",
  act: "submit-testimony",
  context: "hello",
}).body.error, "unknown_profile");
assert.equal(preparePublicGuideAct({
  profile: "suicide-corse",
  act: "submit-testimony",
  context: "   ",
}).body.error, "missing_act_context");

const latestTurn = preparePublicGuideAct({
  profile: "suicide-corse",
  act: "submit-testimony",
  locale: "fr",
  context: "   ",
  history: [
    { role: "user", content: "Un ancien message qui ne doit pas partir." },
    { role: "assistant", content: "Réponse du Guide." },
    { role: "user", content: "Seulement le dernier tour." },
  ],
});
assert.match(latestTurn.body.prepared_act.body, /Seulement le dernier tour/);
assert.doesNotMatch(latestTurn.body.prepared_act.body, /Un ancien message/);
assert.equal(live.profile.act_templates.some(item => item.id === latestTurn.body.prepared_act.kind), true);

const pilot = preparePublicGuideAct({
  profile: "fractavolta",
  act: "pilot-contact",
  locale: "en",
  context: "A commune wants a sober pilot.",
});
assert.equal(pilot.body.prepared_act.to, "jhr@baronsmariani.org");
assert.equal(pilot.body.prepared_act.executed, false);
assert.match(pilot.body.prepared_act.body, /does not start a pilot/);
assert.equal(preparePublicGuideAct({
  profile: "fractavolta",
  act: "submit-testimony",
  context: "no",
}).body.error, "unknown_act");

const moduleSource = fs.readFileSync(new URL("./lib/public-guide-profiles.js", import.meta.url), "utf8");
assert.doesNotMatch(moduleSource, /child_process|nodemailer|octokit|writeFile|appendFile|fetch\(/);
const httpSource = fs.readFileSync(path.join(root, "scripts", "cogentia-mcp-http.js"), "utf8");
const handlerStart = httpSource.indexOf("async function handleGuidePrepareAct");
const handlerEnd = httpSource.indexOf("async function handleGuideChatStream", handlerStart);
assert.ok(handlerStart > 0 && handlerEnd > handlerStart);
const handler = httpSource.slice(handlerStart, handlerEnd);
assert.match(handler, /preparePublicGuideAct/);
assert.doesNotMatch(handler, /openSurfaceTurnPacket|guideWebSearchRun|guideRetrievalRun|createAgentGatewayClient|fetch\(/);
assert.match(moduleSource, /act_templates/);
assert.match(moduleSource, /resolvePublicGuideProfile/);
assert.doesNotMatch(moduleSource, /ACTS\[/);

const guideJs = fs.readFileSync(path.join(siteRoot, "assets", "guide.js"), "utf8");
const guideHtml = fs.readFileSync(path.join(siteRoot, "guide.html"), "utf8");
assert.match(guideJs, /sessionStorage/);
assert.doesNotMatch(guideJs, /localStorage/);
assert.doesNotMatch(guideHtml, /localStorage/);
assert.match(guideHtml, /Brouillon — non envoyé/);
assert.match(guideJs, /submit-testimony/);
assert.match(guideJs, /report-correction/);
assert.match(guideJs, /draft\.to/);
assert.doesNotMatch(guideJs, /institutmariani@gmail\.com/);
assert.doesNotMatch(guideJs, /jhr@baronsmariani\.org/);
assert.doesNotMatch(guideJs, /technical-report|pilot-contact/);
assert.doesNotMatch(guideHtml, /institutmariani@gmail\.com/);
assert.doesNotMatch(guideHtml, /jhr@baronsmariani\.org/);
assert.doesNotMatch(guideHtml, /technical-report|pilot-contact/);
assert.doesNotMatch(guideJs, /mailto:/);
assert.doesNotMatch(guideHtml, /mailto:/);
assert.doesNotMatch(guideJs, /editions\//);
assert.equal(fs.existsSync(path.join(siteRoot, "editions", "2026-09-17", "index.html")), true);

console.log(JSON.stringify({
  ok: true,
  profiles: ["fractavolta", "suicide-corse"],
  prepare_act: true,
  suicide_corse_scope: live.profile.sourceScopeSummary.mode,
}, null, 2));
