/**
 * Semantic Mutation Type Checking (cogentia#115).
 * Deterministic validation of document transformations against semantic types,
 * metadata invariants, and update policies.
 *
 * Core rule:
 *   Desired Present states. Archaeology explains. Reality tests.
 */

import yaml from "js-yaml";

export const MUTATION_STATUS = Object.freeze({
  PASS: "PASS",
  WARN: "WARN",
  AMBIGUOUS: "AMBIGUOUS",
  BLOCK: "BLOCK",
});

const STRICT_POLICIES = new Set([
  "UP-DESIRED-PRESENT",
  "UP-REALITY-EVIDENCE",
  "UP-HISTORICAL-PRESERVE",
  "UP-DECISION-REVIEW",
]);

const NORMATIVE_KINDS = new Set([
  "architecture-specification",
  "protocol-specification",
  "policy-registry",
  "formal-invariant",
]);

export function parseFrontmatter(text) {
  if (typeof text !== "string") return { present: false, data: {}, body: "" };
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { present: false, data: {}, body: text };
  try {
    const data = yaml.load(match[1]) || {};
    const body = text.slice(match[0].length);
    return { present: true, data, body, rawYaml: match[1] };
  } catch (err) {
    return { present: false, data: {}, body: text, error: err.message };
  }
}

export function extractVersionsFromChangelog(changelog) {
  if (!Array.isArray(changelog)) return [];
  const versions = [];
  for (const item of changelog) {
    const text = typeof item === "string" ? item : (item?.version || item?.title || "");
    const match = text.match(/v?(\d+(?:\.\d+)+(?:-[a-zA-Z0-9.]+)?)/i);
    if (match) {
      versions.push({
        raw: match[0],
        normalized: match[1].replace(/^v/i, ""),
        entry: text,
      });
    }
  }
  return versions;
}

export function compareSemverLike(v1, v2) {
  const p1 = String(v1).split("-")[0].split(".").map(Number);
  const p2 = String(v2).split("-")[0].split(".").map(Number);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

/**
 * Check deterministic semantic mutation from beforeText to afterText.
 */
export function checkSemanticMutation(beforeText, afterText, options = {}) {
  const filePath = options.filePath || "document.md";
  const explicitOverride = Boolean(options.explicitOverride);

  const before = parseFrontmatter(beforeText || "");
  const after = parseFrontmatter(afterText || "");

  const blocks = [];
  const warns = [];
  const notes = [];

  const beforeData = before.data || {};
  const afterData = after.data || {};

  const beforePolicy = beforeData.update_policy || "UP-DEFAULT-REVIEWED";
  const afterPolicy = afterData.update_policy || beforePolicy;

  // 1. Check document_kind mutations
  if (before.present && after.present && beforeData.document_kind !== afterData.document_kind) {
    const fromKind = beforeData.document_kind || "unspecified";
    const toKind = afterData.document_kind || "unspecified";

    if (STRICT_POLICIES.has(beforePolicy) || NORMATIVE_KINDS.has(fromKind)) {
      if (!explicitOverride) {
        blocks.push({
          code: "MUTATION_BLOCKED_PROTECTED_KIND",
          field: "document_kind",
          from: fromKind,
          to: toKind,
          policy: beforePolicy,
          message: `Silent mutation of document_kind from "${fromKind}" to "${toKind}" under protected policy "${beforePolicy}".`,
        });
      } else {
        warns.push({
          code: "MUTATION_OVERRIDDEN_PROTECTED_KIND",
          field: "document_kind",
          from: fromKind,
          to: toKind,
          message: `Explicit override allowed document_kind mutation from "${fromKind}" to "${toKind}".`,
        });
      }
    } else {
      warns.push({
        code: "MUTATION_DOCUMENT_KIND_CHANGED",
        field: "document_kind",
        from: fromKind,
        to: toKind,
        message: `document_kind changed from "${fromKind}" to "${toKind}".`,
      });
    }
  }

  // 2. Check document_role demotions (e.g. source -> derived or working note)
  if (before.present && after.present && beforeData.document_role !== afterData.document_role) {
    const fromRole = beforeData.document_role || "unspecified";
    const toRole = afterData.document_role || "unspecified";

    if (fromRole === "source" && toRole !== "source" && !explicitOverride) {
      blocks.push({
        code: "MUTATION_BLOCKED_ROLE_DEMOTION",
        field: "document_role",
        from: fromRole,
        to: toRole,
        message: `Cannot demote document_role from "${fromRole}" to "${toRole}" without explicit authorization.`,
      });
    } else {
      warns.push({
        code: "MUTATION_DOCUMENT_ROLE_CHANGED",
        field: "document_role",
        from: fromRole,
        to: toRole,
        message: `document_role changed from "${fromRole}" to "${toRole}".`,
      });
    }
  }

  // 3. Check update_policy weakening
  if (before.present && after.present && beforeData.update_policy !== afterData.update_policy) {
    const fromPolicy = beforeData.update_policy;
    const toPolicy = afterData.update_policy;

    if (STRICT_POLICIES.has(fromPolicy) && !STRICT_POLICIES.has(toPolicy) && !explicitOverride) {
      blocks.push({
        code: "MUTATION_BLOCKED_POLICY_WEAKENING",
        field: "update_policy",
        from: fromPolicy,
        to: toPolicy,
        message: `Cannot weaken strict update_policy "${fromPolicy}" to "${toPolicy}".`,
      });
    } else if (fromPolicy && toPolicy && fromPolicy !== toPolicy) {
      notes.push(`update_policy transitioned from "${fromPolicy}" to "${toPolicy}".`);
    }
  }

  // 4. Check Version vs Changelog consistency
  if (after.present) {
    const frontmatterVersion = String(afterData.version || "").replace(/^v/i, "").trim();
    const changelogEntries = extractVersionsFromChangelog(afterData.changelog);

    if (frontmatterVersion && changelogEntries.length > 0) {
      // Find highest version in changelog
      let highestChangelogVersion = changelogEntries[0].normalized;
      for (const entry of changelogEntries) {
        if (compareSemverLike(entry.normalized, highestChangelogVersion) > 0) {
          highestChangelogVersion = entry.normalized;
        }
      }

      if (compareSemverLike(highestChangelogVersion, frontmatterVersion) > 0) {
        blocks.push({
          code: "INCONSISTENCY_VERSION_CHANGELOG_MISMATCH",
          field: "version",
          frontmatter_version: frontmatterVersion,
          latest_changelog_version: highestChangelogVersion,
          message: `Frontmatter version "${frontmatterVersion}" contradicts latest changelog version "${highestChangelogVersion}".`,
        });
      }
    }

    // Check chronological order of changelog entries
    if (changelogEntries.length > 1) {
      let hasDisorder = false;
      let prev = changelogEntries[0].normalized;
      for (let i = 1; i < changelogEntries.length; i++) {
        const curr = changelogEntries[i].normalized;
        if (compareSemverLike(changelogEntries[1].normalized, changelogEntries[0].normalized) > 0) {
          if (compareSemverLike(curr, prev) < 0) {
            hasDisorder = true;
            warns.push({
              code: "INCONSISTENCY_CHANGELOG_ORDER",
              field: "changelog",
              message: `Changelog is out of chronological order: v${prev} precedes v${curr}.`,
            });
            break;
          }
        }
        prev = curr;
      }
    }
  }

  // 5. Check policy-specific content structural tendencies
  if (after.present && after.body) {
    if (afterPolicy === "UP-DESIRED-PRESENT") {
      const narrativeHeaders = after.body.match(/^#{1,3}\s+(?:Prior Art|Rationale|Historical Emergence|Genealogy|Comparative Analysis|Background Literature)/gim);
      if (narrativeHeaders && narrativeHeaders.length > 0) {
        warns.push({
          code: "TENDENCY_DESIRED_PRESENT_NARRATIVE_BLOAT",
          policy: afterPolicy,
          matches: narrativeHeaders.map(h => h.trim()),
          message: `UP-DESIRED-PRESENT document contains narrative/historical sections (${narrativeHeaders.join(", ")}). Consider migrating rationale to Archaeology.`,
        });
      }
    } else if (afterPolicy === "UP-REALITY-EVIDENCE") {
      if (before.present && before.body) {
        const beforeFailureMatches = (before.body.match(/failure|error|timeout|crash|defect/gi) || []).length;
        const afterFailureMatches = (after.body.match(/failure|error|timeout|crash|defect/gi) || []).length;
        if (beforeFailureMatches > 5 && afterFailureMatches === 0 && !explicitOverride) {
          blocks.push({
            code: "MUTATION_BLOCKED_RETROSPECTIVE_NORMALIZATION",
            policy: afterPolicy,
            message: "Retrospective removal of recorded failure evidence detected under UP-REALITY-EVIDENCE.",
          });
        }
      }
    }
  }

  let status = MUTATION_STATUS.PASS;
  if (blocks.length > 0) status = MUTATION_STATUS.BLOCK;
  else if (warns.length > 0) status = MUTATION_STATUS.WARN;

  return {
    ok: blocks.length === 0,
    status,
    file: filePath,
    policy: afterPolicy,
    blocks,
    warnings: warns,
    notes,
  };
}

/**
 * Extension hook for future semantic-judge LLM classifier.
 * Produces structured classification + confidence + evidence without replacing deterministic gates.
 */
export async function semanticClassifierHook(diffText, context = {}) {
  return {
    available: false,
    reason: "LLM semantic classifier is deferred; deterministic rules are authoritative.",
    provisional_classes: [],
  };
}
