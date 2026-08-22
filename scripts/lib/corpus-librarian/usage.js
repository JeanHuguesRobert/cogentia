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

  // include_text=1 returns gateway `text` (chunk body). Prefer this path
  // when the index already carries the span; /api/context/lines opens one file.
  const preferOpen = options.preferOpen === true;
  const searchResult = await searchUntilHits(tools, question, {
    limit: searchLimit,
    mode,
    repo: options.repo,
    include_text: options.includeSearchText !== false,
  }, { diagnostics, trace });

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
        why_relevant: "search_include_text",
      };
    } else if (preferOpen) {
      const opened = await tools.open({
        ref: hit.ref,
        start: hit.start_line,
        end: hit.end_line,
      });
      diagnostics.tool_calls += 1;
      diagnostics.open_calls += 1;
      diagnostics.path = "search_open";
      trace.push(step("corpus.open", opened.ok, { source_id: hit.source_id }));
      if (opened.ok && opened.excerpt?.text) {
        excerpt = {
          source_id: opened.excerpt.source_id || hit.source_id,
          text: opened.excerpt.text,
          why_relevant: "opened_span",
        };
      }
    } else if (hit.text) {
      excerpt = {
        source_id: hit.source_id,
        text: hit.text,
        why_relevant: "search_short_text",
      };
    }

    if (
      preferOpen
      && excerpt
      && excerpt.text.length < minOpenChars
      && typeof tools.expand === "function"
    ) {
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

/**
 * Keyword FTS often ANDs tokens: full natural questions return 0 hits.
 * Progressive queries: full → content words → top entity/token.
 */
async function searchUntilHits(tools, question, searchInput, { diagnostics, trace }) {
  const candidates = searchQueryCandidates(question);
  let last = { ok: false, hits: [], query: question };
  for (const query of candidates) {
    const result = await tools.search({ ...searchInput, query });
    diagnostics.tool_calls += 1;
    diagnostics.search_calls += 1;
    if (result.index_hash) diagnostics.index_hash = result.index_hash;
    diagnostics.path = diagnostics.search_calls === 1 ? "search_text" : "search_focused";
    trace.push(step("corpus.search", result.ok, {
      query,
      hit_count: result.hits?.length || 0,
      mode: result.mode,
    }));
    last = { ...result, query };
    if (result.ok && result.hits?.length) return last;
  }
  return last;
}

export function searchQueryCandidates(question) {
  const raw = String(question || "").trim();
  if (!raw) return [];
  const focused = focusSearchQuery(raw);
  const tokens = tokenizeContent(raw);
  const out = [];
  const push = value => {
    const q = String(value || "").trim();
    if (q && !out.includes(q)) out.push(q);
  };
  push(raw);
  push(focused);
  // Prefer distinctive multi-word phrases before single tokens.
  if (tokens.length >= 2) push(tokens.slice(0, 3).join(" "));
  if (tokens.length >= 2) push(tokens.slice(0, 2).join(" "));
  for (const token of tokens) push(token);
  return out.slice(0, 6);
}

export function focusSearchQuery(question) {
  return tokenizeContent(question).slice(0, 6).join(" ");
}

function tokenizeContent(question) {
  const stop = new Set([
    "a", "an", "the", "and", "or", "of", "to", "for", "in", "on", "at", "by", "with", "from", "as", "is", "are",
    "was", "were", "be", "been", "what", "why", "how", "when", "where", "which", "who", "whom", "this", "that",
    "these", "those", "it", "its", "do", "does", "did", "can", "could", "should", "would", "may", "might",
    "about", "into", "over", "under", "only", "just", "than", "then", "also", "very", "more", "most",
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "au", "aux", "en", "dans", "sur", "par",
    "pour", "avec", "sans", "est", "sont", "que", "qui", "quoi", "dont", "où", "ou", "comment", "pourquoi",
    "quel", "quelle", "quels", "quelles", "ce", "cet", "cette", "ces", "il", "elle", "on", "nous", "vous",
    "ils", "elles", "d", "l", "se", "sa", "son", "ses", "mon", "ton", "leur", "leurs", "ne", "pas", "plus",
    "moins", "tres", "très", "peut", "peuvent", "doit", "doivent", "elle", "faire", "etre", "être",
  ]);
  return String(question || "")
    .normalize("NFKC")
    .replace(/[?!.,;:()[\]{}"“”«»]/g, " ")
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3)
    .filter(token => !stop.has(token.toLowerCase()))
    .filter(token => !/^\d+$/.test(token));
}

function step(tool, ok, detail = {}) {
  return { tool, ok: Boolean(ok), ...detail };
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
