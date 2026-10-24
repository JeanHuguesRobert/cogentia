#!/usr/bin/env node
// Read Git state and preserve recovery material. Never reset, stash, clean,
// apply, commit, fetch or delete anything in a source checkout.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";

const args = process.argv.slice(2);
function option(name) {
  const at = args.indexOf(name);
  return at < 0 ? null : args[at + 1];
}
const root = path.resolve(option("--root") || "C:/tweesic");
const output = option("--output");
if (!output) throw new Error("Usage: inventory-workspace-reconciliation.mjs --root <workspace> --output <new-recovery-directory>");
const destination = path.resolve(output);
const key = (value) => path.resolve(value).replaceAll("\\", "/").toLowerCase();
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const exists = async (target) => fs.access(target).then(() => true, () => false);
if (await exists(destination)) throw new Error("Recovery directory already exists; choose a new snapshot directory");
if (key(destination) === key(root)) throw new Error("Recovery directory must not be the workspace root");

function git(repo, commands, binary = false) {
  return new Promise((resolve) => execFile("git", ["--no-optional-locks", "-c", "core.quotepath=false", "-C", repo, ...commands], {
    encoding: binary ? "buffer" : "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 60000,
  }, (error, stdout, stderr) => resolve({ ok: !error, data: stdout, error: error ? String(stderr || error.message).trim() : null })));
}
const entries = await fs.readdir(root, { withFileTypes: true });
const roots = [];
if (await exists(path.join(root, ".git"))) roots.push(root);
for (const entry of entries) {
  const repo = path.join(root, entry.name);
  if (entry.isDirectory() && await exists(path.join(repo, ".git"))) roots.push(repo);
}
const discovered = new Map(roots.map((repo) => [key(repo), repo]));
const discoveryErrors = [];
for (const repo of roots) {
  const result = await git(repo, ["worktree", "list", "--porcelain"]);
  if (!result.ok) { discoveryErrors.push({ repo, error: result.error }); continue; }
  for (const line of result.data.split(/\r?\n/)) {
    if (!line.startsWith("worktree ")) continue;
    const candidate = path.resolve(line.slice(9));
    if (key(candidate).startsWith(`${key(root)}/`) && await exists(candidate)) discovered.set(key(candidate), candidate);
  }
}
const repositories = [...discovered.values()].sort((a, b) => key(a).localeCompare(key(b)));
for (const repo of repositories) {
  if (key(destination) === key(repo) || key(destination).startsWith(`${key(repo)}/`)) {
    throw new Error("Recovery output must be outside every discovered source checkout");
  }
}
await fs.mkdir(destination, { recursive: true });
const records = [];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < repositories.length) {
    const repo = repositories[cursor++];
    const id = hash(key(repo)).slice(0, 16);
    const commands = {
      head: ["rev-parse", "HEAD"],
      status: ["status", "--porcelain=v1", "--branch"],
      commonDirectory: ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      remotes: ["remote", "-v"],
      stash: ["stash", "list", "--format=%H%x09%gd%x09%cs%x09%s"],
      refs: ["for-each-ref", "--format=%(refname)%09%(objectname)%09%(upstream)", "refs/heads", "refs/remotes"],
      untracked: ["ls-files", "--others", "--exclude-standard", "-z"],
    };
    const results = Object.fromEntries(await Promise.all(Object.entries(commands).map(async ([name, command]) => [name, await git(repo, command)])));
    const record = { id, path: repo, observed_at: new Date().toISOString(),
      errors: Object.entries(results).filter(([, value]) => !value.ok).map(([operation, value]) => ({ operation, error: value.error })),
      head: results.head.data.trim(), status: results.status.data.trimEnd(),
      common_directory: results.commonDirectory.data.trim(), remotes: results.remotes.data.trim(),
      stashes: results.stash.data.trim().split(/\r?\n/).filter(Boolean), refs: results.refs.data.trim().split(/\r?\n/).filter(Boolean),
      untracked: results.untracked.data.split("\0").filter(Boolean), recovery_files: [], snapshot_consistent: false };
    const dirty = record.status.split(/\r?\n/).length > 1;
    if (dirty && results.status.ok && results.head.ok) {
      const dir = path.join(destination, id);
      await fs.mkdir(dir, { recursive: true });
      const staged = await git(repo, ["diff", "--cached", "--binary"], true);
      const unstaged = await git(repo, ["diff", "--binary"], true);
      const save = async (relative, data) => {
        const target = path.join(dir, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, data, { flag: "wx" });
        const reread = await fs.readFile(target);
        if (hash(reread) !== hash(data)) throw new Error("Recovery read-back mismatch");
        record.recovery_files.push({ path: `${id}/${relative.replaceAll("\\", "/")}`, bytes: data.length, sha256: hash(data) });
      };
      if (staged.ok) await save("staged.patch", staged.data);
      else record.errors.push({ operation: "staged_patch", error: staged.error });
      if (unstaged.ok) await save("unstaged.patch", unstaged.data);
      else record.errors.push({ operation: "unstaged_patch", error: unstaged.error });
      for (const relative of record.untracked) {
        const source = path.resolve(repo, relative);
        if (!key(source).startsWith(`${key(repo)}/`)) { record.errors.push({ operation: "untracked", file: relative, error: "outside_checkout" }); continue; }
        try {
          const before = await fs.lstat(source);
          if (!before.isFile() || before.size > 64 * 1024 * 1024) throw new Error("nonregular_or_over_64MiB");
          const body = await fs.readFile(source);
          await save(path.join("untracked", relative), body);
          const after = await fs.lstat(source);
          if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) throw new Error("source_changed_during_copy");
        } catch (error) { record.errors.push({ operation: "untracked", file: relative, error: error.message }); }
      }
      const [headAfter, statusAfter, stagedAfter, unstagedAfter] = await Promise.all([
        git(repo, commands.head), git(repo, commands.status),
        git(repo, ["diff", "--cached", "--binary"], true), git(repo, ["diff", "--binary"], true),
      ]);
      record.snapshot_consistent = !record.errors.length && headAfter.ok && statusAfter.ok && stagedAfter.ok && unstagedAfter.ok &&
        headAfter.data.trim() === record.head && statusAfter.data.trimEnd() === record.status &&
        stagedAfter.data.equals(staged.data) && unstagedAfter.data.equals(unstaged.data);
    } else record.snapshot_consistent = !record.errors.length;
    records.push(record);
  }
}));
records.sort((a, b) => key(a.path).localeCompare(key(b.path)));
const common = new Map();
for (const record of records) common.set(key(record.common_directory || record.path), record.stashes);
const report = { schema: "workspace-reconciliation.snapshot/v1", workspace: root,
  observed_at: new Date().toISOString(), locality: "workstation-only recovery evidence; not for public upload",
  coverage: "immediate child Git checkouts and their registered worktrees inside the workspace",
  discovery_errors: discoveryErrors, total_worktrees: records.length,
  dirty_worktrees: records.filter((r) => r.status.split(/\r?\n/).length > 1).length,
  unique_stashes: [...common.values()].reduce((total, stashes) => total + stashes.length, 0), repositories: records };
const json = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(destination, "inventory.json"), json, { flag: "wx" });
if (hash(await fs.readFile(path.join(destination, "inventory.json"))) !== hash(json)) throw new Error("Inventory read-back mismatch");
console.log(JSON.stringify({ snapshot: destination, inventory_sha256: hash(json), worktrees: report.total_worktrees,
  dirty_worktrees: report.dirty_worktrees, stashes: report.unique_stashes,
  inconsistent_or_failed: records.filter((r) => !r.snapshot_consistent).map((r) => ({ path: r.path, errors: r.errors })),
  discovery_errors: discoveryErrors }, null, 2));
