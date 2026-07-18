#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-issue-sync-"));
const repoPath = path.join(tempRoot, "demo");
fs.mkdirSync(repoPath, { recursive: true });
fs.writeFileSync(path.join(repoPath, "README.md"), [
  "---",
  "title: Demo repository",
  "author: test",
  "date: 2026-07-18",
  "---",
  "",
  "# Demo repository",
  "",
  "This repository exists only for issue indexing tests.",
].join("\n"), "utf8");
fs.writeFileSync(path.join(tempRoot, ".cogentia.json"), JSON.stringify({
  repos: [{ name: "demo", path: "./demo" }],
}, null, 2), "utf8");

const ghScript = path.join(tempRoot, "gh.cmd");
fs.writeFileSync(ghScript, [
  "@echo off",
  "setlocal",
  "if \"%~1\"==\"issue\" if /I \"%~2\"==\"list\" (",
  "  echo [{\"number\":18,\"title\":\"Recent progress on issue indexing\",\"state\":\"OPEN\",\"stateReason\":\"\",\"updatedAt\":\"2026-07-18T10:00:00Z\",\"closedAt\":null,\"url\":\"https://github.com/JeanHuguesRobert/demo/issues/18\",\"labels\":[{\"name\":\"index\"}],\"author\":{\"login\":\"JeanHuguesRobert\"}}]",
  "  exit /b 0",
  ")",
  "if \"%~1\"==\"issue\" if /I \"%~2\"==\"view\" (",
  "  echo {\"number\":18,\"title\":\"Recent progress on issue indexing\",\"state\":\"OPEN\",\"stateReason\":\"\",\"updatedAt\":\"2026-07-18T10:00:00Z\",\"closedAt\":null,\"url\":\"https://github.com/JeanHuguesRobert/demo/issues/18\",\"labels\":[{\"name\":\"index\"}],\"author\":{\"login\":\"JeanHuguesRobert\"},\"body\":\"## Target documents\\n\\n- `README.md`\\n\\n## Agent-resumable next step\\n\\nCheck recent progress on issue indexing.\",\"comments\":[{\"author\":{\"login\":\"JeanHuguesRobert\"},\"createdAt\":\"2026-07-18T10:05:00Z\",\"body\":\"Recent progress: issue packets should be indexed as markdown.\"}]}",
  "  exit /b 0",
  ")",
  "echo []",
].join("\r\n"), "utf8");

const env = {
  ...process.env,
  COGENTIA_REGISTRY: path.join(tempRoot, ".cogentia.json"),
  COGENTIA_GH_EXEC: JSON.stringify(["C:\\Windows\\System32\\cmd.exe", "/d", "/s", "/c", ghScript]),
};

const sync = await run("scripts/cogentia.js", ["issues", "sync", "demo", "--state", "open", "--limit", "1", "--json"], env, root);
assert.equal(sync.status, 0, JSON.stringify({
  status: sync.status,
  signal: sync.signal,
  error: sync.error ? { message: sync.error.message, code: sync.error.code, errno: sync.error.errno, syscall: sync.error.syscall, path: sync.error.path } : null,
  stdout: sync.stdout,
  stderr: sync.stderr,
}, null, 2));
const syncJson = JSON.parse(sync.stdout);
assert.equal(syncJson.ok, true, sync.stdout);

const issuePacket = path.join(repoPath, ".cogentia", "issues", "JeanHuguesRobert-demo", "issue-00018.md");
assert.ok(fs.existsSync(issuePacket), issuePacket);
const packetText = fs.readFileSync(issuePacket, "utf8");
assert.match(packetText, /source_kind:\s+"issue"/);
assert.match(packetText, /Recent progress: issue packets should be indexed as markdown/);

const rebuild = await run("scripts/cogentia.js", ["index", "rebuild", "--json"], env, root);
assert.equal(rebuild.status, 0, JSON.stringify({
  status: rebuild.status,
  signal: rebuild.signal,
  error: rebuild.error ? { message: rebuild.error.message, code: rebuild.error.code, errno: rebuild.error.errno, syscall: rebuild.error.syscall, path: rebuild.error.path } : null,
  stdout: rebuild.stdout,
  stderr: rebuild.stderr,
}, null, 2));
const rebuildJson = JSON.parse(rebuild.stdout);
assert.equal(rebuildJson.ok, true, rebuild.stdout);

const search = await run("scripts/cogentia.js", ["index", "search", "recent progress on issue indexing", "--limit", "5", "--json"], env, root);
assert.equal(search.status, 0, JSON.stringify({
  status: search.status,
  signal: search.signal,
  error: search.error ? { message: search.error.message, code: search.error.code, errno: search.error.errno, syscall: search.error.syscall, path: search.error.path } : null,
  stdout: search.stdout,
  stderr: search.stderr,
}, null, 2));
const searchJson = JSON.parse(search.stdout);
assert.equal(searchJson.ok, true, search.stdout);
assert.ok(searchJson.results.some(result => String(result.path || "").includes(".cogentia/issues/jeanhuguesrobert-demo/issue-00018.md")), search.stdout);

console.log(JSON.stringify({
  ok: true,
  sync_written: syncJson.written,
  rebuild_documents: rebuildJson.documents,
  search_results: searchJson.count,
}, null, 2));

function run(file, args, env, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, file), ...args], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({ status: code, signal, stdout, stderr, error: null });
    });
  });
}
