#!/usr/bin/env node
/**
 * rpi3-view site.edge heartbeat — send now or enqueue for store-and-forward.
 *
 * Env:
 *   COGENTIA_BLACKBOARD_URL
 *   COGENTIA_BLACKBOARD_UPSERT_TOKEN
 *   COGENTIA_ATTRACTOR_ID          default attractor:rpi3-view:site-edge
 *   EDGE_STORE_ON_FAILURE=1        default — queue when FractaNet unreachable
 */

import {
  BLACKBOARD_EVENTS,
  buildSiteEdgeAttractor,
} from "../../lib/packet-attractor-blackboard.js";
import { loadOptionalEnvFiles, resolveEdgeStateDir } from "./lib/env.js";
import { probeFractanet } from "./lib/connectivity.js";
import { deliverHttpPost } from "./lib/deliver.js";
import { enqueueOutbox } from "./lib/outbox.js";

loadOptionalEnvFiles([
  process.env.EDGE_ENV_FILE,
  process.env.COGENTIA_ATTRACTOR_ENV_FILE,
  `${process.env.HOME || ""}/srv/cogentia/secrets/domotics.env`,
  `${process.env.HOME || ""}/srv/cogentia/secrets/viewer.env`,
]);

const blackboardUrl = String(process.env.COGENTIA_BLACKBOARD_URL || "").trim().replace(/\/$/, "");
const token = String(
  process.env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || process.env.COGENTIA_ADMIN_TOKEN || "",
).trim();
const storeOnFailure = parseBoolean(process.env.EDGE_STORE_ON_FAILURE, true);
const stateDir = resolveEdgeStateDir();

if (!blackboardUrl) {
  console.error(JSON.stringify({ ok: false, error: "missing_blackboard_url" }));
  process.exit(2);
}
if (!token) {
  console.error(JSON.stringify({ ok: false, error: "missing_blackboard_upsert_token" }));
  process.exit(2);
}

const attractor = buildSiteEdgeAttractor({
  id: process.env.COGENTIA_ATTRACTOR_ID,
  resourceId: process.env.COGENTIA_ATTRACTOR_NODE_ID,
  hostname: process.env.EDGE_HOSTNAME || process.env.ONA_HOSTNAME || "rpi3-view",
  endpointRef: process.env.COGENTIA_ATTRACTOR_ENDPOINT_REF,
  ttlSeconds: Number(process.env.COGENTIA_ATTRACTOR_TTL_SECONDS || 300),
});

const payload = {
  event: BLACKBOARD_EVENTS.ADVERTISED,
  advertised_by: attractor.node.resource_id,
  attractor,
};

const httpPayload = {
  method: "POST",
  url: `${blackboardUrl}/ops/blackboard/upsert`,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Cogentia-Node": attractor.node.resource_id,
  },
  body: payload,
};

const connectivity = await probeFractanet();
if (!connectivity.ok && storeOnFailure) {
  const queued = enqueueOutbox(stateDir, {
    kind: "http.post",
    target: "blackboard.site-edge",
    payload: httpPayload,
  });
  console.log(JSON.stringify({
    ok: true,
    mode: "store",
    queued_id: queued.id,
    attractor_id: attractor.id,
    stats_pending: true,
    connectivity,
  }, null, 2));
  process.exit(0);
}

const result = await deliverHttpPost(httpPayload);
if (!result.ok && storeOnFailure) {
  const queued = enqueueOutbox(stateDir, {
    kind: "http.post",
    target: "blackboard.site-edge",
    payload: httpPayload,
  });
  console.log(JSON.stringify({
    ok: true,
    mode: "store_after_failure",
    queued_id: queued.id,
    attractor_id: attractor.id,
    delivery_error: result.error,
  }, null, 2));
  process.exit(0);
}

if (!result.ok) {
  console.error(JSON.stringify({
    ok: false,
    error: result.error,
    status: result.status,
    attractor_id: attractor.id,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mode: "send",
  event: payload.event,
  attractor_id: attractor.id,
  snapshot_at: result.body?.snapshot_at || null,
  probe_url: connectivity.url || null,
}, null, 2));

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return fallback;
}