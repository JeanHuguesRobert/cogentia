#!/usr/bin/env node
/**
 * Unit tests for JHN OpenAI surface (auth + models + path matching).
 * No live daemon required.
 */
import assert from "node:assert/strict";
import { createJhnOpenAiSurface, isTwinOpenAiPath } from "./lib/jhn-openai-surface.js";

const OWNER = "test-owner-master-key-jhr";
const PUBLIC = "test-public-key";

function mockReq(auth) {
  return { headers: auth ? { authorization: auth } : {} };
}

// Paths
assert.equal(isTwinOpenAiPath("/guide/v1/models"), true);
assert.equal(isTwinOpenAiPath("/guide/v1/chat/completions"), true);
assert.equal(isTwinOpenAiPath("/twin/jhn/v1/models"), true);
assert.equal(isTwinOpenAiPath("/v1/chat/completions"), true);
assert.equal(isTwinOpenAiPath("/guide/chat"), false);

// Anon public when no public key required
{
  const surface = createJhnOpenAiSurface({
    ownerKey: () => OWNER,
    publicKey: () => "",
    produceAnswer: async () => ({ ok: true, answer: "hi", sources: [] }),
  });
  const a = surface.resolveAccess(mockReq());
  assert.equal(a.ok, true);
  assert.equal(a.access_class, "public");
  assert.ok(a.models.includes("jhn-public"));
  assert.ok(!a.models.includes("jhn-owner"));
}

// Owner key
{
  const surface = createJhnOpenAiSurface({
    ownerKey: () => OWNER,
    publicKey: () => "",
    produceAnswer: async () => ({ ok: true, answer: "hi" }),
  });
  const a = surface.resolveAccess(mockReq(`Bearer ${OWNER}`));
  assert.equal(a.access_class, "owner");
  assert.ok(a.models.includes("jhn-owner"));
}

// Wrong key rejected
{
  const surface = createJhnOpenAiSurface({
    ownerKey: () => OWNER,
    publicKey: () => "",
    produceAnswer: async () => ({ ok: true, answer: "hi" }),
  });
  const a = surface.resolveAccess(mockReq("Bearer wrong"));
  assert.equal(a.ok, false);
  assert.equal(a.status, 401);
}

// Public key required mode
{
  const surface = createJhnOpenAiSurface({
    ownerKey: () => OWNER,
    publicKey: () => PUBLIC,
    produceAnswer: async () => ({ ok: true, answer: "hi" }),
  });
  assert.equal(surface.resolveAccess(mockReq()).ok, false);
  assert.equal(surface.resolveAccess(mockReq(`Bearer ${PUBLIC}`)).access_class, "public");
  assert.equal(surface.resolveAccess(mockReq(`Bearer ${OWNER}`)).access_class, "owner");
}

// Extract messages
{
  const surface = createJhnOpenAiSurface({
    produceAnswer: async () => ({ ok: true, answer: "x" }),
  });
  const { question, history } = surface.extractQuestionAndHistory({
    messages: [
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "second question" },
    ],
  });
  assert.equal(question, "second question");
  assert.equal(history.length, 2);
}

// handleModels JSON
{
  const surface = createJhnOpenAiSurface({
    ownerKey: () => OWNER,
    publicKey: () => "",
    produceAnswer: async () => ({ ok: true, answer: "hi" }),
  });
  let status = 0;
  let body = null;
  await surface.handleModels(mockReq(), {}, (res, s, b) => {
    status = s;
    body = b;
  });
  assert.equal(status, 200);
  assert.equal(body.object, "list");
  assert.ok(body.data.some((m) => m.id === "jhn-public"));
  assert.ok(!body.data.some((m) => m.id === "jhn-owner"));
}

console.log(JSON.stringify({ ok: true, test: "jhn-openai-surface" }, null, 2));
