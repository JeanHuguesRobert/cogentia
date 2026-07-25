// File: scripts/test-static-projection-full.js
// Description: Automated test for llms.txt and llms-full.txt static projection generation (Issue #66).

import fs from "node:fs";
import path from "node:path";
import { emitStaticProjection } from "./lib/cogentia-core.js";

async function runStaticProjectionTest() {
  console.log("🚀 Testing Static Projection Emission (llms.txt & llms-full.txt - Issue #66)...\n");

  const mockCtx = {
    registryRoot: process.cwd(),
    repos: [
      { name: "cogentia", path: "." },
      { name: "barons-Mariani", path: "../barons-Mariani" }
    ]
  };

  const result = emitStaticProjection(mockCtx);
  console.log("Emit Result:", JSON.stringify(result, null, 2));

  if (!result.ok || !fs.existsSync(result.llms_path) || !fs.existsSync(result.llms_full_path)) {
    throw new Error("❌ Static projection emission failed!");
  }

  const llmsStat = fs.statSync(result.llms_path);
  const llmsFullStat = fs.statSync(result.llms_full_path);

  console.log(`✓ llms.txt generated successfully (${llmsStat.size} bytes)`);
  console.log(`✓ llms-full.txt generated successfully (${llmsFullStat.size} bytes)\n`);

  if (llmsFullStat.size < 1000) {
    throw new Error("Expected llms-full.txt size > 1,000 bytes");
  }

  console.log("==========================================================================");
  console.log("✅ STATIC PROJECTION & LLMS-FULL VERIFICATION PASSED (100%)");
  console.log("==========================================================================");
}

runStaticProjectionTest().catch(err => {
  console.error("❌ Static Projection Test Failed:", err);
  process.exit(1);
});
