/** Read-only FractaVolta Guide capability for the governed step harness. */

export function createGuideCorpusCapability(options = {}) {
  const url = String(options.url || "http://127.0.0.1:8791/guide/chat");
  const request = typeof options.fetch === "function" ? options.fetch : globalThis.fetch;
  const timeoutMs = boundedInteger(options.timeoutMs, 8000, 500, 60000);

  return {
    name: "corpus.search",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    description: "Search the public Cogentia/FractaVolta corpus through Guide and return grounded excerpts, sources, and an optional draft answer.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Focused public-corpus question." },
        locale: { type: "string", enum: ["en", "fr"] },
        web_search: { type: "boolean", description: "Request current public web retrieval when freshness is necessary." },
      },
      required: ["question"],
      additionalProperties: false,
    },
    async execute(input = {}, context = {}) {
      const question = String(input.question || context.turnInput?.text || "").trim();
      if (!question) throw capabilityError("INVALID_GUIDE_QUESTION");
      const locale = input.locale === "fr" ? "fr" : "en";
      const response = await request(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ question, locale, web_search: Boolean(input.web_search) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        const error = capabilityError("GUIDE_REQUEST_FAILED");
        error.http_status = response.status;
        throw error;
      }
      return normalizeGuideResult(body);
    },
  };
}

function normalizeGuideResult(body) {
  const excerpts = Array.isArray(body?.context?.excerpts) ? body.context.excerpts.slice(0, 8).map(item => ({
    source_id: String(item?.source_id || "").slice(0, 240),
    text: String(item?.text || "").replace(/\s+/g, " ").trim().slice(0, 1800),
  })).filter(item => item.source_id && item.text) : [];
  const sources = Array.isArray(body?.sources) ? body.sources.slice(0, 12).map(item => ({
    source_id: String(item?.source_id || "").slice(0, 240),
    title: String(item?.title || item?.path || "").slice(0, 300),
    url: /^https?:\/\//.test(String(item?.url || "")) ? String(item.url) : "",
  })).filter(item => item.source_id) : [];
  return {
    answer: String(body?.answer || "").trim().slice(0, 12000),
    excerpts,
    sources,
    source_ids: [...new Set(excerpts.map(item => item.source_id))],
    current_information: body?.context?.web_search ? {
      attempted: Boolean(body.context.web_search.attempted),
      verified: Boolean(body.context.web_search.ok),
    } : { attempted: false, verified: false },
    warnings: Array.isArray(body?.warnings) ? body.warnings.map(value => String(value).slice(0, 300)).slice(0, 8) : [],
  };
}

function capabilityError(code) {
  const error = new Error("Guide corpus capability failed");
  error.name = "CapabilityError";
  error.code = code;
  return error;
}
function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback;
}
