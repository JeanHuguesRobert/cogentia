import { randomUUID } from "node:crypto";

export const EDGE_TRAP_EVENT = "edge/trap";
export const EDGE_POLL_EVENT = "edge/directed-poll";

export const TRAP_TYPES = {
  CONNECTIVITY_UP: "connectivity.up",
  DOMOTICS_SENSOR: "domotics.sensor",
  DOMOTICS_ACTUATOR: "domotics.actuator",
  SITE_MANUAL: "site.manual",
  SITE_EDGE_TTL: "site.edge.ttl",
};

export function buildEdgeTrap(options = {}) {
  const now = new Date().toISOString();
  return {
    event: EDGE_TRAP_EVENT,
    trap_id: String(options.trap_id || `trap:${randomUUID()}`).trim(),
    node_id: String(options.node_id || "resource://rpi3-view").trim(),
    hostname: String(options.hostname || "rpi3-view").trim(),
    trap_type: String(options.trap_type || TRAP_TYPES.SITE_MANUAL).trim(),
    severity: String(options.severity || "notice").trim(),
    detail: options.detail && typeof options.detail === "object" ? options.detail : {},
    emitted_at: options.emitted_at || now,
  };
}

export function buildDirectedPollResult(options = {}) {
  return {
    event: EDGE_POLL_EVENT,
    trap_id: options.trap_id || null,
    node_id: String(options.node_id || "resource://rpi3-view").trim(),
    hostname: String(options.hostname || "rpi3-view").trim(),
    polled_at: options.polled_at || new Date().toISOString(),
    ok: options.ok !== false,
    transport: String(options.transport || "ssh").trim(),
    outbox: options.outbox || null,
    drain: options.drain || null,
    error: options.error || null,
  };
}

export function trapTypeForHostname(hostname) {
  const map = {
    "rpi3-view": "resource://rpi3-view",
  };
  return map[String(hostname || "").trim()] || `resource://${hostname}`;
}