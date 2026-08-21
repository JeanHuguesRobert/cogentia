import assert from "node:assert/strict";
import http from "node:http";
import { packHandoffPacket, runHandoffPacket } from "./lib/john-handoff.js";
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

  // 3. Test REAL Over-The-Wire HTTP Socket Transport with ephemeral server
  const server = http.createServer(async (req, res) => {
    try {
      assert.equal(req.method, "POST");
      assert.equal(req.headers["authorization"], "Bearer test-auth-token-123");
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        try {
          const receivedPacket = JSON.parse(body);
          const execResult = await runHandoffPacket(receivedPacket, { nodeId: "node:http-daemon" });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, returnPacket: execResult.returnPacket }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const serverPort = server.address().port;
  const serverUrl = `http://127.0.0.1:${serverPort}`;

  try {
    const httpResult = await sendHandoffPacket(packet, {
      target: serverUrl,
      options: { bearerToken: "test-auth-token-123", timeoutMs: 3000 },
    });

    assert.equal(httpResult.ok, true);
    assert.equal(httpResult.transport, "http_direct");
    assert.equal(httpResult.data.ok, true);
    assert.equal(httpResult.data.returnPacket.envelope.status, "solved");
    assert.equal(httpResult.data.returnPacket.envelope.lineage.solved_by_node, "node:http-daemon");
  } finally {
    server.close();
  }

  // 4. Test Total Failure (All invalid targets fail gracefully)
  const failedResult = await sendHandoffPacket(packet, {
    target: "http://127.0.0.1:9999/unreachable-1",
    fallbacks: ["http://127.0.0.1:9998/unreachable-2"],
    options: { timeoutMs: 300 },
  });

  assert.equal(failedResult.ok, false);
  assert.equal(failedResult.status, "delivery_failed");
  assert.equal(failedResult.errors.length, 2);

  console.log(JSON.stringify({ ok: true, test: "john_handoff_transport", completed: true, real_http_socket_tested: true }, null, 2));
}

testTransports().catch((err) => {
  console.error("test-john-handoff-transport failed:", err);
  process.exit(1);
});
