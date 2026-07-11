import { pathToFileURL } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnHeadless } from "./spawn-headless.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function watchdogEnabled(env = process.env) {
  return parseBoolean(env.AGENT_GATEWAY_WATCHDOG, true);
}

/**
 * Attempt a one-shot gateway restart (platform-specific start script).
 * On Windows prefers in-process runGatewayStart() — no child node.exe console flash.
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
    const script = path.join(repoRoot, "scripts", "ops", "start-agent-gateway-windows.js");
    if (!fs.existsSync(script)) {
      return { attempted: true, ok: false, detail: "start_script_missing", command: script };
    }
    try {
      const mod = await import(pathToFileURL(script).href);
      if (typeof mod.runGatewayStart === "function") {
        const result = await mod.runGatewayStart({
          env,
          cli: {
            envFile: env.AGENT_GATEWAY_ENV_FILE
              || path.join(os.homedir(), ".cogentia", "secrets", "agent-gateway.env"),
          },
        });
        return {
          attempted: true,
          ok: result.ok === true,
          command: "in_process:runGatewayStart",
          detail: result.ok ? "ok" : (result.error || "gateway_start_failed"),
        };
      }
    } catch (error) {
      return {
        attempted: true,
        ok: false,
        command: "in_process:runGatewayStart",
        detail: error.message || "gateway_start_failed",
      };
    }
    return runProcess(process.execPath, [script], {
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

function runShellCommand(command, options) {
  return new Promise(resolve => {
    const child = spawnHeadless(command, [], {
      shell: true,
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        attempted: true,
        ok: false,
        command,
        detail: "watchdog_timeout",
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
        detail: code === 0 ? "ok" : `exit_${code}`,
      });
    });
  });
}

function runProcess(command, args, options) {
  return new Promise(resolve => {
    const child = spawnHeadless(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        attempted: true,
        ok: false,
        command: [command, ...args].join(" "),
        detail: "watchdog_timeout",
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
        detail: code === 0 ? "ok" : `exit_${code}`,
      });
    });
  });
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return fallback;
}