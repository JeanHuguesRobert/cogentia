#!/usr/bin/env node
/**
 * Regression fixture for issue #100 (narrowed scope, see issue comments).
 *
 * - concepts/index bootstrap must create a valid skeleton on a repo that has
 *   neither file yet, and must be a no-op the second time (idempotent).
 * - concepts graph/ref/status must exist as CLI subcommands and produce
 *   output consistent with what corpus-status.md's existing concepts /
 *   concept_graph blocks already show for a real repo.
 *
 * This is deliberately NOT a test that concepts.md/index.md *content* is
 * mechanically regenerable -- that was never true even in v1, and building
 * it would regress the agent-drafts/human-accepts model these files use.
 * See https://github.com/JeanHuguesRobert/cogentia/issues/100.
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");

function run(args, opts = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    ...opts,
  });
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

// ---- Part A: bootstrap idempotence on a scratch registry -------------------

const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-concepts-test-"));
const repoDir = path.join(scratchRoot, "fixture-repo");
fs.mkdirSync(path.join(repoDir, "research"), { recursive: true });
const registryPath = path.join(scratchRoot, ".cogentia.json");
fs.writeFileSync(registryPath, JSON.stringify({
  repos: [{ name: "fixture-repo", path: "./fixture-repo", branch: "main" }],
}, null, 2));

const scratchEnv = { ...process.env, COGENTIA_REGISTRY: registryPath };

check("concepts init creates index.md and concepts.md when absent", () => {
  const result = run(["concepts", "init", "fixture-repo", "--json"], { env: scratchEnv });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  const indexPath = path.join(repoDir, "research", "index.md");
  const conceptsPath = path.join(repoDir, "research", "concepts.md");
  assert.ok(fs.existsSync(indexPath), "index.md should be created");
  assert.ok(fs.existsSync(conceptsPath), "concepts.md should be created");
  assert.match(fs.readFileSync(indexPath, "utf8"), /title:.*fixture-repo/i);
  assert.match(fs.readFileSync(conceptsPath, "utf8"), /title:.*fixture-repo/i);
});

check("concepts init is a no-op on the second run", () => {
  const before = {
    index: fs.readFileSync(path.join(repoDir, "research", "index.md"), "utf8"),
    concepts: fs.readFileSync(path.join(repoDir, "research", "concepts.md"), "utf8"),
  };
  const result = run(["concepts", "init", "fixture-repo", "--json"], { env: scratchEnv });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  const after = {
    index: fs.readFileSync(path.join(repoDir, "research", "index.md"), "utf8"),
    concepts: fs.readFileSync(path.join(repoDir, "research", "concepts.md"), "utf8"),
  };
  assert.equal(before.index, after.index, "index.md must be unchanged on second init");
  assert.equal(before.concepts, after.concepts, "concepts.md must be unchanged on second init");
});

fs.rmSync(scratchRoot, { recursive: true, force: true });

// ---- Part B: CLI parity against the real workspace registry ----------------

const realEnv = { ...process.env };
if (!realEnv.COGENTIA_REGISTRY) {
  const candidates = [
    path.join(root, "..", "JeanHuguesRobert", ".cogentia.json"),
    path.join(root, ".cogentia.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      realEnv.COGENTIA_REGISTRY = c;
      break;
    }
  }
}

check("concepts graph exists and returns node/edge structure", () => {
  const result = run(["concepts", "graph", "cogentia", "--json"], { env: realEnv });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  const json = JSON.parse(result.stdout);
  assert.ok(
    Array.isArray(json.nodes) || Array.isArray(json.edges) || typeof json.mermaid === "string",
    "graph output should contain a recognizable graph structure"
  );
});

check("concepts status exists and returns a per-concept table", () => {
  const result = run(["concepts", "status", "cogentia", "--json"], { env: realEnv });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  const json = JSON.parse(result.stdout);
  assert.ok(
    Array.isArray(json.concepts) || Array.isArray(json.results),
    "status output should list concepts"
  );
});

check("concepts ref resolves a known concept to its canonical file", () => {
  const result = run(["concepts", "ref", "Cogentia", "cogentia", "--json"], { env: realEnv });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}: ${result.stderr}`);
  const json = JSON.parse(result.stdout);
  assert.ok(json.path || json.file, "ref output should resolve to a file path");
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
