#!/usr/bin/env node
/**
 * test-guide-optimizations.js — Unit test suite for the 4 Guide optimizations
 */

import assert from "node:assert/strict";
import { resolveSourceUrl, formatSourceMarkdownLink } from "./lib/source-deep-links.js";
import { synthesizeSmartExtractiveAnswer } from "./lib/smart-extractive-synthesizer.js";
import { createSemanticAnswerCache } from "./lib/semantic-answer-cache.js";

// 1. Test Deep Links (Optimisation 4)
const url1 = resolveSourceUrl("FractaVolta:research/generalized_packet_networks.md#L968-L1057");
assert.equal(url1, "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/generalized_packet_networks.md#L968-L1057");

const url2 = resolveSourceUrl("cogentia:.cogentia/issues/jeanhuguesrobert-cogentia/issue-00018.md#L419-L435");
assert.equal(url2, "https://github.com/JeanHuguesRobert/cogentia/issues/18#L419-L435");

const mdLink = formatSourceMarkdownLink("marenostrum:research/pacte_anti_capture.md#L1-L20", "Pacte Anti-Capture");
assert.equal(mdLink, "[Pacte Anti-Capture](https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/pacte_anti_capture.md#L1-L20)");

// 2. Test Smart Extractive Synthesis (Optimisation 2)
const synthResult = synthesizeSmartExtractiveAnswer({
  question: "Comment une commune corse peut-elle demarrer un pilote FractaVolta ?",
  excerpts: [
    { text: "Une commune corse peut démarrer un pilote sobre et vérifiable en commençant par les besoins d'autonomie énergétique locale. Les clauses de copropriété territoriale garantissent la réversibilité." },
    { text: "Documentation d'installation technique pour réseaux de paquets énergétiques distribués." },
  ],
  sources: [
    { source_id: "FractaVolta:research/fractavolta_paper.md#L10-L20", title: "FractaVolta Paper" },
  ],
  locale: "fr",
});
assert.match(synthResult, /Rappel de surface/);
assert.match(synthResult, /commune corse peut démarrer un pilote/);
assert.match(synthResult, /github\.com\/JeanHuguesRobert\/FractaVolta/);

// 3. Test Canonical Semantic Cache (Optimisation 1)
const cache = createSemanticAnswerCache();
const hit1 = cache.matchCanonical("qui est Jean Hugues ?");
assert.ok(hit1);
assert.equal(hit1.mode, "canonical_cache");
assert.match(hit1.answer, /Jean Hugues Noël Robert est un ingénieur/);

const hit2 = cache.matchCanonical("What is Possibilism in his work ?");
assert.ok(hit2);
assert.equal(hit2.mode, "canonical_cache");
assert.match(hit2.answer, /Possibilisme/);

const miss = cache.matchCanonical("Quelle est la météo à Ajaccio ?");
assert.equal(miss, null);

console.log(JSON.stringify({
  ok: true,
  test: "guide_optimizations",
  deep_links_tested: true,
  smart_extractive_tested: true,
  canonical_cache_tested: true,
  completed: true,
}, null, 2));
