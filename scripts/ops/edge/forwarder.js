#!/usr/bin/env node
/**
 * Edge store-and-forward drain loop + connectivity.up trap on FractaNet restore.
 */

import { loadOptionalEnvFiles, resolveEdgeStateDir } from "./lib/env.js";
import { drainOutboxOnce } from "./lib/drain.js";
import { emitEdgeTrap } from "./lib/trap.js";
import { readConnectivityState, writeConnectivityState } from "./lib/connectivity-state.js";
import { TRAP_TYPES } from "../../lib/edge-trap-protocol.js";

loadOptionalEnvFiles([
  process.env.EDGE_ENV_FILE,
  process.env.COGENTIA_ATTRACTOR_ENV_FILE,
  `${process.env.HOME || ""}/srv/cogentia/secrets/domotics.env`,
  `${process.env.HOME || ""}/srv/cogentia/secrets/viewer.env`,
]);

const once = process.argv.includes("--once");
const stateDir = resolveEdgeStateDir();

async function tick() {
  const prior = readConnectivityState(stateDir);
  const summary = await drainOutboxOnce(stateDir);
  const up = summary.skipped !== "fractanet_unreachable";
  if (up && prior.fractanet_up === false) {
    const trap = await emitEdgeTrap({
      stateDir,
      trap_type: TRAP_TYPES.CONNECTIVITY_UP,
      detail: { probe_url: summary.probe_url || null },
    });
    summary.connectivity_trap = trap.mode || trap.error || null;
  }
  writeConnectivityState(stateDir, up);
  return summary;
}

async function main() {
  if (once) {
    console.log(JSON.stringify(await tick(), null, 2));
    return;
  }

  const intervalMs = Number(process.env.EDGE_FORWARD_INTERVAL_MS || 120_000);
  for (;;) {
    const summary = await tick();
    console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message || "forwarder_failed" }));
  process.exit(1);
});