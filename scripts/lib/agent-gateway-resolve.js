import {
  attractorHasCapability,
  isAttractorFresh,
} from "./packet-attractor-blackboard.js";

const GATEWAY_PROFILE = "agent-gateway.v1";

export async function fetchBlackboardSnapshot(blackboardUrl, options = {}) {
  const base = String(blackboardUrl || "").trim().replace(/\/$/, "");
  if (!base) {
    throw Object.assign(new Error("missing_blackboard_url"), { code: "missing_blackboard_url" });
  }
  const url = new URL("/ops/blackboard", `${base}/`);
  const capability = String(options.capability || "").trim();
  if (capability) url.searchParams.set("capability", capability);
  url.searchParams.set("fresh", options.fresh === false ? "0" : "1");

  const timeoutMs = Number(options.timeoutMs || 15_000);
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.json();
  if (!response.ok || body.ok === false) {
    throw Object.assign(new Error("blackboard_fetch_failed"), {
      code: "blackboard_fetch_failed",
      status: response.status,
      body,
    });
  }
  return body;
}

export function listAgentGatewayAttractors(attractors = []) {
  return (Array.isArray(attractors) ? attractors : [])
    .filter(item => String(item?.transport?.profile || "").trim() === GATEWAY_PROFILE);
}

export function pickAgentGatewayAttractor(attractors = [], options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  let candidates = listAgentGatewayAttractors(attractors);

  const attractorId = String(options.attractorId || "").trim();
  if (attractorId) {
    candidates = candidates.filter(item => String(item.id || "").trim() === attractorId);
  }

  const capability = String(options.capability || "").trim();
  if (capability) {
    candidates = candidates.filter(item => attractorHasCapability(item, capability));
  }

  const model = String(options.model || "").trim();
  if (model) {
    candidates = candidates.filter(item => attractorHasCapability(item, `model.${model}`));
  }

  const hostname = String(options.hostname || "").trim().toLowerCase();
  if (hostname) {
    candidates = candidates.filter(item => {
      const endpoint = String(item.transport?.endpoint_ref || "").toLowerCase();
      const resource = String(item.node?.resource_id || "").toLowerCase();
      return endpoint.includes(hostname) || resource.includes(hostname);
    });
  }

  candidates.sort((left, right) => scoreAttractor(right, now) - scoreAttractor(left, now));
  return candidates[0] || null;
}

export async function resolveAgentGatewayAttractor(options = {}) {
  const snapshot = await fetchBlackboardSnapshot(options.blackboardUrl, {
    capability: options.capability,
    fresh: options.fresh,
    timeoutMs: options.timeoutMs,
  });
  const attractor = pickAgentGatewayAttractor(snapshot.attractors, options);
  if (!attractor) {
    return {
      ok: false,
      error: "attractor_not_found",
      snapshot_at: snapshot.snapshot_at,
      count: snapshot.count,
    };
  }
  return {
    ok: true,
    attractor,
    endpoint: String(attractor.transport?.endpoint_ref || "").trim(),
    snapshot_at: snapshot.snapshot_at,
    fresh: isAttractorFresh(attractor, options.now),
    status: String(attractor.availability?.status || "online").trim() || "online",
  };
}

function scoreAttractor(attractor, now) {
  let score = 0;
  const status = String(attractor.availability?.status || "online").trim().toLowerCase();
  if (status === "online") score += 100;
  else if (status === "degraded") score += 20;
  if (isAttractorFresh(attractor, now)) score += 50;
  const lastSeen = Date.parse(String(attractor.availability?.last_seen || ""));
  if (Number.isFinite(lastSeen)) score += lastSeen / 1_000_000_000_000;
  return score;
}