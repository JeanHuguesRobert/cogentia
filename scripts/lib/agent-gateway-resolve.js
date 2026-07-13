import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  attractorHasCapability,
  isAttractorFresh,
} from "./packet-attractor-blackboard.js";

const GATEWAY_PROFILE = "agent-gateway.v1";

function getLocalCachePath() {
  return path.join(os.homedir(), ".cogentia-blackboard-cache.json");
}

export async function fetchBlackboardSnapshot(blackboardUrl, options = {}) {
  const base = String(blackboardUrl || "").trim().replace(/\/$/, "");
  const timeoutMs = Number(options.timeoutMs || 15_000);

  try {
    if (!base) {
      throw Object.assign(new Error("missing_blackboard_url"), { code: "missing_blackboard_url" });
    }
    const url = new URL("/ops/blackboard", `${base}/`);
    const capability = String(options.capability || "").trim();
    if (capability) url.searchParams.set("capability", capability);
    url.searchParams.set("fresh", options.fresh === false ? "0" : "1");

    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json();
    if (!response.ok || body.ok === false) {
      throw new Error("blackboard_response_failed");
    }

    // Cache the snapshot locally
    try {
      const cachePath = getLocalCachePath();
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(body, null, 2), "utf8");
    } catch (_) {}

    return body;
  } catch (error) {
    // Attempt local cache fallback
    try {
      const cachePath = getLocalCachePath();
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
        cached._routed_via = "offline_cache_fallback";
        return cached;
      }
    } catch (_) {}
    throw Object.assign(new Error("blackboard_fetch_failed"), {
      code: "blackboard_fetch_failed",
      reason: error.message,
    });
  }
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

  const isOffline = snapshot._routed_via === "offline_cache_fallback";
  let attractor = pickAgentGatewayAttractor(snapshot.attractors, options);
  if (isOffline && !attractor) {
    attractor = pickAgentGatewayAttractor(snapshot.attractors, { ...options, fresh: false });
  }

  if (!attractor) {
    return {
      ok: false,
      error: "attractor_not_found",
      snapshot_at: snapshot.snapshot_at,
      count: snapshot.count,
    };
  }

  let endpoint = String(attractor.transport?.endpoint_ref || "").trim();

  // If offline, probe the candidate endpoints to find one that is active
  if (isOffline) {
    const online = await probeEndpointHealth(endpoint, options.token);
    if (!online) {
      const candidates = listAgentGatewayAttractors(snapshot.attractors);
      let found = false;
      for (const candidate of candidates) {
        if (candidate.id === attractor.id) continue;
        const candidateEndpoint = String(candidate.transport?.endpoint_ref || "").trim();
        const ok = await probeEndpointHealth(candidateEndpoint, options.token);
        if (ok) {
          attractor = candidate;
          endpoint = candidateEndpoint;
          found = true;
          break;
        }
      }
      if (!found) {
        return {
          ok: false,
          error: "no_online_attractor_in_cache",
          snapshot_at: snapshot.snapshot_at,
          count: snapshot.count,
        };
      }
    }
  }

  return {
    ok: true,
    attractor,
    endpoint,
    snapshot_at: snapshot.snapshot_at,
    fresh: isOffline ? true : isAttractorFresh(attractor, options.now),
    status: String(attractor.availability?.status || "online").trim() || "online",
    routed_via: isOffline ? "offline_cache_fallback" : "blackboard",
  };
}

async function probeEndpointHealth(endpoint, token) {
  const url = `${endpoint.replace(/\/$/, "")}/health?quick=1`;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    const body = await response.json();
    return response.ok && body.ok === true;
  } catch (_) {
    return false;
  }
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