#!/usr/bin/env node

// Read-only aggregate metadata audit for the repositories in the Cogentia registry.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const scriptDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, (m) => m.slice(1));
const localAudit = path.join(scriptDir, "metadata-audit.js");
const registryArg = process.argv.find((arg) => arg.startsWith("--registry="));
const registryPath = registryArg
  ? path.resolve(registryArg.slice("--registry=".length))
  : path.resolve(process.env.COGENTIA_REGISTRY || "../JeanHuguesRobert/.cogentia.json");
const registryRoot = path.dirname(registryPath);
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const repos = (registry.repos || []).map((repo) => ({
  ...repo,
  absolute_path: path.resolve(registryRoot, repo.path),
}));

const results = repos.map((repo) => {
  try {
    const output = execFileSync(process.execPath, [localAudit, "--json"], {
      cwd: repo.absolute_path,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const audit = JSON.parse(output);
    const needsReview = audit.artifacts.filter((artifact) => artifact.state === "needs-review");
    const ranked = needsReview.map((artifact) => {
      const basename = path.basename(artifact.path).toLowerCase();
      const entry = ["readme.md", "index.md", "concepts.md"].includes(basename);
      const structural = artifact.issues.includes("invalid-frontmatter") || artifact.issues.includes("invalid-structured-data");
      const score = (repo.navigation?.read_priority || 99) * 100 + (entry ? 0 : 20) + (structural ? 0 : 10);
      return { path: artifact.path, issues: artifact.issues, score };
    }).sort((a, b) => a.score - b.score || a.path.localeCompare(b.path));
    return {
      name: repo.name,
      path: repo.path,
      kind: repo.kind,
      read_priority: repo.navigation?.read_priority ?? null,
      state: "audited",
      audit,
      priority: ranked,
    };
  } catch (error) {
    return {
      name: repo.name,
      path: repo.path,
      kind: repo.kind,
      state: "blocked",
      error: error.message,
    };
  }
});

const totals = results.reduce((acc, result) => {
  acc.repositories += 1;
  if (result.state === "audited") {
    acc.audited += 1;
    acc.scanned += result.audit.totals.scanned;
    acc.complete += result.audit.totals.complete;
    acc.needs_review += result.audit.totals.needs_review;
  } else acc.blocked += 1;
  return acc;
}, { repositories: 0, audited: 0, blocked: 0, scanned: 0, complete: 0, needs_review: 0 });

const priority = results.flatMap((result) => result.state === "audited"
  ? result.priority.map((item) => ({ repository: result.name, kind: result.kind, read_priority: result.read_priority, ...item }))
  : []).sort((a, b) => a.score - b.score || a.repository.localeCompare(b.repository) || a.path.localeCompare(b.path));

console.log(JSON.stringify({
  schema: "cogentia.corpus-metadata-audit.v1",
  generated_at: new Date().toISOString(),
  registry: registryPath.replaceAll("\\", "/"),
  read_only: true,
  totals,
  priority,
  repositories: results,
}, null, 2));
