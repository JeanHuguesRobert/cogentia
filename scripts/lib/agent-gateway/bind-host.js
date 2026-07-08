import { execFileSync } from "node:child_process";
import fs from "node:fs";

const BIND_ALIASES = new Set(["loopback", "localhost", "127.0.0.1", "::1"]);
const ALL_ALIASES = new Set(["all", "0.0.0.0", "::", "*"]);

export function resolveBindHost(input, env = process.env) {
  const raw = String(input || env.AGENT_GATEWAY_BIND || env.AGENT_GATEWAY_HOST || "loopback").trim();
  const key = raw.toLowerCase();

  if (BIND_ALIASES.has(key)) return { host: "127.0.0.1", mode: "loopback" };
  if (ALL_ALIASES.has(key)) return { host: "0.0.0.0", mode: "all" };
  if (key === "tailscale") {
    const ip = readTailscaleIPv4(env);
    if (ip) return { host: ip, mode: "tailscale", tailscale_ip: ip };
    return { host: "0.0.0.0", mode: "all", warning: "tailscale_ip_unavailable" };
  }
  return { host: raw, mode: "custom" };
}

export function requireTokenForExposure(bind, token) {
  if (bind.mode === "loopback") return null;
  if (String(token || "").trim()) return null;
  return "AGENT_GATEWAY_TOKEN is required when binding outside loopback";
}

function readTailscaleIPv4(env) {
  const candidates = [];
  if (process.platform === "win32") {
    candidates.push("C:\\Program Files\\Tailscale\\tailscale.exe");
  }
  candidates.push("tailscale");

  for (const bin of candidates) {
    if (process.platform === "win32" && bin.includes("\\") && !fs.existsSync(bin)) continue;
    try {
      const out = execFileSync(bin, ["ip", "-4"], {
        encoding: "utf8",
        env,
        timeout: 5000,
      }).trim();
      const ip = out.split(/\r?\n/).map(s => s.trim()).find(Boolean);
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
    } catch {
      // try next candidate
    }
  }
  return null;
}