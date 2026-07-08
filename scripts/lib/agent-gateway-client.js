import { resolveAgentGatewayAttractor } from "./agent-gateway-resolve.js";

/**
 * Blackboard-routed client for agent-cli-gateway (resolve → POST /v1/chat/completions).
 */
export function createAgentGatewayClient(options = {}) {
  const config = {
    blackboardUrl: String(options.blackboardUrl || "").trim(),
    token: String(options.token || "").trim(),
    endpoint: String(options.endpoint || "").trim().replace(/\/$/, ""),
    attractorId: String(options.attractorId || "").trim(),
    capability: String(options.capability || "").trim(),
    model: String(options.model || "").trim(),
    hostname: String(options.hostname || "").trim(),
    allowDegraded: options.allowDegraded === true,
    timeoutMs: positiveMs(options.timeoutMs, 60_000),
    blackboardTimeoutMs: positiveMs(options.blackboardTimeoutMs, 15_000),
    fresh: options.fresh !== false,
  };

  let cachedResolve = null;

  return {
    config,
    resolve: overrides => resolveTarget({ ...config, ...overrides }),
    health: overrides => gatewayRequest("GET", "/health", null, { ...config, ...overrides }),
    listTools: overrides => gatewayRequest("GET", "/v1/tools", null, { ...config, ...overrides }),
    chatCompletion: (payload, overrides = {}) => gatewayRequest(
      "POST",
      "/v1/chat/completions",
      payload,
      { ...config, ...overrides },
    ),
    invoke: invokeOptions => invokeThroughGateway({ ...config, ...invokeOptions }),
  };

  async function resolveTarget(overrides) {
    const merged = { ...config, ...overrides };
    const direct = String(merged.endpoint || "").trim().replace(/\/$/, "");
    if (direct) {
      cachedResolve = {
        ok: true,
        endpoint: direct,
        status: "online",
        fresh: true,
        attractor_id: merged.attractorId || null,
        routed_via: "direct_endpoint",
      };
      return cachedResolve;
    }

    const blackboardUrl = String(merged.blackboardUrl || "").trim();
    if (!blackboardUrl) {
      throw clientError("missing_blackboard_url", "COGENTIA_BLACKBOARD_URL or --endpoint required");
    }

    const resolved = await resolveAgentGatewayAttractor({
      blackboardUrl,
      attractorId: merged.attractorId || undefined,
      capability: merged.capability || undefined,
      model: merged.model || undefined,
      hostname: merged.hostname || undefined,
      fresh: merged.fresh,
      timeoutMs: merged.blackboardTimeoutMs,
    });

    if (!resolved.ok || !resolved.endpoint) {
      throw clientError(resolved.error || "attractor_not_found", "No agent-gateway attractor matched", {
        snapshot_at: resolved.snapshot_at,
        count: resolved.count,
      });
    }

    if (resolved.status === "degraded" && !merged.allowDegraded) {
      throw clientError("attractor_degraded", `Attractor ${resolved.attractor?.id || ""} is degraded`, {
        endpoint: resolved.endpoint,
        attractor_id: resolved.attractor?.id,
      });
    }

    cachedResolve = {
      ok: true,
      endpoint: resolved.endpoint.replace(/\/$/, ""),
      attractor_id: resolved.attractor?.id || null,
      status: resolved.status,
      fresh: resolved.fresh,
      snapshot_at: resolved.snapshot_at,
      routed_via: "blackboard",
    };
    return cachedResolve;
  }

  async function gatewayRequest(method, route, payload, overrides) {
    const merged = { ...config, ...overrides };
    const target = await resolveTarget(merged);
    const url = `${target.endpoint}${route}`;
    const headers = { Accept: method === "POST" ? "application/json" : "application/json" };
    const token = String(merged.token || "").trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    if (payload != null) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: payload == null ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(merged.timeoutMs),
    });

    const body = await readResponseBody(response);
    if (!response.ok) {
      throw clientError(
        body?.error?.code || "gateway_request_failed",
        body?.error?.message || body?.error || `HTTP ${response.status}`,
        { status: response.status, body, endpoint: target.endpoint, attractor_id: target.attractor_id },
      );
    }
    return {
      ...body,
      _route: {
        endpoint: target.endpoint,
        attractor_id: target.attractor_id,
        routed_via: target.routed_via,
        status: target.status,
      },
    };
  }
}

export async function invokeThroughGateway(options = {}) {
  const client = createAgentGatewayClient(options);
  const model = String(options.model || "").trim();
  const prompt = String(options.prompt ?? options.content ?? "").trim();
  if (!model) throw clientError("missing_model", "--model is required");
  if (!prompt) throw clientError("missing_prompt", "--prompt is required");

  const metadata = { ...(options.metadata && typeof options.metadata === "object" ? options.metadata : {}) };
  if (options.sessionId) metadata.session_id = String(options.sessionId);
  if (options.repl) metadata.adapter_mode = "repl";
  if (options.expect) metadata.expect = String(options.expect);
  if (options.cwd) metadata.cwd = String(options.cwd);

  const payload = {
    model,
    stream: options.stream === true,
    messages: [{ role: "user", content: prompt }],
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };

  const result = await client.chatCompletion(payload, options);
  return {
    ok: true,
    model,
    content: extractCompletionContent(result),
    session_id: result.metadata?.session_id || null,
    timing: result.metadata?.timing || null,
    route: result._route,
    raw: options.includeRaw ? result : undefined,
  };
}

export function extractCompletionContent(body = {}) {
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  return choice?.message?.content || "";
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "non_json_response", raw: text.slice(0, 500) };
  }
}

export function clientError(code, message, detail = {}) {
  return Object.assign(new Error(message || code), { code, detail });
}

function positiveMs(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}