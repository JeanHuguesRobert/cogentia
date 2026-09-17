import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  groupCollection,
  crossReferenceContinuations,
  formatTriage,
} from "../scripts/lib/triage.js";

test("groupCollection groups items by repo correctly", () => {
  const items = [
    { repo: "repo-a", path: "doc1.md" },
    { repo: "repo-b", path: "doc2.md" },
    { repo: "repo-a", path: "doc3.md" },
  ];
  const grouped = groupCollection(items, "repo");
  assert.equal(grouped["repo-a"].count, 2);
  assert.equal(grouped["repo-b"].count, 1);
  assert.equal(grouped["repo-a"].items.length, 2);
});

test("groupCollection groups items by directory correctly", () => {
  const items = [
    { path: "research/ai/study.md" },
    { path: "research/ai/eval.md" },
    { path: "docs/readme.md" },
    { path: "root.md" },
  ];
  const grouped = groupCollection(items, "dir");
  assert.equal(grouped["research/ai"].count, 2);
  assert.equal(grouped["docs"].count, 1);
  assert.equal(grouped["./"].count, 1);
});

test("groupCollection groups items by reason, rule, or custom field", () => {
  const items = [
    { rule: "explicit-metadata", reason: "no match" },
    { rule: "explicit-metadata", reason: "syntax error" },
    { rule: "heuristic", reason: "no match" },
  ];
  const byRule = groupCollection(items, "rule");
  assert.equal(byRule["explicit-metadata"].count, 2);
  assert.equal(byRule["heuristic"].count, 1);

  const byReason = groupCollection(items, "reason");
  assert.equal(byReason["no match"].count, 2);
  assert.equal(byReason["syntax error"].count, 1);
});

test("crossReferenceContinuations flags stale continuations, tracked, and untracked judgments", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-triage-test-"));
  try {
    const activeContinuations = [
      {
        id: "ctn_active_valid",
        kind: "document_role_review",
        dedupe_key: "document_role_review:repo-a/open.md",
        subject: { repo: "repo-a", path: "open.md" },
      },
      {
        id: "ctn_active_settled",
        kind: "document_role_review",
        dedupe_key: "document_role_review:repo-a/settled.md",
        subject: { repo: "repo-a", path: "settled.md" },
      },
      {
        id: "ctn_active_deleted",
        kind: "document_role_review",
        dedupe_key: "document_role_review:repo-a/deleted.md",
        subject: { repo: "repo-a", path: "deleted.md" },
      },
    ];

    const freshJudgments = [
      {
        dedupe_key: "document_role_review:repo-a/open.md",
        subject: { repo: "repo-a", path: "open.md" },
        context: {},
      },
      {
        dedupe_key: "document_role_review:repo-a/untracked.md",
        subject: { repo: "repo-a", path: "untracked.md" },
        context: {},
      },
      {
        dedupe_key: "document_role_review:repo-a/resolved_before.md",
        subject: { repo: "repo-a", path: "resolved_before.md" },
        context: { resolved_elsewhere: { decision: "source" } },
      },
    ];

    // File setup
    const repoDir = path.join(tempDir, "repo-a");
    fs.mkdirSync(repoDir, { recursive: true });
    fs.writeFileSync(path.join(repoDir, "open.md"), "# Open");
    fs.writeFileSync(path.join(repoDir, "settled.md"), "# Settled");
    // deleted.md is intentionally not created

    const inventoryDocs = [
      { repo: "repo-a", rel: "open.md", role: "unknown", role_confidence: "weak" },
      { repo: "repo-a", rel: "settled.md", role: "operational", role_confidence: "strong" },
    ];

    const repos = [{ name: "repo-a", path: repoDir }];

    const result = crossReferenceContinuations(
      activeContinuations,
      freshJudgments,
      inventoryDocs,
      repos
    );

    // Tracked judgment: open.md
    assert.equal(result.tracked_judgments.length, 1);
    assert.equal(result.tracked_judgments[0].continuation_id, "ctn_active_valid");

    // Untracked judgment: untracked.md (resolved_before.md is ignored as already resolved)
    assert.equal(result.untracked_judgments.length, 1);
    assert.equal(result.untracked_judgments[0].subject.path, "untracked.md");

    // Stale continuations: settled.md and deleted.md
    assert.equal(result.stale_continuations.length, 2);
    const settledStale = result.stale_continuations.find(s => s.id === "ctn_active_settled");
    assert.ok(settledStale);
    assert.match(settledStale.reason, /role_settled/);

    const deletedStale = result.stale_continuations.find(s => s.id === "ctn_active_deleted");
    assert.ok(deletedStale);
    assert.match(deletedStale.reason, /file_deleted_or_missing/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("formatTriage renders report text with and without grouping", () => {
  const sampleReport = {
    ok: false,
    protocol: "cogentia.triage.v1",
    timestamp: "2026-09-17T12:00:00.000Z",
    repo: "all",
    summary: {
      consolidate_issues: 1,
      classification_changes: 2,
      classification_conflicts: 0,
      classification_ambiguous: 1,
      judgments_total: 2,
      judgments_unresolved: 1,
      judgments_already_resolved: 1,
      active_continuations: 2,
      stale_continuations: 1,
      untracked_judgments: 1,
      tracked_judgments: 0,
    },
    consolidate_issues: ["1 document gap(s)"],
    stale_continuations: [
      { id: "ctn_1", kind: "document_role_review", subject: { repo: "repo-a", path: "foo.md" }, reason: "role_settled" },
    ],
    untracked_judgments: [
      { dedupe_key: "k1", repo: "repo-b", path: "bar.md", reasons: ["unknown role"] },
    ],
    classification: {
      conflicts: [],
      ambiguous: [{ repo: "repo-b", path: "bar.md", reason: "no rule" }],
      changes_count: 2,
    },
    actions_taken: {
      cancelled_stale_count: 0,
      emitted_missing_count: 0,
    },
  };

  const plainText = formatTriage(sampleReport);
  assert.match(plainText, /Corpus Triage Report \[all\]/);
  assert.match(plainText, /Stale Continuations \(1\)/);
  assert.match(plainText, /ctn_1/);
  assert.match(plainText, /Untracked Judgments/);

  const groupedReport = {
    ...sampleReport,
    grouped: {
      field: "repo",
      stale: { "repo-a": { count: 1 } },
      untracked: { "repo-b": { count: 1 } },
      ambiguous: { "repo-b": { count: 1 } },
    },
  };

  const groupedText = formatTriage(groupedReport);
  assert.match(groupedText, /--- Grouped by repo ---/);
  assert.match(groupedText, /Stale Continuations by repo/);
  assert.match(groupedText, /repo-a: 1/);
});
