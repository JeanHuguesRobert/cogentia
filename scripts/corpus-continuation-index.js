#!/usr/bin/env node

// Read-only navigable index of unresolved metadata continuations.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, (m) => m.slice(1));
const planner = path.join(here, "metadata-plan.js");
const registryArg = process.argv.find((arg) => arg.startsWith("--registry="));
const registryPath = path.resolve(registryArg ? registryArg.slice(11) : (process.env.COGENTIA_REGISTRY || "../JeanHuguesRobert/.cogentia.json"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const root = path.dirname(registryPath);
const continuations = [];
for (const repo of registry.repos || []) {
  const cwd = path.resolve(root, repo.path);
  try {
    const report = JSON.parse(execFileSync(process.execPath, [planner, "--json"], { cwd, encoding: "utf8" }));
    for (const item of report.plans.filter((entry) => entry.action === "provenance-continuation")) {
      const basename = path.basename(item.path).toLowerCase();
      const entry = ["readme.md", "index.md", "concepts.md"].includes(basename);
      continuations.push({ repository: repo.name, repository_path: repo.path, read_priority: repo.navigation?.read_priority ?? 99, path: item.path, continuation_kind: item.continuation_kind, next_actor: item.next_actor, entry_document: entry, score: (repo.navigation?.read_priority ?? 99) * 100 + (entry ? 0 : 20) });
    }
  } catch (error) { continuations.push({ repository: repo.name, repository_path: repo.path, state: "blocked", error: error.message }); }
}
continuations.sort((a, b) => a.score - b.score || a.repository.localeCompare(b.repository) || a.path.localeCompare(b.path));
console.log(JSON.stringify({ schema: "cogentia.corpus-continuation-index.v1", generated_at: new Date().toISOString(), registry: registryPath.replaceAll("\\", "/"), read_only: true, totals: { continuations: continuations.filter((item) => !item.state).length, blocked: continuations.filter((item) => item.state === "blocked").length, entry_documents: continuations.filter((item) => item.entry_document).length }, continuations }, null, 2));
