/**
 * Cogentia client for Inox inox.session.v1 retrieval loop.
 * POST /session/turn — continuations reinjected as fulfillment turns on same session_id.
 */

const DEFAULT_CORPUS = "cogentia-public";
const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;

const EVENT = {
  RETRIEVAL_BATCH: "retrieval.batch",
  FULFILLMENT: "fulfillment",
};

export function retrievalInoxConfigured(env = process.env) {
  const url = String(env.COGENTIA_INOX_RETRIEVAL_URL || env.INOX_RETRIEVAL_URL || "").trim();
  return Boolean(url);
}

export function inoxRetrievalBaseUrl(env = process.env) {
  return String(env.COGENTIA_INOX_RETRIEVAL_URL || env.INOX_RETRIEVAL_URL || "").replace(/\/$/, "");
}

export function inoxRetrievalToken(env = process.env) {
  return String(env.COGENTIA_INOX_SERVE_TOKEN || env.INOX_SERVE_TOKEN || "");
}

export async function retrievalInoxPackBatch(queries, options = {}) {
  const env = options.env || process.env;
  const base = inoxRetrievalBaseUrl(env);
  if (!base) return { ok: false, error: "inox_retrieval_not_configured" };

  const timeoutMs = Number(options.timeoutMs || env.COGENTIA_INOX_TIMEOUT_MS || 90000);
  const corpusKey = String(options.corpusKey || env.COGENTIA_RETRIEVAL_CORPUS_KEY || DEFAULT_CORPUS);
  const payload = {
    queries: queries.map(item => String(item || "").trim()).filter(Boolean),
    mode: String(options.mode || "hybrid"),
    corpus_key: corpusKey,
    index_hash: String(options.indexHash || env.COGENTIA_RETRIEVAL_INDEX_HASH || ""),
    limit: Number(options.limit || 4),
    budget: Number(options.budget || 2000),
    provider: String(options.provider || "openai"),
    model_name: String(options.modelName || DEFAULT_MODEL),
    dimensions: Number(options.dimensions || DEFAULT_DIMENSIONS),
  };

  if (!payload.queries.length) {
    return { ok: false, error: "missing_queries" };
  }

  let sessionId = options.sessionId || null;
  let packet = await sessionTurn(base, env, {
    session_id: sessionId || undefined,
    event: { kind: EVENT.RETRIEVAL_BATCH, payload },
  }, timeoutMs);

  if (packet.type === "continuation") {
    sessionId = packet.session_id;
    const fulfilled = await fulfillContinuationLocally(packet.continuation, env);
    if (!fulfilled.ok) {
      return {
        ok: false,
        error: "continuation_fulfillment_required",
        session_id: sessionId,
        continuation: packet.continuation,
        message: fulfilled.message || "Host must fulfill continuation or configure local capability secrets.",
      };
    }
    packet = await sessionTurn(base, env, {
      session_id: sessionId,
      event: {
        kind: EVENT.FULFILLMENT,
        continuation_id: packet.continuation.id,
        fulfillments: fulfilled.fulfillments,
      },
    }, timeoutMs);
  }

  if (packet.type === "error" || packet.ok === false) {
    return {
      ok: false,
      error: packet.error || "inox_session_failed",
      message: packet.message,
      session_id: packet.session_id || sessionId,
      packet,
    };
  }

  if (packet.type !== "result") {
    return {
      ok: false,
      error: "unexpected_inox_packet",
      session_id: packet.session_id || sessionId,
      packet,
    };
  }

  const body = packet.body && typeof packet.body === "object" ? packet.body : {};
  return {
    ...body,
    ok: body.ok !== false,
    session_id: packet.session_id || sessionId,
    retrieval_transport: "inox.session.v1",
    inox_duration_ms: packet.duration_ms,
  };
}

async function sessionTurn(base, env, body, timeoutMs) {
  const token = inoxRetrievalToken(env);
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${base}/session/turn`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(`Inox retrieval unavailable at ${base}: ${error.message}`);
  }

  const packet = await response.json().catch(() => ({}));
  if (!response.ok && !packet?.type) {
    throw new Error(`Inox session/turn HTTP ${response.status}: ${packet?.message || packet?.error || "request failed"}`);
  }
  return packet;
}

async function fulfillContinuationLocally(continuation, env) {
  const pending = Array.isArray(continuation?.pending) ? continuation.pending : [];
  if (!pending.length) return { ok: false, message: "continuation_has_no_pending_steps" };

  const fulfillments = [];
  for (const step of pending) {
    const result = await fulfillCapabilityStep(step, env);
    if (!result.ok) {
      return { ok: false, message: result.message || result.error, step_id: step.id };
    }
    fulfillments.push({ id: step.id, ok: true, result: result.result });
  }
  return { ok: true, fulfillments };
}

async function fulfillCapabilityStep(step, env) {
  const capability = String(step.capability || "");
  if (capability === "openai.embeddings") {
    const request = step.request || {};
    const embedded = await embedQuery(String(request.input || ""), {
      env,
      modelName: request.model || DEFAULT_MODEL,
      dimensions: Number(request.dimensions || DEFAULT_DIMENSIONS),
    });
    if (!embedded.ok) return embedded;
    return { ok: true, result: { ok: true, embedding: embedded.embedding } };
  }
  if (capability === "supabase.rpc") {
    const request = step.request || {};
    const rpc = await supabaseRpc(request.fn, request.args || {}, env);
    if (!rpc.ok) return rpc;
    return { ok: true, result: rpc };
  }
  return { ok: false, error: "unknown_capability", message: `Unsupported capability: ${capability}` };
}

async function embedQuery(query, options) {
  const apiKey = String(options.env?.OPENAI_API_KEY || options.env?.COGENTIA_OPENAI_API_KEY || "");
  if (!apiKey) {
    return { ok: false, error: "missing_openai_api_key", message: "Set OPENAI_API_KEY to fulfill embedding continuations locally." };
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

async function supabaseRpc(fn, args, env) {
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "supabase_not_configured", message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to fulfill RPC continuations locally." };
  }
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