#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCognitiveDraft,
  resolveRetrievalMode,
} from "./lib/agent-jhn-whatsapp/draft.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const guide = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "agent-jhn-answer-core", "guide-fractavolta.json"), "utf8"));
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalPrimary = process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL;
const originalFallback = process.env.AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL;
const originalRetrieval = process.env.AGENT_JHN_WHATSAPP_RETRIEVAL;
const tests = [];
const test = (name, run) => tests.push({ name, run });

process.env.OPENAI_API_KEY = "test-key-never-sent";
process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL = "gpt-5.6-terra";
process.env.AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL = "gpt-4.1-mini";
delete process.env.AGENT_JHN_WHATSAPP_RETRIEVAL;

const normalized = {
  text: "Qu'est-ce que FractaVolta ?",
  remote_jid: "33678059481@s.whatsapp.net",
  conversation_id: "whatsapp:test",
};
const config = {
  allowed_self_jid: normalized.remote_jid,
  visible_agent_id: "agent-jhn-experimental",
  notice_url: "https://example.invalid/notice",
};

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function completion(model, content, finishReason = "stop") {
  return {
    model,
    choices: [{ message: { role: "assistant", content }, finish_reason: finishReason }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: content ? 20 : 800,
      completion_tokens_details: { reasoning_tokens: content ? 0 : 800 },
    },
  };
}

test("resolveRetrievalMode defaults and sanitizes", () => {
  assert.equal(resolveRetrievalMode({}), "guide");
  assert.equal(resolveRetrievalMode({ AGENT_JHN_WHATSAPP_RETRIEVAL: "librarian" }), "librarian");
  assert.equal(resolveRetrievalMode({ AGENT_JHN_WHATSAPP_RETRIEVAL: "SHADOW" }), "shadow");
  assert.equal(resolveRetrievalMode({ AGENT_JHN_WHATSAPP_RETRIEVAL: "nope" }), "guide");
  assert.equal(resolveRetrievalMode({ AGENT_JHN_WHATSAPP_RETRIEVAL: "guide" }, { retrievalMode: "librarian" }), "librarian");
});

test("Guide then GPT-5.6 produces a grounded answer", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    if (String(url).includes("/guide/chat")) return jsonResponse(guide);
    return jsonResponse(completion("gpt-5.6-terra", "Réponse fondée sur le corpus."), 200, { "x-request-id": "req_contract_primary" });
  };
  const result = await buildCognitiveDraft(normalized, config, {
    // Keep this case focused on Guide+OpenAI wiring; brief/constitution covered below.
    injectAgentBrief: false,
    injectPublicReadonlyAgents: false,
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.model, "gpt-5.6-terra");
  assert.ok(calls[1].body.messages.some((m) => /Public corpus excerpts/.test(m.content)));
  assert.match(result.text, /Réponse fondée sur le corpus/);
  assert.equal(result.provenance_class, "openai-corpus-grounded");
  assert.equal(result.retrieval_mode, "guide");
});

test("WhatsApp OpenAI prompt injects public-readonly AGENTS and agent brief", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    if (String(url).includes("/guide/chat")) return jsonResponse(guide);
    return jsonResponse(completion("gpt-5.6-terra", "Réponse sous mandat de représentation."));
  };
  const briefSnippet = "# Agent Brief — Representing Jean Hugues Noël Robert\nYou draft; he decides.";
  const publicAgentsSnippet = "# Public read-only agent constitution\nSurface mandate is a strict subset.";
  const result = await buildCognitiveDraft(normalized, config, {
    injectAgentBrief: true,
    agentBriefText: briefSnippet,
    injectPublicReadonlyAgents: true,
    publicReadonlyAgentsText: publicAgentsSnippet,
  });
  const openai = calls.find((c) => String(c.url).includes("api.openai.com"));
  assert.ok(openai);
  const joined = openai.body.messages.map((m) => m.content).join("\n---\n");
  assert.match(joined, /Public read-only agent constitution/);
  assert.match(joined, /strict subset/);
  assert.match(joined, /Agent Brief — Representing Jean Hugues Noël Robert/);
  assert.match(joined, /You draft; he decides/);
  assert.match(joined, /Public corpus excerpts/);
  assert.match(joined, /Operating brief for representing/);
  assert.match(result.text, /sous mandat de représentation/);
  assert.equal(result.agent_brief_injected, true);
});

test("empty GPT-5.6 response falls back to GPT-4.1", async () => {
  const models = [];
  const diagnostics = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/guide/chat")) return jsonResponse(guide);
    const model = JSON.parse(options.body).model;
    models.push(model);
    if (model === "gpt-5.6-terra") {
      return jsonResponse(completion(model, null, "length"), 200, { "x-request-id": "req_contract_empty" });
    }
    return jsonResponse(completion(model, "Réponse du modèle de secours."));
  };
  const result = await buildCognitiveDraft(normalized, config, {
    injectAgentBrief: false,
    injectPublicReadonlyAgents: false,
    onCognitiveError: (_error, event) => diagnostics.push(event),
  });
  assert.deepEqual(models, ["gpt-5.6-terra", "gpt-4.1-mini"]);
  assert.match(result.text, /modèle de secours/);
  assert.equal(diagnostics[0].stage, "empty_response");
  assert.equal(diagnostics[0].finish_reason, "length");
});

test("two provider failures return the corpus fallback", async () => {
  const diagnostics = [];
  globalThis.fetch = async (url) => {
    if (String(url).includes("/guide/chat")) return jsonResponse(guide);
    return jsonResponse({ error: { type: "server_error", code: "provider_unavailable" } }, 503);
  };
  const result = await buildCognitiveDraft(normalized, config, {
    injectAgentBrief: false,
    injectPublicReadonlyAgents: false,
    onCognitiveError: (_error, event) => diagnostics.push(event),
  });
  assert.match(result.text, /énergie distribuée, calcul et gouvernance locale/);
  assert.equal(result.provenance_class, "s7-cognitive-retrieval");
  assert.equal(diagnostics.filter(event => event.stage === "synthesis_error").length, 2);
});

test("Guide failure still allows a direct GPT-5.6 answer", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes("/guide/chat")) throw Object.assign(new Error("local guide unavailable"), { code: "ECONNREFUSED" });
    return jsonResponse(completion("gpt-5.6-terra", "Réponse directe sans corpus."));
  };
  const result = await buildCognitiveDraft(normalized, config, {
    injectAgentBrief: false,
    injectPublicReadonlyAgents: false,
  });
  assert.match(result.text, /Réponse directe sans corpus/);
  assert.equal(result.provenance_class, "openai-direct");
  assert.deepEqual(result.sources, []);
});

test("librarian mode uses packet path and never calls Guide", async () => {
  let guideCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/guide/chat")) {
      guideCalls += 1;
      return jsonResponse(guide);
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  const result = await buildCognitiveDraft(normalized, config, {
    retrievalMode: "librarian",
    answerWithLibrarian: async () => ({
      ok: true,
      path: "librarian_c",
      answer: "Réponse bibliothécaire grounded [cogentia:docs/x.md#L1-L2].",
      provider: "openai",
      model: "gpt-5.6-terra",
      sources: [{ source_id: "cogentia:docs/x.md#L1-L2" }],
      packet: { coverage: "enough", source_ids: ["cogentia:docs/x.md#L1-L2"] },
      explore: { ok: true, toolCalls: 2, searchCalls: 1 },
      latencyMs: 42,
    }),
  });
  assert.equal(guideCalls, 0);
  assert.equal(result.retrieval_mode, "librarian");
  assert.equal(result.provenance_class, "librarian-corpus-grounded");
  assert.match(result.text, /Réponse bibliothécaire grounded/);
  assert.equal(result.librarian.ok, true);
  assert.equal(result.librarian.path, "librarian_c");
  assert.deepEqual(result.librarian.source_ids, ["cogentia:docs/x.md#L1-L2"]);
});

test("shadow mode keeps Guide live text and reports librarian compare", async () => {
  const shadowReports = [];
  globalThis.fetch = async (url) => {
    if (String(url).includes("/guide/chat")) return jsonResponse(guide);
    return jsonResponse(completion("gpt-5.6-terra", "Réponse Guide live."), 200, { "x-request-id": "req_shadow_guide" });
  };
  const result = await buildCognitiveDraft(normalized, config, {
    retrievalMode: "shadow",
    onShadowCompare: (summary) => shadowReports.push(summary),
    answerWithLibrarian: async () => ({
      ok: true,
      path: "librarian_c",
      answer: "Réponse librarian shadow-only (ne doit pas être envoyée).",
      provider: "extractive-fallback",
      sources: [{ source_id: "cogentia:docs/shadow.md#L1-L3" }],
      packet: { coverage: "partial", source_ids: ["cogentia:docs/shadow.md#L1-L3"] },
      explore: { ok: true, toolCalls: 1 },
      latencyMs: 11,
    }),
  });
  assert.equal(result.retrieval_mode, "shadow");
  assert.match(result.text, /Réponse Guide live/);
  assert.doesNotMatch(result.text, /shadow-only/);
  assert.equal(result.provenance_class, "openai-corpus-grounded");
  assert.equal(result.shadow.ok, true);
  assert.equal(result.shadow.provider, "extractive-fallback");
  assert.equal(shadowReports.length, 1);
  assert.equal(shadowReports[0].answer_length > 0, true);
});

test("librarian empty answer falls back to deterministic stub", async () => {
  globalThis.fetch = async () => {
    throw new Error("fetch must not be used when librarian is injected empty");
  };
  const result = await buildCognitiveDraft(normalized, config, {
    retrievalMode: "librarian",
    answerWithLibrarian: async () => ({
      ok: false,
      path: "librarian_c",
      answer: "",
      provider: null,
      sources: [],
      packet: { coverage: "none", source_ids: [] },
      explore: { ok: false, toolCalls: 1 },
      latencyMs: 5,
    }),
  });
  assert.equal(result.retrieval_mode, "librarian");
  assert.equal(result.stub, true);
  assert.equal(result.provenance_class, "deterministic_stub");
});

let passed = 0;
const failures = [];
try {
  for (const item of tests) {
    try {
      await item.run();
      passed += 1;
    } catch (error) {
      failures.push({ name: item.name, error: error.stack || error.message });
    }
  }
} finally {
  globalThis.fetch = originalFetch;
  restoreEnv("OPENAI_API_KEY", originalKey);
  restoreEnv("AGENT_JHN_WHATSAPP_OPENAI_MODEL", originalPrimary);
  restoreEnv("AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL", originalFallback);
  restoreEnv("AGENT_JHN_WHATSAPP_RETRIEVAL", originalRetrieval);
}

console.log(JSON.stringify({
  ok: failures.length === 0,
  passed,
  failed: failures.length,
  total: tests.length,
  real_network_calls: 0,
  whatsapp_messages_sent: 0,
  failures,
}, null, 2));
if (failures.length) process.exit(1);

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
