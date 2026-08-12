#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  answerWithLibrarian,
  assessPacketSufficiency,
  buildEvidencePacket,
  createCorpusLibrarianTools,
  exploreCorpusDeterministic,
  packetToRetrieval,
  parseSourceId,
  searchQueryCandidates,
  synthesizeFromPacket,
} from "./lib/corpus-librarian/index.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });

function mockFetch(routes) {
  return async (url) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, "");
    for (const route of routes) {
      if (route.match(path)) {
        const body = typeof route.body === "function" ? route.body(path) : route.body;
        return new Response(JSON.stringify(body), {
          status: route.status || 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404 });
  };
}

test("parseSourceId reads stable gateway ids", () => {
  assert.deepEqual(parseSourceId("cogentia:docs/x.md#L10-L20"), {
    ref: "cogentia:docs/x.md",
    start: 10,
    end: 20,
    source_id: "cogentia:docs/x.md#L10-L20",
  });
});

test("buildEvidencePacket dedupes and sets coverage", () => {
  const packet = buildEvidencePacket({
    question: "What is Cogentia?",
    excerpts: [
      { source_id: "a#L1-L2", text: "Cogentia is a corpus." },
      { source_id: "a#L1-L2", text: "duplicate" },
      { source_id: "b#L1-L2", text: "Public retrieval gateway." },
    ],
  });
  assert.equal(packet.excerpts.length, 2);
  assert.equal(packet.coverage, "enough");
  assert.equal(assessPacketSufficiency(packet).sufficient, true);
});

test("tools.search normalizes hits from context gateway", async () => {
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([{
      match: (path) => path.startsWith("/api/context/search"),
      body: {
        ok: true,
        mode: "keyword",
        index_hash: "idx1",
        results: [{
          id: "cogentia:docs/cogentia-index-layer.md#L1-L12",
          repo: "cogentia",
          path: "docs/cogentia-index-layer.md",
          start_line: 1,
          end_line: 12,
          title: "Index layer",
          score: 0.9,
          text: "short",
        }],
      },
    }]),
  });
  const result = await tools.search({ query: "index", limit: 3, mode: "keyword" });
  assert.equal(result.ok, true);
  assert.equal(result.hits.length, 1);
  assert.equal(result.hits[0].ref, "cogentia:docs/cogentia-index-layer.md");
  assert.equal(result.hits[0].start_line, 1);
});

test("tools.open and expand call lines endpoint", async () => {
  let opened = 0;
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([{
      match: (path) => {
        if (!path.startsWith("/api/context/lines")) return false;
        opened += 1;
        return true;
      },
      body: (path) => {
        const url = new URL(path, "http://gateway.test");
        return {
          ok: true,
          source_id: `cogentia:docs/x.md#L${url.searchParams.get("start")}-L${url.searchParams.get("end")}`,
          text: "Indexed Markdown remains the canonical corpus source of truth for retrieval.",
        };
      },
    }]),
  });
  const open = await tools.open({ ref: "cogentia:docs/x.md", start: 10, end: 12 });
  assert.equal(open.ok, true);
  assert.match(open.excerpt.text, /canonical corpus/);
  const expanded = await tools.expand({
    hit: { ref: "cogentia:docs/x.md", start_line: 10, end_line: 12, source_id: "cogentia:docs/x.md#L10-L12" },
    radius: 5,
  });
  assert.equal(expanded.ok, true);
  assert.equal(opened, 2);
  assert.equal(expanded.excerpt.start_line, 5);
});

test("deterministic explore uses search include_text packet without LLM", async () => {
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([
      {
        match: (path) => path.startsWith("/api/context/search"),
        body: {
          ok: true,
          mode: "hybrid",
          index_hash: "idx2",
          results: [
            {
              id: "cogentia:docs/a.md#L1-L3",
              repo: "cogentia",
              path: "docs/a.md",
              start_line: 1,
              end_line: 3,
              text: "Cogentia indexes Markdown for public retrieval and citation.",
            },
            {
              id: "cogentia:docs/b.md#L4-L8",
              repo: "cogentia",
              path: "docs/b.md",
              start_line: 4,
              end_line: 8,
              text: "The context gateway exposes search, pack, and line open over the index.",
            },
          ],
        },
      },
    ]),
  });

  const result = await exploreCorpusDeterministic(
    { question: "How does Cogentia retrieve markdown?", locale: "en", intent: "explain" },
    { tools, openTopK: 2, minOpenChars: 40, mode: "hybrid" },
  );

  assert.equal(result.ok, true);
  assert.equal(result.stopReason, "packet_ready");
  assert.equal(result.packet.protocol, "cogentia.evidence_packet/v1");
  assert.ok(result.packet.excerpts.length >= 2);
  assert.equal(result.packet.diagnostics.search_calls, 1);
  assert.equal(result.packet.diagnostics.open_calls, 0);
  assert.equal(result.packet.diagnostics.path, "search_text");
  assert.equal(result.packet.diagnostics.tool_calls, result.trace.length);
  assert.ok(result.trace.every(item => item.tool.startsWith("corpus.")));
  assert.equal(result.answer, undefined);
});

test("snippet field from gateway maps into hit text", async () => {
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([{
      match: (path) => path.startsWith("/api/context/search"),
      body: {
        ok: true,
        results: [{
          id: "cogentia:docs/x.md#L1-L2",
          repo: "cogentia",
          path: "docs/x.md",
          start_line: 1,
          end_line: 2,
          snippet: "Only snippet available without include_text.",
        }],
      },
    }]),
  });
  const result = await tools.search({ query: "x" });
  assert.equal(result.hits[0].text.includes("snippet"), true);
});

test("searchQueryCandidates reduces natural questions for keyword FTS", () => {
  const candidates = searchQueryCandidates("Explain FractaVolta simply for a first-time visitor.");
  assert.ok(candidates[0].includes("Explain FractaVolta"));
  assert.ok(candidates.some(item => item === "FractaVolta" || item.includes("FractaVolta")));
  assert.ok(candidates.length >= 2);
});

test("focused search retries when the full question has zero hits", async () => {
  let calls = 0;
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([{
      match: (path) => path.startsWith("/api/context/search"),
      body: (path) => {
        calls += 1;
        const q = new URL(path, "http://gateway.test").searchParams.get("q") || "";
        if (q.includes("Explain FractaVolta simply")) {
          return { ok: true, results: [] };
        }
        return {
          ok: true,
          mode: "keyword",
          results: [{
            id: "FractaVolta:research/paper.md#L1-L8",
            repo: "FractaVolta",
            path: "research/paper.md",
            start_line: 1,
            end_line: 8,
            text: "FractaVolta is a local capacity energy infrastructure proposal.",
          }],
        };
      },
    }]),
  });
  const result = await exploreCorpusDeterministic({
    question: "Explain FractaVolta simply for a first-time visitor.",
    locale: "en",
  }, { tools, mode: "keyword", openTopK: 1, minOpenChars: 20 });
  assert.equal(result.ok, true);
  assert.ok(calls >= 2);
  assert.ok(result.packet.excerpts[0].text.includes("FractaVolta"));
});

test("empty search yields none coverage", async () => {
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([{
      match: (path) => path.startsWith("/api/context/search"),
      body: { ok: true, results: [] },
    }]),
  });
  const result = await exploreCorpusDeterministic({ question: "zzzz-unknown" }, { tools });
  assert.equal(result.ok, false);
  assert.equal(result.packet.coverage, "none");
  assert.ok(result.packet.gaps.includes("no_search_hits"));
});

test("packetToRetrieval feeds answer-core claim shape", () => {
  const retrieval = packetToRetrieval({
    excerpts: [{ source_id: "a#L1-L2", text: "Claim text here." }],
    source_ids: ["a#L1-L2"],
    freshness: { required: false, verified: false },
  });
  assert.equal(retrieval.context.excerpts[0].source_id, "a#L1-L2");
  assert.equal(retrieval.ok, true);
});

test("synthesizeFromPacket falls back extractively without API key", async () => {
  const packet = buildEvidencePacket({
    question: "What is Cogentia?",
    locale: "en",
    excerpts: [
      { source_id: "cogentia:docs/x.md#L1-L4", text: "Cogentia is a public corpus and retrieval system." },
      { source_id: "cogentia:docs/y.md#L2-L5", text: "It indexes Markdown for citation-grade answers." },
    ],
  });
  const result = await synthesizeFromPacket(packet, { apiKey: "", channel: "api" });
  assert.equal(result.ok, true);
  assert.equal(result.provider, "extractive-fallback");
  assert.match(result.answer, /Cogentia is a public corpus/);
  assert.match(result.answer, /\[cogentia:docs\/x\.md#L1-L4\]/);
});

test("answerWithLibrarian explores then synthesizes without network LLM", async () => {
  const tools = createCorpusLibrarianTools({
    baseUrl: "http://gateway.test",
    fetch: mockFetch([{
      match: (path) => path.startsWith("/api/context/search"),
      body: {
        ok: true,
        results: [{
          id: "cogentia:docs/a.md#L1-L5",
          repo: "cogentia",
          path: "docs/a.md",
          start_line: 1,
          end_line: 5,
          text: "Cogentia exposes a context gateway over indexed Markdown documents.",
        }],
      },
    }]),
  });
  const result = await answerWithLibrarian(
    { question: "What is the context gateway?", locale: "en" },
    { tools, apiKey: "", mode: "keyword", openTopK: 1, minOpenChars: 20 },
  );
  assert.equal(result.ok, true);
  assert.equal(result.path, "librarian_c");
  assert.ok(result.explore.toolCalls >= 1);
  assert.match(result.answer, /context gateway|Markdown/i);
  assert.equal(result.provider, "extractive-fallback");
});

let failed = 0;
for (const item of tests) {
  try {
    await item.run();
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}: ${error.stack || error.message}`);
  }
}

console.log(JSON.stringify({
  ok: failed === 0,
  passed: tests.length - failed,
  failed,
  total: tests.length,
  cycle: "B+C",
  network_calls: 0,
  llm_calls: 0,
}, null, 2));
if (failed) process.exit(1);
