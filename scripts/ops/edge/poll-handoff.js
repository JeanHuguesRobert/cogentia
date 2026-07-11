#!/usr/bin/env node
/**
 * Edge response to fracta directed poll (SNMP GET after trap).
 * Drains outbox if possible and returns stats JSON on stdout.
 */

import { loadOptionalEnvFiles, resolveEdgeStateDir } from "./lib/env.js";
import { drainOutboxOnce } from "./lib/drain.js";
import { outboxStats, listPendingOutbox } from "./lib/outbox.js";

loadOptionalEnvFiles([
  process.env.EDGE_ENV_FILE,
  `${process.env.HOME || ""}/srv/cogentia/secrets/domotics.env`,
]);

const json = process.argv.includes("--json");
const stateDir = resolveEdgeStateDir();
const drain = await drainOutboxOnce(stateDir);
const pending = listPendingOutbox(stateDir, { limit: 10 }).map(row => ({
  id: row.id,
  target: row.target,
  trap_type: row.payload?.body?.trap_type || null,
  created_at: row.created_at,
}));

const payload = {
  ok: true,
  event: "edge/poll-handoff",
  node_id: process.env.EDGE_NODE_ID || "resource://rpi3-view",
  hostname: process.env.EDGE_HOSTNAME || "rpi3-view",
  polled_at: new Date().toISOString(),
  stats: outboxStats(stateDir),
  drain,
  pending_preview: pending,
};

if (json) {
  console.log(JSON.stringify(payload));
} else {
  console.log(JSON.stringify(payload, null, 2));
}