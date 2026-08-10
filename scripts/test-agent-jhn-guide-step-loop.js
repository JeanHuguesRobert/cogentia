#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCapabilityRegistry, createGovernedHarness } from "./lib/agent-jhn-whatsapp/governed-harness.js";
import { createGuideCorpusCapability } from "./lib/agent-jhn-whatsapp/guide-step-capability.js";
import { createOpenAiStepReasoner } from "./lib/agent-jhn-whatsapp/openai-step-reasoner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const guideFixture = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "agent-jhn-answer-core", "guide-fractavolta.json"), "utf8"));
const tests = [];
const test = (name, run) => tests.push({ name, run });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const completion = content => json({ choices: [{ message: { content } }] });

test("reasoner -> Guide -> observation -> answer completes a bounded loop", async () => {
  const calls = [];
  let reasonerCalls = 0;
  const mockFetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url: String(url), body });
    if (String(url).includes("/guide/chat")) return json({ ...guideFixture, ok: true });
    reasonerCalls += 1;
    if (reasonerCalls === 1) {
      return completion(JSON.stringify({
        kind: "capability_call",
        capability: "corpus.search",
        input: { question: "Explain FractaVolta simply.", locale: "en", web_search: false },
      }));
    }
    assert.match(body.messages[1].content, /FractaVolta organise une infrastructure/);
    return completion(JSON.stringify({ kind: "answer", answer: "FractaVolta starts with a grounded local node [fractavolta:paper]." }));
  };
  const capability = createGuideCorpusCapability({ url: "http://guide.test/guide/chat", fetch: mockFetch });
  const reasoner = createOpenAiStepReasoner({ apiKey: "test-key-never-sent", fetch: mockFetch });
  const harness = createGovernedHarness({ registry: createCapabilityRegistry([capability]), reasoner });
  const result = await harness.run(
    { text: "Explain FractaVolta simply.", locale: "en" },
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 3, maxCapabilityCalls: 1, maxCostUnits: 2 },
  );
  assert.equal(result.ok, true);
  assert.equal(result.answer, "FractaVolta starts with a grounded local node [fractavolta:paper].");
  assert.equal(result.stepCount, 2);
  assert.equal(result.capabilityCalls, 1);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[1].body, { question: "Explain FractaVolta simply.", locale: "en", web_search: false });
  assert.equal(result.steps[0].result.observation.value, undefined);
});

test("Guide results expose only normalized public evidence", async () => {
  const capability = createGuideCorpusCapability({
    fetch: async () => json({
      ...guideFixture,
      ok: true,
      context: { ...guideFixture.context, web_search: { attempted: true, ok: true } },
      sources: [{ source_id: "source", title: "Title", url: "https://example.com", private: "drop" }],
      private: "drop",
    }),
  });
  const result = await capability.execute({ question: "Current?", locale: "en", web_search: true });
  assert.equal(result.current_information.verified, true);
  assert.deepEqual(Object.keys(result.sources[0]), ["source_id", "title", "url"]);
  assert.equal(JSON.stringify(result).includes("private"), false);
});

test("Guide failures expose a safe capability code", async () => {
  const capability = createGuideCorpusCapability({ fetch: async () => json({ error: "private database detail" }, 503) });
  await assert.rejects(
    capability.execute({ question: "Explain" }),
    error => error.code === "GUIDE_REQUEST_FAILED" && error.http_status === 503 && !error.message.includes("private"),
  );
});

let passed = 0;
const failures = [];
for (const item of tests) {
  try { await item.run(); passed += 1; }
  catch (error) { failures.push({ name: item.name, error: error.stack || error.message }); }
}
console.log(JSON.stringify({ ok: failures.length === 0, passed, failed: failures.length, total: tests.length, real_network_calls: 0, external_writes: 0, failures }, null, 2));
if (failures.length) process.exit(1);
