#!/usr/bin/env node
/**
 * Regression fixture for concepts.init as the first WRITE v3 module
 * extended to authorized MCP callers (#80/#108, "one key, two lockers").
 *
 * Proves the daemon itself is the enforcement point now, not just MCP:
 * - an unauthorized POST to /api/ops/concepts/init is denied (403,
 *   tier_forbidden) and writes nothing;
 * - a loopback caller who asks for (and is granted) full view, on a daemon
 *   configured with COGENTIA_MCP_ALLOW_MUTATE=1, is allowed -- for both a
 *   public-visibility and a private-visibility target repo (the dynamic
 *   per-target locker resolution from concepts.init's governance.requires);
 * - the MCP tool cogentia_concepts_init round-trips through the daemon
 *   (proving daemonPost now forwards enough for the daemon's own
 *   invokeCapability governance check to pass, not just MCP's MUTATE_TOOLS
 *   gate) and actually writes files;
 * - an MCP caller with no mutate grant is refused by MCP itself, before
 *   ever reaching the daemon (defense in depth, both layers).
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

function freshRegistry() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-concepts-init-write-"));
  for (const name of ["public-repo", "private-repo", "another-public-repo"]) {
    fs.mkdirSync(path.join(scratchRoot, name), { recursive: true });
  }
  const registryPath = path.join(scratchRoot, ".cogentia.json");
  fs.writeFileSync(
    registryPath,
    JSON.stringify(
      {
        repos: [
          { name: "public-repo", path: "./public-repo", branch: "main" },
          { name: "private-repo", path: "./private-repo", branch: "main" },
          { name: "another-public-repo", path: "./another-public-repo", branch: "main" },
        ],
        policies: { "private-repo": { visibility: "private" } },
      },
      null,
      2
    )
  );
  return { scratchRoot, registryPath, env: { COGENTIA_REGISTRY: registryPath } };
}

function conceptsPath(scratchRoot, repo) {
  return path.join(scratchRoot, repo, "research", "concepts.md");
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

async function runMcp(mcpEnv, messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/cogentia-mcp.js"], {
      cwd: root,
      env: { ...process.env, ...mcpEnv },
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

const ADMIN_TOKEN = "test-admin-token-concepts-init";

{
  const { scratchRoot, env } = freshRegistry();
  await checkAsync("concepts.init write gate: denied without authorization, allowed with it, for both public and private targets, plus MCP round-trip", async () => {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: { ...process.env, ...env, COGENTIA_MCP_ALLOW_MUTATE: "1", COGENTIA_ADMIN_TOKEN: ADMIN_TOKEN },
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

      // A: unauthorized (no ?view=full, no admin token) -- denied, no write.
      const denied = await fetch(`${base}/api/ops/concepts/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: "public-repo" }),
      });
      const deniedBody = await denied.json();
      assert.equal(denied.status, 403, JSON.stringify(deniedBody));
      assert.equal(deniedBody.error, "tier_forbidden");
      assert.equal(fs.existsSync(conceptsPath(scratchRoot, "public-repo")), false, "denied call must not write anything");

      // B: authorized (loopback + ?view=full, daemon has COGENTIA_MCP_ALLOW_MUTATE=1) -- public target.
      const okPublic = await fetch(`${base}/api/ops/concepts/init?view=full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: "public-repo" }),
      });
      const okPublicBody = await okPublic.json();
      assert.equal(okPublic.status, 200, JSON.stringify(okPublicBody));
      assert.equal(fs.existsSync(conceptsPath(scratchRoot, "public-repo")), true);
      assert.match(fs.readFileSync(conceptsPath(scratchRoot, "public-repo"), "utf8"), /^visibility: public$/m);

      // C: same authorization, private-visibility target -- also allowed
      // (admin's grant covers both lockers; the dynamic requirement
      // resolved "private" for this repo and the grant satisfies it).
      const okPrivate = await fetch(`${base}/api/ops/concepts/init?view=full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: "private-repo" }),
      });
      const okPrivateBody = await okPrivate.json();
      assert.equal(okPrivate.status, 200, JSON.stringify(okPrivateBody));
      assert.equal(fs.existsSync(conceptsPath(scratchRoot, "private-repo")), true);
      assert.match(fs.readFileSync(conceptsPath(scratchRoot, "private-repo"), "utf8"), /^visibility: private$/m);

      // D: MCP round-trip, admin-authenticated -- proves daemonPost now
      // forwards enough (?view=full + Authorization) for the daemon's own
      // governance check to pass, not just MCP's own MUTATE_TOOLS gate.
      const mcpAdminEnv = {
        COGENTIA_DAEMON_URL: base,
        COGENTIA_MCP_VIEW: "full",
        COGENTIA_ADMIN_TOKEN: ADMIN_TOKEN,
        COGENTIA_MCP_ALLOW_MUTATE: "1",
      };
      const mcpOk = await runMcp(mcpAdminEnv, [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "cogentia_concepts_init", arguments: { repo: "another-public-repo" } } },
      ]);
      const mcpToolResult = mcpOk.find((m) => m.id === 2);
      assert.ok(mcpToolResult && !mcpToolResult.error, JSON.stringify(mcpToolResult, null, 2));
      assert.equal(fs.existsSync(conceptsPath(scratchRoot, "another-public-repo")), true, "MCP-driven write must actually reach disk");

      // E: MCP without any mutate grant -- refused by MCP itself, before
      // the daemon is even involved (defense in depth).
      const mcpDenied = await runMcp({ COGENTIA_DAEMON_URL: base, COGENTIA_MCP_VIEW: "public" }, [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "cogentia_concepts_init", arguments: { repo: "public-repo" } } },
      ]);
      const deniedResult = mcpDenied.find((m) => m.id === 2);
      assert.equal(deniedResult?.result?.isError, true, "an unauthorized MCP caller must be refused, not silently allowed");
      assert.equal(deniedResult?.result?.structuredContent?.error_class, "tier_forbidden");
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
