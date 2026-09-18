#!/usr/bin/env node
import assert from "node:assert/strict";
import { createOpenAiStepReasoner } from "./lib/agent-jhn-whatsapp/openai-step-reasoner.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
function response(content, status = 200) {
  const body = status === 200 ? { choices: [{ message: { content } }] } : content;
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const state = {
  input: { text: "What is current?" },
  observations: [{ type: "capability_result", capability: "corpus.search", ok: true, value: { excerpts: ["public"] } }],
  capabilities: [{ name: "web.search", description: "Search current public web", kind: "mcp", risk: "read_only", costUnits: 2, resultVisibility: "reasoner", inputSchema: { type: "object" } }],
  bounds: { maxSteps: 4 },
  nextSequence: 2,
};

test("adapter returns one structured capability step", async () => {
  let requestBody;
  const adapter = createOpenAiStepReasoner({
    apiKey: "test-key-never-sent",
    model: "gpt-5.6-terra",
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return response('{"kind":"capability_call","capability":"web.search","input":{"q":"FractaVolta"}}');
    },
  });
  const step = await adapter.nextStep(state);
  assert.deepEqual(step, { kind: "capability_call", capability: "web.search", input: { q: "FractaVolta" } });
  assert.equal(requestBody.model, "gpt-5.6-terra");
  assert.equal(requestBody.response_format.type, "json_object");
  assert.equal(requestBody.messages[1].content.includes("Search current public web"), true);
  assert.equal(requestBody.messages[0].content.includes("hidden chain-of-thought"), true);
});

test("adapter accepts fenced JSON but returns no prose wrapper", async () => {
  const adapter = createOpenAiStepReasoner({ apiKey: "test", fetch: async () => response('```json\n{"kind":"answer","answer":"Grounded."}\n```') });
  assert.deepEqual(await adapter.nextStep(state), { kind: "answer", answer: "Grounded." });
});

test("invalid JSON fails with a safe machine code", async () => {
  const adapter = createOpenAiStepReasoner({ apiKey: "test", fetch: async () => response("private malformed response") });
  await assert.rejects(adapter.nextStep(state), error => error.code === "INVALID_STEP_JSON" && !error.message.includes("private malformed response"));
});

test("provider errors expose status and safe code only", async () => {
  const adapter = createOpenAiStepReasoner({ apiKey: "test", fetch: async () => response({ error: { code: "rate_limit_exceeded", message: "private" } }, 429) });
  await assert.rejects(adapter.nextStep(state), error => error.code === "rate_limit_exceeded" && error.http_status === 429 && !error.message.includes("private"));
});

let passed = 0;
const failures = [];
for (const item of tests) {
  try { await item.run(); passed += 1; }
  catch (error) { failures.push({ name: item.name, error: error.stack || error.message }); }
}
console.log(JSON.stringify({ ok: failures.length === 0, passed, failed: failures.length, total: tests.length, real_network_calls: 0, failures }, null, 2));
if (failures.length) process.exit(1);
