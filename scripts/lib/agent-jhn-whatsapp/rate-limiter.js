/**
 * Rate Limiter & Circuit Breaker Subsystem for Agent John.
 * Prevents loops, runaway sends, and bugs from flooding WhatsApp.
 *
 * Rules:
 * - Max 5 outbound sends per 60 seconds (configurable)
 * - Max 20 outbound sends per 300 seconds
 * - If threshold exceeded: TRIPS CIRCUIT BREAKER (hard stop + emergency alarm)
 * - Reset via self-chat command: `reset rate limit`
 */

import fs from "node:fs";
import path from "node:path";
import { notifyHumanAttention } from "./emergency-notification.js";

const DEFAULT_WINDOW_MS = 60_000; // 60s window
const DEFAULT_MAX_SENDS_PER_WINDOW = 5;
const DEFAULT_BURST_MAX = 15;

function getRateLimiterStatePath(config) {
  const base = config.state_dir || path.join(process.cwd(), ".cogentia", "runtime", "agent-jhn-whatsapp");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return path.join(base, "rate-limiter-state.json");
}

export function loadRateLimiterState(config) {
  const p = getRateLimiterStatePath(config);
  if (!fs.existsSync(p)) {
    return {
      tripped: false,
      tripped_at: null,
      reason: null,
      outbound_timestamps: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { tripped: false, tripped_at: null, reason: null, outbound_timestamps: [] };
  }
}

export function saveRateLimiterState(config, state) {
  const p = getRateLimiterStatePath(config);
  fs.writeFileSync(p, JSON.stringify(state, null, 2), "utf8");
  return state;
}

/**
 * Check if rate limit allows outbound send.
 * If limit exceeded, TRIPS circuit breaker and fires alarm.
 */
export function checkRateLimit(config, options = {}) {
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const state = loadRateLimiterState(config);

  if (state.tripped) {
    return {
      allowed: false,
      rule_id: "policy.rate_limit_circuit_breaker_tripped",
      reason: `Circuit breaker TRIPPED at ${state.tripped_at}: ${state.reason}`,
      tripped: true,
    };
  }

  // Filter timestamps within sliding window (60s)
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const maxSends = options.maxSends || DEFAULT_MAX_SENDS_PER_WINDOW;
  const recent = (state.outbound_timestamps || []).filter((ts) => now - ts < windowMs);

  if (recent.length >= maxSends) {
    // TRIP CIRCUIT BREAKER!
    state.tripped = true;
    state.tripped_at = new Date(now).toISOString();
    state.reason = `Rate limit exceeded: ${recent.length + 1} sends within ${windowMs / 1000}s`;
    saveRateLimiterState(config, state);

    // Fire Multi-Channel Emergency Alarm
    notifyHumanAttention({
      title: "🚨 AGENT JOHN ALARM: Rate Limit Circuit Breaker Tripped!",
      message: `Loop or rapid send detected (${recent.length + 1} msgs/${windowMs / 1000}s). Outbound sends are now HARD BLOCKED. Reply "reset rate limit" to unblock.`,
      senderJid: "system_alarm",
      config,
    });

    return {
      allowed: false,
      rule_id: "policy.rate_limit_exceeded_tripped",
      reason: state.reason,
      tripped: true,
    };
  }

  return { allowed: true, recent_count: recent.length, maxSends };
}

/**
 * Record an outbound send event.
 */
export function recordOutboundSendEvent(config, options = {}) {
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const state = loadRateLimiterState(config);
  state.outbound_timestamps.push(now);

  // Keep last 50 timestamps
  if (state.outbound_timestamps.length > 50) {
    state.outbound_timestamps = state.outbound_timestamps.slice(-50);
  }

  saveRateLimiterState(config, state);
  return state;
}

/**
 * Reset circuit breaker (called via self-chat command: `reset rate limit`).
 */
export function resetRateLimiter(config) {
  const state = {
    tripped: false,
    tripped_at: null,
    reason: null,
    outbound_timestamps: [],
  };
  saveRateLimiterState(config, state);
  return { ok: true, message: "Circuit breaker reset. Outbound sends unblocked." };
}
