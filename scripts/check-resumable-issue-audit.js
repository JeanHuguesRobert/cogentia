#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  AUDIT_EXIT,
  auditResumableIssue,
  renderResumableIssueAudit,
} from "./lib/resumable-issue-audit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "scripts", "fixtures", "resumable-issues");

function readFixture(name) {
  const body = fs.readFileSync(path.join(fixtureDir, name), "utf8");
  const title = (body.match(/^#\s+(.+)$/m) || [])[1] || name;
  return {
    repository: "JeanHuguesRobert/cogentia",
    number: 0,
    title,
    state: "open",
    body,
    comments: [],
  };
}

function fileExists(ref) {
  const rel = String(ref || "").replace(/^\/+/, "").replace(/\\/g, "/");
  if (!rel || rel.split("/").includes("..")) return false;
  return fs.existsSync(path.join(root, rel));
}

function auditFixture(name, issueExtras = {}) {
  return auditResumableIssue({ ...readFixture(name), ...issueExtras }, { fileExists });
}

const source = fs.readFileSync(path.join(root, "scripts", "lib", "resumable-issue-audit.js"), "utf8");
assert.doesNotMatch(source, /child_process|openai|anthropic|\bfetch\s*\(/i);

const pass = auditFixture("pass.md");
assert.equal(pass.cold_handler_closure.status, "PASS", JSON.stringify(pass.cold_handler_closure));
assert.equal(pass.exit_code, AUDIT_EXIT.PASS);
assert.equal(pass.goal.status, "present");
assert.equal(pass.constraints.status, "present");
assert.equal(pass.authority.status, "present");
assert.equal(pass.authority.interpreted_as_unlimited, false);
assert.ok(pass.authority.effect_ceiling.must_not.includes("deploy"));
assert.equal(pass.effects.github_issue_mutation, false);
assert.equal(pass.effects.continuation_emitted, false);
assert.equal(pass.continuations.length, 0);
assert.match(renderResumableIssueAudit(pass), /closure: PASS/);
assert.match(renderResumableIssueAudit(pass), /remote side effects: none/);

const minimal = auditFixture("minimal-pass.md");
assert.equal(minimal.cold_handler_closure.status, "PASS", JSON.stringify(minimal.cold_handler_closure));
assert.equal(minimal.constraints.status, "not_required");
assert.equal(minimal.stop_conditions.status, "not_required");
assert.equal(minimal.context_references.status, "not_required");
assert.equal(minimal.authority.status, "inherited_gate");
assert.equal(minimal.authority.interpreted_as_unlimited, false);
assert.match(minimal.authority.note, /AGENTS\.shared\.md/);

const weak = auditResumableIssue({
  ...readFixture("minimal-pass.md"),
  body: readFixture("minimal-pass.md").body.replace(
    /## Agent-resumable Next Action[\s\S]*?(?=## Acceptance)/,
    "## Agent-resumable Next Action\n\nContinue investigating this.\n\n",
  ),
}, { fileExists });
assert.equal(weak.next_action.status, "weak");
assert.equal(weak.cold_handler_closure.status, "PARTIAL");
assert.ok(weak.cold_handler_closure.reasons.includes("next_action_weak"));

const partial = auditFixture("partial.md");
assert.equal(partial.cold_handler_closure.status, "PARTIAL", JSON.stringify(partial.cold_handler_closure));
assert.equal(partial.exit_code, AUDIT_EXIT.PARTIAL);
assert.ok(partial.cold_handler_closure.reasons.includes("next_action_missing"));
assert.ok(partial.cold_handler_closure.reasons.includes("acceptance_missing"));
assert.ok(partial.deterministic_repairs.some(item => item.dimension === "next_action"));

const dangling = auditFixture("dangling.md");
assert.equal(dangling.cold_handler_closure.status, "FAIL", JSON.stringify(dangling.cold_handler_closure));
assert.ok(dangling.cold_handler_closure.reasons.includes("dangling_required_reference"));
assert.ok(dangling.context_references.dangling.includes("docs/does-not-exist-resumable-audit.md"));

const noGoal = auditFixture("no-goal.md");
assert.equal(noGoal.cold_handler_closure.status, "FAIL");
assert.equal(noGoal.goal.status, "missing");
assert.ok(noGoal.cold_handler_closure.reasons.includes("goal_missing"));

const judgment = auditFixture("judgment-goals.md");
assert.equal(judgment.cold_handler_closure.status, "JUDGMENT_REQUIRED", JSON.stringify(judgment.cold_handler_closure));
assert.equal(judgment.goal.status, "ambiguous");
assert.equal(judgment.continuations.length, 1);
assert.equal(judgment.continuations[0].emitted, false);
assert.equal(judgment.continuations[0].continuation_id, null);
assert.equal(judgment.continuations[0].context.historical_status, "new_judgment_not_historical_fact");
assert.equal(judgment.continuations[0].context.alternatives.length, 2);
assert.match(judgment.continuations[0].question, /which explicit goal candidate/i);
assert.equal(judgment.continuations[0].decision, undefined);
assert.equal(Object.hasOwn(judgment, "decision"), false);
assert.deepEqual(judgment.goal.alternatives, [
  "Keep the audit strictly read-only.",
  "Make the audit rewrite Issues immediately.",
]);

const rationale = auditFixture("unknown-rationale.md");
assert.equal(rationale.cold_handler_closure.status, "PASS", JSON.stringify(rationale.cold_handler_closure));
assert.equal(rationale.original_rationale.status, "unknown");
assert.equal(rationale.original_rationale.epistemic, "unknown");
assert.deepEqual(rationale.original_rationale.evidence, []);
assert.equal(JSON.stringify(rationale.original_rationale).includes("because"), false);
assert.match(rationale.current_state.evidence[0].excerpt, /changed to blue/);

const explicitAuthority = auditFixture("explicit-authority.md");
assert.equal(explicitAuthority.cold_handler_closure.status, "PASS", JSON.stringify(explicitAuthority.cold_handler_closure));
assert.equal(explicitAuthority.authority.status, "present");
assert.equal(explicitAuthority.authority.interpreted_as_unlimited, false);
assert.ok(explicitAuthority.authority.effect_ceiling.may.includes("edit"));
assert.ok(explicitAuthority.authority.effect_ceiling.must_not.includes("deploy"));
assert.ok(explicitAuthority.constraints.evidence.some(item => /do not treat silence as permission/i.test(item.excerpt)));

const conflict = auditFixture("authority-conflict.md");
assert.equal(conflict.cold_handler_closure.status, "JUDGMENT_REQUIRED", JSON.stringify(conflict.cold_handler_closure));
assert.equal(conflict.authority.status, "ambiguous");
assert.equal(conflict.authority.interpreted_as_unlimited, false);
assert.ok(conflict.authority.alternatives.some(line => /MAY deploy/i.test(line)));
assert.ok(conflict.authority.alternatives.some(line => /MUST NOT deploy/i.test(line)));
assert.equal(conflict.continuations.some(item => item.decision), false);

const uncovered = auditFixture("consequential-no-ceiling.md");
assert.equal(uncovered.cold_handler_closure.status, "JUDGMENT_REQUIRED", JSON.stringify(uncovered.cold_handler_closure));
assert.equal(uncovered.authority.interpreted_as_unlimited, false);
assert.equal(uncovered.authority.reason, "authority_missing_for_consequential_effect");
assert.equal(uncovered.authority.effect_ceiling?.may?.includes("deploy"), false);

const superseded = auditResumableIssue({
  ...readFixture("minimal-pass.md"),
  comments: [{
    author: "later",
    created_at: "2026-09-27T12:00:00Z",
    body: "## Goal\n\nChange the README title from Cogenta to Cogentia and record the commit.\n",
  }],
}, { fileExists });
assert.equal(superseded.goal.evidence[0].epistemic, "superseded");
assert.equal(superseded.goal.evidence.at(-1).epistemic, "explicit");
assert.equal(superseded.goal.evidence.at(-1).source, "comment:1");
assert.match(superseded.goal.evidence.at(-1).excerpt, /record the commit/);

const unchecked = auditResumableIssue(readFixture("pass.md"));
assert.equal(unchecked.context_references.status, "partial");
assert.equal(unchecked.cold_handler_closure.status, "PARTIAL");
assert.ok(unchecked.cold_handler_closure.reasons.includes("context_references_unverified"));
assert.equal(unchecked.cold_handler_closure.status === "FAIL", false);

const partialText = renderResumableIssueAudit(partial);
assert.match(partialText, /closure: PARTIAL/);
assert.match(partialText, /next_action_missing/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "resumable-audit-"));
const logPath = path.join(tmp, "gh.log");
const registryDir = path.join(tmp, "registry");
fs.mkdirSync(registryDir);
fs.writeFileSync(path.join(registryDir, ".cogentia.json"), JSON.stringify({ repos: [] }));
const fakeGh = path.join(root, "scripts", "fixtures", "resumable-audit-fake-gh.js");
const cli = spawnSync(process.execPath, [
  "scripts/cogentia.js",
  "issues",
  "resumable-audit",
  "example/repo#1",
  "--json",
  "--root", root,
], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    COGENTIA_GH_EXEC: JSON.stringify([process.execPath, fakeGh]),
    COGENTIA_REGISTRY: path.join(registryDir, ".cogentia.json"),
    FAKE_GH_LOG: logPath,
  },
});
assert.equal(cli.status, AUDIT_EXIT.FAIL, cli.stderr || cli.stdout);
const cliAudit = JSON.parse(cli.stdout);
assert.equal(cliAudit.schema, "cogentia.resumable-issue-audit/v1");
assert.equal(cliAudit.effects.github_issue_mutation, false);
assert.equal(cliAudit.effects.git_commit, false);
assert.equal(cliAudit.effects.continuation_emitted, false);
assert.equal(fs.existsSync(path.join(registryDir, ".cogentia", "continuations")), false);
const ghCalls = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.ok(ghCalls.length >= 1);
assert.ok(ghCalls.every(args => args[0] === "issue" && args[1] === "view"));

const offline = spawnSync(process.execPath, [
  "scripts/cogentia.js",
  "issues",
  "resumable-audit",
  "--body-file", path.join(fixtureDir, "partial.md"),
  "--repository", "JeanHuguesRobert/cogentia",
  "--number", "211",
  "--json",
  "--root", root,
], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, COGENTIA_REGISTRY: path.join(registryDir, ".cogentia.json") },
});
assert.equal(offline.status, AUDIT_EXIT.PARTIAL, offline.stderr || offline.stdout);
const offlineAudit = JSON.parse(offline.stdout);
assert.equal(offlineAudit.issue.repository, "JeanHuguesRobert/cogentia");
assert.equal(offlineAudit.issue.number, 211);
assert.equal(offlineAudit.cold_handler_closure.status, "PARTIAL");

const help = spawnSync(process.execPath, ["scripts/cogentia.js", "issues", "--help"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env },
});
assert.equal(help.status, 0, help.stderr || help.stdout);
assert.match(help.stdout, /issues resumable-audit/);
assert.match(help.stdout, /PASS 0, PARTIAL 2, JUDGMENT_REQUIRED 3, FAIL 4/);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({
  ok: true,
  pass: pass.cold_handler_closure.status,
  minimal: minimal.cold_handler_closure.status,
  partial: partial.cold_handler_closure.status,
  dangling: dangling.cold_handler_closure.status,
  judgment: judgment.cold_handler_closure.status,
}, null, 2));
