#!/usr/bin/env node
/**
 * Regression fixture for concepts.list/check/graph/status/ref as v3 modules
 * (#80/#108 human-UX vs agent-UX parity follow-on).
 *
 * Two things to prove:
 * - the daemon routes (/api/cli/concepts/*) and their new view-filtering
 *   (loadVisibleConcepts) actually exclude a private repo's concepts by
 *   default -- these previously called loadConcepts(ctx) completely
 *   unfiltered (same class of bug as corpus.locate's, see
 *   test-privacy-gate.js), and were only reachable at all with an admin
 *   token; now they're public routes so the filter is load-bearing.
 * - at least one of the five is reachable through the MCP tool, not just
 *   the daemon HTTP route directly, proving genuine agent-UX parity.
 */
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "scripts", "cogentia.js");

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL - ${name}`);
    console.error(err.message || err);
  }
}

function run(args, { env: extraEnv = {} } = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return { ...result, json };
}

function freshRegistry() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-concepts-agent-ux-"));
  const publicRepoDir = path.join(scratchRoot, "public-repo");
  const privateRepoDir = path.join(scratchRoot, "private-repo");
  fs.mkdirSync(path.join(publicRepoDir, "research"), { recursive: true });
  fs.mkdirSync(path.join(privateRepoDir, "research"), { recursive: true });

  fs.writeFileSync(
    path.join(publicRepoDir, "research", "concepts.md"),
    ["---", "title: Concept Index", "document_role: index", "---", "", "# Concept Index", "", "## Public Widget", "", "**Status:** stable", ""].join("\n")
  );
  fs.writeFileSync(
    path.join(privateRepoDir, "research", "concepts.md"),
    ["---", "title: Concept Index", "document_role: index", "---", "", "# Concept Index", "", "## Secret Widget", "", "**Status:** stable", ""].join("\n")
  );

  const registryPath = path.join(scratchRoot, ".cogentia.json");
  fs.writeFileSync(
    registryPath,
    JSON.stringify(
      {
        repos: [
          { name: "public-repo", path: "./public-repo", branch: "main" },
          { name: "private-repo", path: "./private-repo", branch: "main" },
        ],
        policies: { "private-repo": { visibility: "private" } },
      },
      null,
      2
    )
  );
  return { scratchRoot, registryPath, env: { COGENTIA_REGISTRY: registryPath } };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function rmScratchSafely(dir) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

async function runMcp(base, messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/cogentia-mcp.js"], {
      cwd: root,
      env: { ...process.env, COGENTIA_DAEMON_URL: base, COGENTIA_MCP_VIEW: "public", COGENTIA_MCP_TIMEOUT_MS: "60000" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`MCP exited ${code}: ${stderr}`));
      resolve(stdout.trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)));
    });
    child.stdin.end(`${messages.map((m) => JSON.stringify(m)).join("\n")}\n`);
  });
}

{
  const { scratchRoot, env } = freshRegistry();
  await checkAsync("concepts.* daemon routes exclude a private repo's concepts by default, and cogentia_concepts_list is reachable via MCP", async () => {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let daemonLog = "";
    daemon.stdout.on("data", (c) => { daemonLog += c; });
    daemon.stderr.on("data", (c) => { daemonLog += c; });

    try {
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          const r = await fetch(`${base}/api/context/health`);
          if (r.ok) break;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (attempt === 49) throw new Error(`Daemon did not start: ${daemonLog}`);
      }

      const list = await (await fetch(`${base}/api/cli/concepts/list?repo=all`)).json();
      assert.equal(list.ok, true);
      assert.equal(list.view, "public");
      const repoNames = list.repos.map((r) => r.repo);
      assert.ok(repoNames.includes("public-repo"));
      assert.ok(!repoNames.includes("private-repo"), "private-repo must not appear in the default-view concepts list");
      const privateEntry = list.repos.find((r) => r.repo === "private-repo");
      assert.equal(privateEntry, undefined);

      const graph = await (await fetch(`${base}/api/cli/concepts/graph?repo=all`)).json();
      assert.equal(graph.ok, true);
      assert.doesNotMatch(graph.mermaid, /Secret Widget/, "private-repo's concept must not appear in the public graph");

      const status = await (await fetch(`${base}/api/cli/concepts/status?repo=all`)).json();
      assert.equal(status.ok, true);
      assert.ok(!status.concepts.some((c) => c.repo === "private-repo"));

      const ref = await (await fetch(`${base}/api/cli/concepts/ref?name=${encodeURIComponent("Secret Widget")}`)).json();
      assert.equal(ref.ok, false, "resolving a private repo's concept name must fail under the default public view");

      const mcp = await runMcp(base, [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "cogentia_concepts_list", arguments: { repo: "all" } } },
      ]);
      const toolResult = mcp.find((m) => m.id === 2);
      assert.ok(toolResult && !toolResult.error, JSON.stringify(toolResult, null, 2));
      const structured = toolResult.result?.structuredContent || JSON.parse(toolResult.result.content[0].text);
      assert.equal(structured.data.ok, true);
      assert.ok(!structured.data.repos.map((r) => r.repo).includes("private-repo"));
    } finally {
      daemon.kill();
      await new Promise((resolve) => daemon.once("exit", resolve));
    }
  });
  await rmScratchSafely(scratchRoot);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
