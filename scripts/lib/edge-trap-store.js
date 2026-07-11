import fs from "node:fs";
import path from "node:path";
import { resolveBlackboardStorePath } from "./packet-attractor-blackboard.js";

export function resolveEdgeTrapStorePath(env = process.env) {
  const configured = String(env.EDGE_TRAP_STORE || "").trim();
  if (configured) return path.resolve(configured);
  const opsDir = path.dirname(resolveBlackboardStorePath(env));
  return path.join(opsDir, "edge-traps.ndjson");
}

export function appendEdgeTrap(trap, options = {}) {
  const storePath = options.storePath || resolveEdgeTrapStorePath(options.env);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const line = `${JSON.stringify({
    stored_at: new Date().toISOString(),
    ...trap,
  })}\n`;
  fs.appendFileSync(storePath, line, "utf8");
  return { ok: true, store_path: storePath, trap_id: trap.trap_id };
}

export function readRecentEdgeTraps(options = {}) {
  const storePath = options.storePath || resolveEdgeTrapStorePath(options.env);
  const limit = Number(options.limit || 50);
  const hostname = String(options.hostname || "").trim().toLowerCase();
  if (!fs.existsSync(storePath)) return [];
  const lines = fs.readFileSync(storePath, "utf8").split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const line of lines.slice(-500)) {
    try {
      const parsed = JSON.parse(line);
      if (hostname && String(parsed.hostname || "").toLowerCase() !== hostname) continue;
      rows.push(parsed);
    } catch {
      continue;
    }
  }
  return rows.slice(-limit);
}