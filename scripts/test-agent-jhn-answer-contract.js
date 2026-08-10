#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCognitiveDraft } from "./lib/agent-jhn-whatsapp/draft.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const guide = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "agent-jhn-answer-core", "guide-fractavolta.json"), "utf8"));
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalPrimary = process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL;
const originalFallback = process.env.AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL;
const tests = [];
const test = (name, run) => tests.push({ name, run });

process.env.OPENAI_API_KEY = "test-key-never-sent";
process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL = "gpt-5.6-terra";
process.env.AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL = "gpt-4.1-mini";

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

test("Guide then GPT-5.6 produces a grounded answer", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    if (String(url).includes("/guide/chat")) return jsonResponse(guide);
    return jsonResponse(completion("gpt-5.6-terra", "Réponse fondée sur le corpus."), 200, { "x-request-id": "req_contract_primary" });
  };
  const result = await buildCognitiveDraft(normalized, config);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.model, "gpt-5.6-terra");
  assert.match(calls[1].body.messages[1].content, /Public corpus excerpts/);
  assert.match(result.text, /Réponse fondée sur le corpus/);
  assert.equal(result.provenance_class, "openai-corpus-grounded");
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
  const result = await buildCognitiveDraft(normalized, config);
  assert.match(result.text, /Réponse directe sans corpus/);
  assert.equal(result.provenance_class, "openai-direct");
  assert.deepEqual(result.sources, []);
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
