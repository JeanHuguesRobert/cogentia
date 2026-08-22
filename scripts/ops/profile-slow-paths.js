#!/usr/bin/env node
/**
 * One-shot phase timings for daemon slowness. Does not change production paths.
 * Mirrors loadContext git remotes + buildInventory inner loops + grep scan.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CONFIG = process.env.COGENTIA_REGISTRY || "C:\\tweesic\\JeanHuguesRobert\\.cogentia.json";
const SKIP = new Set([".git", "node_modules", ".turbo", "dist", "build", ".cache", ".next", ".vite", "coverage"]);
const t = () => Date.now();
const log = (step, extra = {}) => console.log(JSON.stringify({ step, ...extra }));

function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return "";
  }
}

function walkMd(dir, out) {
  if (!fs.existsSync(dir)) return;
  const base = path.basename(dir);
  if (SKIP.has(base)) return;
  if (base === ".cogentia") {
    walkMd(path.join(dir, "issues"), out);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, out);
    else if (entry.isFile() && /\.md$/i.test(entry.name)) out.push(full);
  }
}

const configPath = fs.statSync(CONFIG).isDirectory() ? path.join(CONFIG, ".cogentia.json") : CONFIG;
const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
const registryRoot = path.dirname(configPath);
const repos = (raw.repos || []).map((r) => ({
  name: r.name,
  path: path.isAbsolute(r.path) ? path.resolve(r.path) : path.resolve(registryRoot, r.path || "."),
  policyGithub: r.github || r.github_repo || raw.policies?.[r.name]?.github || raw.repo_policies?.[r.name]?.github || "",
}));

log("registry", { repos: repos.length, configPath });

let t0 = t();
const remotes = [];
for (const repo of repos) {
  const s = t();
  let remote = "";
  try {
    remote = execFileSync("git", ["-C", repo.path, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  } catch {
    remote = "";
  }
  remotes.push({ name: repo.name, ms: t() - s, has_policy_github: Boolean(repo.policyGithub), remote: remote ? "yes" : "no" });
}
log("loadContext_git_remotes", { ms: t() - t0, repos: remotes.length, slowest: remotes.sort((a, b) => b.ms - a.ms).slice(0, 5) });

t0 = t();
const filesByRepo = [];
let allFiles = [];
for (const repo of repos) {
  const s = t();
  const files = [];
  walkMd(repo.path, files);
  filesByRepo.push({ name: repo.name, files: files.length, ms: t() - s });
  allFiles = allFiles.concat(files.map((f) => ({ repo: repo.name, full: f, rel: path.relative(repo.path, f).replace(/\\/g, "/") })));
}
log("listMarkdown", { ms: t() - t0, files: allFiles.length, slowest_repos: filesByRepo.sort((a, b) => b.ms - a.ms).slice(0, 5) });

t0 = t();
const gitDate = [];
for (const repo of repos) {
  const s = t();
  const out = git(repo.path, ["log", "--date=short", "--format=@@@%cs%x09%s", "--name-only", "--", "*.md"]);
  gitDate.push({ name: repo.name, ms: t() - s, bytes: Buffer.byteLength(out) });
}
log("buildGitDateIndex", { ms: t() - t0, slowest: gitDate.sort((a, b) => b.ms - a.ms).slice(0, 8), total_bytes: gitDate.reduce((n, r) => n + r.bytes, 0) });

t0 = t();
let bytes = 0;
for (const file of allFiles) {
  const rawFile = fs.readFileSync(file.full, "utf8");
  bytes += Buffer.byteLength(rawFile);
}
log("first_pass_readFileSync", { ms: t() - t0, files: allFiles.length, bytes });

t0 = t();
const linkRe = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
let linkCount = 0;
for (const file of allFiles) {
  const rawFile = fs.readFileSync(file.full, "utf8");
  let m;
  const re = new RegExp(linkRe);
  while ((m = re.exec(rawFile))) linkCount++;
}
log("second_pass_read_and_links", { ms: t() - t0, files: allFiles.length, linkCount });

const target = allFiles.find((f) => f.repo === "cogentia" && f.rel === "research/cognitive_packets.md");
t0 = t();
const found = allFiles.find((f) => f.repo === "cogentia" && f.rel === "research/cognitive_packets.md");
const lookupMs = t() - t0;
t0 = t();
const text = found ? fs.readFileSync(found.full, "utf8") : "";
const lines = text.split(/\r?\n/).slice(0, 8);
log("resolve_and_read_one_doc", {
  ms_lookup: lookupMs,
  ms_read: t() - t0,
  found: Boolean(found),
  chars: text.length,
  preview_lines: lines.length,
});

const cogentiaFiles = allFiles.filter((f) => f.repo === "cogentia").sort((a, b) => a.rel.localeCompare(b.rel));
t0 = t();
const needle = "capability symmetry";
const matches = [];
let filesRead = 0;
for (const doc of cogentiaFiles) {
  filesRead++;
  const fileLines = fs.readFileSync(doc.full, "utf8").split(/\r?\n/);
  for (let i = 0; i < fileLines.length; i++) {
    if (!fileLines[i].toLowerCase().includes(needle)) continue;
    matches.push(`${doc.rel}:${i + 1}`);
    if (matches.length >= 5) break;
  }
  if (matches.length >= 5) break;
}
log("grep_scan_until_5_hits", { ms: t() - t0, filesRead, of: cogentiaFiles.length, matches });
