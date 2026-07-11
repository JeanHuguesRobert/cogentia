#!/usr/bin/env node
/**
 * Emit an edge trap (SNMP trap analogue). Store-and-forward if fracta unreachable.
 *
 * Usage:
 *   node emit-trap.js domotics.sensor --detail '{"sensor":"temp","c":21.5}'
 *   node emit-trap.js site.manual --detail '{"action":"override_scene","scene":"evening"}'
 */

import { loadOptionalEnvFiles, resolveEdgeStateDir } from "./lib/env.js";
import { emitEdgeTrap } from "./lib/trap.js";
import { TRAP_TYPES } from "../../lib/edge-trap-protocol.js";

loadOptionalEnvFiles([
  process.env.EDGE_ENV_FILE,
  `${process.env.HOME || ""}/srv/cogentia/secrets/domotics.env`,
  `${process.env.HOME || ""}/srv/cogentia/secrets/viewer.env`,
]);

const args = process.argv.slice(2);
const trapArg = args.find(arg => !arg.startsWith("--")) || TRAP_TYPES.SITE_MANUAL;
const detailArg = readFlagValue(args, "--detail");

const trapType = Object.values(TRAP_TYPES).includes(trapArg)
  ? trapArg
  : trapArg.includes(".")
    ? trapArg
    : TRAP_TYPES.SITE_MANUAL;

let detail = {};
if (detailArg) {
  try {
    detail = JSON.parse(detailArg);
  } catch {
    console.error(JSON.stringify({ ok: false, error: "invalid_detail_json" }));
    process.exit(2);
  }
}

const result = await emitEdgeTrap({
  stateDir: resolveEdgeStateDir(),
  trap_type: trapType,
  detail,
  hostname: process.env.EDGE_HOSTNAME || "rpi3-view",
  node_id: process.env.EDGE_NODE_ID || "resource://rpi3-view",
});

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return "";
  return String(argv[index + 1] || "").trim();
}