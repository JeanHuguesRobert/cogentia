/**
 * Deterministic tool usage for Cycle B:
 * search → open top-k → expand if span text is thin.
 * No LLM controller. Does not synthesize the user-facing answer.
 */

import { buildEvidencePacket } from "./packet.js";

export async function exploreCorpusDeterministic(input = {}, options = {}) {
  const question = String(input.question || input.text || "").trim();
  const tools = options.tools;
  if (!tools || typeof tools.search !== "function") {
    throw new Error("exploreCorpusDeterministic requires options.tools");
  }
  if (!question) {
    return {
      ok: false,
      stopReason: "empty_question",
      packet: buildEvidencePacket({ question: "", excerpts: [], gaps: ["empty_question"] }),
      trace: [],
    };
  }

  const locale = input.locale === "fr" ? "fr" : "en";
  const intent = String(input.intent || "explain");
  const freshnessRequired = Boolean(input.freshnessRequired);
  const searchLimit = boundedInteger(options.searchLimit, 6, 1, 20);
  const openTopK = boundedInteger(options.openTopK, 3, 1, 8);
  const minOpenChars = boundedInteger(options.minOpenChars, 80, 20, 2000);
  const mode = ["keyword", "hybrid", "semantic"].includes(options.mode) ? options.mode : "hybrid";

  const trace = [];
  const diagnostics = {
    tool_calls: 0,
    search_calls: 0,
    open_calls: 0,
    expand_calls: 0,
    index_hash: null,
    path: "search_open",
  };

  const searchResult = await tools.search({
    query: question,
    limit: searchLimit,
    mode,
    repo: options.repo,
    include_text: true,
  });
  diagnostics.tool_calls += 1;
  diagnostics.search_calls += 1;
  diagnostics.index_hash = searchResult.index_hash || null;
  trace.push(step("corpus.search", searchResult.ok, {
    hit_count: searchResult.hits?.length || 0,
    mode: searchResult.mode,
  }));

  if (!searchResult.ok || !searchResult.hits?.length) {
    return {
      ok: false,
      stopReason: "no_hits",
      packet: buildEvidencePacket({
        question, locale, intent, freshnessRequired,
        excerpts: [],
        gaps: ["no_search_hits"],
        diagnostics: { ...diagnostics, path: "search_empty" },
      }),
      trace,
      search: searchResult,
    };
  }

  const excerpts = [];
  const top = searchResult.hits.slice(0, openTopK);
  for (const hit of top) {
    let excerpt = null;
    if (hit.text && hit.text.length >= minOpenChars) {
      excerpt = {
        source_id: hit.source_id,
        text: hit.text,
        why_relevant: "search_snippet",
      };
    } else {
      const opened = await tools.open({
        ref: hit.ref,
        start: hit.start_line,
        end: hit.end_line,
      });
      diagnostics.tool_calls += 1;
      diagnostics.open_calls += 1;
      trace.push(step("corpus.open", opened.ok, { source_id: hit.source_id }));
      if (opened.ok && opened.excerpt?.text) {
        excerpt = {
          source_id: opened.excerpt.source_id || hit.source_id,
          text: opened.excerpt.text,
          why_relevant: "opened_span",
        };
      }
    }

    if (excerpt && excerpt.text.length < minOpenChars && typeof tools.expand === "function") {
      const expanded = await tools.expand({ hit, radius: options.expandRadius || 15 });
      diagnostics.tool_calls += 1;
      diagnostics.expand_calls += 1;
      diagnostics.path = "search_open_expand";
      trace.push(step("corpus.expand", expanded.ok, { source_id: hit.source_id }));
      if (expanded.ok && expanded.excerpt?.text) {
        excerpt = {
          source_id: expanded.excerpt.source_id || excerpt.source_id,
          text: expanded.excerpt.text,
          why_relevant: "expanded_span",
        };
      }
    }

    if (excerpt?.text) excerpts.push(excerpt);
  }

  const gaps = [];
  if (excerpts.length < 1) gaps.push("open_failed");
  if (excerpts.length === 1) gaps.push("single_excerpt");
  if (freshnessRequired) gaps.push("freshness_not_verified_in_cycle_b");

  const packet = buildEvidencePacket({
    question, locale, intent, freshnessRequired, excerpts, gaps, diagnostics,
  });

  return {
    ok: packet.coverage !== "none",
    stopReason: packet.coverage === "none" ? "no_excerpts" : "packet_ready",
    packet,
    trace,
    search: searchResult,
  };
}

function step(tool, ok, detail = {}) {
  return { tool, ok: Boolean(ok), ...detail };
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
