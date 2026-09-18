#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildCognitiveDraft } from "./lib/agent-jhn-whatsapp/draft.js";

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({
  ok: true,
  answer: "Grounded Guide response.",
  sources: [],
  context: { excerpts: [] },
  warnings: [],
}), { status: 200, headers: { "Content-Type": "application/json" } });

const normalized = { text: "What is a Cognitive Packet?", remote_jid: "33600000000@s.whatsapp.net", conversation_id: "test" };
const config = { visible_agent_id: "agent-jhn-experimental", notice_url: "https://example.invalid/notice", mandate_id: "read-public" };
try {
  const enabled = await buildCognitiveDraft(normalized, config, { reasoningLoopV2Enabled: true, guideUrl: "http://guide.test/guide/chat" });
  assert.equal(enabled.reasoning_loop?.protocol, "cogentia.agent_john_reasoning_loop.v2");
  assert.equal(enabled.reasoning_loop_fallback, undefined);

  const fallback = await buildCognitiveDraft(normalized, config, {
    reasoningLoopV2Enabled: true,
    reasoningLoopV2ForceFailure: true,
    guideUrl: "http://guide.test/guide/chat",
  });
  assert.equal(fallback.reasoning_loop_fallback, true);
  assert.equal(fallback.reasoning_loop.error, "forced_v2_failure");
  console.log("ok - WhatsApp is an Agent John V2 projection and preserves its legacy fallback");
} finally {
  globalThis.fetch = originalFetch;
}
