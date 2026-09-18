#!/usr/bin/env node
/**
 * Regression fixture for `concepts scan-issues`, covering the judgment-
 * boundary generalization discussed alongside issue #100:
 *
 * - dry-run by default (free preview, zero gh issue-view calls, zero
 *   continuations) -- --apply required for the real (costly) work;
 * - --apply creates one concept-from-issue continuation per candidate,
 *   deduplicated on repeat runs;
 * - gh failure/timeout defers to a capability-delegation continuation
 *   instead of throwing (research/portable_continuations_and_judgment_boundaries.md);
 * - a large candidate count at --apply time defers to a confirmation
 *   continuation unless --yes is also given.
 *
 * Uses a fake `gh` (scripts/test-fixtures/fake-gh.js) via COGENTIA_GH_EXEC
 * so this is deterministic and does not depend on live network/gh auth.
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");
const fakeGh = path.join(root, "scripts", "test-fixtures", "fake-gh.js");

function run(args, { mode = "ok", env: extraEnv = {} } = {}) {
  const env = {
    ...process.env,
    COGENTIA_GH_EXEC: JSON.stringify([process.execPath, fakeGh]),
    FAKE_GH_MODE: mode,
    ...extraEnv,
  };
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env });
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return { ...result, json };
}

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}

function continuationsOfKind(registryPath, kind) {
  const dir = path.join(path.dirname(registryPath), ".cogentia", "continuations");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .filter(c => c.kind === kind);
}

function freshRegistry() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-scan-issues-test-"));
  const repoDir = path.join(scratchRoot, "fixture-repo");
  fs.mkdirSync(path.join(repoDir, "research"), { recursive: true });
  const registryPath = path.join(scratchRoot, ".cogentia.json");
  fs.writeFileSync(registryPath, JSON.stringify({
    repos: [{ name: "fixture-repo", path: "./fixture-repo", branch: "main" }],
    policies: { "fixture-repo": { github: "fake/repo" } },
  }, null, 2));
  return { scratchRoot, registryPath, env: { COGENTIA_REGISTRY: registryPath } };
}

// ---- dry-run default: free preview, no continuations ----------------------
{
  const { scratchRoot, registryPath, env } = freshRegistry();
  check("scan-issues without --apply is a dry run with no continuations", () => {
    const r = run(["concepts", "scan-issues", "fixture-repo", "--limit", "2", "--json"], { env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.dry_run, true);
    assert.equal(r.json.would_propose.length, 2);
    assert.equal(continuationsOfKind(registryPath, "concept-from-issue").length, 0);
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

// ---- --apply creates continuations, dedup on repeat ------------------------
{
  const { scratchRoot, registryPath, env } = freshRegistry();
  check("scan-issues --apply creates one continuation per candidate", () => {
    const r = run(["concepts", "scan-issues", "fixture-repo", "--limit", "2", "--apply", "--json"], { env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.proposals.length, 2);
    assert.ok(r.json.proposals.every(p => p.created === true));
    assert.equal(continuationsOfKind(registryPath, "concept-from-issue").length, 2);
  });
  check("scan-issues --apply is deduplicated on a second run", () => {
    const r = run(["concepts", "scan-issues", "fixture-repo", "--limit", "2", "--apply", "--json"], { env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.ok(r.json.proposals.every(p => p.created === false), "second run should find existing active continuations");
    assert.equal(continuationsOfKind(registryPath, "concept-from-issue").length, 2, "no duplicate continuations");
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

// ---- gh failure defers to a capability-delegation continuation ------------
{
  const { scratchRoot, registryPath, env } = freshRegistry();
  check("gh failure defers to a capability-delegation continuation instead of erroring", () => {
    const r = run(["concepts", "scan-issues", "fixture-repo", "--limit", "2", "--json"], { mode: "fail", env });
    assert.equal(r.status, 0, `expected a graceful (exit 0) deferral, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.deferred, true);
    assert.ok(r.json.continuation, "should reference a created continuation");
    assert.equal(continuationsOfKind(registryPath, "capability-delegation").length, 1);
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

// ---- large scope at --apply time defers to a confirmation continuation ----
{
  const { scratchRoot, registryPath, env } = freshRegistry();
  check("--apply with a large candidate count defers to a confirmation continuation", () => {
    const r = run(["concepts", "scan-issues", "fixture-repo", "--limit", "20", "--apply", "--json"], { mode: "many", env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.needs_confirmation, true);
    assert.equal(r.json.candidate_count, 20);
    assert.equal(continuationsOfKind(registryPath, "confirmation").length, 1);
    assert.equal(continuationsOfKind(registryPath, "concept-from-issue").length, 0, "must not do the work before confirmation");
  });
  check("--apply --yes bypasses confirmation and does the work", () => {
    const r = run(["concepts", "scan-issues", "fixture-repo", "--limit", "20", "--apply", "--yes", "--json"], { mode: "many", env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.needs_confirmation, undefined);
    assert.equal(r.json.proposals.length, 20);
    assert.equal(continuationsOfKind(registryPath, "concept-from-issue").length, 20);
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
