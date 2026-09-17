import fs from "node:fs";
import path from "node:path";

/**
 * Generic grouping helper for corpus collections (classification items, judgments, continuations).
 * Supports grouping by:
 * - "repo": item.repo || item.subject?.repo
 * - "dir" / "directory": directory prefix of path (e.g. path.dirname(item.path))
 * - "reason": item.reason or joined item.context?.reasons
 * - "rule": item.rule
 * - "confidence": item.confidence
 * - "kind": item.document_kind || item.kind
 * - "role": item.document_role || item.role
 * - arbitrary property key
 *
 * @param {Array} items
 * @param {string} field
 * @returns {Record<string, { count: number, items: Array }>}
 */
export function groupCollection(items, field) {
  const groups = new Map();
  const safeField = String(field || "").toLowerCase().trim();

  for (const item of items || []) {
    let key = "unknown";
    if (safeField === "repo") {
      key = item.repo || item.subject?.repo || "unknown";
    } else if (safeField === "dir" || safeField === "directory") {
      const p = item.path || item.rel || item.subject?.path || "";
      key = p ? path.dirname(p).replace(/\\/g, "/") : ".";
      if (key === ".") key = "./";
    } else if (safeField === "reason") {
      key = item.reason || (item.context?.reasons || []).join("; ") || (item.reasons || []).join("; ") || "unknown";
    } else if (safeField === "rule") {
      key = item.rule || "unknown";
    } else if (safeField === "confidence") {
      key = item.confidence || item.role_confidence || "unknown";
    } else if (safeField === "kind") {
      key = item.document_kind || item.kind || "unknown";
    } else if (safeField === "role") {
      key = item.document_role || item.role || "unknown";
    } else if (item[field] !== undefined) {
      key = String(item[field]);
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  // Sort groups by count descending, then alphabetical
  const sortedEntries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const result = {};
  for (const [k, v] of sortedEntries) {
    result[k] = { count: v.length, items: v };
  }
  return result;
}

/**
 * Cross-references active continuations against fresh document judgment requests and inventory.
 * Flags:
 * 1. Stale continuations (conditions already resolved or file missing)
 * 2. Untracked judgments (open judgments lacking an active continuation)
 * 3. Tracked judgments (open judgments with an existing active continuation)
 *
 * @param {Array} activeContinuations
 * @param {Array} freshJudgments
 * @param {Array} inventoryDocs
 * @param {Array} repos
 * @returns {{ stale_continuations: Array, untracked_judgments: Array, tracked_judgments: Array }}
 */
export function crossReferenceContinuations(activeContinuations, freshJudgments, inventoryDocs = [], repos = []) {
  const judgmentMap = new Map();
  for (const j of freshJudgments || []) {
    if (j.dedupe_key) judgmentMap.set(j.dedupe_key, j);
  }

  const activeByDedupe = new Map();
  for (const c of activeContinuations || []) {
    if (c.dedupe_key) activeByDedupe.set(c.dedupe_key, c);
  }

  const docMap = new Map();
  for (const d of inventoryDocs || []) {
    docMap.set(`${d.repo}::${d.rel}`, d);
  }

  const repoPathMap = new Map();
  for (const r of repos || []) {
    if (r.name && r.path) repoPathMap.set(r.name, r.path);
  }

  const stale_continuations = [];
  const tracked_judgments = [];
  const untracked_judgments = [];

  // 1. Check fresh judgments that are genuinely unresolved
  for (const j of freshJudgments || []) {
    const isResolvedElsewhere = Boolean(j.context?.resolved_elsewhere);
    if (isResolvedElsewhere) continue;

    if (activeByDedupe.has(j.dedupe_key)) {
      tracked_judgments.push({
        dedupe_key: j.dedupe_key,
        repo: j.subject?.repo || "",
        path: j.subject?.path || "",
        continuation_id: activeByDedupe.get(j.dedupe_key).id,
      });
    } else {
      untracked_judgments.push(j);
    }
  }

  // 2. Check active continuations for staleness
  for (const c of activeContinuations || []) {
    const isDocRole = c.kind === "document_role_review"
      || c.kind === "index.document_role_judgment"
      || (c.dedupe_key && c.dedupe_key.startsWith("document_role_review:"));

    if (isDocRole) {
      // If the fresh judgment list does not ask for judgment on this key, it's stale
      if (!judgmentMap.has(c.dedupe_key)) {
        let reason = "condition_resolved";
        if (c.subject?.repo && c.subject?.path) {
          const repoRoot = repoPathMap.get(c.subject.repo);
          const fullPath = repoRoot ? path.join(repoRoot, c.subject.path) : null;
          if (fullPath && !fs.existsSync(fullPath)) {
            reason = "file_deleted_or_missing";
          } else {
            const doc = docMap.get(`${c.subject.repo}::${c.subject.path}`);
            if (doc && doc.role && doc.role !== "unknown" && doc.role_confidence !== "weak") {
              reason = `role_settled (${doc.role}, confidence=${doc.role_confidence})`;
            }
          }
        }
        stale_continuations.push({
          id: c.id,
          kind: c.kind,
          title: c.title,
          dedupe_key: c.dedupe_key,
          subject: c.subject,
          reason,
          created_at: c.created_at,
          cancelled: false,
        });
      }
    } else if (c.subject?.repo && c.subject?.path) {
      // General continuation with subject path: check if file was deleted
      const repoRoot = repoPathMap.get(c.subject.repo);
      const fullPath = repoRoot ? path.join(repoRoot, c.subject.path) : null;
      if (fullPath && !fs.existsSync(fullPath)) {
        stale_continuations.push({
          id: c.id,
          kind: c.kind,
          title: c.title,
          dedupe_key: c.dedupe_key,
          subject: c.subject,
          reason: "subject_file_missing",
          created_at: c.created_at,
          cancelled: false,
        });
      }
    }
  }

  return {
    stale_continuations,
    untracked_judgments,
    tracked_judgments,
  };
}

/**
 * Format the triage report into readable console text.
 *
 * @param {object} report
 * @returns {string}
 */
export function formatTriage(report) {
  const lines = [
    `\nCorpus Triage Report [${report.repo}] — ${report.timestamp.slice(0, 19).replace("T", " ")}\n`,
    `Status: ${report.ok ? "CLEAN" : "ATTENTION NEEDED"}`,
    `Active Continuations: ${report.summary.active_continuations} (stale: ${report.summary.stale_continuations})`,
    `Judgments: ${report.summary.judgments_total} total (${report.summary.judgments_already_resolved} resolved elsewhere, ${report.summary.judgments_unresolved} open, ${report.summary.untracked_judgments} untracked)`,
    `Classification: ${report.summary.classification_changes} planned changes, ${report.summary.classification_conflicts} conflicts, ${report.summary.classification_ambiguous} ambiguous`,
    `Consolidate Issues: ${report.summary.consolidate_issues}`,
  ];

  if (report.actions_taken?.cancelled_stale_count > 0) {
    lines.push(`\n[Action] Cancelled ${report.actions_taken.cancelled_stale_count} stale continuation(s).`);
  }
  if (report.actions_taken?.emitted_missing_count > 0) {
    lines.push(`\n[Action] Emitted ${report.actions_taken.emitted_missing_count} missing continuation(s).`);
  }

  if (report.grouped) {
    lines.push(`\n--- Grouped by ${report.grouped.field} ---`);
    if (report.stale_continuations?.length && report.grouped.stale) {
      lines.push(`\nStale Continuations by ${report.grouped.field}:`);
      for (const [k, v] of Object.entries(report.grouped.stale)) {
        lines.push(`  - ${k}: ${v.count}`);
      }
    }
    if (report.untracked_judgments?.length && report.grouped.untracked) {
      lines.push(`\nUntracked Judgments by ${report.grouped.field}:`);
      for (const [k, v] of Object.entries(report.grouped.untracked)) {
        lines.push(`  - ${k}: ${v.count}`);
      }
    }
    if (report.classification?.ambiguous?.length && report.grouped.ambiguous) {
      lines.push(`\nAmbiguous Classifications by ${report.grouped.field}:`);
      for (const [k, v] of Object.entries(report.grouped.ambiguous)) {
        lines.push(`  - ${k}: ${v.count}`);
      }
    }
  } else {
    if (report.stale_continuations?.length) {
      lines.push(`\nStale Continuations (${report.stale_continuations.length}):`);
      for (const item of report.stale_continuations.slice(0, 20)) {
        const repoPath = item.subject?.repo ? `${item.subject.repo}/${item.subject.path || ""}` : (item.dedupe_key || "");
        lines.push(`  - ${item.id} [${item.kind}] ${repoPath}: ${item.reason}${item.cancelled ? " (cancelled)" : ""}`);
      }
      if (report.stale_continuations.length > 20) {
        lines.push(`  - ... ${report.stale_continuations.length - 20} more (use --cancel-stale to auto-cancel)`);
      }
    }

    if (report.untracked_judgments?.length) {
      lines.push(`\nUntracked Judgments needing continuations (${report.untracked_judgments.length}):`);
      for (const item of report.untracked_judgments.slice(0, 20)) {
        const reasons = item.reasons?.length ? item.reasons.join("; ") : "judgment needed";
        lines.push(`  - ${item.repo}/${item.path}: ${reasons}${item.emitted ? " (emitted)" : ""}`);
      }
      if (report.untracked_judgments.length > 20) {
        lines.push(`  - ... ${report.untracked_judgments.length - 20} more (use --emit-missing to emit)`);
      }
    }

    if (report.classification?.conflicts?.length) {
      lines.push(`\nClassification Conflicts (${report.classification.conflicts.length}):`);
      for (const item of report.classification.conflicts.slice(0, 15)) {
        const confs = (item.conflicts || []).map(c => `${c.field}: ${c.explicit} != ${c.inferred}`).join("; ");
        lines.push(`  - ${item.repo}/${item.path}: ${confs}`);
      }
      if (report.classification.conflicts.length > 15) {
        lines.push(`  - ... ${report.classification.conflicts.length - 15} more`);
      }
    }

    if (report.consolidate_issues?.length) {
      lines.push("\nConsolidate issues:");
      for (const iss of report.consolidate_issues) {
        lines.push(`  - ${iss}`);
      }
    }
  }

  return lines.join("\n");
}
