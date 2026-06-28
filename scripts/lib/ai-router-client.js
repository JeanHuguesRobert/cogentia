const DEFAULT_AI_ROUTER_URL = "http://127.0.0.1:8880";
const DEFAULT_TIMEOUT_MS = 15000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 120000;

export function createAiRouterClient(options = {}) {
  const baseUrl = normalizeAiRouterUrl(options.baseUrl || process.env.COGENTIA_AI_ROUTER_URL || DEFAULT_AI_ROUTER_URL);
  const apiKey = String(options.apiKey ?? process.env.COGENTIA_AI_ROUTER_API_KEY ?? "");
  const timeoutMs = boundedInteger(options.timeoutMs ?? process.env.COGENTIA_AI_ROUTER_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("AI router client requires fetch");

  async function request(route, requestOptions = {}) {
    const url = new URL(route, baseUrl);
    const headers = {
      Accept: "application/json",
      ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
      ...(requestOptions.headers || {}),
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    let response;
    try {
      response = await fetchImpl(url, {
        method: requestOptions.method || "GET",
        headers,
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: "ai_router_unavailable",
        message: error.message,
        router: publicRouterInfo(baseUrl),
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "ai_router_http_error",
        message: typeof body === "object" && body ? (body.error?.message || body.message || body.error || response.statusText) : (body || response.statusText),
        router: publicRouterInfo(baseUrl),
      };
    }

    return {
      ok: true,
      status: response.status,
      body,
      router: publicRouterInfo(baseUrl),
    };
  }

  return {
    baseUrl,
    publicInfo: () => publicRouterInfo(baseUrl),
    health: () => request("/health"),
    models: () => request("/v1/models"),
    chatCompletions: payload => request("/v1/chat/completions", { method: "POST", body: payload }),
    embeddings: payload => request("/v1/embeddings", { method: "POST", body: payload }),
  };
}

export async function aiRouterHealth(options = {}) {
  const client = createAiRouterClient(options);
  const health = await client.health();
  if (!health.ok) {
    return {
      ok: false,
      available: false,
      service: "ai-router",
      router: health.router,
      status: health.status,
      error: health.error,
      message: health.message,
    };
  }
  const body = health.body && typeof health.body === "object" ? health.body : {};
  return {
    ok: true,
    available: true,
    service: body.service || "ai-router",
    router: health.router,
    status: health.status,
    capabilities: body.capabilities || {},
    health: sanitizeHealthBody(body),
  };
}

function sanitizeHealthBody(body) {
  const forbidden = new Set(["api_key", "apiKey", "authorization", "token", "secret"]);
  const sanitized = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (forbidden.has(key)) continue;
    if (typeof value === "string" && value.length > 200) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function normalizeAiRouterUrl(value) {
  const url = new URL(String(value || DEFAULT_AI_ROUTER_URL));
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("COGENTIA_AI_ROUTER_URL must be an HTTP(S) URL");
  }
  if (url.username || url.password) {
    throw new Error("COGENTIA_AI_ROUTER_URL must not embed credentials");
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.search = "";
  url.hash = "";
  return url;
}

function publicRouterInfo(url) {
  return {
    origin: url.origin,
    loopback: isLoopbackHost(url.hostname),
  };
}

function isLoopbackHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(parsed, max)) : fallback;
}
