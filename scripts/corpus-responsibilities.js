#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

export const RESPONSIBILITY_SCHEMA = "cogentia.responsibility-claims.v1";
export const RELATIONS = new Set([
  "defines",
  "implements",
  "operates",
  "experiments",
  "projects",
  "consumes",
  "depends_on",
  "must_not_duplicate",
]);

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", ".cache", ".next", "coverage",
  ".turbo", ".venv", "venv", ".cogentia",
]);

export function loadResponsibilityFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = yaml.load(raw) || {};
  const errors = [];
  if (parsed.schema !== RESPONSIBILITY_SCHEMA) {
    errors.push(`unsupported schema: ${parsed.schema || "missing"}`);
  }
  if (!Array.isArray(parsed.claims)) errors.push("claims must be an array");
  const claims = Array.isArray(parsed.claims) ? parsed.claims.map((claim, index) => ({
    ...claim,
    _source_file: file,
    _index: index,
  })) : [];
  for (const claim of claims) {
    if (!claim.subject) errors.push(`claim[${claim._index}] missing subject`);
    if (!claim.relation) errors.push(`claim[${claim._index}] missing relation`);
    if (!claim.repo) errors.push(`claim[${claim._index}] missing repo`);
    if (claim.relation && !RELATIONS.has(claim.relation)) {
      errors.push(`claim[${claim._index}] unknown relation: ${claim.relation}`);
    }
  }
  return { file, claims, errors };
}

export function discoverResponsibilityFiles(root) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(full);
      } else if (entry.isFile() && entry.name.endsWith(".responsibility.yaml")) {
        out.push(full);
      }
    }
  };
  visit(root);
  return out.sort();
}

export function buildResponsibilityGraph(root) {
  const files = discoverResponsibilityFiles(root);
  const loaded = files.map(loadResponsibilityFile);
  const claims = loaded.flatMap(x => x.claims);
  const errors = loaded.flatMap(x => x.errors.map(error => ({ file: x.file, error })));
  return { schema: RESPONSIBILITY_SCHEMA, root, files, claims, errors };
}

export function routeResponsibility(graph, subject, relation) {
  const matches = graph.claims.filter(claim => claim.subject === subject && claim.relation === relation);
  if (matches.length === 0) return { ok: false, status: "not_found", subject, relation, matches: [] };
  const destinations = new Map();
  for (const claim of matches) {
    const key = `${claim.repo}:${claim.path || ""}`;
    if (!destinations.has(key)) destinations.set(key, claim);
  }
  const unique = [...destinations.values()];
  if (unique.length > 1) return { ok: false, status: "ambiguous", subject, relation, matches: unique };
  return { ok: true, status: "resolved", subject, relation, match: unique[0], matches };
}

export function checkResponsibilityGraph(graph) {
  const issues = [...graph.errors];
  const groups = new Map();
  for (const claim of graph.claims) {
    if (!claim.subject || !claim.relation || !claim.repo) continue;
    const key = `${claim.subject}\u0000${claim.relation}`;
    const arr = groups.get(key) || [];
    arr.push(claim);
    groups.set(key, arr);
  }
  for (const [key, claims] of groups) {
    const positive = claims.filter(c => c.relation !== "must_not_duplicate");
    const destinations = new Set(positive.map(c => `${c.repo}:${c.path || ""}`));
    if (destinations.size > 1) {
      issues.push({
        type: "ambiguous_responsibility",
        key: key.replace("\u0000", "/"),
        destinations: [...destinations],
      });
    }
  }
  return { ok: issues.length === 0, claim_count: graph.claims.length, file_count: graph.files.length, issues };
}

function gitTimestamp(repoDir, args) {
  try {
    const text = execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const n = Number(text);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function repoFreshness(repoDir) {
  const researchDir = path.join(repoDir, "research");
  if (!fs.existsSync(researchDir)) return null;
  const latestResearch = gitTimestamp(repoDir, ["log", "-1", "--format=%ct", "--", "research"]);
  const views = ["research/index.md", "research/concepts.md"].map(rel => {
    const full = path.join(repoDir, rel);
    if (!fs.existsSync(full)) return { path: rel, exists: false, status: "absent", committed_at: null };
    const committedAt = gitTimestamp(repoDir, ["log", "-1", "--format=%ct", "--", rel]);
    let status = "unknown";
    if (latestResearch && committedAt) status = committedAt >= latestResearch ? "fresh" : "stale";
    return { path: rel, exists: true, status, committed_at: committedAt };
  });
  return {
    repo: path.basename(repoDir),
    latest_research_commit_at: latestResearch,
    views,
  };
}

export function corpusFreshness(root) {
  const reports = [];
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch {}
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    const report = repoFreshness(path.join(root, entry.name));
    if (report) reports.push(report);
  }
  return reports.sort((a, b) => a.repo.localeCompare(b.repo));
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || "check";
  const values = {};
  while (args.length) {
    const token = args.shift();
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    values[key] = args.length && !args[0].startsWith("--") ? args.shift() : true;
  }
  return { command, values };
}

function defaultRoot() {
  return path.resolve(process.env.COGENTIA_CORPUS_ROOT || path.join(process.cwd(), ".."));
}

function cleanClaim(claim, root) {
  return {
    subject: claim.subject,
    relation: claim.relation,
    repo: claim.repo,
    path: claim.path || null,
    scope: claim.scope || null,
    confidence: claim.confidence || null,
    evidence: claim.evidence || [],
    note: claim.note || null,
    source_file: path.relative(root, claim._source_file).replaceAll("\\", "/"),
  };
}

function main() {
  const { command, values } = parseArgs(process.argv.slice(2));
  const root = path.resolve(String(values.root || defaultRoot()));
  if (command === "freshness") {
    const repos = corpusFreshness(root);
    console.log(JSON.stringify({ ok: true, root, repos }, null, 2));
    return;
  }
  const graph = buildResponsibilityGraph(root);
  if (command === "list") {
    console.log(JSON.stringify({
      ok: graph.errors.length === 0,
      schema: graph.schema,
      root,
      claims: graph.claims.map(c => cleanClaim(c, root)),
      errors: graph.errors,
    }, null, 2));
    return;
  }
  if (command === "check") {
    const result = checkResponsibilityGraph(graph);
    console.log(JSON.stringify({ ...result, root }, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }
  if (command === "route") {
    const subject = String(values.subject || "");
    const relation = String(values.relation || "");
    if (!subject || !relation) throw new Error("route requires --subject <id> --relation <relation>");
    const result = routeResponsibility(graph, subject, relation);
    const clean = {
      ...result,
      match: result.match ? cleanClaim(result.match, root) : undefined,
      matches: (result.matches || []).map(c => cleanClaim(c, root)),
    };
    console.log(JSON.stringify(clean, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }
  throw new Error(`Unknown command: ${command}. Use list, check, route, freshness.`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, m => m.slice(1)));
if (invoked) {
  try { main(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  }
}
