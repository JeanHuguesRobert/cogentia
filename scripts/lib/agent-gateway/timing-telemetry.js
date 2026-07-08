/**
 * Experimental timing telemetry (assumes loosely synchronized clocks).
 * Request:  X-Agent-Gateway-Client-Sent-Ms — client unix epoch ms
 * Response: X-Agent-Gateway-Server-*-Ms + X-Agent-Gateway-Timing (JSON)
 */

const HEADER_CLIENT_SENT = "x-agent-gateway-client-sent-ms";

export function readClientSentMs(req) {
  const raw = req?.headers?.[HEADER_CLIENT_SENT];
  if (raw == null || raw === "") return null;
  const value = Number(String(raw).trim());
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

export function createTimingTrace(mode, clientSentMs = null) {
  const receivedMs = Date.now();
  const marks = [];
  return {
    mode,
    clientSentMs,
    receivedMs,
    completedMs: null,
    marks,
    mark(name, extra = {}) {
      marks.push({ name, at_ms: Date.now(), ...extra });
    },
    finish(extra = {}) {
      const completedMs = Date.now();
      this.completedMs = completedMs;
      return buildTimingReport(this, extra);
    },
  };
}

export function buildTimingReport(trace, extra = {}) {
  const completedMs = trace.completedMs ?? Date.now();
  const totalMs = completedMs - trace.receivedMs;
  const rttEstimateMs = trace.clientSentMs != null
    ? trace.receivedMs - trace.clientSentMs
    : null;

  const report = {
    server_received_ms: trace.receivedMs,
    server_completed_ms: completedMs,
    total_ms: totalMs,
    mode: trace.mode,
    ...extra,
  };

  if (trace.clientSentMs != null) {
    report.client_sent_ms = trace.clientSentMs;
  }
  if (rttEstimateMs != null) {
    report.rtt_estimate_ms = rttEstimateMs;
  }

  for (const mark of trace.marks) {
    report[`${mark.name}_ms`] = mark.at_ms - trace.receivedMs;
  }

  if (extra.gateway_ms != null) report.gateway_ms = extra.gateway_ms;
  if (extra.child_ms != null) report.child_ms = extra.child_ms;
  if (extra.bootstrap_ms != null) report.bootstrap_ms = extra.bootstrap_ms;

  return report;
}

export function timingResponseHeaders(report) {
  const headers = {
    "X-Agent-Gateway-Server-Received-Ms": String(report.server_received_ms),
    "X-Agent-Gateway-Server-Completed-Ms": String(report.server_completed_ms),
    "X-Agent-Gateway-Timing-Total-Ms": String(report.total_ms),
    "X-Agent-Gateway-Timing-Mode": String(report.mode),
    "X-Agent-Gateway-Timing": JSON.stringify(report),
  };

  if (report.client_sent_ms != null) {
    headers["X-Agent-Gateway-Client-Sent-Ms"] = String(report.client_sent_ms);
  }
  if (report.rtt_estimate_ms != null) {
    headers["X-Agent-Gateway-Timing-Rtt-Ms"] = String(report.rtt_estimate_ms);
  }
  if (report.gateway_ms != null) {
    headers["X-Agent-Gateway-Timing-Gateway-Ms"] = String(report.gateway_ms);
  }
  if (report.child_ms != null) {
    headers["X-Agent-Gateway-Timing-Child-Ms"] = String(report.child_ms);
  }
  if (report.bootstrap_ms != null) {
    headers["X-Agent-Gateway-Timing-Bootstrap-Ms"] = String(report.bootstrap_ms);
  }
  if (report.session_reused != null) {
    headers["X-Agent-Gateway-Timing-Session-Reused"] = report.session_reused ? "1" : "0";
  }
  if (report.session_spawned != null) {
    headers["X-Agent-Gateway-Timing-Session-Spawned"] = report.session_spawned ? "1" : "0";
  }

  return headers;
}

export const TIMING_EXPOSE_HEADERS = [
  "X-Agent-Gateway-Client-Sent-Ms",
  "X-Agent-Gateway-Server-Received-Ms",
  "X-Agent-Gateway-Server-Completed-Ms",
  "X-Agent-Gateway-Timing",
  "X-Agent-Gateway-Timing-Total-Ms",
  "X-Agent-Gateway-Timing-Mode",
  "X-Agent-Gateway-Timing-Rtt-Ms",
  "X-Agent-Gateway-Timing-Gateway-Ms",
  "X-Agent-Gateway-Timing-Child-Ms",
  "X-Agent-Gateway-Timing-Bootstrap-Ms",
  "X-Agent-Gateway-Timing-Session-Reused",
  "X-Agent-Gateway-Timing-Session-Spawned",
].join(", ");