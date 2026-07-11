#!/usr/bin/env node
/**
 * Start or restart Agent CLI Gateway on Windows (background + log + health probe).
 * Export runGatewayStart() for in-process watchdog / ONA (no child node.exe flash).
 */

import { execFile, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadAgentGatewayEnv } from "../lib/agent-gateway-env.js";
import { resolveBindHost } from "../lib/agent-gateway/bind-host.js";
import { spawnHeadless } from "../lib/spawn-headless.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function runGatewayStart(options = {}) {
  const cli = options.cli || {};
  const paths = resolvePaths(cli);
  const runtimeEnv = { ...(options.env || process.env) };

  if (!fs.existsSync(paths.envFile)) {
    return {
      ok: false,
      error: "env_file_missing",
      env_file: paths.envFile,
    };
  }

  fs.mkdirSync(paths.varDir, { recursive: true });
  const logFile = path.join(paths.varDir, "agent-gateway.log");
  loadAgentGatewayEnv([paths.envFile], runtimeEnv);

  const stopped = await stopExistingGatewayProcesses();
  if (stopped.length) await sleep(2000);

  const port = Number(runtimeEnv.AGENT_GATEWAY_PORT || cli.port || 8793);
  const gatewayScript = path.join(paths.root, "scripts", "agent-gateway.js");
  if (!fs.existsSync(gatewayScript)) {
    return { ok: false, error: "gateway_entry_missing", script: gatewayScript };
  }

  const logFd = await openLogFile(logFile);
  const child = spawnHeadless(process.execPath, [gatewayScript, "--port", String(port)], {
    cwd: paths.root,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: runtimeEnv,
  });
  child.unref();
  fs.closeSync(logFd);

  await sleep(4000);

  const token = String(runtimeEnv.AGENT_GATEWAY_TOKEN || "").trim();
  const healthHost = resolveHealthHost(runtimeEnv.AGENT_GATEWAY_BIND, paths.nodeSlug);

  try {
    const health = await probeHealth(healthHost, port, token);
    return {
      ok: true,
      pid: child.pid,
      port,
      log_file: logFile,
      health,
      stopped_pids: stopped,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "health_not_ok",
      pid: child.pid,
      port,
      log_file: logFile,
      stopped_pids: stopped,
    };
  }
}

function parseArgs(argv) {
  const options = { envFile: "", repoRoot: "", port: 0 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file" && argv[i + 1]) {
      options.envFile = argv[++i];
      continue;
    }
    if (arg === "--repo-root" && argv[i + 1]) {
      options.repoRoot = argv[++i];
      continue;
    }
    if (arg === "--port" && argv[i + 1]) {
      options.port = Number(argv[++i]);
    }
  }
  return options;
}

function resolvePaths(options) {
  const nodeSlug = os.hostname().toLowerCase();
  const secretsDir = path.join(os.homedir(), ".cogentia", "secrets");
  const varDir = path.join(os.homedir(), ".cogentia", "var");
  const envFile = options.envFile
    ? path.resolve(options.envFile)
    : path.join(secretsDir, "agent-gateway.env");
  const root = options.repoRoot ? path.resolve(options.repoRoot) : repoRoot;
  return { nodeSlug, secretsDir, varDir, envFile, root };
}

function resolveHealthHost(bind, hostname) {
  const mode = String(bind || "loopback").trim().toLowerCase();
  if (["loopback", "localhost", "127.0.0.1"].includes(mode)) return "127.0.0.1";
  if (mode === "tailscale") {
    const resolved = resolveBindHost("tailscale");
    if (resolved.tailscale_ip) return resolved.tailscale_ip;
    return hostname;
  }
  return "127.0.0.1";
}

async function stopExistingGatewayProcesses() {
  if (process.platform !== "win32") return [];
  const pids = await listGatewayProcessIds();
  for (const pid of pids) {
    console.log(`[agent-gateway] stopping pid ${pid}`);
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", windowsHide: true });
    } catch {
      // best effort
    }
  }
  return pids;
}

async function listGatewayProcessIds() {
  const pattern = /agent-gateway\.js/i;
  const pids = new Set();

  try {
    const { stdout } = await execFileAsync(
      "wmic",
      ["process", "where", "name='node.exe'", "get", "ProcessId,CommandLine", "/format:csv"],
      { encoding: "utf8", windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    );
    for (const line of stdout.split(/\r?\n/)) {
      if (!pattern.test(line)) continue;
      const match = line.match(/,(\d+)\s*$/);
      if (match) pids.add(Number(match[1]));
    }
  } catch {
    // best effort
  }

  return [...pids];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function openLogFile(logFile, attempts = 8) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return fs.openSync(logFile, "a");
    } catch (error) {
      lastError = error;
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastError;
}

async function probeHealth(host, port, token, timeoutMs = 45_000) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`http://${host}:${port}/health`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json();
  if (!response.ok || !body?.ok) {
    throw new Error("health_not_ok");
  }
  return body;
}

function tailLog(logFile, lines = 20) {
  if (!fs.existsSync(logFile)) return;
  const content = fs.readFileSync(logFile, "utf8").split(/\r?\n/);
  for (const line of content.slice(-lines)) {
    if (line) console.log(line);
  }
}

function isCliInvocation() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

if (isCliInvocation()) {
  const result = await runGatewayStart({ cli: parseArgs(process.argv) });
  if (!result.ok) {
    console.error(`[agent-gateway] start failed — see ${result.log_file || "logs"}`);
    if (result.log_file) tailLog(result.log_file);
    console.error(result.error || "start_failed");
    process.exit(1);
  }
  console.log(`[agent-gateway] OK pid=${result.pid} port=${result.port} log=${result.log_file}`);
  console.log(JSON.stringify(result.health));
}