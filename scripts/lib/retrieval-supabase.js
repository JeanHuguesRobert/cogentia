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
      warnings: [
        `Semantic retrieval unavailable; fell back to keyword (${semantic.error || "no_semantic_results"}).`,
        ...(keyword.warnings || []),
      ],
    };
  }
  return semantic.ok ? keyword : semantic;
}

async function semanticSearchSupabase(supabaseUrl, serviceKey, query, options) {
  const embedding = await embedQuery(query, options);
  if (!embedding.ok) {
    return { ok: false, error: embedding.error, query, mode: "semantic", warnings: embedding.warnings || [] };
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
    return { ok: false, error: rows.error, query, mode: "semantic", warnings: [rows.message || rows.error] };
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
    return { ok: false, error: rows.error, query, mode: "keyword", warnings: [rows.message || rows.error] };
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
    budget: { max_tokens: budget, used_tokens_estimate: used },
  };
}

async function embedQuery(query, options) {
  const apiKey = String(options.env?.OPENAI_API_KEY || options.env?.COGENTIA_OPENAI_API_KEY || "");
  if (!apiKey) {
    return { ok: false, error: "missing_openai_api_key", warnings: ["Set OPENAI_API_KEY for Supabase semantic retrieval."] };
  }
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.modelName || DEFAULT_MODEL,
      input: query,
      dimensions: options.dimensions || DEFAULT_DIMENSIONS,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: "query_embedding_failed", message: body?.error?.message || response.statusText };
  }
  const embedding = body?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) return { ok: false, error: "invalid_embedding_response" };
  return { ok: true, embedding };
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
    const message = typeof data === "object" ? (data.message || data.error || text) : text;
    return { ok: false, error: "supabase_rpc_failed", message, fn };
  }
  return { ok: true, data };
}