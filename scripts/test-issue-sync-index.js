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
  "  echo [{\"number\":18,\"title\":\"Recent progress on issue indexing\",\"state\":\"OPEN\",\"updatedAt\":\"2026-07-18T10:00:00Z\",\"closedAt\":null,\"url\":\"https://github.com/JeanHuguesRobert/demo/issues/18\",\"labels\":[{\"name\":\"index\"}],\"author\":{\"login\":\"JeanHuguesRobert\"}}]",
  "  exit /b 0",
  ")",
  "if \"%~1\"==\"issue\" if /I \"%~2\"==\"view\" (",
  "  echo {\"number\":18,\"title\":\"Recent progress on issue indexing\",\"state\":\"OPEN\",\"updatedAt\":\"2026-07-18T10:00:00Z\",\"closedAt\":null,\"url\":\"https://github.com/JeanHuguesRobert/demo/issues/18\",\"labels\":[{\"name\":\"index\"}],\"author\":{\"login\":\"JeanHuguesRobert\"},\"body\":\"## Target documents\\n\\n- `README.md`\\n\\n## Agent-resumable next step\\n\\nCheck recent progress on issue indexing.\",\"comments\":[{\"author\":{\"login\":\"JeanHuguesRobert\"},\"createdAt\":\"2026-07-18T10:05:00Z\",\"body\":\"Recent progress: issue packets should be indexed as markdown.\"}]}",
  "  exit /b 0",
  ")",
  "echo []",
].join("\r\n"), "utf8");

const env = {
  ...process.env,
  COGENTIA_REGISTRY: path.join(tempRoot, ".cogentia.json"),
  COGENTIA_GH_EXEC: JSON.stringify(["C:\\Windows\\System32\\cmd.exe", "/d", "/s", "/c", ghScript]),
};

const issuePacket = path.join(repoPath, ".cogentia", "issues", "JeanHuguesRobert-demo", "issue-00018.md");
assert.ok(!fs.existsSync(issuePacket), issuePacket);

const update = await run("scripts/cogentia.js", ["index", "update", "--json"], env, root);
assert.equal(update.status, 0, JSON.stringify({
  status: update.status,
  signal: update.signal,
  error: update.error ? { message: update.error.message, code: update.error.code, errno: update.error.errno, syscall: update.error.syscall, path: update.error.path } : null,
  stdout: update.stdout,
  stderr: update.stderr,
}, null, 2));
const updateJson = JSON.parse(update.stdout);
assert.equal(updateJson.ok, true, update.stdout);
assert.ok(updateJson.issue_packets?.written >= 1, update.stdout);

assert.ok(fs.existsSync(issuePacket), issuePacket);
const packetText = fs.readFileSync(issuePacket, "utf8");
assert.match(packetText, /source_kind:\s+"issue"/);
assert.match(packetText, /Recent progress: issue packets should be indexed as markdown/);

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
  update_issue_packets: updateJson.issue_packets?.written || 0,
  update_documents: updateJson.documents,
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
