import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  auditReadmeSemanticEvidence,
  readmeReviewInputSnapshot,
  readmeReviewMetadata,
  readmeReviewState,
  updateReadmeReviewMetadata,
} from "../scripts/lib/readme-semantic-audit.js";

test("semantic README audit distinguishes local proof from unresolved prose", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-semantic-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "node test.js" } }));
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "existing.md"), "# Existing\n");
    fs.mkdirSync(path.join(root, "research"));
    fs.writeFileSync(path.join(root, "research", "source.md"), "# Source\n");
    const fullPath = path.join(root, "docs", "README.md");
    fs.writeFileSync(fullPath, "[ok](existing.md) [missing](gone.md)\n\n`research/source.md`\n\nnpm run test\nnpm run absent\n\nCurrently planned for 2027.\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "docs/README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.findings.broken_local_references.length, 1);
    assert.equal(report.findings.missing_commands.length, 1);
    assert.equal(report.commands.find(command => command.target === "test").status, "declared");
    assert.equal(report.local_references.find(reference => reference.reference === "research/source.md").resolution, "repo_root");
    assert.equal(report.temporal_cues.length, 1);
    assert.equal(report.findings.requires_judgment, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("temporal wording alone remains a signal, not a continuation-worthy contradiction", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-temporal-"));
  try {
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "# Fixture\n\nCurrently maintained.\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.temporal_cues.length, 1);
    assert.equal(report.findings.requires_judgment, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("semantic README evidence ignores notation and resolves workspace-local references", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-workspace-"));
  try {
    const root = path.join(workspace, "repo");
    fs.mkdirSync(root);
    fs.mkdirSync(path.join(workspace, "sibling"));
    fs.writeFileSync(path.join(workspace, "sibling", "source.md"), "# Source\n");
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "node test.js" } }));
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "`.json` `test/*.test.js` `sibling/source.md` `JeanHuguesRobert/sibling/source.md`\n\nnpm run test # ordinary annotation\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root });
    assert.deepEqual(report.local_references.map(reference => reference.reference), ["sibling/source.md", "JeanHuguesRobert/sibling/source.md"]);
    assert.equal(report.local_references[0].resolution, "workspace_root");
    assert.equal(report.local_references[1].resolution, "workspace_qualified");
    assert.equal(report.commands[0].status, "declared");
    assert.equal(report.findings.broken_local_references.length, 0);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("planned or ignored local paths are evidence, not broken README claims", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-expected-absent-"));
  try {
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "`.mailarch/config.json` is ignored by git.\nCreate `future/worker.js` later.\n`retired/worker.js` is historical.\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.local_references.length, 3);
    assert.equal(report.local_references.every(reference => reference.expected_absent), true);
    assert.equal(report.findings.broken_local_references.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("retired command examples are reported as historical rather than missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-historical-"));
  try {
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "## Historical Usage\n\nThe command is not runnable from the current tree.\n\nnode retired-scanner.js --scan\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.commands[0].status, "missing");
    assert.equal(report.commands[0].historical, true);
    assert.equal(report.findings.missing_commands.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("intended future commands are reported as prospective rather than missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-prospective-"));
  try {
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "## Required runners\n\nThe intended commands MAY be introduced with their milestones.\n\nnpm run test:future\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.commands[0].prospective, true);
    assert.equal(report.findings.missing_commands.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("application routes and code in Markdown link labels are not treated as missing files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-routes-"));
  try {
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "[the `docs/missing.md` reference](https://example.test/docs)\n\nVisit `wiki/adresse` for the public route.\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.local_references.length, 1);
    assert.equal(report.local_references[0].reference, "wiki/adresse");
    assert.equal(report.local_references[0].resolution, "application_route");
    assert.equal(report.findings.broken_local_references.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("node commands resolve a sibling entrypoint next to a nested README", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-node-entrypoint-"));
  try {
    const directory = path.join(root, "mcp");
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, "server.js"), "export default {};\n");
    const fullPath = path.join(directory, "README.md");
    fs.writeFileSync(fullPath, "node server.js\n");
    const report = auditReadmeSemanticEvidence({ repo: "fixture", path: "mcp/README.md", full_path: fullPath, repo_root: root });
    assert.equal(report.commands[0].status, "declared");
    assert.equal(report.commands[0].resolution, "readme_directory");
    assert.equal(report.findings.missing_commands.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("README review snapshot ignores its own frontmatter control block but detects local source changes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-readme-review-"));
  try {
    fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src", "main.js"), "export const version = 1;\n");
    const fullPath = path.join(root, "README.md");
    fs.writeFileSync(fullPath, "# Fixture\n\nDescribes the local program.\n");
    const readme = { repo: "fixture", path: "README.md", full_path: fullPath, repo_root: root };
    const initial = readmeReviewInputSnapshot(readme);
    const recorded = updateReadmeReviewMetadata(fs.readFileSync(fullPath, "utf8"), {
      reviewed_at: "2026-09-21T00:00:00.000Z",
      reviewed_commit: "fixture",
      scope: initial.scope,
      input_fingerprint: initial.fingerprint,
    });
    fs.writeFileSync(fullPath, recorded);
    assert.equal(readmeReviewMetadata(recorded).input_fingerprint, initial.fingerprint);
    assert.equal(readmeReviewState(readme).status, "already_reviewed");
    assert.equal(readmeReviewInputSnapshot(readme).fingerprint, initial.fingerprint);

    fs.writeFileSync(path.join(root, "src", "main.js"), "export const version = 2;\n");
    assert.equal(readmeReviewState(readme).status, "review_required");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
