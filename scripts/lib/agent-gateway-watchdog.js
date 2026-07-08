import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function watchdogEnabled(env = process.env) {
  return parseBoolean(env.AGENT_GATEWAY_WATCHDOG, true);
}

/**
 * Attempt a one-shot gateway restart (platform-specific start script).
 * @returns {Promise<{ attempted: boolean, ok: boolean, command?: string, detail?: string }>}
 */
export async function restartAgentGateway(options = {}) {
  const env = options.env || process.env;
  if (!watchdogEnabled(env)) {
    return { attempted: false, ok: false, detail: "watchdog_disabled" };
  }

  const override = String(env.AGENT_GATEWAY_WATCHDOG_RESTART_SCRIPT || "").trim();
  if (override) {
    return runShellCommand(override, {
      timeoutMs: Number(env.AGENT_GATEWAY_WATCHDOG_TIMEOUT_MS || 120_000),
      cwd: options.cwd || repoRoot,
      env,
    });
  }

  if (process.platform === "win32") {
    const script = path.join(repoRoot, "scripts", "ops", "start-agent-gateway-windows.ps1");
    if (!fs.existsSync(script)) {
      return { attempted: true, ok: false, detail: "start_script_missing", command: script };
    }
    const pwsh = resolvePwsh(env);
    return runProcess(pwsh, ["-NoProfile", "-File", script], {
      timeoutMs: Number(env.AGENT_GATEWAY_WATCHDOG_TIMEOUT_MS || 120_000),
      cwd: repoRoot,
      env,
    });
  }

  const termuxScript = path.join(os.homedir(), "fractanet-termux-start-gateway.sh");
  const repoScript = path.join(repoRoot, "scripts", "ops", "fractanet-termux-start-gateway.sh");
  const script = fs.existsSync(termuxScript) ? termuxScript : repoScript;
  if (!fs.existsSync(script)) {
    return { attempted: true, ok: false, detail: "start_script_missing", command: script };
  }
  return runProcess("bash", [script], {
    timeoutMs: Number(env.AGENT_GATEWAY_WATCHDOG_TIMEOUT_MS || 120_000),
    cwd: repoRoot,
    env,
  });
}

function resolvePwsh(env) {
  const configured = String(env.AGENT_GATEWAY_WATCHDOG_PWSH || "").trim();
  if (configured && fs.existsSync(configured)) return configured;
  const candidates = [
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    "C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "pwsh";
}

function runShellCommand(command, options) {
  return new Promise(resolve => {
    const child = spawn(command, {
      shell: true,
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let detail = "";
    child.stdout?.on("data", chunk => { detail += chunk; });
    child.stderr?.on("data", chunk => { detail += chunk; });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        attempted: true,
        ok: false,
        command,
        detail: trimTail(detail) || "watchdog_timeout",
      });
    }, options.timeoutMs);
    child.on("error", error => {
      clearTimeout(timer);
      resolve({ attempted: true, ok: false, command, detail: error.message });
    });
    child.on("close", code => {
      clearTimeout(timer);
      resolve({
        attempted: true,
        ok: code === 0,
        command,
        detail: trimTail(detail) || (code === 0 ? "ok" : `exit_${code}`),
      });
    });
  });
}

function runProcess(command, args, options) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let detail = "";
    child.stdout?.on("data", chunk => { detail += chunk; });
    child.stderr?.on("data", chunk => { detail += chunk; });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        attempted: true,
        ok: false,
        command: [command, ...args].join(" "),
        detail: trimTail(detail) || "watchdog_timeout",
      });
    }, options.timeoutMs);
    child.on("error", error => {
      clearTimeout(timer);
      resolve({
        attempted: true,
        ok: false,
        command: [command, ...args].join(" "),
        detail: error.message,
      });
    });
    child.on("close", code => {
      clearTimeout(timer);
      resolve({
        attempted: true,
        ok: code === 0,
        command: [command, ...args].join(" "),
        detail: trimTail(detail) || (code === 0 ? "ok" : `exit_${code}`),
      });
    });
  });
}

function trimTail(text, max = 400) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(-max);
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return fallback;
}