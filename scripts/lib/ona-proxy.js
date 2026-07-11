import { timingSafeEqual } from "node:crypto";

const ONA_CAPABILITY = "operium.node.v1";
const DEFAULT_ONA_PORT = 8794;
const HTTP_ENDPOINT_RE = /^https?:\/\//i;

export function expectedOnaPort(env = process.env) {
  const configured = Number(env.ONA_PORT);
  return Number.isFinite(configured) && configured > 0 && configured <= 65535
    ? configured
    : DEFAULT_ONA_PORT;
}

export function opsReadToken(env = process.env) {
  return String(
    env.COGENTIA_OPS_READ_TOKEN
    || env.COGENTIA_ADMIN_TOKEN
    || "",
  ).trim();
}

export function onaReadToken(env = process.env) {
  return String(env.ONA_READ_TOKEN || "").trim();
}

export function hasOpsReadAuth(req, env = process.env) {
  const expected = opsReadToken(env);
  if (!expected) return false;
  const authorization = String(req.headers?.authorization || "");
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const supplied = bearer || String(req.headers?.["x-cogentia-ops-token"] || "");
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function decodeNodeId(encoded) {
  try {
    return decodeURIComponent(String(encoded || "").trim());
  } catch {
    return null;
  }
}

export function parseOpsNodePath(pathname = "") {
  const match = String(pathname || "").match(/^\/ops\/node\/([^/]+)\/(status|drift)$/);
  if (!match) {
    return { ok: false, error: "invalid_ops_node_path" };
  }

  const nodeId = decodeNodeId(match[1]);
  if (!nodeId) {
    return { ok: false, error: "invalid_node_id_encoding" };
  }

  return {
    ok: true,
    encoded_node_id: match[1],
    node_id: nodeId,
    suffix: match[2],
    ona_path: match[2] === "drift" ? "/node/drift" : "/node/status",
  };
}

export function isAcceptableOnaEndpoint(endpointRef, env = process.env) {
  const value = String(endpointRef || "").trim();
  if (!HTTP_ENDPOINT_RE.test(value)) return false;
  if (value.startsWith("secret://")) return false;
  try {
    const url = new URL(value);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    return Number(port) === expectedOnaPort(env);
  } catch {
    return false;
  }
}

export function hasOnaCapability(attractor = {}) {
  const capabilities = Array.isArray(attractor.matches?.capabilities)
    ? attractor.matches.capabilities
    : [];
  return capabilities.some(
    value => String(value || "").trim().toLowerCase() === ONA_CAPABILITY.toLowerCase(),
  );
}

export function isAttractorFresh(attractor = {}, now = new Date()) {
  const lastSeen = Date.parse(String(attractor.availability?.last_seen || ""));
  const ttlSeconds = Number(attractor.availability?.ttl_seconds);
  if (!Number.isFinite(lastSeen) || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return false;
  const ageMs = now.getTime() - lastSeen;
  return ageMs >= 0 && ageMs <= ttlSeconds * 1000;
}

export function resolveOnaAttractorForNode(blackboardStore, nodeId, options = {}) {
  const normalizedNodeId = String(nodeId || "").trim();
  if (!normalizedNodeId) {
    return { ok: false, error: "missing_node_id" };
  }

  const snapshot = blackboardStore.snapshot({
    capability: ONA_CAPABILITY,
    fresh: options.fresh !== false,
    now: options.now,
  });

  const candidates = (snapshot.attractors || [])
    .filter(hasOnaCapability)
    .filter(attractor => String(attractor.node?.resource_id || "").trim() === normalizedNodeId)
    .map(attractor => ({
      attractor,
      fresh: isAttractorFresh(attractor, options.now),
      status: String(attractor.availability?.status || "online").trim() || "online",
      endpoint: String(attractor.transport?.endpoint_ref || "").trim().replace(/\/$/, ""),
    }))
    .filter(item => isAcceptableOnaEndpoint(item.endpoint, options.env));

  if (!candidates.length) {
    return {
      ok: false,
      error: "ona_attractor_not_found",
      node_id: normalizedNodeId,
      snapshot_at: snapshot.snapshot_at,
      count: snapshot.count,
    };
  }

  candidates.sort((left, right) => {
    if (left.fresh !== right.fresh) return left.fresh ? -1 : 1;
    if (left.status === "online" && right.status !== "online") return -1;
    if (right.status === "online" && left.status !== "online") return 1;
    return 0;
  });

  const picked = candidates[0];
  return {
    ok: true,
    node_id: normalizedNodeId,
    attractor_id: picked.attractor.id,
    hostname: picked.attractor.node?.hostname || null,
    endpoint: picked.endpoint,
    fresh: picked.fresh,
    status: picked.status,
    snapshot_at: snapshot.snapshot_at,
  };
}

export async function proxyOnaRequest(resolved, onaPath, options = {}) {
  const token = String(options.token || onaReadToken(options.env)).trim();
  if (!token) {
    return { ok: false, error: "missing_ona_read_token" };
  }

  const endpoint = String(resolved?.endpoint || "").trim().replace(/\/$/, "");
  const path = String(onaPath || "").trim();
  if (!endpoint || !path.startsWith("/")) {
    return { ok: false, error: "invalid_proxy_target" };
  }

  const url = `${endpoint}${path}`;
  const fetchImpl = options.fetch || globalThis.fetch;

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(Number(options.timeoutMs || 10_000)),
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text || "{}");
    } catch {
      body = { ok: false, error: "invalid_json", raw: text.slice(0, 200) };
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      body,
      proxy: {
        node_id: resolved.node_id,
        attractor_id: resolved.attractor_id,
        endpoint,
        ona_path: path,
        routed_via: "ona_proxy",
        fresh: resolved.fresh,
        status: resolved.status,
        snapshot_at: resolved.snapshot_at,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "TimeoutError" ? "ona_proxy_timeout" : "ona_proxy_failed",
      message: error.message || null,
      proxy: {
        node_id: resolved.node_id,
        attractor_id: resolved.attractor_id,
        endpoint,
        ona_path: path,
        routed_via: "ona_proxy",
      },
    };
  }
}

export function summarizeNodeAgentsLayer(blackboardSummary = {}, options = {}) {
  const env = options.env || process.env;
  const now = options.now;
  const attractors = (blackboardSummary.attractors || []).filter(hasOnaCapability);
  const fresh = attractors.filter(item => isAttractorFresh(item, now));

  return {
    capability: ONA_CAPABILITY,
    attractor_count: attractors.length,
    fresh_count: fresh.length,
    fresh_attractor_count: fresh.length,
    attractors: attractors.map(item => {
      const endpoint = String(item.transport?.endpoint_ref || "").trim().replace(/\/$/, "");
      return {
        id: item.id,
        node_id: item.node?.resource_id || null,
        hostname: item.node?.hostname || null,
        endpoint: endpoint || null,
        status: item.availability?.status || null,
        fresh: isAttractorFresh(item, now),
        acceptable_endpoint: endpoint ? isAcceptableOnaEndpoint(endpoint, env) : false,
        health_score: item.metadata?.health_score ?? null,
        ona_version: item.metadata?.ona_version || null,
      };
    }),
  };
}

export async function handleOpsNodeProxyRequest(req, blackboardStore, options = {}) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const parsed = parseOpsNodePath(url.pathname);
  if (!parsed.ok) {
    return { status: 404, body: { ok: false, error: parsed.error } };
  }

  if (!hasOpsReadAuth(req, options.env)) {
    return { status: 401, body: { ok: false, error: "unauthorized_ops_read" } };
  }

  const resolved = resolveOnaAttractorForNode(blackboardStore, parsed.node_id, options);
  if (!resolved.ok) {
    return { status: 404, body: resolved };
  }

  const proxied = await proxyOnaRequest(resolved, parsed.ona_path, options);
  if (!proxied.ok) {
    const status = proxied.error === "missing_ona_read_token"
      ? 503
      : proxied.error === "ona_proxy_timeout"
        ? 504
        : (proxied.status && proxied.status >= 400 ? proxied.status : 502);
    return {
      status,
      body: {
        ok: false,
        error: proxied.error || "ona_proxy_failed",
        message: proxied.message || null,
        proxy: proxied.proxy || null,
        ona: proxied.body || null,
      },
    };
  }

  return {
    status: 200,
    body: {
      ...proxied.body,
      proxy: proxied.proxy,
    },
  };
}