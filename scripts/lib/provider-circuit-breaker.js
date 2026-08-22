/**
 * provider-circuit-breaker.js — Unified In-Memory Circuit Breaker for LLM Synthesis Providers
 *
 * States:
 * - CLOSED: Provider is healthy and presumed available (normal traffic).
 * - OPEN: Provider encountered quota exhaustion (429/402/1113) or hard failure.
 *         Traffic is blocked for `quarantineMs` (default 5 min for quota, 1 min for network).
 * - HALF_OPEN: Quarantine expired; exactly one probe request is allowed through.
 */

export function createProviderCircuitBreaker(options = {}) {
  const defaultQuotaQuarantineMs = Number(options.quotaQuarantineMs || 300000); // 5 min
  const defaultNetworkQuarantineMs = Number(options.networkQuarantineMs || 60000); // 1 min
  const states = new Map();

  function getStatus(provider) {
    const entry = states.get(provider);
    if (!entry) {
      return { state: "CLOSED", failures: 0, lastFailureAt: null, lastError: null };
    }
    const now = Date.now();
    if (entry.state === "OPEN" && now - entry.lastFailureAt >= entry.quarantineMs) {
      return { ...entry, state: "HALF_OPEN" };
    }
    return entry;
  }

  function isOpen(provider) {
    const status = getStatus(provider);
    return status.state === "OPEN";
  }

  function isAvailable(provider) {
    const status = getStatus(provider);
    return status.state === "CLOSED" || status.state === "HALF_OPEN";
  }

  function recordSuccess(provider) {
    states.set(provider, {
      state: "CLOSED",
      failures: 0,
      lastSuccessAt: Date.now(),
      lastFailureAt: null,
      lastError: null,
      quarantineMs: defaultQuotaQuarantineMs,
    });
  }

  function recordFailure(provider, error, statusCode = 0, customQuarantineMs = null) {
    const prev = states.get(provider) || { failures: 0 };
    const errMsg = String(error?.message || error || `http_${statusCode}`);
    const isQuotaOrLimit =
      statusCode === 429 ||
      statusCode === 402 ||
      /spend limit|quota|insufficient balance|insufficient credits|1113/i.test(errMsg);

    const quarantineMs =
      customQuarantineMs
      || (isQuotaOrLimit ? defaultQuotaQuarantineMs : defaultNetworkQuarantineMs);

    states.set(provider, {
      state: "OPEN",
      failures: prev.failures + 1,
      lastFailureAt: Date.now(),
      lastError: errMsg,
      statusCode,
      quarantineMs,
      reason: isQuotaOrLimit ? "quota_or_spend_limit" : "service_unavailable",
    });
  }

  function reset(provider = null) {
    if (provider) {
      states.delete(provider);
    } else {
      states.clear();
    }
  }

  function snapshot() {
    const out = {};
    for (const [provider] of states) {
      out[provider] = getStatus(provider);
    }
    return out;
  }

  return {
    getStatus,
    isOpen,
    isAvailable,
    recordSuccess,
    recordFailure,
    reset,
    snapshot,
  };
}
