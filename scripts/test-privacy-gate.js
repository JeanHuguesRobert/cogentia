#!/usr/bin/env node
/**
 * Regression fixture for two privacy bugs found while auditing human-UX vs
 * agent-UX parity (#80/#108 follow-on):
 *
 * 1. /api/context/guide-resolve trusted a client-supplied ?view= query
 *    param instead of clamping to the daemon's auth-resolved view, letting
 *    an anonymous caller request view=private and see non-secret
 *    private/internal/confidential repo documents with zero authentication.
 *    Fixed via resolveEffectiveView(daemonView, requestedView).
 *
 * 2. runCorpusLocate's guide_resolve and concept_registry branches did not
 *    filter by visibility at all (unlike its full-text-search branch, which
 *    was already safe via the precomputed searchable_public column). Fixed
 *    by threading a `view` argument through to visibleDocs() and a
 *    repo-filtered loadConcepts().
 *
 * Also covers: concepts init no longer hardcodes visibility: public into
 * research/index.md / research/concepts.md skeletons -- a private repo's
 * own init'd files must inherit that repo's visibility.
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
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-privacy-test-"));
  const publicRepoDir = path.join(scratchRoot, "public-repo");
  const privateRepoDir = path.join(scratchRoot, "private-repo");
  fs.mkdirSync(path.join(publicRepoDir, "research"), { recursive: true });
  fs.mkdirSync(path.join(privateRepoDir, "research"), { recursive: true });

  fs.writeFileSync(path.join(publicRepoDir, "research", "index.md"), "---\ntitle: index\n---\n# Index\n");
  fs.writeFileSync(
    path.join(publicRepoDir, "research", "concepts.md"),
    ["---", "title: Concept Index", "document_role: index", "---", "", "# Concept Index", "", "## Public Widget", "", "**Status:** stable", ""].join("\n")
  );

  fs.writeFileSync(path.join(privateRepoDir, "research", "index.md"), "---\ntitle: index\n---\n# Index\n");
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
        policies: {
          "private-repo": { visibility: "private" },
        },
      },
      null,
      2
    )
  );
  return { scratchRoot, registryPath, env: { COGENTIA_REGISTRY: registryPath } };
}

// ---- corpus.locate: private concept must not leak under the default (public) view --
{
  const { scratchRoot, env } = freshRegistry();
  check("locate (default view) does not surface a private repo's concept", () => {
    const rebuild = run(["index", "rebuild", "--json"], { env });
    assert.equal(rebuild.status, 0, `index rebuild failed: ${rebuild.stderr}`);

    const r = run(["locate", "Secret Widget", "--json"], { env });
    assert.equal(r.status, 0, `locate failed: ${r.stderr}`);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.view, "public");
    assert.deepEqual(r.json.targets, [], "private-repo's concept must not appear under the default public view");
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

{
  const { scratchRoot, env } = freshRegistry();
  check("locate --view private surfaces the private repo's concept for an authorized (local) caller", () => {
    const rebuild = run(["index", "rebuild", "--json"], { env });
    assert.equal(rebuild.status, 0, `index rebuild failed: ${rebuild.stderr}`);

    const r = run(["locate", "Secret Widget", "--view", "private", "--json"], { env });
    assert.equal(r.status, 0, `locate failed: ${r.stderr}`);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.view, "private");
    const hit = r.json.targets.find((t) => t.repo === "private-repo" && t.authority === "concept_registry_definition");
    assert.ok(hit, "private-repo's concept should be visible under --view private (local/trusted caller)");
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

check("locate (default view) still surfaces the public repo's concept", () => {
  const { scratchRoot, env } = freshRegistry();
  try {
    const rebuild = run(["index", "rebuild", "--json"], { env });
    assert.equal(rebuild.status, 0, `index rebuild failed: ${rebuild.stderr}`);
    const r = run(["locate", "Public Widget", "--json"], { env });
    assert.equal(r.json.ok, true);
    const hit = r.json.targets.find((t) => t.repo === "public-repo" && t.authority === "concept_registry_definition");
    assert.ok(hit, "public-repo's concept must still be found under the default public view");
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
});

// ---- concepts init: skeleton visibility must follow the repo's own policy --
{
  const { scratchRoot, env } = freshRegistry();
  check("concepts init on a fresh private repo writes visibility: private into the skeleton, not public", () => {
    const anotherPrivateDir = path.join(scratchRoot, "another-private-repo");
    fs.mkdirSync(anotherPrivateDir, { recursive: true });
    const registryPath = path.join(scratchRoot, ".cogentia.json");
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    registry.repos.push({ name: "another-private-repo", path: "./another-private-repo", branch: "main" });
    registry.policies["another-private-repo"] = { visibility: "private" };
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

    const r = run(["concepts", "init", "another-private-repo", "--json"], { env });
    assert.equal(r.status, 0, `concepts init failed: ${r.stderr}`);
    const conceptsBody = fs.readFileSync(path.join(anotherPrivateDir, "research", "concepts.md"), "utf8");
    const indexBody = fs.readFileSync(path.join(anotherPrivateDir, "research", "index.md"), "utf8");
    assert.match(conceptsBody, /^visibility: private$/m, "concepts.md skeleton must inherit the repo's private visibility");
    assert.match(indexBody, /^visibility: private$/m, "index.md skeleton must inherit the repo's private visibility");
  });
  fs.rmSync(scratchRoot, { recursive: true, force: true });
}

// ---- daemon: anonymous caller cannot escalate view via the query string ---

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

{
  const { scratchRoot, env } = freshRegistry();
  await checkAsync("a daemon instance authorized only for public view cannot be escalated via ?view=private", async () => {
    const rebuild = run(["index", "rebuild", "--json"], { env });
    assert.equal(rebuild.status, 0, `index rebuild failed: ${rebuild.stderr}`);

    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    // COGENTIA_DAEMON_VIEW=public forces daemonRequestView() to return
    // "public" unconditionally, regardless of loopback/admin-token --
    // deterministically simulating "this daemon instance is authorized for
    // public view only" (e.g. a publicly-exposed instance, or one behind a
    // reverse proxy where every request looks loopback to daemonIsLoopback).
    // The bug: /api/context/guide-resolve's content filtering ignored this
    // outer, already-gated view and re-derived its own straight from the
    // query string, with no loopback/admin check of its own at all.
    const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: { ...process.env, ...env, COGENTIA_DAEMON_VIEW: "public" },
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

      const guideRes = await fetch(`${base}/api/context/guide-resolve?q=index&view=private`);
      const guideBody = await guideRes.json();
      assert.equal(guideBody.view, "public", "guide-resolve must clamp an anonymous caller's requested view to public");

      const locateRes = await fetch(`${base}/api/context/locate?subject=${encodeURIComponent("Secret Widget")}&view=private`);
      const locateBody = await locateRes.json();
      assert.equal(locateBody.ok, true);
      assert.equal(locateBody.view, "public", "locate must clamp an anonymous caller's requested view to public");
      assert.deepEqual(locateBody.targets, [], "private-repo's concept must not leak even when the query string asks for view=private");
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
