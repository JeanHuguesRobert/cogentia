#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { planResumableIssue } from "./lib/resumable-issue-plan.js";
import {
  authorizeResumableApply,
  prepareResumableApply,
  verifyDeliveredBody,
} from "./lib/resumable-issue-apply.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "scripts", "fixtures", "resumable-issues");

function fileExists(ref) {
  const rel = String(ref || "").replace(/^\/+/, "").replace(/\\/g, "/");
  if (!rel || rel.split("/").includes("..")) return false;
  return fs.existsSync(path.join(root, rel));
}

const body = fs.readFileSync(path.join(fixtureDir, "likely-areas.md"), "utf8");
const issue = {
  repository: "JeanHuguesRobert/cogentia",
  number: 210,
  title: "Record the audit command",
  state: "open",
  body,
  comments: [],
};
const plan = planResumableIssue(issue, { fileExists });
const exposed = prepareResumableApply(issue, plan);
assert.equal(exposed.status, "exposed");
assert.equal(exposed.exit_code, 2);
assert.equal(exposed.effects.github_issue_mutation, false);
assert.equal(exposed.effects.plan_applied, false);
assert.match(exposed.delivery_body, /status: applied/);
assert.match(exposed.delivery_body, new RegExp(`proposed_body_sha256: ${plan.proposed_body_sha256}`));
assert.doesNotMatch(exposed.delivery_body, /status: plan_not_applied/);
assert.equal(authorizeResumableApply(exposed, "nope").status, "confirm_required");
assert.equal(authorizeResumableApply(exposed, exposed.delivery_body_sha256).authorized, true);

const stale = prepareResumableApply({ ...issue, body: `${body}\nchanged\n` }, plan);
assert.equal(stale.status, "stale_plan");
assert.equal(stale.delivery_body, null);
assert.equal(stale.effects.github_issue_mutation, false);

const blocked = prepareResumableApply(issue, { status: "needs_judgment", proposed_body: null });
assert.equal(blocked.status, "refused");
assert.equal(blocked.exit_code, 3);

const again = prepareResumableApply({ ...issue, body: exposed.delivery_body }, plan);
assert.equal(again.status, "already_applied");
assert.equal(again.effects.github_issue_mutation, false);

assert.equal(verifyDeliveredBody(exposed.delivery_body, `${exposed.delivery_body}\n`).ok, true);
assert.equal(verifyDeliveredBody(exposed.delivery_body, `${exposed.delivery_body}\n\n`).ok, false);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "resumable-apply-"));
const planPath = path.join(tmp, "plan.json");
const logPath = path.join(tmp, "gh.log");
const statePath = path.join(tmp, "state.md");
const bodyPath = path.join(tmp, "body.md");
fs.writeFileSync(planPath, JSON.stringify(plan));
fs.writeFileSync(bodyPath, body);
const registryDir = path.join(tmp, "registry");
fs.mkdirSync(registryDir);
fs.writeFileSync(path.join(registryDir, ".cogentia.json"), JSON.stringify({ repos: [] }));
const env = {
  ...process.env,
  COGENTIA_GH_EXEC: JSON.stringify([process.execPath, path.join(root, "scripts", "fixtures", "resumable-apply-fake-gh.js")]),
  COGENTIA_REGISTRY: path.join(registryDir, ".cogentia.json"),
  FAKE_GH_LOG: logPath,
  FAKE_GH_STATE: statePath,
  FAKE_GH_BODY_FILE: bodyPath,
};
function run(args) {
  fs.writeFileSync(logPath, "");
  fs.rmSync(statePath, { force: true });
  return spawnSync(process.execPath, ["scripts/cogentia.js", "issues", "resumable-apply", "JeanHuguesRobert/cogentia#210", "--from", planPath, "--json", ...args], {
    cwd: root,
    encoding: "utf8",
    env,
  });
}
function calls() {
  return fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

const preview = run([]);
assert.equal(preview.status, 2, preview.stderr || preview.stdout);
const previewJson = JSON.parse(preview.stdout);
assert.equal(previewJson.status, "exposed");
assert.equal(previewJson.effects.github_issue_mutation, false);
assert.ok(calls().every(args => args[0] === "issue" && args[1] === "view"));

const mismatch = run(["--confirm", "00000000"]);
assert.equal(mismatch.status, 2, mismatch.stderr || mismatch.stdout);
assert.equal(JSON.parse(mismatch.stdout).status, "confirm_required");
assert.ok(calls().every(args => args[1] === "view"));

const applied = run(["--confirm", previewJson.delivery_body_sha256]);
assert.equal(applied.status, 0, applied.stderr || applied.stdout);
const appliedJson = JSON.parse(applied.stdout);
assert.equal(appliedJson.status, "applied");
assert.equal(appliedJson.verified, true);
assert.equal(appliedJson.effects.github_issue_mutation, true);
assert.equal(appliedJson.effects.plan_applied, true);
const appliedCalls = calls();
assert.deepEqual(appliedCalls.map(args => args[1]), ["view", "edit", "view"]);
assert.equal(fs.readFileSync(statePath, "utf8"), previewJson.delivery_body);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, delivery: previewJson.delivery_body_sha256 }, null, 2));
