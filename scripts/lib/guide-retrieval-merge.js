export function mergeGuideRetrievalFromPacks({
  question,
  plan,
  queries,
  packs,
  guideLimit,
  guideBudget,
  guideQueryLimit,
  options = {},
  helpers,
}) {
  const {
    emitGuideProgress,
    guideProgress,
    safeSources,
    summarizePackRetrieval,
    estimateGuideTokens,
    truncateGuideText,
    rankGuideSources,
  } = helpers;

  const attempts = [];
  const sources = [];
  const context = [];
  const warnings = [];
  const seenSources = new Set();
  const sourceRanks = new Map();
  let usedTokens = 0;

  for (const [queryIndex, query] of queries.entries()) {
    emitGuideProgress(options, "guide_status", {
      stage: "retrieval_query",
      query,
      message: guideProgress(options.locale, "retrieval_query", { query }).message,
    });

    const pack = packs.get(query) || { ok: false, error: "missing_pack", query };
    const packSources = safeSources(pack.sources);
    const retrieval = summarizePackRetrieval(pack);
    attempts.push({
      query,
      ok: Boolean(pack.ok),
      count: packSources.length,
      mode: retrieval.mode,
      retrieval,
      pack_hash: pack.pack_hash,
      source_ids: packSources.map(source => source.source_id),
      error: pack.ok ? undefined : (pack.error || pack.message),
    });
    emitGuideProgress(options, "guide_retrieval_query", {
      stage: "retrieval_query_done",
      query,
      ok: Boolean(pack.ok),
      count: packSources.length,
      mode: retrieval.mode,
      retrieval,
      source_ids: packSources.map(source => source.source_id),
      pack_hash: pack.pack_hash,
      warnings: pack.warnings || [],
      message: guideProgress(options.locale, "retrieval_query_done", { count: packSources.length }).message,
    });
    warnings.push(...(pack.warnings || []));

    const contextBySource = new Map((Array.isArray(pack.context) ? pack.context : []).map(item => [String(item.source_id || ""), item]));
    for (const source of packSources) {
      if (!source.source_id || seenSources.has(source.source_id)) continue;
      const item = contextBySource.get(source.source_id);
      const text = String(item?.text || "").trim();
      if (!text) continue;
      const estimate = estimateGuideTokens(text);
      if (usedTokens + estimate > guideBudget && context.length) continue;
      seenSources.add(source.source_id);
      sourceRanks.set(source.source_id, {
        query,
        query_index: queryIndex,
        source_index: sources.length,
      });
      sources.push(source);
      context.push({
        source_id: source.source_id,
        text: truncateGuideText(text, Math.max(512, guideBudget - usedTokens)),
      });
      usedTokens += estimate;
      if (sources.length >= guideLimit || usedTokens >= guideBudget) break;
    }
    if (sources.length >= guideLimit || usedTokens >= guideBudget) break;
  }

  const ranked = rankGuideSources(question, queries, sources, context, sourceRanks);
  return {
    strategy: "guide-retrieval-run-v1",
    planner: {
      strategy: plan.strategy,
      source: plan.source,
      objective: plan.objective,
      notes: plan.notes || [],
      error: plan.planner_error || undefined,
    },
    query_limit: guideQueryLimit,
    queries,
    attempts,
    sources: ranked.sources,
    context: ranked.context,
    warnings: [...new Set(warnings)],
  };
}