import assert from "node:assert/strict";
import {
  packHandoffPacket,
  unpackHandoffPacket,
  runHandoffPacket,
  getLocalGitContext,
} from "./lib/john-handoff.js";

const sampleRequest = {
  version: "john.request.v1",
  request_id: "req-handoff-test-001",
  principal: { id: "user:developer-alpha" },
  mandate: { id: "mandate:dev:2026", version: "1.0.0" },
  budget: { id: "budget:dev:daily", max_cost_usd: 1.0 },
  execution_budget: {
    max_steps: 3,
    max_tool_calls: 5,
    max_subagents: 0,
    max_elapsed_ms: 10000,
    max_external_effects: 0,
  },
  exposure: "read_only",
  capability: "code-analysis",
  input: { prompt: "Analyze module dependencies across workspaces" },
  handler: { id: "mock.echo", kind: "mock" },
  ithaca: {
    description: "Developer CLI Terminal Session (Machine A)",
    return_target: "node:developer-machine-a:session-789",
  },
};

async function testHandoffRoundtrip() {
  // 1. Machine A: Pack request into Cognitive Packet
  const sealedPacket = packHandoffPacket(sampleRequest, {
    targetNode: "node:remote-worker-b",
    gitContext: { commit: "abc123456789", branch: "main", available: true },
  });

  assert.equal(sealedPacket.envelope.kind, "john.request.handoff");
  assert.equal(sealedPacket.envelope.routeTo, "node:remote-worker-b");
  assert.equal(sealedPacket.envelope.lineage.git_commit, "abc123456789");
  assert.equal(sealedPacket.envelope.ithaca.return_target, "node:developer-machine-a:session-789");

  // 2. Machine B: Unpack and inspect packet
  const inspection = unpackHandoffPacket(sealedPacket);
  assert.equal(inspection.intent, "Analyze module dependencies across workspaces");
  assert.equal(inspection.requiredCapability, "code-analysis");
  assert.equal(inspection.routeTo, "node:remote-worker-b");
  assert.equal(inspection.gitContext.commit, "abc123456789");

  // 3. Machine B: Execute packet locally on its own environment
  const execution = await runHandoffPacket(sealedPacket, {
    nodeId: "node:remote-worker-b",
  });

  assert.equal(execution.success, true);
  assert.ok(execution.events.length > 0);

  const returnPacket = execution.returnPacket;
  assert.equal(returnPacket.envelope.packetKind, "john.yield.handoff");
  assert.equal(returnPacket.envelope.status, "solved");
  assert.equal(returnPacket.envelope.routeTo, "node:developer-machine-a:session-789");
  assert.equal(returnPacket.envelope.lineage.upstream_packet_id, sealedPacket.envelope.id);
  assert.equal(returnPacket.envelope.lineage.solved_by_node, "node:remote-worker-b");
  assert.ok(returnPacket.yield.semantic_yield);

  console.log(JSON.stringify({ ok: true, test: "john_handoff", completed: true }, null, 2));
}

testHandoffRoundtrip().catch((err) => {
  console.error("test-john-handoff failed:", err);
  process.exit(1);
});
