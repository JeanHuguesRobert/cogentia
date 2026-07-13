#!/usr/bin/env node
/**
 * Active peer watchdog daemon for Fractanet distributed nodes.
 * Monitors coordinator VPS health and alerts if the coordinator goes offline.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

// Parse CLI arguments for env files
const args = process.argv.slice(2);
const envFiles = [];
const runOnce = args.includes("--once");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--blackboard-env-file" && args[i + 1]) {
    envFiles.push(args[i + 1]);
    i++;
  }
}
loadOptionalEnvFiles(envFiles);

// Default settings
const BLACKBOARD_URL = String(process.env.COGENTIA_BLACKBOARD_URL || "https://cogentia.fractavolta.com").trim().replace(/\/$/, "");
const INTERVAL_MS = Number(process.env.FRACTANET_WATCHDOG_INTERVAL_MS) || 60_000;
const FAIL_THRESHOLD = Number(process.env.FRACTANET_WATCHDOG_FAIL_THRESHOLD) || 2;

const logPath = path.join(os.homedir(), ".cogentia-peer-watchdog.log");

function logMessage(text) {
  const line = `[${new Date().toISOString()}] ${text}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(logPath, line, "utf8");
  } catch (_) {}
}

async function probeUrl(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const elapsed = Date.now() - started;
    return { ok: res.ok, status: res.status, elapsed };
  } catch (error) {
    return { ok: false, error: error.message || "timeout", elapsed: Date.now() - started };
  }
}

// OS Notification Helpers
function triggerAlert(message) {
  logMessage(`!!! ALERT TRIGGERED !!! ${message}`);
  // Auditory warning
  process.stdout.write("\u0007\u0007\u0007");

  const platform = os.platform();
  if (platform === "win32") {
    const script = "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show($env:FRACTANET_ALERT_MESSAGE, 'Fractanet Peer Watchdog', 0, 48) | Out-Null";
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      env: { ...process.env, FRACTANET_ALERT_MESSAGE: message },
    }, (err) => {
      if (err) logMessage(`Failed to display Windows alert: ${err.message}`);
    });
  } else if (platform === "android" || fs.existsSync("/data/data/com.termux")) {
    execFile("termux-notification", ["--title", "Fractanet Alert", "--content", message, "--priority", "high"], (err) => {
      if (err) logMessage(`Failed to trigger Termux notification: ${err.message}`);
    });
  } else if (platform === "linux") {
    execFile("notify-send", ["-u", "critical", "Fractanet Alert", message], (err) => {
      if (err) {
        execFile("wall", [`FRACTANET ALERT: ${message}`], () => {});
      }
    });
  }
}

let consecutiveFailures = 0;

async function checkHealth() {
  logMessage(`Running peer check on coordinator: ${BLACKBOARD_URL}`);
  
  // Probes the core endpoints
  const endpoints = [
    { name: "Cogentia Daemon", url: `${BLACKBOARD_URL}/health` },
    { name: "Guide Stack", url: `${BLACKBOARD_URL}/guide/health` },
  ];

  let anyFailed = false;
  let reportDetails = [];

  for (const endpoint of endpoints) {
    const probe = await probeUrl(endpoint.url);
    if (probe.ok) {
      reportDetails.push(`${endpoint.name} online (${probe.elapsed}ms)`);
    } else {
      anyFailed = true;
      reportDetails.push(`${endpoint.name} offline: ${probe.error || `HTTP ${probe.status}`} (${probe.elapsed}ms)`);
    }
  }

  logMessage(`Status: ${reportDetails.join(" | ")}`);

  if (anyFailed) {
    consecutiveFailures++;
    logMessage(`Consecutive failures: ${consecutiveFailures}/${FAIL_THRESHOLD}`);
    
    if (consecutiveFailures === FAIL_THRESHOLD) {
      triggerAlert(`Coordinator VPS at ${BLACKBOARD_URL} is experiencing connection dropouts or resource fatigue.`);
    }
  } else {
    if (consecutiveFailures >= FAIL_THRESHOLD) {
      logMessage("Coordinator VPS has recovered. Clearing alert state.");
      triggerAlert("Coordinator VPS has recovered and is now back online.");
    }
    consecutiveFailures = 0;
  }
}

function loadOptionalEnvFiles(files) {
  const allowedKeys = new Set([
    "COGENTIA_BLACKBOARD_URL",
    "FRACTANET_WATCHDOG_INTERVAL_MS",
    "FRACTANET_WATCHDOG_FAIL_THRESHOLD",
  ]);
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(String(file));
    if (!fs.existsSync(resolved)) continue;
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (!allowedKeys.has(key)) continue;
      if (process.env[key] != null) continue;
      process.env[key] = unquoteEnvValue(match[2]);
    }
  }
}

function unquoteEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Run loop
logMessage(`Peer Watchdog active. Target coordinator: ${BLACKBOARD_URL}`);
logMessage(`Log path: ${logPath}`);

await checkHealth();
if (!runOnce) {
  setInterval(checkHealth, INTERVAL_MS);
}
