#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeQuestion,
  buildEvidencePacket,
  critiqueAnswer,
  createAnswerEngine,
  renderAnswer,
} from "./lib/agent-jhn-whatsapp/answer-core.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(root, "fixtures", "agent-jhn-answer-core", name), "utf8"));
const success = fixture("openai-success.json");
const empty = fixture("openai-empty.json");
const rateLimit = fixture("openai-rate-limit.json");
const guide = fixture("guide-fractavolta.json");
const tests = [];
const test = (name, run) => tests.push({ name, run });

test("primary success is corpus grounded", async () => {
  const engine = createAnswerEngine({
    retrieve: async () => guide,
    synthesizers: [{
      provider: "openai", model: "gpt-5.6-terra",
      synthesize: async ({ retrieval }) => ({ ...success, sources: retrieval.sources }),
    }],
  });
  const result = await engine.answer({ text: "Qu'est-ce que FractaVolta ?", locale: "fr" });
  assert.equal(result.ok, true);
  assert.equal(result.model, "gpt-5.6-terra");
  assert.equal(result.fallbackLevel, 0);
  assert.equal(result.sources.length, 2);
});

test("empty primary response uses secondary model", async () => {
  const events = [];
  const engine = createAnswerEngine({
    retrieve: async () => guide,
    onDiagnostic: event => events.push(event),
    synthesizers: [
      { provider: "openai", model: "gpt-5.6-sol", synthesize: async () => empty },
      { provider: "openai", model: "gpt-5.6-terra", synthesize: async () => ({ ...success, model: "gpt-5.6-terra" }) },
    ],
  });
  const result = await engine.answer({ text: "question", locale: "fr" });
  assert.equal(result.model, "gpt-5.6-terra");
  assert.equal(result.fallbackLevel, 1);
  assert.equal(events[0].stage, "empty_response");
  assert.equal(events[0].finish_reason, "length");
});

test("timeout uses secondary model", async () => {
  const timeout = Object.assign(new Error("private prompt"), { name: "TimeoutError", code: "ETIMEDOUT" });
  const engine = createAnswerEngine({
    retrieve: async () => guide,
    synthesizers: [
      { provider: "openai", model: "gpt-5.6-sol", synthesize: async () => { throw timeout; } },
      { provider: "openai", model: "gpt-5.6-terra", synthesize: async () => ({ ...success, model: "gpt-5.6-terra" }) },
    ],
  });
  const result = await engine.answer({ text: "question" });
  assert.equal(result.model, "gpt-5.6-terra");
  assert.equal(result.diagnostics[0].stage, "timeout");
  assert.equal(result.diagnostics[0].timed_out, true);
});

test("two model failures use extractive corpus answer", async () => {
  const httpError = Object.assign(new Error("secret body"), {
    name: "ProviderError", code: rateLimit.error.code, http_status: 429,
  });
  const engine = createAnswerEngine({
    retrieve: async () => guide,
    synthesizers: [
      { provider: "openai", model: "gpt-5.6-sol", synthesize: async () => { throw httpError; } },
      { provider: "openai", model: "gpt-5.6-terra", synthesize: async () => { throw httpError; } },
    ],
  });
  const result = await engine.answer({ text: "question" });
  assert.equal(result.provider, "extractive-fallback");
  assert.equal(result.answer, guide.answer);
  assert.equal(result.fallbackLevel, 2);
});

test("retrieval failure still permits a model answer", async () => {
  const engine = createAnswerEngine({
    retrieve: async () => { throw new Error("database unavailable"); },
    synthesizers: [{ provider: "openai", model: "gpt-5.6-terra", synthesize: async () => success }],
  });
  const result = await engine.answer({ text: "bonjour" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.sources, []);
  assert.equal(result.diagnostics[0].stage, "retrieval");
});

test("diagnostics never expose messages, prompts, or keys", async () => {
  const secret = "sk-project-super-secret";
  const failure = Object.assign(new Error(`${secret} private message body`), { code: "unsafe code with spaces" });
  const engine = createAnswerEngine({
    retrieve: async () => guide,
    synthesizers: [{ provider: "openai", model: "gpt-5.6-terra", synthesize: async () => { throw failure; } }],
  });
  const result = await engine.answer({ text: "private message body" });
  const serialized = JSON.stringify(result.diagnostics);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("private message body"), false);
  assert.equal(result.diagnostics[0].error_code, null);
  assert.equal(result.diagnostics[0].prompt_tokens, undefined);
});

test("language is detected from the message before the phone hint", async () => {
  assert.equal(analyzeQuestion({ text: "Explain FractaVolta simply.", locale: "fr" }).locale, "en");
  assert.equal(analyzeQuestion({ text: "Explique simplement FractaVolta.", locale: "en" }).locale, "fr");
});

test("current-information intent records unverified freshness", async () => {
  const analysis = analyzeQuestion({ text: "What current public information is available?" });
  const evidence = buildEvidencePacket(guide, analysis);
  assert.equal(analysis.intent, "current_info");
  assert.equal(analysis.needsCurrentWeb, true);
  assert.equal(evidence.current_information_verified, false);
  const review = critiqueAnswer({
    answer: "The corpus says something useful [source].",
    analysis,
    evidence,
  });
  assert.equal(review.accepted, false);
  assert.match(review.answer, /^Caution: this public information has not been verified as current\./);
});

test("short-message rendering does not clip a developed answer for style", async () => {
  const answer = Array.from({ length: 8 }, (_, index) => `Paragraph ${index}: ${"useful evidence ".repeat(12).trim()}`).join("\n\n");
  const rendered = renderAnswer(answer, { channel: "whatsapp", maxChars: 900 });
  assert.equal(rendered, answer);
  assert.ok(!rendered.endsWith("…"));
});

test("engine exposes analysis, evidence, and critique", async () => {
  const engine = createAnswerEngine({
    retrieve: async () => guide,
    synthesizers: [{ provider: "fixture", model: "fixture", synthesize: async () => success }],
  });
  const result = await engine.answer({ text: "Explain FractaVolta simply.", channel: "whatsapp" });
  assert.equal(result.analysis.locale, "en");
  assert.equal(result.evidence.retrieval_available, true);
  assert.ok(Array.isArray(result.critique.issues));
});

test("latency uses the injected clock and performs no network access", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network forbidden"); };
  let now = 100;
  try {
    const engine = createAnswerEngine({
      clock: () => now,
      retrieve: async () => { now += 5; return guide; },
      synthesizers: [{
        provider: "fixture", model: "fixture-model",
        synthesize: async () => { now += 7; return success; },
      }],
    });
    const result = await engine.answer({ text: "question" });
    assert.equal(result.latencyMs, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

let passed = 0;
const failures = [];
for (const item of tests) {
  try {
    await item.run();
    passed += 1;
  } catch (error) {
    failures.push({ name: item.name, error: error.stack || error.message });
  }
}
console.log(JSON.stringify({
  ok: failures.length === 0,
  passed,
  failed: failures.length,
  total: tests.length,
  network_calls: 0,
  whatsapp_messages_sent: 0,
  failures,
}, null, 2));
if (failures.length) process.exit(1);
