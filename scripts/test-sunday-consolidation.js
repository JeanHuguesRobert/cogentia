// File: scripts/test-sunday-consolidation.js
// Description: Automated test for Sunday Corpus Consolidation Runner (Issue #70).

import fs from "node:fs";
import path from "node:path";
import { runWeeklyConsolidation } from "./lib/cogentia-core.js";

async function runSundayConsolidationTest() {
  console.log("🚀 Testing Sunday Corpus Consolidation Pipeline (Issue #70)...\n");

  const result = await runWeeklyConsolidation({ root: process.cwd() });
  console.log("Consolidation Result Summary:", JSON.stringify({
    ok: result.ok,
    sprint_tag: result.sprint_tag,
    timestamp: result.timestamp,
    repos_projected: result.repos_projected,
    packets_scanned: result.packets_scanned,
    digest_path: result.digest_path
  }, null, 2));

  if (!result.ok || !fs.existsSync(result.digest_path)) {
    throw new Error("❌ Sunday Consolidation failed or Weekly Digest missing!");
  }

  const digestStat = fs.statSync(result.digest_path);
  console.log(`\n✓ Weekly Digest generated successfully at: ${result.digest_path} (${digestStat.size} bytes)`);

  if (digestStat.size < 500) {
    throw new Error("Expected weekly digest size > 500 bytes");
  }

  console.log("==========================================================================");
  console.log("✅ SUNDAY CORPUS CONSOLIDATION RUNNER VERIFICATION PASSED (100%)");
  console.log("==========================================================================");
}

runSundayConsolidationTest().catch(err => {
  console.error("❌ Sunday Consolidation Test Failed:", err);
  process.exit(1);
});
