import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildDirectedPollResult } from "./edge-trap-protocol.js";

export function resolvePollSshTarget(trap, env = process.env) {
  const explicit = String(env.EDGE_POLL_SSH_TARGET || "").trim();
  if (explicit) return explicit;
  // SSH config Host alias (e.g. ~/.ssh/config `Host rpi3-view`) — not MagicDNS FQDN.
  return String(trap?.hostname || "rpi3-view").trim();
}

export function resolvePollSshIdentity(env = process.env) {
  const explicit = String(env.EDGE_POLL_SSH_IDENTITY || "").trim();
  if (explicit) return path.resolve(explicit);
  const mesh = path.join(os.homedir(), ".ssh", "fractanet-mesh");
  return fs.existsSync(mesh) ? mesh : "";
}

export function resolvePollHandoffCommand(env = process.env) {
  const configured = String(env.EDGE_POLL_HANDOFF_CMD || "").trim();
  if (configured) return configured;
  return "~/.local/bin/node ~/srv/cogentia/repos/cogentia/scripts/ops/edge/poll-handoff.js --json";
}

export function runDirectedEdgePoll(trap, options = {}) {
  const env = options.env || process.env;
  const sshTarget = resolvePollSshTarget(trap, env);
  const remoteCmd = resolvePollHandoffCommand(env);
  const timeoutMs = Number(options.timeoutMs || 30_000);

  return new Promise((resolve) => {
    const args = [
      "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=12",
      "-o", "StrictHostKeyChecking=accept-new",
    ];
    const identity = resolvePollSshIdentity(env);
    if (identity) {
      args.push("-i", identity, "-o", "IdentitiesOnly=yes");
    }
    args.push(sshTarget, remoteCmd);
    const child = spawn("ssh", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(buildDirectedPollResult({
        trap_id: trap?.trap_id,
        node_id: trap?.node_id,
        hostname: trap?.hostname,
        ok: false,
        error: "directed_poll_timeout",
        transport: "ssh",
      }));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve(buildDirectedPollResult({
          trap_id: trap?.trap_id,
          node_id: trap?.node_id,
          hostname: trap?.hostname,
          ok: false,
          error: trimTail(stderr || stdout || `ssh_exit_${code}`),
          transport: "ssh",
        }));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(buildDirectedPollResult({
          trap_id: trap?.trap_id,
          node_id: trap?.node_id || parsed.node_id,
          hostname: trap?.hostname || parsed.hostname,
          ok: parsed.ok !== false,
          transport: "ssh",
          outbox: parsed.stats || parsed.outbox || null,
          drain: parsed.drain || null,
          error: parsed.error || null,
        }));
      } catch (error) {
        resolve(buildDirectedPollResult({
          trap_id: trap?.trap_id,
          node_id: trap?.node_id,
          hostname: trap?.hostname,
          ok: false,
          error: error.message || "invalid_poll_handoff_json",
          transport: "ssh",
        }));
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve(buildDirectedPollResult({
        trap_id: trap?.trap_id,
        node_id: trap?.node_id,
        hostname: trap?.hostname,
        ok: false,
        error: error.message || "ssh_spawn_failed",
        transport: "ssh",
      }));
    });
  });
}

function trimTail(text, max = 300) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(-max);
}