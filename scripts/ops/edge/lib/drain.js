import { probeFractanet } from "./connectivity.js";
import { deliverHttpPost } from "./deliver.js";
import { resolveTrapUrl } from "./trap.js";
import {
  listPendingOutbox,
  markOutboxDelivered,
  markOutboxFailed,
  markOutboxInFlight,
  outboxStats,
} from "./outbox.js";

export async function drainOutboxOnce(stateDir, options = {}) {
  const connectivity = await probeFractanet(options);
  if (!connectivity.ok) {
    return {
      ok: true,
      skipped: "fractanet_unreachable",
      stats: outboxStats(stateDir),
      connectivity,
    };
  }

  const pending = listPendingOutbox(stateDir);
  const results = [];
  for (const row of pending) {
    if (row.kind !== "http.post") {
      const fail = markOutboxFailed(row, `unsupported_kind:${row.kind}`);
      results.push({ id: row.id, ok: false, error: fail.state, kind: row.kind });
      continue;
    }
    try {
      markOutboxInFlight(row);
      const payload = normalizeOutboxPayload(row, options.env || process.env);
      const timeoutMs = row.target === "trap.notify"
        ? Number(options.trapTimeoutMs || 60_000)
        : Number(options.timeoutMs || 25_000);
      const result = await deliverHttpPost(payload, { ...options, timeoutMs });
      if (result.ok) {
        markOutboxDelivered(row);
        results.push({ id: row.id, ok: true, target: row.target, status: result.status });
      } else {
        const fail = markOutboxFailed(row, result.error || "delivery_failed");
        results.push({
          id: row.id,
          ok: false,
          target: row.target,
          error: result.error,
          attempts: fail.attempts,
          state: fail.state,
          next_attempt_at: fail.next_attempt_at,
        });
      }
    } catch (error) {
      const fail = markOutboxFailed(row, error.message || "delivery_failed");
      results.push({
        id: row.id,
        ok: false,
        target: row.target,
        error: error.message,
        attempts: fail.attempts,
        state: fail.state,
        next_attempt_at: fail.next_attempt_at,
      });
    }
  }

  return {
    ok: true,
    drained: results.length,
    delivered: results.filter(item => item.ok).length,
    failed: results.filter(item => !item.ok).length,
    probe_url: connectivity.url,
    stats: outboxStats(stateDir),
    results,
  };
}

function normalizeOutboxPayload(row, env = process.env) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  if (row.target !== "trap.notify" || row.kind !== "http.post") return payload;
  const trapUrl = resolveTrapUrl(env);
  if (!trapUrl) return payload;
  return { ...payload, url: trapUrl };
}