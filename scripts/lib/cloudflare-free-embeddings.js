/**
 * Free-plan-only Magistral embedding route for the #338 pilot.
 *
 * This adapter cannot address a paid provider directly: the only endpoint is a
 * trusted loopback Magistral service whose effective Free-plan configuration
 * must be rechecked before EVERY batch. COP admission is a separate necessary
 * condition of any real effect; endpoint reachability is not a mandate.
 */
const APPROVED_MODELS = Object.freeze({
  "@cf/google/embeddinggemma-2": 768,
  "@cf/qwen/qwen3-embedding-0.6b": 1024,
});

export async function requestFreeCloudflareEmbeddings({
  texts, model, dimensions, baseUrl = "http://127.0.0.1:8880",
  apiKey = "", fetchImpl = fetch, timeoutMs = 20000,
  maxBillableUsd = "", effectAdmitted = false,
} = {}) {
  if (String(maxBillableUsd) !== "0") throw new Error("cloudflare_zero_budget_required");
  if (!effectAdmitted) throw new Error("cloudflare_cop_admission_required");
  if (!Object.hasOwn(APPROVED_MODELS, model) || APPROVED_MODELS[model] !== Number(dimensions)) {
    throw new Error("cloudflare_embedding_profile_unrecognized");
  }
  if (!Array.isArray(texts) || !texts.length || !texts.every(v => typeof v === "string" && v.trim())) {
    throw new Error("cloudflare_embedding_input_invalid");
  }
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("cloudflare_magistral_loopback_only");
  }
  const headers = {Accept: "application/json"};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const controller = AbortSignal.timeout(timeoutMs);
  const statusUrl = new URL("/v1/magistral/embeddings/status", url);
  const statusResponse = await fetchImpl(statusUrl, {
    method:"GET", headers, redirect:"error", signal: controller,
  });
  if (!statusResponse.ok) throw new Error("cloudflare_magistral_status_unreachable");
  const status = await statusResponse.json().catch(() => null);
  if (!status || status.provider !== "cloudflare" || status.model !== model
      || status.dimensions !== Number(dimensions) || status.enabled !== true
      || status.configured !== true || status.free_plan_verified !== true
      || status.budget_zero !== true) {
    throw new Error("cloudflare_verified_free_profile_missing");
  }
  const response = await fetchImpl(new URL("/v1/embeddings", url), {
    method:"POST", headers:{...headers, "Content-Type":"application/json"},
    redirect:"error", signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({model,input:texts,dimensions,embedding_role:"document"}),
  });
  if (!response.ok) {
    const err = new Error(response.status === 429 ? "cloudflare_rate_limited" : "cloudflare_embed_http_error");
    err.status = response.status;
    const retryAfter = response.headers?.get?.("Retry-After");
    if (/^\d{1,6}$/.test(retryAfter || "")) err.retryAfterSeconds = Math.min(86400,Number(retryAfter));
    // Magistral projects the upstream delay into its JSON error envelope.
    // Read only the bounded numeric field, never expose the upstream body.
    if (response.status === 429 && err.retryAfterSeconds === undefined) {
      const envelope = await response.json().catch(() => null);
      const seconds = envelope?.error?.retry_after_seconds;
      if (Number.isSafeInteger(seconds) && seconds >= 0)
        err.retryAfterSeconds = Math.min(86400, seconds);
    }
    throw err;
  }
  const result = await response.json().catch(() => null);
  if (!result || result.model !== model || !Array.isArray(result.data)
      || result.data.length !== texts.length) throw new Error("cloudflare_embed_response_mismatch");
  const ordered = [...result.data];
  if (ordered.some(row => Number.isInteger(row.index))) {
    if (!ordered.every(row => Number.isInteger(row.index) && row.index >= 0 && row.index < texts.length)) {
      throw new Error("cloudflare_embed_index_invalid");
    }
    ordered.sort((a,b)=>a.index-b.index);
    if (!ordered.every((row,i)=>row.index===i)) throw new Error("cloudflare_embed_index_duplicate");
  }
  if (ordered.some(row => !Array.isArray(row.embedding)
      || row.embedding.length !== dimensions
      || !row.embedding.every(x => typeof x === "number" && Number.isFinite(x)))) {
    throw new Error("cloudflare_embed_vector_invalid");
  }
  return {...result, data:ordered};
}
