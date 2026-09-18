import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConsolidateSession, CONSOLIDATE_SESSION_PROTOCOL } from "../scripts/lib/consolidate-session.js";

const ctx = { repos: [{ name: "ubikia" }, { name: "cogentia" }] };

test("consolidate session separates observations from unexecuted typed actions", () => {
  const session = buildConsolidateSession(ctx, {
    generated: { changes: 2 }, gaps: [{}], privacy: { leaks: [] }, continuations: [{}],
    auto_sections: { issues: [] }, trail_lint: { issues: [] }, metadata_audit: { invalid: 0 },
    continuation_index: { blocked: 0 }, noise_summary: { modified: 1 },
    git: [{ repo: "ubikia", behind: 1, ahead: 0, dirty_count: 0 }],
    diagnostics: { completed_sources: [{ id: "corpus_plan", duration_ms: 123 }] },
  }, { now: "2026-09-18T20:00:00.000Z" });

  assert.equal(session.protocol, CONSOLIDATE_SESSION_PROTOCOL);
  assert.equal(session.read_only, true);
  assert.deepEqual(session.scope.configured_repositories, ["cogentia", "ubikia"]);
  assert.deepEqual(session.boundary.actions_executed, []);
  assert.deepEqual(session.boundary.external_effects, []);
  assert.deepEqual(session.diagnostics.completed_sources, [{ id: "corpus_plan", duration_ms: 123 }]);
  assert.equal(session.observations.find(item => item.id === "generated_navigation").status, "attention");
  const apply = session.proposed_actions.find(item => item.id === "apply_generated_navigation");
  assert.equal(apply.effect, "local_write_requires_authorization");
  assert.equal(apply.requires_authorization, true);
  assert.equal(apply.execution, "not_run");
  assert.equal(session.proposed_actions.find(item => item.id === "inspect_git_drift").effect, "read_only");
});

test("consolidate session remains empty of actions when its inputs are clear", () => {
  const session = buildConsolidateSession(ctx, {
    generated: { changes: 0 }, gaps: [], privacy: { leaks: [] }, continuations: [],
    auto_sections: { issues: [] }, trail_lint: { issues: [] }, metadata_audit: { invalid: 0 },
    continuation_index: { blocked: 0 }, noise_summary: {}, git: [],
  }, { now: "2026-09-18T20:00:00.000Z" });

  assert.deepEqual(session.proposed_actions, []);
  assert.ok(session.observations.every(item => item.status === "clear"));
});

test("consolidate session supports the bounded quick report shape", () => {
  const session = buildConsolidateSession(ctx, {
    gaps_count: 1,
    privacy_leaks_count: 0,
    active_continuations: 2,
  }, { now: "2026-09-18T20:00:00.000Z" });

  assert.equal(session.observations.find(item => item.id === "document_gaps").count, 1);
  assert.equal(session.observations.find(item => item.id === "continuations").count, 2);
  assert.equal(session.proposed_actions.find(item => item.id === "inspect_document_gaps").execution, "not_run");
  assert.equal(session.proposed_actions.find(item => item.id === "inspect_continuations").effect, "read_only");
});
