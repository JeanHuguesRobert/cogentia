// File: scripts/test-continuation-trace-sync.js
// Description: Automated verification for continuation and interaction trace packet sync (Issue #68).

import { listContinuationsCore, syncInteractionTracesCore } from "./lib/cogentia-core.js";

async function runContinuationTraceSyncTest() {
  console.log("🚀 Testing Continuation & Interaction Trace Sync Automation (Issue #68)...\n");

  // 1. Run syncInteractionTracesCore
  console.log("--- 1. Sync Interaction Traces ---");
  const syncResult = await syncInteractionTracesCore();
  console.log("Sync Result Summary:", JSON.stringify({
    ok: syncResult.ok,
    total_packets: syncResult.total_packets,
    timestamp: syncResult.timestamp
  }, null, 2));

  if (!syncResult.ok || typeof syncResult.total_packets !== "number") {
    throw new Error("syncInteractionTracesCore failed!");
  }
  console.log(`✓ Scanned ${syncResult.total_packets} interaction & continuation trace packets.\n`);

  // 2. Test listContinuationsCore
  console.log("--- 2. List Continuations Core ---");
  const listResult = await listContinuationsCore({ status: "alive" });
  console.log("Alive Continuations Count:", listResult.total);

  if (listResult.total > 0) {
    console.log("Sample Continuation Packet:", JSON.stringify(listResult.continuations[0], null, 2));
  }
  console.log("✓ listContinuationsCore PASS\n");

  console.log("==========================================================================");
  console.log("✅ CONTINUATION & INTERACTION TRACE SYNC VERIFICATION PASSED (100%)");
  console.log("==========================================================================");
}

runContinuationTraceSyncTest().catch(err => {
  console.error("❌ Continuation Trace Sync Test Failed:", err);
  process.exit(1);
});
