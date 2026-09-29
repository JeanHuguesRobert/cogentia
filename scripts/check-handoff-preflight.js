#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preflightHandoff } from "./lib/handoff-preflight.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "scripts", "fixtures", "handoff-preflight");
const csv = "research/senatoriales-2026/data/electeurs_senatoriaux_2B_2026.csv";

function readFixture(name) {
  const body = fs.readFileSync(path.join(fixtureDir, name), "utf8");
  return {
    repository: "JeanHuguesRobert/barons-Mariani",
    number: 85,
    title: (body.match(/^#\s+(.+)$/m) || [])[1] || name,
    state: "open",
    body,
    comments: [],
  };
}

function present(ref) {
  return ref === "instructions/AGENTS.shared.md" || ref === csv;
}

const before = preflightHandoff(readFixture("before-repair.md"), { fileExists: () => false });
assert.equal(before.closure.status, "BLOCKED", JSON.stringify(before.closure));
assert.equal(before.dependencies[0].ref, csv);
assert.equal(before.dependencies[0].required, true);
assert.equal(before.dependencies[0].state, "producer-local");
assert.equal(before.dependencies[0].exists, false);
assert.equal(before.dependencies[0].retrievable, false);
assert.equal(before.closure.blocked_is_impossible, false);
assert.equal(before.necessary_means.executed, false);
assert.equal(before.necessary_means.authority_widened, false);
assert.equal(before.necessary_means.paths[0].id, "copy-into-repository");
assert.equal(before.necessary_means.paths[0].admissible, true);
assert.equal(before.necessary_means.paths[0].executable, false);
assert.ok(before.necessary_means.paths[0].measured_risk.governs.includes("option_loss"));
assert.equal(before.effects.repair_executed, false);
assert.equal(before.effects.github_issue_mutation, false);

const visibleOnlyToProducer = preflightHandoff(readFixture("before-repair.md"), { fileExists: () => true });
assert.equal(visibleOnlyToProducer.dependencies[0].exists, true);
assert.equal(visibleOnlyToProducer.dependencies[0].state, "producer-local");
assert.equal(visibleOnlyToProducer.dependencies[0].retrievable, false);
assert.equal(visibleOnlyToProducer.closure.status, "BLOCKED");

const after = preflightHandoff(readFixture("after-repair.md"), { fileExists: present });
assert.equal(after.closure.status, "PASS", JSON.stringify(after.closure));
assert.equal(after.dependencies[0].state, "present-retrievable");
assert.equal(after.dependencies[0].retrievable, true);
assert.equal(after.reconciliation.principal_relay.valid_path, true);
assert.equal(after.reconciliation.principal_relay.requested, false);

const optional = preflightHandoff(readFixture("optional-missing.md"), {
  fileExists: ref => ref === "instructions/AGENTS.shared.md",
});
assert.equal(optional.closure.status, "PASS", JSON.stringify(optional.closure));
const optionalCsv = optional.dependencies.find(dep => dep.ref === csv);
assert.equal(optionalCsv.required, false);
assert.equal(optionalCsv.state, "absent");

const human = preflightHandoff(readFixture("human-assist.md"), { fileExists: () => false });
assert.equal(human.closure.status, "BLOCKED");
assert.equal(human.dependencies[0].state, "blocked");
assert.equal(human.dependencies[0].assist, true);
assert.equal(human.necessary_means.paths[0].id, "human-assist");
assert.equal(human.necessary_means.authority_widened, false);
assert.equal(human.mandate.authority_widened, false);

const exceeds = preflightHandoff(readFixture("exceeds-mandate.md"), { fileExists: () => false });
assert.equal(exceeds.closure.status, "BLOCKED");
assert.equal(exceeds.necessary_means.paths[0].admissible, false);
assert.equal(exceeds.necessary_means.paths[0].exceeds_mandate, true);
assert.equal(exceeds.necessary_means.paths[0].executable, false);
assert.equal(exceeds.necessary_means.escalation, true);
assert.match(exceeds.necessary_means.paths[0].escalation, /Do not bypass/);

const stale = preflightHandoff(readFixture("stale-baseline.md"), { fileExists: present });
assert.equal(stale.closure.status, "PARTIAL", JSON.stringify(stale.closure));
assert.ok(stale.closure.reasons.includes("stale_baseline"));
assert.equal(stale.reconciliation.required, true);
assert.deepEqual(stale.reconciliation.method, ["fetch", "compare", "reconcile"]);
assert.ok(stale.reconciliation.rejected.includes("reset"));
assert.ok(stale.reconciliation.rejected.includes("overwrite"));
assert.equal(stale.reconciliation.principal_relay.requested, true);
assert.equal(stale.reconciliation.principal_relay.minimal, true);
assert.match(stale.reconciliation.principal_relay.message, /refresh current main/);

const resetIssue = readFixture("stale-baseline.md");
resetIssue.body = resetIssue.body.replace(
  "1. Read `instructions/AGENTS.shared.md`.",
  "1. git reset --hard origin/main and overwrite local work.",
);
const reset = preflightHandoff(resetIssue, { fileExists: present });
assert.equal(reset.reconciliation.blind_overwrite_rejected, true);
assert.ok(reset.closure.reasons.includes("blind_overwrite_rejected"));
assert.deepEqual(reset.reconciliation.method, ["fetch", "compare", "reconcile"]);

const impossible = preflightHandoff({
  repository: "JeanHuguesRobert/cogentia",
  number: 212,
  title: "Impossible input",
  body: [
    "## Goal",
    "",
    "Read a file that cannot exist for this handler.",
    "",
    "## Agent-resumable Next Action",
    "",
    "1. Read `research/does-not-exist.bin`.",
    "",
    "## Required inputs",
    "",
    "- `research/does-not-exist.bin` (required; channel: impossible)",
  ].join("\n"),
}, { fileExists: () => false });
assert.equal(impossible.dependencies[0].state, "impossible");
assert.equal(impossible.closure.status, "BLOCKED");
assert.equal(impossible.closure.blocked_is_impossible, false);
assert.ok(impossible.closure.reasons.includes("impossible_under_current_regime"));
assert.equal(impossible.necessary_means.paths.length, 0);

const cli = spawnSync(process.execPath, [
  "scripts/cogentia.js",
  "issues",
  "handoff-preflight",
  "--body-file", path.join(fixtureDir, "before-repair.md"),
  "--json",
], { cwd: root, encoding: "utf8" });
assert.equal(cli.status, 4, cli.stderr || cli.stdout);
const cliResult = JSON.parse(cli.stdout);
assert.equal(cliResult.schema, "cogentia.handoff-preflight/v1");
assert.equal(cliResult.closure.status, "BLOCKED");
assert.equal(cliResult.dependencies[0].state, "producer-local");
assert.equal(cliResult.effects.github_issue_mutation, false);
assert.equal(cliResult.effects.repair_executed, false);

const help = spawnSync(process.execPath, ["scripts/cogentia.js", "issues", "--help"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(help.status, 0, help.stderr || help.stdout);
assert.match(help.stdout, /issues handoff-preflight/);

console.log(JSON.stringify({
  ok: true,
  before: before.closure.status,
  after: after.closure.status,
  optional: optional.closure.status,
  human: human.closure.status,
  exceeds: exceeds.closure.status,
  stale: stale.closure.status,
  impossible: impossible.closure.status,
}, null, 2));
