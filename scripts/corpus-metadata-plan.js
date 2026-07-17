#!/usr/bin/env node

// Read-only aggregate metadata plan for every repository in the canonical registry.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, (m) => m.slice(1));
const planner = path.join(here, "metadata-plan.js");
const arg = process.argv.find((value) => value.startsWith("--registry="));
const registryPath = path.resolve(arg ? arg.slice(11) : (process.env.COGENTIA_REGISTRY || "../JeanHuguesRobert/.cogentia.json"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const root = path.dirname(registryPath);
const repositories = (registry.repos || []).map((repo) => {
  const cwd = path.resolve(root, repo.path);
  try {
    const plan = JSON.parse(execFileSync(process.execPath, [planner, "--json"], { cwd, encoding: "utf8" }));
    return { name: repo.name, path: repo.path, kind: repo.kind, state: "planned", totals: plan.totals, plans: plan.plans };
  } catch (error) {
    return { name: repo.name, path: repo.path, kind: repo.kind, state: "blocked", error: error.message };
  }
});
const totals = repositories.reduce((out, repo) => {
  out.repositories += 1;
  if (repo.state === "planned") {
    out.planned += 1;
    out.plans += repo.totals.plans;
    out.safe_metadata_plans += repo.totals.safe_metadata_plans;
    out.provenance_continuations += repo.totals.provenance_continuations;
  } else out.blocked += 1;
  return out;
}, { repositories: 0, planned: 0, blocked: 0, plans: 0, safe_metadata_plans: 0, provenance_continuations: 0 });
console.log(JSON.stringify({ schema: "cogentia.corpus-metadata-plan.v1", generated_at: new Date().toISOString(), registry: registryPath.replaceAll("\\", "/"), read_only: true, totals, repositories }, null, 2));
