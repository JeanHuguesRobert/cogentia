#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const registryPath = process.env.COGENTIA_REGISTRY || process.argv[2] || ".cogentia.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const registryRoot = path.dirname(path.resolve(registryPath));
const skip = new Set([".git", "node_modules", "dist", "build", ".cache", ".next", "coverage"]);
const names = new Set(["agents.md", "claude.md", "instructions.md", ".ai-rules.md", ".rules.md", ".cursorrules", ".windsurfrules", ".clinerules", "copilot-instructions.md"]);
const promptPath = /(^|[\\/])(prompts?|\.agents)([\\/]|$)|(?:^|[-_])prompt(?:[-_.]|$)/i;
const canonicalSharedUrl = "https://github.com/JeanHuguesRobert/cogentia/blob/main/instructions/AGENTS.shared.md";

function frontmatter(text) {
  const match = String(text || "").match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!match) return {};
  return Object.fromEntries(match[1]
    .split(/\r?\n/)
    .map(line => line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, "")]));
}

function walk(root, current, found) {
  if (!fs.existsSync(current) || skip.has(path.basename(current))) return;
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, full, found);
    else if (entry.isFile()) {
      const relative = path.relative(root, full).replace(/\\/g, "/");
      if (names.has(entry.name.toLowerCase()) || promptPath.test(relative)) found.push({ full, relative });
    }
  }
}

const entries = [];
const issues = [];
const cogentiaRepo = (registry.repos || []).find(repo => repo.name === "cogentia");
const cogentiaRoot = cogentiaRepo ? path.resolve(registryRoot, cogentiaRepo.path) : null;
const shared = cogentiaRoot ? path.join(cogentiaRoot, "instructions", "AGENTS.shared.md") : null;
if (!shared || !fs.existsSync(shared)) {
  issues.push({ type: "missing_shared_source", repo: "cogentia", path: "instructions/AGENTS.shared.md" });
}
const publicReadonly = cogentiaRoot
  ? path.join(cogentiaRoot, "instructions", "AGENTS.public-readonly.md")
  : null;
if (!publicReadonly || !fs.existsSync(publicReadonly)) {
  issues.push({
    type: "missing_public_readonly_constitution",
    repo: "cogentia",
    path: "instructions/AGENTS.public-readonly.md",
    note: "Answer surfaces (Guide/WhatsApp) inject this derived file; run: node scripts/cogentia.js agent public-readonly verify",
  });
} else {
  const publicText = fs.readFileSync(publicReadonly, "utf8");
  if (!/registre-mariani|secret/i.test(publicText)) {
    issues.push({
      type: "public_readonly_missing_privacy_boundary",
      repo: "cogentia",
      path: "instructions/AGENTS.public-readonly.md",
    });
  }
  entries.push({
    repo: "cogentia",
    path: "instructions/AGENTS.public-readonly.md",
    kind: "public_readonly_constitution",
    shared_reference: true,
    shared_instructions: canonicalSharedUrl,
  });
}

for (const repo of registry.repos || []) {
  const root = path.resolve(registryRoot, repo.path);
  if (!fs.existsSync(root)) {
    issues.push({ type: "repository_unavailable", repo: repo.name });
    continue;
  }
  if (!fs.existsSync(path.join(root, "AGENTS.md"))) {
    issues.push({ type: "missing_local_mandate", repo: repo.name, path: "AGENTS.md" });
  }
  const found = [];
  walk(root, root, found);
  for (const item of found) {
    const text = fs.readFileSync(item.full, "utf8");
    const metadata = frontmatter(text);
    const kind = path.basename(item.full).toLowerCase() === "agents.md"
      ? "local_mandate" : promptPath.test(item.relative) ? "prompt_contract" : "tool_or_runtime_instruction";
    const declaredShared = metadata.shared_instructions || null;
    const localShared = declaredShared && !/^https?:\/\//.test(declaredShared)
      ? path.resolve(path.dirname(item.full), declaredShared)
      : null;
    const shared_reference = declaredShared === canonicalSharedUrl || localShared === shared;
    entries.push({
      repo: repo.name,
      path: item.relative,
      kind,
      shared_reference,
      shared_instructions: declaredShared,
    });
    if (kind === "local_mandate" && repo.name !== "cogentia" && !shared_reference) {
      issues.push({ type: "missing_explicit_shared_reference", repo: repo.name, path: item.relative });
    }
  }
}

const by_kind = Object.fromEntries(["local_mandate", "prompt_contract", "tool_or_runtime_instruction"].map(kind => [kind, entries.filter(x => x.kind === kind).length]));
console.log(JSON.stringify({ ok: issues.length === 0, shared_source: { path: shared, canonical_url: canonicalSharedUrl }, summary: { total: entries.length, by_kind }, entries, issues }, null, 2));
process.exitCode = issues.length ? 1 : 0;
