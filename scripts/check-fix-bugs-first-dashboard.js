#!/usr/bin/env node

/**
 * Unit tests for Fix Bugs First Dashboard normalization & subsystem gates.
 * Run: node scripts/test-fix-bugs-first-dashboard.js
 */

import assert from "node:assert/strict";
import {
  buildDashboardData,
  evaluateSubsystemGates,
  normalizeItem,
  renderDashboardMarkdown,
} from "./lib/fix-bugs-first-dashboard.js";

console.log("Running Fix Bugs First Dashboard unit tests...");

// 1. Test Normalization
const rawBug = {
  id: "TEST-BUG-001",
  kind: "bug",
  title: "Test critical bug",
  subsystem: "secrets",
  severity: "critical",
  status: "open",
  evidence: "Failed rotation test",
  next_action: "Fix rotation script",
  github_issue: 99,
};

const normalized = normalizeItem(rawBug, "test-source");
assert.equal(normalized.id, "TEST-BUG-001");
assert.equal(normalized.kind, "bug");
assert.equal(normalized.subsystem, "secrets");
assert.equal(normalized.severity, "critical");
assert.equal(normalized.urgency, "now"); // Inferred from critical severity
assert.equal(normalized.blocks_features, true);
assert.equal(normalized.url, "https://github.com/JeanHuguesRobert/operium/issues/99");

// 2. Test Subsystem Gates
const items = [
  normalized,
  {
    id: "TEST-FEAT-001",
    kind: "feature",
    title: "Secrets vault sync",
    subsystem: "secrets",
    status: "open",
  },
  {
    id: "TEST-FEAT-002",
    kind: "feature",
    title: "Tooling CLI improvement",
    subsystem: "tooling",
    status: "open",
  },
];

const gates = evaluateSubsystemGates(items);

// Secrets subsystem has a critical open bug -> BLOCKED
assert.equal(gates.secrets.state, "BLOCKED");
assert.equal(gates.secrets.blocking_bugs.length, 1);
assert.equal(gates.secrets.blocking_bugs[0], "TEST-BUG-001");

// Tooling subsystem has no open bugs -> OK
assert.equal(gates.tooling.state, "OK");
assert.equal(gates.tooling.blocking_bugs.length, 0);

// 3. Test Full Dashboard Build & Markdown Rendering
const dashboard = buildDashboardData([rawBug, items[1], items[2]], [], { test: true, view_id: "fix-bugs-first-dashboard", visibility: "public" });
assert.equal(dashboard.schema, "cogentia.fix-bugs-first-dashboard.v1");
assert.equal(dashboard.metadata.open_bugs_count, 1);
assert.equal(dashboard.metadata.open_features_count, 2);
assert.equal(dashboard.metadata.view_id, "fix-bugs-first-dashboard");
assert.equal(dashboard.metadata.visibility, "public");

const markdown = renderDashboardMarkdown(dashboard);
assert.match(markdown, /# 🛡️ Fix Bugs First Work Dashboard/);
assert.match(markdown, /`secrets` \| 🚫 \*\*BLOCKED\*\*/);
assert.match(markdown, /`tooling` \| ✅ \*\*OK\*\*/);
assert.match(markdown, /\[TEST-BUG-001\] Test critical bug/);

console.log(JSON.stringify({
  ok: true,
  tests_passed: [
    "normalization_item",
    "subsystem_gate_evaluation",
    "dashboard_data_structure",
    "markdown_rendering",
  ],
}, null, 2));
