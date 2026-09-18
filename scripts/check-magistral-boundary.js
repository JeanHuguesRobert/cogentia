// File: scripts/test-magistral-boundary.js
// Description: Automated test for Magistral AI Router boundary and secret sanitization.

import { createAiRouterClient, aiRouterHealth } from "./lib/cogentia-core.js";

async function runMagistralBoundaryTest() {
  console.log("🚀 Testing Cogentia <-> Magistral AI Router Boundary (Issue #67)...\n");

  // 1. Check default client creation & loopback URL validation
  console.log("--- 1. Client Configuration Test ---");
  const client = createAiRouterClient({ baseUrl: "http://127.0.0.1:8880" });
  console.log("Base URL:", client.baseUrl);
  console.log("Public Router Info:", JSON.stringify(client.publicInfo()));

  if (!client.publicInfo().loopback) {
    throw new Error("Expected loopback host detection for 127.0.0.1");
  }
  console.log("✓ Loopback URL validation PASS\n");

  // 2. Test degraded fallback when Magistral is offline
  console.log("--- 2. Degraded Fallback Test (Unreachable Port) ---");
  const offlineHealth = await aiRouterHealth({ baseUrl: "http://127.0.0.1:59999", timeoutMs: 1000 });
  console.log("Offline Health Result:", JSON.stringify(offlineHealth, null, 2));

  if (offlineHealth.available !== false || offlineHealth.error !== "ai_router_unavailable") {
    throw new Error("Expected graceful degraded fallback for offline router");
  }
  console.log("✓ Degraded mode fallback PASS\n");

  // 3. Test secret & token sanitization
  console.log("--- 3. Secret & API Key Sanitization Test ---");
  const mockFetch = async () => {
    return {
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({
        service: "magistral-mock",
        capabilities: { chat: true, embeddings: true },
        api_key: "secret_live_key_do_not_leak",
        authorization: "Bearer secret_token",
        version: "1.2.0"
      })
    };
  };

  const sanitizedHealth = await aiRouterHealth({ fetchImpl: mockFetch });
  console.log("Sanitized Health Payload:", JSON.stringify(sanitizedHealth, null, 2));

  if (sanitizedHealth.health.api_key || sanitizedHealth.health.authorization) {
    throw new Error("❌ CRITICAL: Secret key leaked in health payload!");
  }
  console.log("✓ Secret & API key sanitization PASS (Zero Leaks)\n");

  console.log("==========================================================================");
  console.log("✅ MAGISTRAL AI ROUTER BOUNDARY VERIFICATION PASSED (100%)");
  console.log("==========================================================================");
}

runMagistralBoundaryTest().catch(err => {
  console.error("❌ Magistral Boundary Test Failed:", err);
  process.exit(1);
});
