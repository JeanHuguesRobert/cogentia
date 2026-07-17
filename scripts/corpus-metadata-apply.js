#!/usr/bin/env node

// Guarded cross-repository metadata application. Preview is the default.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, (m) => m.slice(1));
const planner = path.join(here, "metadata-plan.js");
const applier = path.join(here, "metadata-apply.js");
const registryArg = process.argv.find((value) => value.startsWith("--registry="));
const entriesOnly = process.argv.includes("--entries");
const apply = process.argv.includes("--apply");
const registryPath = path.resolve(registryArg ? registryArg.slice(11) : (process.env.COGENTIA_REGISTRY || "../JeanHuguesRobert/.cogentia.json"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const root = path.dirname(registryPath);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-metadata-"));
const repositories = [];
for (const repo of registry.repos || []) {
  const cwd = path.resolve(root, repo.path);
  try {
    const plan = JSON.parse(execFileSync(process.execPath, [planner, "--json"], { cwd, encoding: "utf8" }));
    if (entriesOnly) plan.plans = plan.plans.filter((item) => ["readme.md", "index.md", "concepts.md"].includes(path.basename(item.path).toLowerCase()));
    const planPath = path.join(tempRoot, `${repo.name.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
    fs.writeFileSync(planPath, JSON.stringify(plan), "utf8");
    const args = [applier, "--plan", planPath, "--json"];
    if (apply) args.push("--apply");
    repositories.push({ name: repo.name, path: repo.path, state: "processed", result: JSON.parse(execFileSync(process.execPath, args, { cwd, encoding: "utf8" })) });
  } catch (error) { repositories.push({ name: repo.name, path: repo.path, state: "blocked", error: error.message }); }
}
console.log(JSON.stringify({ schema: "cogentia.corpus-metadata-apply.v1", generated_at: new Date().toISOString(), registry: registryPath.replaceAll("\\", "/"), applied: apply, read_only: !apply, repositories }, null, 2));
