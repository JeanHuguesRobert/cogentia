#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-plan-scope-"));

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function corpusStatus(name) {
  return [
    "---",
    `title: "Corpus Status — ${name}"`,
    "date: 2026-10-17",
    "---",
    "",
    `# Corpus Status — ${name}`,
    "",
    "## Registered Repositories",
    "<!-- BEGIN_AUTO: registered_repos -->",
    "<!-- END_AUTO: registered_repos -->",
    "",
    "## Cross-Reference Graph",
    "<!-- BEGIN_AUTO: graph -->",
    "<!-- END_AUTO: graph -->",
    "",
    "## Concepts",
    "<!-- BEGIN_AUTO: concepts -->",
    "<!-- END_AUTO: concepts -->",
    "",
    "## Concept Graph",
    "<!-- BEGIN_AUTO: concept_graph -->",
    "<!-- END_AUTO: concept_graph -->",
    "",
    "## Published",
    "<!-- BEGIN_AUTO: published -->",
    "<!-- END_AUTO: published -->",
    "",
    "## What Remains Possible",
    "<!-- BEGIN_AUTO: possibilities -->",
    "<!-- END_AUTO: possibilities -->",
    ""
  ].join("\n");
}

function index(name) {
  return [
    `# Research Index — ${name}`,
    "",
    "## Published",
    "",
    "| Title | Status |",
    "|---|---|",
    "",
    "## Open Possibilities",
    "",
    "- none",
    ""
  ].join("\n");
}

try {
  const repoA = path.join(scratch, "repo-a");
  const repoB = path.join(scratch, "repo-b");

  write(path.join(repoA, "research", "index.md"), index("repo-a"));
  write(path.join(repoB, "research", "index.md"), index("repo-b"));
  write(path.join(repoA, "research", "corpus-status.md"), corpusStatus("repo-a"));
  write(path.join(repoA, "research", "a.md"), "# A\n");
  write(
    path.join(repoB, "research", "b.md"),
    "# B\n\nSee [A](https://github.com/JeanHuguesRobert/repo-a/blob/main/research/a.md).\n"
  );

  const registry = path.join(scratch, ".cogentia.json");
  write(registry, JSON.stringify({
    repos: [
      { name: "repo-a", path: "./repo-a", branch: "main", github: "JeanHuguesRobert/repo-a" },
      { name: "repo-b", path: "./repo-b", branch: "main", github: "JeanHuguesRobert/repo-b" }
    ]
  }, null, 2));

  const run = spawnSync(process.execPath, [
    cli,
    "corpus", "plan",
    "--repo", "repo-a",
    "--no-trails",
    "--no-backlinks",
    "--no-documents",
    "--no-readmes",
    "--include-content",
    "--json"
  ], {
    encoding: "utf8",
    env: { ...process.env, COGENTIA_REGISTRY: registry }
  });

  assert.equal(run.status, 0, `expected exit 0, got ${run.status}: ${run.stderr}`);
  const plan = JSON.parse(run.stdout);
  const status = plan.changes.find(change =>
    change.repo === "repo-a" &&
    change.path.replace(/\\/g, "/") === "research/corpus-status.md"
  );
  assert.ok(status, "repo-scoped plan should refresh repo-a corpus-status");
  assert.match(
    status.after,
    /r_repo_b\s+--?>\|1\|\s+r_repo_a/,
    "repo-scoped projection must retain cross-repo evidence from repo-b"
  );
  assert.equal(
    plan.changes.some(change => change.repo === "repo-b"),
    false,
    "repo scope must constrain writes to repo-a"
  );

  console.log("ok - repo-scoped plan keeps full-corpus evidence while constraining writes");
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
