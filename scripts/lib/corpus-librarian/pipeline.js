/**
 * Cycle C pipeline: explore (tools) → evidence packet → synthesize (writer).
 */

import { analyzeQuestion } from "../agent-jhn-whatsapp/answer-core.js";
import { synthesizeFromPacket } from "./answer.js";
import { createCorpusLibrarianTools } from "./tools.js";
import { exploreCorpusDeterministic, focusSearchQuery } from "./usage.js";

/**
 * Librarian answer path (Cycle C).
 */
export async function answerWithLibrarian(input = {}, options = {}) {
  const question = String(input.question || input.text || "").trim();
  const analysis = analyzeQuestion({
    text: question,
    locale: input.locale,
    channel: input.channel || "api",
  });
  const tools = options.tools || createCorpusLibrarianTools({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    timeoutMs: options.toolTimeoutMs,
  });

  const exploreStarted = Date.now();
  const exploration = await exploreCorpusDeterministic({
    question,
    locale: analysis.locale,
    intent: analysis.intent,
    freshnessRequired: analysis.needsCurrentWeb,
  }, {
    tools,
    mode: options.mode || "keyword",
    openTopK: options.openTopK,
    searchLimit: options.searchLimit,
    minOpenChars: options.minOpenChars,
    preferOpen: options.preferOpen === true,
  });
  const exploreMs = Date.now() - exploreStarted;

  const synthStarted = Date.now();
  const synthesis = await synthesizeFromPacket(exploration.packet, {
    question,
    locale: analysis.locale,
    channel: input.channel || options.channel || "api",
    apiKey: options.apiKey,
    model: options.model,
    fetch: options.fetch,
    synthesizer: options.synthesizer,
    maxChars: options.maxChars,
    timeoutMs: options.synthTimeoutMs,
    injectAgentBrief: options.injectAgentBrief,
    agentBriefText: options.agentBriefText,
    agentBriefPath: options.agentBriefPath,
  });
  const synthMs = Date.now() - synthStarted;

  return {
    ok: Boolean(synthesis.ok && synthesis.answer),
    path: "librarian_c",
    answer: synthesis.answer || "",
    provider: synthesis.provider,
    model: synthesis.model,
    sources: synthesis.sources,
    critique: synthesis.critique,
    packet: exploration.packet,
    explore: {
      ok: exploration.ok,
      stopReason: exploration.stopReason,
      latencyMs: exploreMs,
      toolCalls: exploration.packet?.diagnostics?.tool_calls || 0,
      searchCalls: exploration.packet?.diagnostics?.search_calls || 0,
      path: exploration.packet?.diagnostics?.path || null,
    },
    synthesis: {
      latencyMs: synthMs,
      fallbackLevel: synthesis.fallbackLevel,
      diagnostics: synthesis.diagnostics,
    },
    latencyMs: exploreMs + synthMs,
    analysis,
    trace: exploration.trace,
  };
}

/**
 * L0-style baseline without Guide: one progressive search (first hit set only)
 * is already what librarian does; true L0 here is *single* keyword focus
 * (first content-token phrase) + same synthesizer — fewer tool retries.
 * Named baseline_retrieve for scorecard honesty when Guide is unavailable.
 */
export async function answerWithBaselineRetrieve(input = {}, options = {}) {
  const question = String(input.question || input.text || "").trim();
  const analysis = analyzeQuestion({
    text: question,
    locale: input.locale,
    channel: input.channel || "api",
  });
  const tools = options.tools || createCorpusLibrarianTools({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    timeoutMs: options.toolTimeoutMs,
  });

  const focused = focusSearchQuery(question) || question;
  const exploreStarted = Date.now();
  const search = await tools.search({
    query: focused,
    limit: options.searchLimit || 6,
    mode: options.mode || "keyword",
    include_text: true,
  });
  const hits = search.ok ? (search.hits || []).slice(0, options.openTopK || 3) : [];
  const excerpts = hits.filter(hit => hit.text).map(hit => ({
    source_id: hit.source_id,
    text: hit.text,
    why_relevant: "baseline_single_search",
  }));
  const packet = {
    protocol: "cogentia.evidence_packet/v1",
    question,
    locale: analysis.locale,
    intent: analysis.intent,
    coverage: excerpts.length >= 2 ? "enough" : excerpts.length === 1 ? "partial" : "none",
    excerpts,
    source_ids: excerpts.map(item => item.source_id),
    gaps: excerpts.length ? [] : ["no_search_hits"],
    freshness: { required: analysis.needsCurrentWeb, verified: false },
    diagnostics: {
      tool_calls: 1,
      search_calls: 1,
      open_calls: 0,
      expand_calls: 0,
      index_hash: search.index_hash || null,
      path: "baseline_single_focused_search",
      focused_query: focused,
    },
  };
  const exploreMs = Date.now() - exploreStarted;

  const synthStarted = Date.now();
  const synthesis = await synthesizeFromPacket(packet, {
    question,
    locale: analysis.locale,
    channel: input.channel || options.channel || "api",
    apiKey: options.apiKey,
    model: options.model,
    fetch: options.fetch,
    synthesizer: options.synthesizer,
    maxChars: options.maxChars,
    timeoutMs: options.synthTimeoutMs,
  });
  const synthMs = Date.now() - synthStarted;

  return {
    ok: Boolean(synthesis.ok && synthesis.answer),
    path: "baseline_retrieve",
    answer: synthesis.answer || "",
    provider: synthesis.provider,
    model: synthesis.model,
    sources: synthesis.sources,
    critique: synthesis.critique,
    packet,
    explore: {
      ok: excerpts.length > 0,
      stopReason: excerpts.length ? "packet_ready" : "no_hits",
      latencyMs: exploreMs,
      toolCalls: 1,
      searchCalls: 1,
      path: packet.diagnostics.path,
      focused_query: focused,
    },
    synthesis: {
      latencyMs: synthMs,
      fallbackLevel: synthesis.fallbackLevel,
      diagnostics: synthesis.diagnostics,
    },
    latencyMs: exploreMs + synthMs,
    analysis,
    trace: [{ tool: "corpus.search", ok: search.ok, query: focused, hit_count: hits.length }],
  };
}
