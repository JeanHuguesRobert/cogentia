// File: scripts/lib/idle-qualification.js
// Description: Dynamic Resource Availability Qualification Engine for Operium / Cogentia.
// Replaces static hardcoded cron timers (e.g. 03:00 AM) with real-time telemetry qualification.

import os from "node:os";

/**
 * Default availability thresholds for background compute (Corpus Sleep Cycle / Monte Carlo).
 */
export const DEFAULT_IDLE_THRESHOLDS = {
  max_load_15min: 1.5,      // Load average (15 min) threshold
  min_free_mem_mb: 250,      // Minimum free memory (MB) required
  max_active_requests: 0,   // Active HTTP/RPC request count
};

/**
 * Qualify whether the system is currently idle and available for background tasks.
 *
 * @param {object} [options]
 * @returns {{ is_idle: boolean, load_15min: number, free_mem_mb: number, active_requests: number, reasons: string[] }}
 */
export function qualifySystemAvailability(options = {}) {
  const thresholds = {
    ...DEFAULT_IDLE_THRESHOLDS,
    ...options.thresholds
  };

  const loadAvg = os.loadavg();
  const load15min = loadAvg[2] || loadAvg[0] || 0;
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const activeRequests = options.activeRequests || 0;

  const reasons = [];
  let isIdle = true;

  if (load15min > thresholds.max_load_15min) {
    isIdle = false;
    reasons.push(`CPU Load (15min) ${load15min.toFixed(2)} exceeds threshold ${thresholds.max_load_15min}`);
  }

  if (freeMemMb < thresholds.min_free_mem_mb) {
    isIdle = false;
    reasons.push(`Free RAM ${freeMemMb} MB below threshold ${thresholds.min_free_mem_mb} MB`);
  }

  if (activeRequests > thresholds.max_active_requests) {
    isIdle = false;
    reasons.push(`Active HTTP requests ${activeRequests} exceed threshold ${thresholds.max_active_requests}`);
  }

  return {
    is_idle: isIdle,
    load_15min: Number(load15min.toFixed(2)),
    free_mem_mb: freeMemMb,
    active_requests: activeRequests,
    reasons: isIdle ? ["System availability qualified for background tasks."] : reasons,
    checked_at: new Date().toISOString()
  };
}
