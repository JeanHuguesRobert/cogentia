import assert from "node:assert/strict";
import { packHandoffPacket } from "./lib/john-handoff.js";
import {
  sendMockTransport,
  sendHandoffPacket,
} from "./lib/john-handoff-transport.js";

const sampleRequest = {
  version: "john.request.v1",
  request_id: "req-transport-test-001",
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
  input: { prompt: "Verify network resilience and fallback transports" },
  handler: { id: "mock.echo", kind: "mock" },
  ithaca: {
    description: "Developer CLI Terminal (Machine A)",
    return_target: "node:developer-machine-a:session-789",
  },
};

async function testTransports() {
  const packet = packHandoffPacket(sampleRequest, {
    targetNode: "node:remote-node-b",
    gitContext: { commit: "123456789abc", branch: "main", available: true },
  });

  // 1. Test Mock / Loopback transport
  const mockResult = await sendMockTransport(packet, { nodeId: "node:remote-node-b" });
  assert.equal(mockResult.ok, true);
  assert.equal(mockResult.transport, "mock_loopback");
  assert.equal(mockResult.status, "completed");
  assert.equal(mockResult.returnPacket.envelope.packetKind, "john.yield.handoff");
  assert.equal(mockResult.returnPacket.envelope.status, "solved");

  // 2. Test Resilient Fallback (Primary HTTP fails -> Fallback to Mock)
  const resilientResult = await sendHandoffPacket(packet, {
    target: "http://127.0.0.1:9999/unreachable",
    fallbacks: ["mock://backup-worker"],
    options: { timeoutMs: 500, nodeId: "node:backup-worker" },
  });

  assert.equal(resilientResult.ok, true);
  assert.equal(resilientResult.transport, "mock_loopback");
  assert.equal(resilientResult.status, "completed");
  assert.equal(resilientResult.returnPacket.envelope.status, "solved");

  // 3. Test Total Failure (All invalid targets fail gracefully)
  const failedResult = await sendHandoffPacket(packet, {
    target: "http://127.0.0.1:9999/unreachable-1",
    fallbacks: ["http://127.0.0.1:9998/unreachable-2"],
    options: { timeoutMs: 300 },
  });

  assert.equal(failedResult.ok, false);
  assert.equal(failedResult.status, "delivery_failed");
  assert.equal(failedResult.errors.length, 2);

  console.log(JSON.stringify({ ok: true, test: "john_handoff_transport", completed: true }, null, 2));
}

testTransports().catch((err) => {
  console.error("test-john-handoff-transport failed:", err);
  process.exit(1);
});
