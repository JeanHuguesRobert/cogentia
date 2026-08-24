const DEFAULT_CORPUS = "cogentia-public";
const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_PROVIDER = "openai";
const DEFAULT_DIMENSIONS = 1536;

export function retrievalSupabaseConfigured(env = process.env) {
  return String(env.COGENTIA_RETRIEVAL_BACKEND || "").toLowerCase() === "supabase"
    && Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Lightweight remote inventory for Views Store / ops — counts & meta only.
 * Never downloads embedding vectors or chunk text bodies.
 */
export async function retrievalSupabaseStatus(options = {}) {
  const env = options.env || process.env;
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "");
  const corpusKey = String(options.corpusKey || env.COGENTIA_RETRIEVAL_CORPUS_KEY || DEFAULT_CORPUS);
  const backend = String(env.COGENTIA_RETRIEVAL_BACKEND || "").toLowerCase();

  if (!supabaseUrl || !serviceKey) {
    return {
      ok: false,
      configured: false,
      backend: backend || null,
      reason: "missing_SUPABASE_URL_or_key",
      message: "Supabase not configured in this environment (no row fetch attempted).",
    };
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: "count=exact",
  };

  try {
    // Total rows (metadata only via Content-Range)
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/retrieval_chunks?select=id&limit=1`,
      { headers }
    );
    const contentRange = countRes.headers.get("content-range") || "";
    const totalMatch = contentRange.match(/\/(\d+|\*)\s*$/);
    const totalRows = totalMatch && totalMatch[1] !== "*" ? Number(totalMatch[1]) : null;

    // Filtered count for corpus_key
    const corpusRes = await fetch(
      `${supabaseUrl}/rest/v1/retrieval_chunks?select=id&corpus_key=eq.${encodeURIComponent(corpusKey)}&limit=1`,
      { headers }
    );
    const corpusRange = corpusRes.headers.get("content-range") || "";
    const corpusMatch = corpusRange.match(/\/(\d+|\*)\s*$/);
    const corpusRows = corpusMatch && corpusMatch[1] !== "*" ? Number(corpusMatch[1]) : null;

    // Small metadata sample — no text, no embedding
    const metaRes = await fetch(
      `${supabaseUrl}/rest/v1/retrieval_chunks?select=corpus_key,index_hash,provider,model_name,dimensions,updated_at,repo&corpus_key=eq.${encodeURIComponent(corpusKey)}&order=updated_at.desc&limit=200`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    const metaText = await metaRes.text();
    let rows = [];
    try {
      rows = metaText ? JSON.parse(metaText) : [];
    } catch {
      rows = [];
    }
    if (!metaRes.ok) {
      return {
        ok: false,
        configured: true,
        backend: backend || "supabase",
        supabase_url_host: safeUrlHost(supabaseUrl),
        corpus_key: corpusKey,
        error: "supabase_meta_query_failed",
        message: typeof rows === "object" && rows?.message ? rows.message : metaText.slice(0, 200),
        total_rows: totalRows,
      };
    }

    const byProvider = new Map();
    const byRepo = new Map();
    const indexHashes = new Map();
    let latestUpdated = null;
    for (const row of rows) {
      const pk = `${row.provider || "?"}::${row.model_name || "?"}::${row.dimensions || "?"}`;
      byProvider.set(pk, (byProvider.get(pk) || 0) + 1);
      if (row.repo) byRepo.set(row.repo, (byRepo.get(row.repo) || 0) + 1);
      if (row.index_hash) indexHashes.set(row.index_hash, (indexHashes.get(row.index_hash) || 0) + 1);
      if (row.updated_at && (!latestUpdated || row.updated_at > latestUpdated)) {
        latestUpdated = row.updated_at;
      }
    }

    return {
      ok: true,
      configured: true,
      backend: backend || "supabase",
      supabase_url_host: safeUrlHost(supabaseUrl),
      corpus_key: corpusKey,
      total_rows: totalRows,
      corpus_rows: corpusRows,
      sample_size: rows.length,
      sample_note: "Provider/repo breakdown is from the latest 200 meta rows for this corpus_key (not a full scan).",
      latest_updated_at: latestUpdated,
      providers_sample: [...byProvider.entries()].map(([k, count]) => {
        const [provider, model_name, dimensions] = k.split("::");
        return { provider, model_name, dimensions: Number(dimensions) || dimensions, sample_count: count };
      }),
      repos_sample: [...byRepo.entries()]
        .map(([repo, sample_count]) => ({ repo, sample_count }))
        .sort((a, b) => b.sample_count - a.sample_count),
      index_hashes_sample: [...indexHashes.entries()]
        .map(([index_hash, sample_count]) => ({ index_hash, sample_count }))
        .sort((a, b) => b.sample_count - a.sample_count),
      vectors_included: false,
      text_bodies_included: false,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      backend: backend || "supabase",
      supabase_url_host: safeUrlHost(supabaseUrl),
      corpus_key: corpusKey,
      error: "supabase_status_failed",
      message: error.message || String(error),
    };
  }
}

function safeUrlHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export async function retrievalSupabasePackBatch(queries, options = {}) {
  const env = options.env || process.env;
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || "");
  const corpusKey = String(options.corpusKey || env.COGENTIA_RETRIEVAL_CORPUS_KEY || DEFAULT_CORPUS);
  const indexHash = String(options.indexHash || env.COGENTIA_RETRIEVAL_INDEX_HASH || "");
  const mode = String(options.mode || "hybrid");
  const limit = Number(options.limit || 4);
  const budget = Number(options.budget || 2000);
  const provider = String(options.provider || DEFAULT_PROVIDER);
  const modelName = String(options.modelName || DEFAULT_MODEL);
  const dimensions = Number(options.dimensions || DEFAULT_DIMENSIONS);

  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const packs = [];
  const warnings = [];
  for (const query of queries) {
    const normalized = String(query || "").trim();
    if (!normalized) {
      packs.push({ query: normalized, ok: false, error: "missing_query" });
      continue;
    }
    let pack;
    if (mode === "keyword") {
      pack = await keywordSearchSupabase(supabaseUrl, serviceKey, normalized, { corpusKey, indexHash, limit, budget });
    } else {
      pack = await hybridSearchSupabase(supabaseUrl, serviceKey, normalized, {
        corpusKey, indexHash, limit, budget, provider, modelName, dimensions, env,
        allowInlineEmbedFulfill: options.allowInlineEmbedFulfill === true,
        queryEmbedding: options.queryEmbedding,
      });
    }
    packs.push({ query: normalized, ...pack });
    warnings.push(...(pack.warnings || []));
  }

  return {
    ok: true,
    strategy: "retrieval-supabase-batch-v1",
    corpus_key: corpusKey,
    mode,
    packs,
    warnings: [...new Set(warnings)],
  };
}

async function hybridSearchSupabase(supabaseUrl, serviceKey, query, options) {
  const semantic = await semanticSearchSupabase(supabaseUrl, serviceKey, query, options);
  if (semantic.ok && semantic.sources?.length) return semantic;
  const keyword = await keywordSearchSupabase(supabaseUrl, serviceKey, query, options);
  if (keyword.ok) {
    return {
      ...keyword,
      mode: "hybrid",
      diagnostic: semantic.diagnostic || null,
      warnings: [
        `Semantic retrieval unavailable; fell back to keyword (${semantic.error || "no_semantic_results"}).`,
        ...(keyword.warnings || []),
      ],
    };
  }
  return semantic.ok ? keyword : semantic;
}

async function semanticSearchSupabase(supabaseUrl, serviceKey, query, options) {
  const embedding = await resolveQueryEmbedding(query, options);
  if (!embedding.ok) {
    return {
      ok: false,
      error: embedding.error || "semantic_continuation_required",
      query,
      mode: "semantic",
      warnings: embedding.warnings || [],
      diagnostic: embedding.diagnostic || null,
      continuation_required: embedding.error === "semantic_continuation_required",
    };
  }
  const rows = await supabaseRpc(supabaseUrl, serviceKey, "match_retrieval_chunks", {
    query_embedding: embedding.embedding,
    corpus_key: options.corpusKey,
    index_hash: options.indexHash || null,
    match_count: options.limit,
    provider_filter: options.provider,
    model_filter: options.modelName,
  });
  if (!rows.ok) {
    return { ok: false, error: rows.error, query, mode: "semantic", warnings: [rows.message || rows.error], diagnostic: rows.diagnostic || null };
  }
  return packFromRows(query, rows.data, {
    mode: "semantic",
    budget: options.budget,
    indexHash: options.indexHash,
    warnings: [`Semantic retrieval used Supabase pgvector (${options.modelName}, ${options.dimensions}d).`],
  });
}

async function keywordSearchSupabase(supabaseUrl, serviceKey, query, options) {
  const rows = await supabaseRpc(supabaseUrl, serviceKey, "search_retrieval_chunks_fts", {
    search_query: query,
    corpus_key: options.corpusKey,
    index_hash: options.indexHash || null,
    match_count: options.limit,
  });
  if (!rows.ok) {
    return { ok: false, error: rows.error, query, mode: "keyword", warnings: [rows.message || rows.error], diagnostic: rows.diagnostic || null };
  }
  return packFromRows(query, rows.data, {
    mode: "keyword",
    budget: options.budget,
    indexHash: options.indexHash,
    warnings: ["Keyword retrieval used Supabase FTS."],
  });
}

function packFromRows(query, rows, options) {
  const list = Array.isArray(rows) ? rows : [];
  const sources = [];
  const context = [];
  let used = 0;
  const budget = Number(options.budget || 2000);
  for (const row of list) {
    const sourceId = String(row.source_id || "");
    const text = String(row.text || "").trim();
    if (!sourceId || !text) continue;
    const estimate = Math.ceil(text.length / 4);
    if (used + estimate > budget && context.length) continue;
    sources.push({
      source_id: sourceId,
      repo: row.repo,
      path: row.path,
      title: row.title || "",
      heading_path: row.heading_path || "",
      start_line: row.start_line,
      end_line: row.end_line,
      role: row.role || "",
      visibility: row.visibility || "public",
      github_url: row.github_url || "",
    });
    context.push({ source_id: sourceId, text });
    used += estimate;
  }
  const indexHash = options.indexHash || list[0]?.index_hash || "";
  return {
    ok: true,
    query,
    mode: options.mode || "semantic",
    index_hash: indexHash,
    schema_version: "0.1",
    sources,
    context,
    pack_hash: `supabase-${options.mode}-${query.length}-${sources.length}`,
    warnings: options.warnings || [],
    diagnostic: options.diagnostic || null,
    budget: { max_tokens: budget, used_tokens_estimate: used },
  };
}

/**
 * Resolve a query embedding without hiding provider judgment in the tool path.
 * Prefer options.queryEmbedding (from a fulfilled continuation / cache).
 * Inline OpenAI call only when explicitly allowed (fulfiller mode).
 */
async function resolveQueryEmbedding(query, options = {}) {
  if (Array.isArray(options.queryEmbedding) && options.queryEmbedding.length) {
    return { ok: true, embedding: options.queryEmbedding, source: "provided" };
  }
  const env = options.env || process.env;
  const allowInline = options.allowInlineEmbedFulfill === true
    || String(env.COGENTIA_ALLOW_INLINE_EMBED_FULFILL || "").trim() === "1";
  if (!allowInline) {
    return {
      ok: false,
      error: "semantic_continuation_required",
      diagnostic: embeddingDiagnostic("semantic_continuation_required", options, { retryable: false, next_action: "fulfill_query_embedding_continuation" }),
      warnings: [
        "Supabase semantic search needs a query embedding from a fulfilled continuation (or options.queryEmbedding). Set COGENTIA_ALLOW_INLINE_EMBED_FULFILL=1 only for explicit fulfiller hosts.",
      ],
    };
  }
  return embedQueryAsFulfiller(query, options);
}

/** Explicit fulfiller: host opted into provider call to complete a continuation. */
async function embedQueryAsFulfiller(query, options = {}) {
  const env = options.env || process.env;
  const apiKey = String(env.OPENAI_API_KEY || env.COGENTIA_OPENAI_API_KEY || "");
  if (!apiKey) {
    return {
      ok: false,
      error: "missing_openai_api_key",
      diagnostic: embeddingDiagnostic("missing_openai_api_key", options, { retryable: false, next_action: "configure_embedding_fulfiller" }),
      warnings: ["Set OPENAI_API_KEY for explicit embed fulfillment."],
    };
  }
  let response;
  try {
    response = await fetch(resolveEmbeddingFulfillerUrl(env), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: options.modelName || DEFAULT_MODEL, input: query, dimensions: options.dimensions || DEFAULT_DIMENSIONS }),
    });
  } catch {
    return {
      ok: false,
      error: "embedding_provider_unreachable",
      diagnostic: embeddingDiagnostic("embedding_provider_unreachable", options, { retryable: true, next_action: "retry_or_check_embedding_provider" }),
      warnings: ["Query embedding provider could not be reached."],
    };
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = Number(response.status || 0);
    const code = status === 401 || status === 403 ? "embedding_auth_failed" : status === 429 ? "embedding_rate_limited" : "embedding_provider_http_error";
    return {
      ok: false,
      error: "query_embedding_failed",
      diagnostic: embeddingDiagnostic(code, options, {
        upstream_status: status || null,
        retryable: status === 408 || status === 409 || status === 429 || status >= 500,
        next_action: status === 401 || status === 403 ? "check_embedding_credentials" : "retry_or_check_embedding_provider",
      }),
      warnings: [`Query embedding provider returned HTTP ${status || "error"}.`],
    };
  }
  const embedding = body?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    return {
      ok: false,
      error: "invalid_embedding_response",
      diagnostic: embeddingDiagnostic("invalid_embedding_response", options, { retryable: false, next_action: "check_embedding_provider_contract" }),
    };
  }
  return { ok: true, embedding, source: "inline_fulfiller" };
}

function embeddingDiagnostic(code, options = {}, extra = {}) {
  return {
    protocol: "cogentia.retrieval-diagnostic/v1",
    phase: "query_embedding",
    code,
    provider: String(options.provider || DEFAULT_PROVIDER),
    model: String(options.modelName || DEFAULT_MODEL),
    dimensions: Number(options.dimensions || DEFAULT_DIMENSIONS),
    upstream_status: extra.upstream_status || null,
    retryable: Boolean(extra.retryable),
    next_action: extra.next_action || null,
  };
}

function resolveEmbeddingFulfillerUrl(env = {}) {
  const explicit = String(env.COGENTIA_EMBEDDING_FULFILLER_URL || env.MAGISTRAL_EMBEDDING_URL || "").trim();
  if (explicit) return explicit;
  const router = String(env.COGENTIA_AI_ROUTER_URL || "").replace(/\/$/, "");
  return router ? `${router}/v1/embeddings` : "https://api.openai.com/v1/embeddings";
}

async function supabaseRpc(supabaseUrl, serviceKey, fn, args) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = null;
  }
  if (!response.ok) {
    const status = Number(response.status || 0);
    return {
      ok: false,
      error: "supabase_rpc_failed",
      message: `Supabase RPC ${fn} returned HTTP ${status || "error"}.`,
      fn,
      diagnostic: {
        protocol: "cogentia.retrieval-diagnostic/v1",
        phase: "vector_search",
        code: "supabase_rpc_failed",
        upstream_status: status || null,
        retryable: status === 408 || status === 409 || status === 429 || status >= 500,
        next_action: "check_supabase_retrieval_rpc",
      },
    };
  }
  return { ok: true, data };
}
