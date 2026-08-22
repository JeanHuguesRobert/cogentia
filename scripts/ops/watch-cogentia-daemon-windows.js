#!/usr/bin/env node
/**
 * Workstation watchdog: poll local Cogentia daemon health, restart if down.
 * Logs NDJSON next to the daemon trace file. Fracta uses systemd instead.
 *
 *   node scripts/ops/watch-cogentia-daemon-windows.js
 *   node scripts/ops/watch-cogentia-daemon-windows.js --once
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const port = Number(process.env.COGENTIA_PORT || 8790);
const host = process.env.COGENTIA_DAEMON_HOST || "127.0.0.1";
const intervalMs = Number(process.env.COGENTIA_DAEMON_WATCH_MS || 15000);
const failLimit = Number(process.env.COGENTIA_DAEMON_FAIL_LIMIT || 3);
const healthTimeoutMs = Number(process.env.COGENTIA_DAEMON_HEALTH_TIMEOUT_MS || 8000);
const logFile = process.env.COGENTIA_DAEMON_WATCH_LOG
  || path.join(os.homedir(), ".cogentia", "logs", "cogentia-daemon-watch.jsonl");
const startScript = path.join(repoRoot, "scripts", "ops", "start-cogentia-daemon-windows.ps1");

const once = process.argv.includes("--once");

function trace(record) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record });
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, `${line}\n`);
  console.error(line);
}

async function health() {
  const url = `http://${host}:${port}/api/context/health?quick=1`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(healthTimeoutMs) });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.ok === true, ms: Date.now() - t0, status: res.status };
  } catch (error) {
    return { ok: false, ms: Date.now() - t0, error: error.message, name: error.name };
  }
}

function restartDaemon() {
  const ps = process.env.COGENTIA_PWSH || "pwsh";
  const child = spawn(ps, ["-NoProfile", "-File", startScript, "-Replace", "-Port", String(port)], {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      trace({ event: "restart_spawn_error", message: err.message });
      resolve(1);
    });
  });
}

let fails = 0;

async function tick() {
  const result = await health();
  if (result.ok) {
    if (fails > 0) trace({ event: "health_recovered", fails, ...result });
    fails = 0;
    return;
  }
  fails += 1;
  trace({ event: "health_fail", fails, failLimit, ...result });
  if (fails < failLimit) return;
  trace({ event: "restart" });
  const code = await restartDaemon();
  trace({ event: "restart_done", code });
  fails = 0;
}

if (once) {
  const result = await health();
  trace({ event: "once", ...result });
  process.exit(result.ok ? 0 : 1);
}

trace({ event: "watch_start", host, port, intervalMs, logFile });
await tick();
setInterval(() => {
  tick().catch((err) => trace({ event: "tick_error", message: err.message }));
}, intervalMs);
