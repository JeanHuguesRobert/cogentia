#!/usr/bin/env node
import assert from "node:assert/strict";
import { checkOperiumBacklogGate, getOperiumStatus, triggerOperiumCheckpoint } from "./lib/operium-bridge.js";

async function main() {
  // 1. Test FBF gate check from Cogentia
  const gate = await checkOperiumBacklogGate("mesh");
  assert.ok(gate, "gate result present");
  assert.equal(gate.subsystem, "mesh");
  assert.equal(typeof gate.blocked, "boolean");

  // 2. Test Operium status inquiry from Cogentia
  const status = await getOperiumStatus();
  assert.ok(status, "status present");
  assert.equal(status.schema, "operium.session_status.v1");
  assert.ok(status.session, "session present");
  assert.equal(status.session.canonical_issue?.handle, "operium/52");

  // 3. Test triggering checkpoint in dry-run mode from Cogentia
  const cp = await triggerOperiumCheckpoint("test-audit", { dryRun: true });
  assert.ok(cp, "checkpoint result present");
  assert.equal(cp.schema, "operium.checkpoint_state.v1");
  assert.equal(cp.dry_run, true);

  console.log(JSON.stringify({
    ok: true,
    test: "operiumBridgeFromCogentia",
    fbf_blocked: gate.blocked,
    active_issue: status.session.canonical_issue?.handle,
    checkpoint_packet: cp.packet_id,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
