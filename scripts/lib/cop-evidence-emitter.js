// File: scripts/lib/cop-evidence-emitter.js
// Description: Emits COP Evidence (cop/node.evidence.v1) to ONA / FractaCalendar upon job completion.
//
// Invariants:
// - Tick is synthetic; work completion emits cop/node.evidence.v1 Event.
// - Evidence records runtime metrics (gain, signals, pairs, elapsed_ms, budget).
// - Fails gracefully if ONA is unreachable (zero hard dependency on external network).

import fs from "node:fs";
import path from "node:path";
import http from "node:http";

export const COP_EVIDENCE_SCHEMA = "cop/node.evidence.v1";

/**
 * Emit a COP evidence event for a temporal obligation.
 *
 * @param {Object} params
 * @param {string} params.obligationId - e.g. "cogentia:sleep-cycle"
 * @param {boolean} [params.ok=true] - Run status
 * @param {boolean} [params.closed=false] - Whether obligation stop condition is met
 * @param {string} [params.status="active"] - "active" | "closed" | "escalated"
 * @param {string|null} [params.nextRunAt=null] - Next scheduled ISO timestamp
 * @param {Object} [params.evidence={}] - Structured metrics / payload
 * @param {Object} [params.options={}] - Config overrides (port, token, stateDir)
 * @returns {Promise<Object>} Result envelope
 */
export async function emitCopEvidence({
  obligationId,
  ok = true,
  closed = false,
  status = "active",
  nextRunAt = null,
  evidence = {},
  options = {}
} = {}) {
  if (!obligationId) {
    throw new Error("emitCopEvidence requires obligationId");
  }

  const now = new Date().toISOString();
  const eventId = `cop:evidence:${obligationId}:${now}`;

  const envelope = {
    id: eventId,
    packet_type: COP_EVIDENCE_SCHEMA,
    artifact_type: "cop/cognitive-packet",
    created_at: now,
    payload: {
      schema: COP_EVIDENCE_SCHEMA,
      obligation_id: obligationId,
      ok: Boolean(ok),
      closed: Boolean(closed),
      status,
      next_run_at: nextRunAt,
      evidence: {
        ...evidence,
        emitted_at: now
      }
    }
  };

  // Attempt HTTP emission to ONA if available
  const port = options.port || parseInt(process.env.ONA_PORT || "8794", 10);
  const token = options.token || process.env.ONA_ADMIN_TOKEN || process.env.ONA_TOKEN || null;

  try {
    const httpResult = await postJsonToOna(`http://127.0.0.1:${port}/node/cop`, envelope, token, 3000);
    return { ok: true, method: "http", eventId, response: httpResult };
  } catch (httpErr) {
    // Fallback: Check if local sqlite state DB exists and append event
    const stateDir = options.stateDir || process.env.COGENTIA_OPS_STATE_DIR || "/var/lib/cogentia";
    const dbPath = path.join(stateDir, ".ops", "ona.sqlite");

    if (fs.existsSync(dbPath)) {
      try {
        const appended = appendEvidenceDirectSqlite(dbPath, envelope, obligationId, now);
        return { ok: true, method: "sqlite_direct", eventId, appended };
      } catch (sqlErr) {
        return { ok: false, method: "fallback_failed", eventId, error: sqlErr.message, http_error: httpErr.message };
      }
    }

    return {
      ok: true,
      method: "logged_only",
      eventId,
      notice: "ONA not reachable and local DB not found; evidence preserved in result payload",
      envelope
    };
  }
}

function postJsonToOna(urlStr, data, token, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify(data);
      const headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: "POST",
          headers,
          timeout: timeoutMs
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(parsed);
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || body}`));
              }
            } catch {
              resolve({ statusCode: res.statusCode, raw: body });
            }
          });
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("ONA HTTP timeout"));
      });
      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function appendEvidenceDirectSqlite(dbPath, envelope, obligationId, now) {
  // Use node's sqlite module if available
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(dbPath);
  try {
    const payloadJson = JSON.stringify(envelope.payload);
    const envelopeJson = JSON.stringify(envelope);

    db.prepare(`
      INSERT INTO cop_events (id, kind, obligation_id, packet_type, payload_json, envelope_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      envelope.id,
      COP_EVIDENCE_SCHEMA,
      obligationId,
      COP_EVIDENCE_SCHEMA,
      payloadJson,
      envelopeJson,
      now
    );

    // Update calendar_obligations row
    db.prepare(`
      UPDATE calendar_obligations
      SET last_run_at = ?,
          last_ok = ?,
          last_evidence_json = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      now,
      envelope.payload.ok ? 1 : 0,
      JSON.stringify(envelope.payload.evidence),
      now,
      obligationId
    );

    return true;
  } finally {
    db.close();
  }
}
