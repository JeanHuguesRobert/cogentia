// Stateless, testable reconnect policy; Chrome extension service workers can restart.
export const MAX_RECONNECT_DELAY_MS = 60_000;
export const STABLE_CONNECTION_MS = 60_000;
export const OPEN_TIMEOUT_MS = 15_000;
export function reconnectDelayMs(failures, random = Math.random()) {
  const attempt = Math.max(1, Math.min(30, Math.floor(failures) || 1));
  const exponential = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * (2 ** attempt));
  const unit = Number.isFinite(random) ? Math.max(0, Math.min(1, random)) : 0.5;
  return Math.round(exponential * (0.75 + unit * 0.25));
}
export function nextFailureCount(previous, connectedMs) {
  return connectedMs >= STABLE_CONNECTION_MS ? 1 : Math.min(30, previous + 1);
}
