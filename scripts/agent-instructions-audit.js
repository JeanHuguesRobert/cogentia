#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const registryPath = process.env.COGENTIA_REGISTRY || process.argv[2] || ".cogentia.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const registryRoot = path.dirname(path.resolve(registryPath));
const skip = new Set([".git", "node_modules", "dist", "build", ".cache", ".next", "coverage"]);
const names = new Set(["agents.md", "claude.md", "instructions.md", ".ai-rules.md", ".rules.md", ".cursorrules", ".windsurfrules", ".clinerules", "copilot-instructions.md"]);
const promptPath = /(^|\\/)(prompts?|\\.agents)(\\/|$)|(?:^|[-_])prompt(?:[-_.]|$)/i;

function walk(root, found) {
  if (!fs.existsSync(root) || skip.has(path.basename(root))) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.isFile()) {
      const relative = path.relative(rootStart, full).replace(/\\\\/g, "/");
      if (names.has(entry.name.toLowerCase()) || promptPath.test(relative)) found.push({ full, relative });
    }
  }
}

const entries = [];
const issues = [];
for (const repo of registry.repos || []) {
  const rootStart = path.resolve(registryRoot, repo.path);
  if (!fs.existsSync(rootStart)) {
    issues.push({ type: "repository_unavailable", repo: repo.name });
    continue;
  }
  const local = path.join(rootStart, "AGENTS.md");
  if (!fs.existsSync(local)) issues.push({ type: "missing_local_mandate", repo: repo.name, path: "AGENTS.md" });
  const found = [];
  walk(rootStart, found);
  for (const item of found) {
    const text = fs.readFileSync(item.full, "utf8");
    const kind = path.basename(item.full).toLowerCase() === "agents.md"
      ? "local_mandate" : promptPath.test(item.relative) ? "prompt_contract" : "tool_or_runtime_instruction";
    const shared_reference = /AGENTS\\.shared\\.md|shared agent instructions|shared baseline/i.test(text);
    entries.push({ repo: repo.name, path: item.relative, kind, shared_reference });
    if (kind === "local_mandate" && repo.name !== "cogentia" && !shared_reference) {
      issues.push({ type: "missing_shared_reference", repo: repo.name, path: item.relative });
    }
  }
}

const shared = path.resolve(registryRoot, "cogentia/instructions/AGENTS.shared.md");
if (!fs.existsSync(shared)) issues.push({ type: "missing_shared_source", repo: "cogentia", path: "instructions/AGENTS.shared.md" });
const by_kind = Object.fromEntries(["local_mandate", "prompt_contract", "tool_or_runtime_instruction"].map(kind => [kind, entries.filter(x => x.kind === kind).length]));
const result = { ok: issues.length === 0, shared_source: shared, summary: { total: entries.length, by_kind }, entries, issues };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ok ? 0 : 1;
