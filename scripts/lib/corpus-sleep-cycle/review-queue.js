// File: scripts/lib/corpus-sleep-cycle/review-queue.js
// Description: Governed Advisory Review Queue for Corpus Sleep Cycle signals.
//
// Invariants:
// - Zero automatic mutation: NEVER writes to, edits, publishes or deletes source markdown files.
// - All Monte Carlo signals land exclusively in this queue for human or governed review.
// - LLM or heuristic outputs are strictly advisory candidates.
// - Append-only JSONL storage with full provenance and immutable history.

import fs from "node:fs";
import path from "node:path";

export const REVIEW_DECISIONS = Object.freeze({
  PENDING: "pending_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  QUARANTINED: "quarantined",
});

export class SleepCycleReviewQueue {
  constructor(options = {}) {
    this.root = path.resolve(options.root || process.cwd());
    this.queueDir = path.join(this.root, ".cogentia");
    this.queueFile = path.join(this.queueDir, "sleep_cycle_review_queue.jsonl");
    this.decisionsFile = path.join(this.queueDir, "sleep_cycle_review_decisions.jsonl");

    this._ensureStorage();
  }

  _ensureStorage() {
    if (!fs.existsSync(this.queueDir)) {
      fs.mkdirSync(this.queueDir, { recursive: true });
    }
    if (!fs.existsSync(this.queueFile)) {
      fs.writeFileSync(this.queueFile, "", "utf8");
    }
    if (!fs.existsSync(this.decisionsFile)) {
      fs.writeFileSync(this.decisionsFile, "", "utf8");
    }
  }

  /**
   * Append candidate signals into the review queue.
   * Duplicates by ID are deduplicated.
   */
  appendSignals(signals = []) {
    if (!Array.isArray(signals) || signals.length === 0) return { added: 0, total: this.count() };

    const existing = this.loadAllSignalsMap();
    let added = 0;
    const linesToAppend = [];

    for (const sig of signals) {
      if (!sig || !sig.id) continue;
      if (!existing.has(sig.id)) {
        existing.set(sig.id, sig);
        linesToAppend.push(JSON.stringify(sig));
        added++;
      }
    }

    if (linesToAppend.length > 0) {
      fs.appendFileSync(this.queueFile, linesToAppend.join("\n") + "\n", "utf8");
    }

    return { added, total: existing.size };
  }

  /**
   * Load all signals stored in the queue.
   */
  loadAllSignalsMap() {
    const map = new Map();
    if (!fs.existsSync(this.queueFile)) return map;

    const content = fs.readFileSync(this.queueFile, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    for (const line of lines) {
      try {
        const sig = JSON.parse(line);
        if (sig && sig.id) map.set(sig.id, sig);
      } catch {
        // Skip malformed line
      }
    }

    // Overlay decisions
    const decisions = this.loadAllDecisions();
    for (const dec of decisions) {
      if (map.has(dec.signal_id)) {
        const sig = map.get(dec.signal_id);
        sig.review_status = dec.decision;
        sig.review_decision = dec;
      }
    }

    return map;
  }

  loadAllDecisions() {
    const list = [];
    if (!fs.existsSync(this.decisionsFile)) return list;

    const content = fs.readFileSync(this.decisionsFile, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d && d.signal_id) list.push(d);
      } catch {
        // Skip malformed line
      }
    }
    return list;
  }

  /**
   * List pending review signals.
   */
  listPending(options = {}) {
    const all = Array.from(this.loadAllSignalsMap().values());
    let pending = all.filter((s) => s.review_status === REVIEW_DECISIONS.PENDING || !s.review_status);

    if (options.kind) {
      pending = pending.filter((s) => s.signal_kind === options.kind);
    }
    if (options.minConfidence != null) {
      pending = pending.filter((s) => (s.confidence ?? 0) >= options.minConfidence);
    }
    if (options.limit != null && options.limit > 0) {
      pending = pending.slice(0, options.limit);
    }

    return pending;
  }

  /**
   * Record a human or governed review decision.
   */
  recordReviewDecision(signalId, { decision, reviewer = "operator", notes = "" } = {}) {
    if (!Object.values(REVIEW_DECISIONS).includes(decision)) {
      throw new Error(`Invalid review decision '${decision}'. Expected one of: ${Object.values(REVIEW_DECISIONS).join(", ")}`);
    }

    const all = this.loadAllSignalsMap();
    if (!all.has(signalId)) {
      throw new Error(`Signal '${signalId}' not found in review queue.`);
    }

    const decisionRecord = {
      signal_id: signalId,
      decision,
      reviewer,
      notes,
      decided_at: new Date().toISOString(),
    };

    fs.appendFileSync(this.decisionsFile, JSON.stringify(decisionRecord) + "\n", "utf8");
    return decisionRecord;
  }

  /**
   * Get queue statistics summary.
   */
  getQueueStats() {
    const all = Array.from(this.loadAllSignalsMap().values());
    const byStatus = {
      pending_review: 0,
      accepted: 0,
      rejected: 0,
      quarantined: 0,
    };
    const byKind = {};

    for (const s of all) {
      const status = s.review_status || "pending_review";
      byStatus[status] = (byStatus[status] || 0) + 1;

      const kind = s.signal_kind || "unknown";
      byKind[kind] = (byKind[kind] || 0) + 1;
    }

    return {
      total_signals: all.length,
      by_status: byStatus,
      by_kind: byKind,
      queue_file: this.queueFile,
    };
  }

  count() {
    return this.loadAllSignalsMap().size;
  }
}
