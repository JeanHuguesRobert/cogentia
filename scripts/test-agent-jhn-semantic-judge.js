#!/usr/bin/env node
import assert from "node:assert/strict";
import { createOpenAiSemanticJudge } from "./lib/agent-jhn-whatsapp/semantic-judge.js";

let requestBody;
const judge = createOpenAiSemanticJudge({
  apiKey: "test-key-never-sent",
  fetch: async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      winner: "B", confidence: 0.9, critical_regression: { A: false, B: false },
      scores: { A: { correctness: 3, relevance: 3, grounding: 2, epistemic_caution: 4, whatsapp_usability: 3, language: 5 }, B: { correctness: 5, relevance: 5, grounding: 5, epistemic_caution: 5, whatsapp_usability: 4, language: 5 } },
      reasons: ["B is better grounded."],
    }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});
const result = await judge.judge({ question: "Explain", candidate_A: "A", candidate_B: "B" });
assert.equal(result.winner, "B");
assert.equal(result.scores.B.grounding, 5);
assert.equal(requestBody.response_format.type, "json_object");
assert.match(requestBody.messages[0].content, /anonymous/);
assert.equal(JSON.stringify(requestBody).includes("test-key-never-sent"), false);
console.log(JSON.stringify({ ok: true, passed: 5, failed: 0, real_network_calls: 0 }, null, 2));
