import { buildEdgeTrap, EDGE_TRAP_EVENT } from "./edge-trap-protocol.js";
import { appendEdgeTrap, readRecentEdgeTraps } from "./edge-trap-store.js";
import { runDirectedEdgePoll } from "./edge-directed-poll.js";

export async function handleEdgeTrapPost(body, options = {}) {
  const env = options.env || process.env;
  const parsed = body && typeof body === "object" ? body : {};
  if (String(parsed.event || "").trim() && parsed.event !== EDGE_TRAP_EVENT) {
    return { ok: false, error: "invalid_trap_event" };
  }

  const trap = buildEdgeTrap({
    trap_id: parsed.trap_id,
    node_id: parsed.node_id,
    hostname: parsed.hostname,
    trap_type: parsed.trap_type,
    severity: parsed.severity,
    detail: parsed.detail,
    emitted_at: parsed.emitted_at,
  });

  const stored = appendEdgeTrap(trap, { env });
  const directedPollEnabled = parseBooleanEnv(env.EDGE_DIRECTED_POLL, true);
  let directed_poll = { ok: false, skipped: "disabled" };

  if (directedPollEnabled) {
    directed_poll = await runDirectedEdgePoll(trap, { env });
    appendEdgeTrap({
      ...directed_poll,
      trap_id: trap.trap_id,
      node_id: trap.node_id,
      hostname: trap.hostname,
      trap_type: "directed-poll.result",
      severity: directed_poll.ok ? "info" : "warning",
      detail: {
        drain: directed_poll.drain,
        outbox: directed_poll.outbox,
        error: directed_poll.error,
      },
    }, { env });
  }

  return {
    ok: true,
    trap_id: trap.trap_id,
    stored_at: stored.store_path,
    directed_poll,
  };
}

export function handleEdgeTrapsGet(url, options = {}) {
  const env = options.env || process.env;
  const parsed = new URL(url, "http://127.0.0.1");
  const hostname = parsed.searchParams.get("hostname") || "";
  const limit = Number(parsed.searchParams.get("limit") || 30);
  const traps = readRecentEdgeTraps({ env, hostname, limit });
  return {
    ok: true,
    count: traps.length,
    traps,
  };
}

function parseBooleanEnv(value, fallback) {
  if (value == null || value === "") return fallback;
  const clean = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  return fallback;
}