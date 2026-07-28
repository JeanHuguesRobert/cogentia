// File: scripts/test-auto-restart.js
// Description: Simulates process failure & auto-restart recovery timer to measure restart latency.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const mcpServerScript = path.join(moduleDir, "cogentia-mcp-http.js");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkPortHealth(port = 8795) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/tools`);
    return res.ok;
  } catch {
    return false;
  }
}

async function runAutoRestartBenchmark() {
  console.log("==========================================================================");
  console.log("       PROCESS FAILURE & AUTO-RESTART RECOVERY BENCHMARK TEST             ");
  console.log("==========================================================================");

  let currentProcess = null;
  let isRunning = true;
  let restartCount = 0;

  // Supervisor loop (simulates systemd Restart=always)
  const supervisor = (async () => {
    while (isRunning) {
      currentProcess = spawn("node", [mcpServerScript], {
        env: { ...process.env, PORT: "8795" },
        stdio: "ignore",
      });

      restartCount++;
      await new Promise((resolve) => {
        currentProcess.on("exit", () => {
          resolve();
        });
      });

      if (isRunning) {
        // systemd RestartSec delay simulation
        await sleep(200);
      }
    }
  })();

  // 1. Wait for initial startup
  console.log("\n[1/3] Waiting for initial server startup on port 8795...");
  let startWait = Date.now();
  while (!(await checkPortHealth(8795))) {
    await sleep(50);
    if (Date.now() - startWait > 5000) throw new Error("Timeout waiting for server start");
  }
  console.log(`✓ Initial startup ready in ${Date.now() - startWait} ms`);

  // 2. Simulate Process Failure (SIGKILL)
  console.log("\n[2/3] Simulating sudden process crash (killing PID)...");
  const crashTime = Date.now();
  currentProcess.kill("SIGKILL");
  console.log("💥 Process KILLED with SIGKILL!");

  // 3. Measure Recovery Latency
  console.log("\n[3/3] Polling server health to measure recovery time...");
  let recovered = false;
  let recoveryTimeMs = 0;

  while (!recovered) {
    await sleep(20);
    recovered = await checkPortHealth(8795);
    if (recovered) {
      recoveryTimeMs = Date.now() - crashTime;
    }
    if (Date.now() - crashTime > 5000) {
      break;
    }
  }

  // Cleanup
  isRunning = false;
  if (currentProcess) currentProcess.kill();

  console.log("\n==========================================================================");
  if (recovered) {
    console.log(`✅ AUTO-RESTART TEST PASSED!`);
    console.log(`⏱️ Total Recovery Latency: ${recoveryTimeMs} ms (${(recoveryTimeMs / 1000).toFixed(2)} seconds)`);
    console.log(`🔄 Restart Count: ${restartCount}`);
  } else {
    console.log(`❌ Recovery failed or timed out.`);
  }
  console.log("==========================================================================");
}

runAutoRestartBenchmark().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
