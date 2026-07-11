#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildEdgeTrap,
  EDGE_TRAP_EVENT,
  TRAP_TYPES,
} from "./lib/edge-trap-protocol.js";
import { appendEdgeTrap, readRecentEdgeTraps } from "./lib/edge-trap-store.js";
import { handleEdgeTrapPost } from "./lib/edge-trap-ops.js";
import {
  resolvePollSshIdentity,
  resolvePollSshTarget,
} from "./lib/edge-directed-poll.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "edge-trap-test-"));
const storePath = path.join(tmpDir, "edge-traps.ndjson");

const trap = buildEdgeTrap({
  trap_type: TRAP_TYPES.DOMOTICS_SENSOR,
  detail: { sensor: "door", state: "open" },
});
assert.equal(trap.event, EDGE_TRAP_EVENT);
assert.equal(trap.trap_type, TRAP_TYPES.DOMOTICS_SENSOR);

appendEdgeTrap(trap, { storePath });
const recent = readRecentEdgeTraps({ storePath, limit: 5 });
assert.equal(recent.length, 1);
assert.equal(recent[0].trap_id, trap.trap_id);

const handled = await handleEdgeTrapPost(trap, {
  env: {
    EDGE_TRAP_STORE: storePath,
    EDGE_DIRECTED_POLL: "0",
  },
});
assert.equal(handled.ok, true);
assert.equal(handled.trap_id, trap.trap_id);

assert.equal(resolvePollSshTarget({ hostname: "rpi3-view" }), "rpi3-view");
assert.equal(
  resolvePollSshTarget({ hostname: "rpi3-view" }, { EDGE_POLL_SSH_TARGET: "edge-host" }),
  "edge-host",
);
assert.equal(typeof resolvePollSshIdentity(), "string");

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, tests: ["build", "store", "handle_trap", "ssh_target"] }));