import { buildEdgeTrap } from "../../../lib/edge-trap-protocol.js";
import { deliverHttpPost } from "./deliver.js";
import { enqueueOutbox } from "./outbox.js";
import { probeFractanet } from "./connectivity.js";

export function resolveTrapUrl(env = process.env) {
  const explicit = String(env.EDGE_TRAP_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = String(env.COGENTIA_BLACKBOARD_URL || "").trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/ops/edge/trap`;
}

export async function emitEdgeTrap(options = {}) {
  const env = options.env || process.env;
  const stateDir = options.stateDir;
  const storeOnFailure = options.storeOnFailure !== false;
  const token = String(
    env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || env.COGENTIA_ADMIN_TOKEN || "",
  ).trim();
  const trapUrl = resolveTrapUrl(env);

  const trap = buildEdgeTrap({
    node_id: options.node_id || env.EDGE_NODE_ID,
    hostname: options.hostname || env.EDGE_HOSTNAME || "rpi3-view",
    trap_type: options.trap_type,
    severity: options.severity,
    detail: options.detail,
    trap_id: options.trap_id,
  });

  if (!trapUrl) {
    return { ok: false, error: "missing_trap_url", trap };
  }
  if (!token) {
    return { ok: false, error: "missing_trap_token", trap };
  }

  const httpPayload = {
    method: "POST",
    url: trapUrl,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Cogentia-Node": trap.node_id,
    },
    body: trap,
  };

  const connectivity = await probeFractanet({ env });
  if (!connectivity.ok && storeOnFailure && stateDir) {
    const queued = enqueueOutbox(stateDir, {
      kind: "http.post",
      target: "trap.notify",
      payload: httpPayload,
    });
    return { ok: true, mode: "store", trap, queued_id: queued.id, connectivity };
  }

  const result = await deliverHttpPost(httpPayload, options);
  if (!result.ok && storeOnFailure && stateDir) {
    const queued = enqueueOutbox(stateDir, {
      kind: "http.post",
      target: "trap.notify",
      payload: httpPayload,
    });
    return {
      ok: true,
      mode: "store_after_failure",
      trap,
      queued_id: queued.id,
      delivery_error: result.error,
    };
  }

  if (!result.ok) {
    return { ok: false, error: result.error, trap, status: result.status };
  }

  return {
    ok: true,
    mode: "trap",
    trap,
    directed_poll: result.body?.directed_poll || null,
    probe_url: connectivity.url || null,
  };
}