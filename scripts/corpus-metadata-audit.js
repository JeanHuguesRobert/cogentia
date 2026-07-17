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
    return { name: repo.name, path: repo.path, kind: repo.kind, state: "audited", audit };
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

console.log(JSON.stringify({
  schema: "cogentia.corpus-metadata-audit.v1",
  generated_at: new Date().toISOString(),
  registry: registryPath.replaceAll("\\", "/"),
  read_only: true,
  totals,
  repositories: results,
}, null, 2));
