/**
 * Deterministic reconnect policy for Baileys. No auth state, network or timers.
 * An open lasting less than stableUptimeMs is NOT a successful recovery.
 */
export function createReconnectPolicy({
  initialDelayMs = 5_000,
  maxDelayMs = 15 * 60_000,
  stableUptimeMs = 60_000,
  jitterFraction = 0.2,
  random = Math.random,
  now = Date.now,
} = {}) {
  let consecutiveFailures = 0;
  let openedAt = null;
  return {
    onOpen() { openedAt = now(); },
    nextDelay() {
      if (openedAt !== null && now() - openedAt >= stableUptimeMs) {
        consecutiveFailures = 0;
      }
      openedAt = null;
      consecutiveFailures += 1;
      const exponential = Math.min(maxDelayMs, initialDelayMs * 2 ** Math.min(consecutiveFailures - 1, 30));
      const jitter = Math.max(0, Math.min(1, random())) * jitterFraction;
      return { delayMs: Math.floor(exponential * (1 - jitter)), consecutiveFailures };
    },
    get failureCount() { return consecutiveFailures; },
  };
}
