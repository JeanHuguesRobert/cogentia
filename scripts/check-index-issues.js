#!/usr/bin/env node
/**
 * Regression fixture for issue #107: proves the (already-existing but never
 * exercised) GitHub Issues indexing pipeline actually works end-to-end --
 * sync -> role=source classification -> chunking -> FTS -> search -- and
 * that gh unavailability during `index rebuild`/`index update` defers to a
 * capability-delegation continuation rather than failing the whole rebuild.
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

function freshRegistry() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-index-issues-test-"));
  const repoDir = path.join(scratchRoot, "fixture-repo");
  fs.mkdirSync(path.join(repoDir, "research"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "research", "index.md"), "---\ntitle: index\n---\n# Index\n");
  const registryPath = path.join(scratchRoot, ".cogentia.json");
  fs.writeFileSync(registryPath, JSON.stringify({
    repos: [{ name: "fixture-repo", path: "./fixture-repo", branch: "main" }],
    policies: { "fixture-repo": { github: "fake/repo" } },
  }, null, 2));
  return { scratchRoot, registryPath, env: { COGENTIA_REGISTRY: registryPath } };
}

// ---- end-to-end: rebuild indexes synced issue content, findable by search --
{
  const { scratchRoot, env } = freshRegistry();
  check("index rebuild indexes synced issue content as role=source, searchable", () => {
    const r = run(["index", "rebuild", "--json"], { mode: "ok", env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.ok, true);
    assert.ok(r.json.issue_packets, "issue_packets stats should be present (rebuild now syncs, not just update)");
    assert.equal(r.json.issue_packets.ok, true);
    assert.equal(r.json.issue_packets.written, 2, "fake gh 'ok' mode returns 2 issues");

    const search = run(["index", "search", "Body of fake issue 1", "--repo", "fixture-repo", "--json"], { mode: "ok", env });
    assert.equal(search.status, 0, `expected exit 0, got ${search.status}: ${search.stderr}`);
    assert.ok(search.json.count >= 1, "issue content should be findable via FTS search");
    const hit = search.json.results.find(x => x.path.includes(".cogentia/issues/"));
    assert.ok(hit, "at least one result should come from a synced issue packet");
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

// ---- index update has the same issue-sync coverage as rebuild -------------
{
  const { scratchRoot, env } = freshRegistry();
  check("index update also syncs issues (not just rebuild)", () => {
    const r = run(["index", "update", "--json"], { mode: "ok", env });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    assert.ok(r.json.issue_packets, "issue_packets stats should be present on update too");
    assert.equal(r.json.issue_packets.written, 2);
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

// ---- gh failure defers, does not fail the whole rebuild -------------------
{
  const { scratchRoot, env } = freshRegistry();
  check("gh failure during index rebuild defers to a continuation, Markdown still indexed", () => {
    const r = run(["index", "rebuild", "--json"], { mode: "fail", env });
    assert.equal(r.status, 0, `rebuild must not hard-fail on gh unavailability, got ${r.status}: ${r.stderr}`);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.issue_packets.ok, false);
    assert.ok(r.json.documents >= 1, "Markdown documents (e.g. research/index.md) must still be indexed despite gh failure");

    const contList = run(["continuation", "list", "--json"], { mode: "ok", env });
    const capabilityConts = (contList.json.continuations || []).filter(c => c.kind === "capability-delegation");
    assert.ok(capabilityConts.length >= 1, "a capability-delegation continuation should have been created");
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
