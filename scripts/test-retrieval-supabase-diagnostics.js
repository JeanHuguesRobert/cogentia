#!/usr/bin/env node

import assert from "node:assert/strict";
import { retrievalSupabasePackBatch } from "./lib/retrieval-supabase.js";

const baseOptions = {
  env: {
    SUPABASE_URL: "https://example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  },
  mode: "hybrid",
  limit: 2,
};

// A non-fulfiller must preserve the COP boundary: it describes the embedding
// continuation and lets FTS remain available, rather than issuing a hidden LLM call.
{
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const batch = await retrievalSupabasePackBatch(["public autonomy"], baseOptions);
    const pack = batch.packs[0];
    assert.equal(batch.ok, true);
    assert.equal(pack.ok, true);
    assert.equal(pack.mode, "hybrid");
    assert.equal(pack.diagnostic.code, "semantic_continuation_required");
    assert.equal(pack.diagnostic.next_action, "fulfill_query_embedding_continuation");
    assert.equal(calls.length, 1, "only FTS may run without an embedding fulfiller");
    assert.match(calls[0], /search_retrieval_chunks_fts/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// An explicit fulfiller with no credential yields a safe, actionable diagnostic.
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const batch = await retrievalSupabasePackBatch(["public autonomy"], {
      ...baseOptions,
      allowInlineEmbedFulfill: true,
    });
    const pack = batch.packs[0];
    assert.equal(pack.diagnostic.code, "missing_openai_api_key");
    assert.equal(pack.diagnostic.next_action, "configure_embedding_fulfiller");
    assert.equal(pack.diagnostic.provider, "openai");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// A fulfiller host may route the explicitly-authorized continuation through
// Magistral instead of bypassing its selected provider policy.
{
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/v1/embeddings")) {
      return new Response(JSON.stringify({ data: [{ embedding: [0.2, 0.4] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const batch = await retrievalSupabasePackBatch(["public autonomy"], {
      ...baseOptions,
      allowInlineEmbedFulfill: true,
      dimensions: 2,
      env: {
        ...baseOptions.env,
        OPENAI_API_KEY: "test-openai-key",
        COGENTIA_AI_ROUTER_URL: "http://127.0.0.1:8880",
      },
    });
    assert.equal(batch.packs[0].mode, "hybrid");
    assert.equal(calls[0], "http://127.0.0.1:8880/v1/embeddings");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log(JSON.stringify({ ok: true, test: "retrieval_supabase_diagnostics" }, null, 2));
