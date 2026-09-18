import assert from "node:assert/strict";
import { JohnPacketListener } from "./lib/john-listener.js";
import { packHandoffPacket } from "./lib/john-handoff.js";
import { sendHandoffPacket } from "./lib/john-handoff-transport.js";

async function testJohnListenerSuite() {
  const listener = new JohnPacketListener({
    port: 0, // Ephemeral OS port
    host: "127.0.0.1",
    nodeId: "node:test:ephemeral-listener",
  });

  const info = await listener.start();
  const address = listener.server.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Test GET /health
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.node_id, "node:test:ephemeral-listener");
    assert.equal(health.status, "online");
    assert.ok(Array.isArray(health.capabilities));

    // 2. Test GET /cop/capabilities
    const capsRes = await fetch(`${baseUrl}/cop/capabilities`);
    assert.equal(capsRes.status, 200);
    const caps = await capsRes.json();
    assert.ok(caps.length >= 3);
    assert.ok(caps.some((c) => c.name === "john.converse"));

    // 3. Test POST /cop/packet ingestion and autonomous execution
    const request = {
      version: "john.request.v1",
      request_id: "listener-test-001",
      principal: { id: "test:principal" },
      mandate: { id: "mandate:test", version: "1" },
      budget: { id: "budget:test" },
      execution_budget: {
        max_steps: 3,
        max_tool_calls: 1,
        max_subagents: 0,
        max_elapsed_ms: 5000,
        max_external_effects: 0,
      },
      exposure: "none",
      capability: "john.converse",
      input: { prompt: "Test autonomous packet attraction on ephemeral listener" },
      handler: { id: "mock.echo", kind: "mock" },
      ithaca: {
        description: "Test Ithaca Channel",
        return_target: "mock://return-channel",
        return_conditions: ["run.completed"],
      },
    };

    const sealedPacket = packHandoffPacket(request, { targetNode: "node:test:ephemeral-listener" });

    // Send packet using standard HTTP transport driver
    const dispatchResult = await sendHandoffPacket(sealedPacket, {
      target: baseUrl,
    });

    assert.equal(dispatchResult.ok, true);
    assert.equal(dispatchResult.status, "completed");
    assert.equal(dispatchResult.returnPacket.envelope.status, "solved");
    assert.ok(dispatchResult.returnPacket.yield);
    assert.ok(dispatchResult.returnPacket.envelope.hops.length >= 2);

    // 4. Test OpenAI-compatible /v1/models endpoint
    const modelsRes = await fetch(`${baseUrl}/guide/v1/models`);
    assert.equal(modelsRes.status, 200);
    const models = await modelsRes.json();
    assert.ok(models.data || models.object === "list");

    console.log(JSON.stringify({
      ok: true,
      test: "john_packet_listener",
      node_id: health.node_id,
      port_tested: port,
      packet_attracted: true,
      completed: true,
    }, null, 2));

  } finally {
    await listener.stop();
  }
}

testJohnListenerSuite().catch((err) => {
  console.error("test-john-listener failed:", err);
  process.exit(1);
});
