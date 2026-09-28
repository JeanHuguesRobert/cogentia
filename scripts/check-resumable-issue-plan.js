#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auditResumableIssue } from "./lib/resumable-issue-audit.js";
import { planResumableIssue, renderResumableIssuePlan } from "./lib/resumable-issue-plan.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "scripts", "fixtures", "resumable-issues");

function readFixture(name) {
  const body = fs.readFileSync(path.join(fixtureDir, name), "utf8");
  const title = (body.match(/^#\s+(.+)$/m) || [])[1] || name;
  return {
    repository: "JeanHuguesRobert/cogentia",
    number: 210,
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

const likely = readFixture("likely-areas.md");
const before = auditResumableIssue(likely, { fileExists });
assert.equal(before.cold_handler_closure.status, "PARTIAL", JSON.stringify(before.cold_handler_closure));
assert.ok(before.cold_handler_closure.reasons.includes("context_references_missing"));

const planned = planResumableIssue(likely, { fileExists });
assert.equal(planned.status, "proposed");
assert.equal(planned.exit_code, 0, JSON.stringify(planned.predicted_closure));
assert.equal(planned.predicted_closure.status, "PASS");
assert.equal(planned.effects.github_issue_mutation, false);
assert.equal(planned.effects.plan_applied, false);
assert.equal(planned.strict_context_headings, true);
assert.notEqual(planned.proposed_body_sha256, planned.original_body_sha256);
assert.match(planned.proposed_body, /## Likely areas/);
assert.match(planned.proposed_body, /## Context References/);
assert.match(planned.proposed_body, /Present-day reorganization/);
assert.match(planned.proposed_body, /plan_not_applied/);
assert.ok(planned.sections.some(section => section.id === "context_references" && section.origin === "reorganized_explicit"));
assert.equal(planResumableIssue(likely, { fileExists }).proposed_body_sha256, planned.proposed_body_sha256);
assert.match(renderResumableIssuePlan(planned), /remote side effects: none/);
assert.match(renderResumableIssuePlan(planned), /plan applied: no/);

const untouched = planResumableIssue(readFixture("pass.md"), { fileExists });
assert.equal(untouched.status, "already_sufficient");
assert.equal(untouched.proposed_body, readFixture("pass.md").body);
assert.equal(untouched.exit_code, 0);

const partial = planResumableIssue(readFixture("partial.md"), { fileExists });
assert.equal(partial.status, "incomplete");
assert.equal(partial.proposed_body, readFixture("partial.md").body);
assert.ok(partial.unfilled_gaps.includes("next_action_missing"));
assert.ok(partial.unfilled_gaps.includes("acceptance_missing"));
assert.equal(partial.predicted_closure.status, "PARTIAL");

const externalIssue = readFixture("external-paths.md");
const externalPlan = planResumableIssue(externalIssue, { fileExists });
assert.equal(externalPlan.status, "proposed");
assert.equal(externalPlan.predicted_closure.status, "PASS", JSON.stringify(externalPlan.predicted_closure));
assert.deepEqual(externalPlan.predicted_context.dangling, []);
const contextAdded = externalPlan.proposed_body.split("## Context References")[1].split("## Cross-repository dependencies")[0];
assert.match(contextAdded, /docs\/resumable_github_issues\.md/);
assert.doesNotMatch(contextAdded, /projects\/suicide-corse\/corpus\.yml/);
assert.doesNotMatch(contextAdded, /assets\/guide\.js/);
const externalBody = externalPlan.proposed_body.split("## Cross-repository dependencies")[1];
assert.match(externalBody, /projects\/suicide-corse\/corpus\.yml/);
assert.match(externalBody, /projects\/suicide-corse\/projections\/conversational-agent\.yml/);
assert.match(externalBody, /assets\/guide\.js/);
assert.match(externalBody, /assets\/guide\.css/);
assert.match(externalBody, /not required context/);
assert.ok(externalPlan.sections.some(section => section.id === "external_references"));
const strictDangle = auditResumableIssue({
  ...externalIssue,
  body: `${externalIssue.body}\n\n## Context References\n\n- \`projects/suicide-corse/corpus.yml\`\n`,
}, { fileExists });
assert.equal(strictDangle.cold_handler_closure.status, "FAIL");
assert.ok(strictDangle.cold_handler_closure.reasons.includes("dangling_required_reference"));
const unproved = planResumableIssue(externalIssue, {});
assert.match(unproved.proposed_body, /## Context References/);
assert.match(unproved.proposed_body, /projects\/suicide-corse\/corpus\.yml/);
assert.doesNotMatch(unproved.proposed_body, /## Cross-repository dependencies/);

const blocked = planResumableIssue(readFixture("judgment-goals.md"), { fileExists });
assert.equal(blocked.status, "needs_judgment");
assert.equal(blocked.proposed_body, null);
assert.equal(blocked.exit_code, 3);
assert.equal(blocked.unanswered_judgments[0].reason, "ambiguous_current_goal");
assert.equal(JSON.stringify(blocked.sections), "[]");

const judged = planResumableIssue(readFixture("judgment-goals.md"), {
  fileExists,
  stepResults: [{
    reason: "ambiguous_current_goal",
    decision: "Keep the audit strictly read-only.",
    explanation: "Chosen as a present-day judgment.",
  }],
});
assert.equal(judged.status, "proposed");
assert.equal(judged.predicted_closure.status, "PASS", JSON.stringify(judged.predicted_closure));
assert.match(judged.proposed_body, /## Historical goal candidates/);
assert.match(judged.proposed_body, /Keep the audit strictly read-only\./);
assert.match(judged.proposed_body, /Make the audit rewrite Issues immediately\./);
assert.match(judged.proposed_body, /Present-day judgment recorded by a supplied StepResult/);
assert.ok(judged.sections.some(section => section.origin === "present_judgment" && section.reason === "ambiguous_current_goal"));

const cli = spawnSync(process.execPath, [
  "scripts/cogentia.js",
  "issues",
  "resumable-plan",
  "--body-file", path.join(fixtureDir, "likely-areas.md"),
  "--json",
  "--root", root,
], { cwd: root, encoding: "utf8" });
assert.equal(cli.status, 0, cli.stderr || cli.stdout);
const cliPlan = JSON.parse(cli.stdout);
assert.equal(cliPlan.schema, "cogentia.resumable-issue-plan/v1");
assert.equal(cliPlan.effects.github_issue_mutation, false);
assert.equal(cliPlan.effects.plan_applied, false);
assert.equal(cliPlan.predicted_closure.status, "PASS");

const help = spawnSync(process.execPath, ["scripts/cogentia.js", "issues", "--help"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(help.status, 0, help.stderr || help.stdout);
assert.match(help.stdout, /issues resumable-plan/);

console.log(JSON.stringify({
  ok: true,
  likely: planned.predicted_closure.status,
  blocked: blocked.status,
  judged: judged.predicted_closure.status,
}, null, 2));
