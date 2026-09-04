/**
 * cogentia/scripts/lib/operium-bridge.js
 *
 * Implements the bridge from Cogentia to Operium:
 * 1. Queries FixBugsFirst gate (operium backlog gate --subsystem <slug>)
 * 2. Fetches real-time operational status (operium status)
 * 3. Triggers sovereign checkpoints (operium checkpoint) upon completion of major cognitive cycles
 * 4. Never throws or blocks Cogentia execution if Operium is unreachable (graceful degradation)
 */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COGENTIA_ROOT = path.resolve(__dirname, "../..");
const WORKSPACE_ROOT = path.resolve(COGENTIA_ROOT, "..");
const OPERIUM_BIN = path.resolve(WORKSPACE_ROOT, "operium/bin/operium.js");

export async function checkOperiumBacklogGate(subsystem = "mesh", options = {}) {
  if (!fs.existsSync(OPERIUM_BIN)) {
    return {
      schema: "operium.backlog.gate.v1",
      ok: true,
      blocked: false,
      subsystem,
      note: "operium_binary_not_found_fallback_unblocked",
    };
  }

  try {
    const { stdout } = await execFileAsync("node", [
      OPERIUM_BIN,
      "backlog",
      "gate",
      "--subsystem",
      subsystem,
      "--json",
    ], {
      timeout: options.timeoutMs || 10000,
    });

    const parsed = JSON.parse(stdout.trim());
    return {
      ok: true,
      ...parsed,
    };
  } catch (err) {
    return {
      schema: "operium.backlog.gate.v1",
      ok: false,
      blocked: false,
      subsystem,
      error: err.message,
    };
  }
}

export async function getOperiumStatus(options = {}) {
  if (!fs.existsSync(OPERIUM_BIN)) {
    return { ok: false, error: "operium_not_found" };
  }

  try {
    const args = [OPERIUM_BIN, "status", "--json"];
    if (options.probe === false) args.push("--no-probe");

    const { stdout } = await execFileAsync("node", args, {
      timeout: options.timeoutMs || 15000,
    });

    return JSON.parse(stdout.trim());
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function triggerOperiumCheckpoint(reason = "cognitive-cycle", options = {}) {
  if (!fs.existsSync(OPERIUM_BIN)) {
    return { ok: false, error: "operium_not_found" };
  }

  try {
    const args = [OPERIUM_BIN, "checkpoint", "--json"];
    if (options.dryRun) args.push("--dry-run");

    const { stdout } = await execFileAsync("node", args, {
      timeout: options.timeoutMs || 15000,
    });

    return JSON.parse(stdout.trim());
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
