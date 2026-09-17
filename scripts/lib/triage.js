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
    } else if (safeField === "category" || safeField === "ambiguity_category" || safeField === "judgment_category") {
      key = item.ambiguity_category || item.judgment_category || categorizeAmbiguity(item);
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
 * Categorize ambiguity / judgment reasons into:
 * - "classifier_gap": generic fallback, missing path rule, or unmapped pattern
 * - "genuine_judgment": content, derivation symmetry, provenance, or human policy decision
 *
 * @param {string|Array<string>|object} input
 * @returns {"classifier_gap" | "genuine_judgment"}
 */
export function categorizeAmbiguity(input) {
  let reasons = [];
  if (typeof input === "string") {
    reasons = [input];
  } else if (Array.isArray(input)) {
    reasons = input;
  } else if (input && typeof input === "object") {
    if (input.ambiguity_category) return input.ambiguity_category;
    if (input.judgment_category) return input.judgment_category;
    if (Array.isArray(input.reasons)) {
      reasons = input.reasons;
    } else if (Array.isArray(input.context?.reasons)) {
      reasons = input.context.reasons;
    } else if (typeof input.reason === "string") {
      reasons = [input.reason];
    }
  }

  const text = reasons.join(" ").toLowerCase();

  // Genuine judgment indicators:
  // - derivation symmetry/asymmetry (asymmetric derived product vs symmetric sovereign source)
  // - provenance questions
  // - source role verification (e.g. inferred from research path)
  // - existing resolved judgments
  if (
    /asymmetric|symmetric/i.test(text) ||
    /derived document may need judgment/i.test(text) ||
    /inferred from research path/i.test(text) ||
    /provenance/i.test(text) ||
    /already resolved/i.test(text) ||
    /privacy|confidential/i.test(text)
  ) {
    return "genuine_judgment";
  }

  // Classifier gap fallback indicators:
  // - "No deterministic kind rule matched."
  // - "Source role without stronger kind signal."
  // - "document role is unknown or weakly inferred"
  // - "Cannot index deterministically with role=unknown"
  // - fallback heuristics
  if (
    /no deterministic kind rule matched/i.test(text) ||
    /without stronger kind signal/i.test(text) ||
    /unknown or weakly inferred/i.test(text) ||
    /cannot index deterministically/i.test(text) ||
    /fallback/i.test(text) ||
    /no rule matched/i.test(text)
  ) {
    return "classifier_gap";
  }

  // If item explicitly has rule "unknown" or "source-document" with weak confidence:
  if (input && typeof input === "object") {
    if (input.rule === "unknown" || input.rule === "source-document") {
      return "classifier_gap";
    }
  }

  // Default to classifier_gap for weak confidence items that have no specific human judgment prompt
  return "classifier_gap";
}

/**
 * Computes the top directory clusters for a collection of items (such as classifier gaps).
 * Groups by normalized directory prefix, rolling up multi-file subdirectories where appropriate.
 *
 * @param {Array} items
 * @param {number} [topN=5]
 * @returns {Array<{ directory: string, count: number, percentage: number }>}
 */
export function topDirectoryClusters(items, topN = 5) {
  if (!items || !items.length) return [];

  // 1. Collect exact directories for all items
  const exactCounts = new Map();
  const itemEntries = [];

  for (const item of items) {
    const repo = item.repo || item.subject?.repo || "";
    const p = (item.path || item.rel || item.subject?.path || "").replace(/\\/g, "/");
    const dir = path.dirname(p).replace(/\\/g, "/");
    const exactKey = repo ? (dir === "." ? repo : `${repo}/${dir}`) : (dir === "." ? "./" : dir);
    exactCounts.set(exactKey, (exactCounts.get(exactKey) || 0) + 1);

    const segments = p.split("/").filter(Boolean);
    const dirSegments = segments.slice(0, -1);
    itemEntries.push({ repo, path: p, exactKey, dirSegments });
  }

  // 2. Evaluate prefix candidates of depth 2, then depth 1
  const prefixGroups = new Map();

  for (const depth of [2, 1]) {
    for (const entry of itemEntries) {
      if (entry.dirSegments.length >= depth) {
        const prefix = entry.dirSegments.slice(0, depth).join("/");
        const key = entry.repo ? (prefix ? `${entry.repo}/${prefix}` : entry.repo) : (prefix || "./");
        if (!prefixGroups.has(key)) prefixGroups.set(key, new Set());
        prefixGroups.get(key).add(entry.exactKey);
      }
    }
  }

  // 3. Find clusters that span multiple distinct subdirectories (depth 2 preferred, then depth 1)
  const clusters = new Map();
  const sortedPrefixes = [...prefixGroups.entries()].sort((a, b) => {
    const depthA = a[0].split("/").length;
    const depthB = b[0].split("/").length;
    return depthB - depthA;
  });

  const coveredExactKeys = new Set();

  for (const [prefixKey, exactSet] of sortedPrefixes) {
    const uncovered = [...exactSet].filter(k => !coveredExactKeys.has(k));
    if (exactSet.size > 1 && uncovered.length > 1) {
      let clusterCount = 0;
      for (const k of exactSet) {
        if (!coveredExactKeys.has(k)) {
          clusterCount += exactCounts.get(k) || 0;
          coveredExactKeys.add(k);
        }
      }
      if (clusterCount > 0) {
        clusters.set(`${prefixKey}/**`, clusterCount);
      }
    }
  }

  // 4. Any exact directories not covered by a multi-dir cluster remain as exact directories
  for (const [exactKey, count] of exactCounts.entries()) {
    if (!coveredExactKeys.has(exactKey)) {
      clusters.set(exactKey, count);
    }
  }

  // 5. Sort by count descending, then alphabetical
  const sorted = [...clusters.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN);

  return sorted.map(([directory, count]) => ({
    directory,
    count,
    percentage: Math.round((count / items.length) * 100),
  }));
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
  const catSummary = report.summary.classification_ambiguous_by_category;
  const ambigText = catSummary && report.summary.classification_ambiguous > 0
    ? `${report.summary.classification_ambiguous} ambiguous (${catSummary.classifier_gap} classifier gap(s), ${catSummary.genuine_judgment} genuine judgment(s))`
    : `${report.summary.classification_ambiguous} ambiguous`;

  const lines = [
    `\nCorpus Triage Report [${report.repo}] — ${report.timestamp.slice(0, 19).replace("T", " ")}\n`,
    `Status: ${report.ok ? "CLEAN" : "ATTENTION NEEDED"}`,
    `Active Continuations: ${report.summary.active_continuations} (stale: ${report.summary.stale_continuations})`,
    `Judgments: ${report.summary.judgments_total} total (${report.summary.judgments_already_resolved} resolved elsewhere, ${report.summary.judgments_unresolved} open, ${report.summary.untracked_judgments} untracked)`,
    `Classification: ${report.summary.classification_changes} planned changes, ${report.summary.classification_conflicts} conflicts, ${ambigText}`,
    `Consolidate Issues: ${report.summary.consolidate_issues}`,
  ];

  if (report.actions_taken?.cancelled_stale_count > 0) {
    lines.push(`\n[Action] Cancelled ${report.actions_taken.cancelled_stale_count} stale continuation(s).`);
  }
  if (report.actions_taken?.emitted_missing_count > 0) {
    lines.push(`\n[Action] Emitted ${report.actions_taken.emitted_missing_count} missing continuation(s).`);
  }

  if (report.summary.classifier_gap_clusters?.length) {
    lines.push("\nTop classifier-gap directory clusters:");
    for (const cluster of report.summary.classifier_gap_clusters) {
      lines.push(`  - ${cluster.directory}: ${cluster.count} file(s) (${cluster.percentage}%)`);
    }
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

    if (report.classification?.ambiguous?.length) {
      lines.push(`\nAmbiguous Classifications (${report.classification.ambiguous.length}):`);
      for (const item of report.classification.ambiguous.slice(0, 15)) {
        const catTag = item.ambiguity_category ? ` [${item.ambiguity_category}]` : "";
        lines.push(`  - ${item.repo}/${item.path}: ${item.reason}${catTag}`);
      }
      if (report.classification.ambiguous.length > 15) {
        lines.push(`  - ... ${report.classification.ambiguous.length - 15} more`);
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
