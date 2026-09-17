#!/usr/bin/env node
/**
 * Deterministic tests for Cogentia #184 — Desktop Commander as a governed
 * host capability provider. Uses fake-dc-mcp.js, not the real upstream,
 * except where a test is explicitly labelled Reality.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpStdioClient } from "./lib/mcp-stdio-client.js";
import {
  DesktopCommanderProvider,
  fakeDesktopCommanderSpawn,
  HOST_CAPABILITY_MAP,
  discoverExtractedDesktopCommander,
  defaultDesktopCommanderSpawn,
} from "./lib/desktop-commander-provider.js";
import { createHostCapabilityRouter, ensureHostCapabilityModules } from "./lib/host-capability-router.js";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  buildHostFsWritePayload,
} from "./lib/side-effect-authorization.js";
import { createMcpCore, PRIVATE_READ_TOOLS, MUTATE_TOOLS } from "./lib/cogentia-mcp-core.js";
import { invokeCapability, registerModule } from "./lib/v3-modules.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fakeScript = path.join(root, "scripts", "fixtures", "fake-dc-mcp.js");

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL - ${name}`);
    console.error(err.stack || err.message || err);
  }
}

function fixtureDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-host-fs-"));
  fs.writeFileSync(path.join(dir, "hello.txt"), "hello-from-fixture\n", "utf8");
  fs.writeFileSync(path.join(dir, "note.md"), "search-token-xyz\n", "utf8");
  return dir;
}

function rmFixture(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Windows may briefly lock a cwd; leftover temp dirs are disposable.
  }
}

function fullAuth() {
  return {
    allowMutate: true,
    auth: "admin",
    actor: "admin",
    principal_ref: "principal:test",
    mandate_ref: "mandate:cogentia#184",
    lockers: {
      public: { read: true, write: true },
      private: { read: true, write: true },
    },
  };
}

function readAuth() {
  return {
    allowMutate: false,
    auth: "admin",
    actor: "admin",
    principal_ref: "principal:test",
    mandate_ref: "mandate:cogentia#184",
    lockers: {
      public: { read: true, write: false },
      private: { read: true, write: false },
    },
  };
}

async function withProvider(fn, extraEnv = {}) {
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    env: { ...process.env, ...extraEnv },
    timeoutMs: 8_000,
  });
  try {
    await fn(provider, dir);
  } finally {
    await provider.stop();
    rmFixture(dir);
  }
}

await check("extracted DC binary is preferred over npx", async () => {
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-npx-"));
  const index = path.join(
    cache,
    "_npx",
    "abc123",
    "node_modules",
    "@wonderwhy-er",
    "desktop-commander",
    "dist",
    "index.js"
  );
  fs.mkdirSync(path.dirname(index), { recursive: true });
  fs.writeFileSync(index, "export {}\n");
  try {
    const found = discoverExtractedDesktopCommander({ npm_config_cache: cache });
    assert.equal(found, index);
    const spawn = defaultDesktopCommanderSpawn({ npm_config_cache: cache });
    assert.equal(spawn.command, process.execPath);
    assert.equal(spawn.args[0], index);
    assert.equal(spawn.args[1], "--no-onboarding");
  } finally {
    rmFixture(cache);
  }
});

await check("provider lifecycle / clean shutdown", async () => {
  await withProvider(async (provider) => {
    const diag = await provider.start();
    assert.equal(diag.provider, "desktop-commander");
    assert.equal(diag.transport, "stdio");
    assert.ok(diag.tool_names.includes("list_directory"));
    await provider.stop();
    await provider.stop();
  });
});

await check("MCP initialization failure", async () => {
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    env: { ...process.env, FAKE_DC_FAIL_INIT: "1" },
    timeoutMs: 8_000,
  });
  await assert.rejects(() => provider.start(), (e) => e.error_class === "mcp_initialize_failed");
  await provider.stop();
});

await check("tools/list normalization", async () => {
  await withProvider(async (provider) => {
    await provider.start();
    const tools = provider.listNormalizedTools();
    assert.ok(tools.some((t) => t.name === "read_file" && t.inputSchema));
    assert.ok(tools.some((t) => t.name === "get_config"));
  });
});

await check("semantic capability → upstream tool mapping", async () => {
  assert.equal(HOST_CAPABILITY_MAP["host.fs.list"].upstream, "list_directory");
  assert.equal(HOST_CAPABILITY_MAP["host.fs.read"].upstream, "read_file");
  assert.equal(HOST_CAPABILITY_MAP["host.fs.search"].upstream, "start_search");
  await withProvider(async (provider, dir) => {
    await provider.start();
    const listed = await provider.invoke("host.fs.list", { path: dir });
    assert.equal(listed.upstream_tool, "list_directory");
    assert.match(listed.result_text, /hello\.txt/);
  });
});

await check("unknown/missing upstream tool fails clearly", async () => {
  await withProvider(async (provider) => {
    await provider.start();
    provider.tools = provider.tools.filter((t) => t.name !== "read_file");
    await assert.rejects(
      () => provider.invoke("host.fs.read", { path: "x" }),
      (e) => e.error_class === "unknown_upstream_tool"
    );
  });
});

await check("provider errors do not crash Cogentia", async () => {
  const client = new McpStdioClient({
    command: process.execPath,
    args: ["-e", "process.exit(1)"],
    timeoutMs: 3_000,
  });
  const provider = new DesktopCommanderProvider({ client });
  await assert.rejects(() => provider.start());
  assert.equal(typeof provider.diagnostics, "function");
});

await check("target/provider resolution is explicit", async () => {
  ensureHostCapabilityModules();
  registerModule({
    id: "host.mock",
    provider: "mock",
    provides: { capabilities: ["host.fs.list"] },
    run: () => ({ ok: true, provider: "mock", upstream_tool: "none" }),
  });
  const selected = await invokeCapability("host.fs.list", { capability: "host.fs.list", args: {} }, { provider: "mock" });
  assert.equal(selected.provider, "mock");
  await assert.rejects(
    () => invokeCapability("host.fs.list", {}, { provider: "does-not-exist" }),
    (e) => e.error_class === "provider_not_found"
  );
});

await check("read-only capability works against a fixture", async () => {
  const dir = fixtureDir();
  const callLog = path.join(dir, "calls.jsonl");
  const provider = new DesktopCommanderProvider({
    spawn: { command: process.execPath, args: [fakeScript] },
    env: { ...process.env, FAKE_DC_CALL_LOG: callLog },
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `read-${Date.now()}`,
    providerFactory: async () => provider,
  });
  try {
    const listed = await router.invoke("host.fs.list", { path: dir }, { auth: readAuth(), target: "node:test" });
    assert.match(listed.result_text, /hello\.txt/);
    const read = await router.invoke(
      "host.fs.read",
      { path: path.join(dir, "hello.txt") },
      { auth: readAuth(), target: "node:test" }
    );
    assert.match(read.result_text, /hello-from-fixture/);
    const search = await router.invoke(
      "host.fs.search",
      { path: dir, pattern: "search-token-xyz" },
      { auth: readAuth(), target: "node:test" }
    );
    assert.match(search.result_text, /note\.md/);
    assert.equal(listed.trace.target, "node:test");
    assert.equal(listed.trace.provider, "desktop-commander");
    assert.equal(listed.trace.capability, "host.fs.list");
  } finally {
    await router.stop();
    rmFixture(dir);
  }
});

await check("effectful capability without authorization is rejected before DC-MCP", async () => {
  resetAuthorizationStore();
  const dir = fixtureDir();
  const callLog = path.join(dir, "calls.jsonl");
  const provider = new DesktopCommanderProvider({
    spawn: { command: process.execPath, args: [fakeScript] },
    env: { ...process.env, FAKE_DC_CALL_LOG: callLog },
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `deny-${Date.now()}`,
    providerFactory: async () => provider,
  });
  try {
    await provider.start();
    const targetPath = path.join(dir, "out.txt");
    await assert.rejects(
      () => router.invoke(
        "host.fs.write",
        { path: targetPath, content: "nope" },
        { auth: fullAuth(), target: "node:test" }
      ),
      (e) => e.error_class === "authorization_missing"
    );
    const log = fs.existsSync(callLog) ? fs.readFileSync(callLog, "utf8") : "";
    assert.equal(log.includes("write_file"), false);
    assert.equal(fs.existsSync(targetPath), false);
  } finally {
    await router.stop();
    rmFixture(dir);
  }
});

await check("trace records semantic capability + target + provider without leaking content", async () => {
  resetAuthorizationStore();
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `trace-${Date.now()}`,
    providerFactory: async () => provider,
  });
  try {
    const targetPath = path.join(dir, "hello.txt");
    const result = await router.invoke(
      "host.fs.read",
      { path: targetPath },
      { auth: readAuth(), actor: "agent:test", target: "node:i7-thinkpad-jhr" }
    );
    const trace = result.trace;
    assert.equal(trace.capability, "host.fs.read");
    assert.equal(trace.target, "node:i7-thinkpad-jhr");
    assert.equal(trace.provider, "desktop-commander");
    assert.equal(trace.upstream_tool, "read_file");
    assert.equal(trace.status, "ok");
    assert.ok(trace.argument_hash.startsWith("sha256:"));
    assert.equal(JSON.stringify(trace).includes("hello-from-fixture"), false);
  } finally {
    await router.stop();
    rmFixture(dir);
  }
});

await check("Cogentia-MCP surface does not expose raw DC tools", async () => {
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `mcp-${Date.now()}`,
    providerFactory: async () => provider,
  });
  const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" }, { hostRouter: router });
  const publicList = await publicCore.handleJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  const publicNames = publicList.result.tools.map((t) => t.name);
  for (const raw of ["list_directory", "read_file", "write_file", "start_process", "start_search", "get_config"]) {
    assert.equal(publicNames.includes(raw), false, `public tools leaked ${raw}`);
  }
  for (const name of PRIVATE_READ_TOOLS) {
    assert.equal(publicNames.includes(name), false, `public tools leaked ${name}`);
  }
  for (const name of MUTATE_TOOLS) {
    assert.equal(publicNames.includes(name), false);
  }
  await assert.rejects(
    () => publicCore.callTool("cogentia_host_fs_list", { path: dir }),
    (e) => e.error_class === "tier_forbidden"
  );

  const privateCore = createMcpCore(
    {
      COGENTIA_MCP_VIEW: "full",
      COGENTIA_ADMIN_TOKEN: "admin-test",
      COGENTIA_MCP_ALLOW_MUTATE: "1",
    },
    { hostRouter: router }
  );
  const privateList = await privateCore.handleJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  const privateNames = privateList.result.tools.map((t) => t.name);
  assert.ok(privateNames.includes("cogentia_host_fs_list"));
  assert.ok(privateNames.includes("cogentia_host_fs_read"));
  assert.ok(privateNames.includes("cogentia_host_fs_search"));
  assert.ok(privateNames.includes("cogentia_host_fs_write"));
  assert.equal(privateNames.includes("list_directory"), false);
  assert.equal(privateNames.includes("read_file"), false);

  const read = await privateCore.callTool("cogentia_host_fs_read", {
    path: path.join(dir, "hello.txt"),
    target: "node:test",
  });
  assert.match(read.result_text, /hello-from-fixture/);
  assert.equal(read.trace.capability, "host.fs.read");
  assert.equal(read.provider, "desktop-commander");

  await assert.rejects(
    () => privateCore.callTool("cogentia_host_fs_write", {
      path: path.join(dir, "evil.txt"),
      content: "should-not-write",
      target: "node:test",
    }),
    (e) => e.error_class === "authorization_missing"
  );
  assert.equal(fs.existsSync(path.join(dir, "evil.txt")), false);

  resetAuthorizationStore();
  const okPath = path.join(dir, "ok.txt");
  const payload = buildHostFsWritePayload({
    path: okPath,
    content: "authorized-write",
    target: "node:test",
  });
  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "host.fs.write",
    target: { node: "node:test", path: okPath },
    payload,
  });
  const written = await privateCore.callTool("cogentia_host_fs_write", {
    path: okPath,
    content: "authorized-write",
    target: "node:test",
    side_effect_authorization: authorization,
  });
  assert.equal(written.ok, true);
  assert.equal(fs.readFileSync(okPath, "utf8"), "authorized-write");

  await router.stop();
  rmFixture(dir);
});

await check("authorized write then replay of the same authorization fails", async () => {
  resetAuthorizationStore();
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `replay-${Date.now()}`,
    providerFactory: async () => provider,
  });
  const targetPath = path.join(dir, "once.txt");
  const payload = buildHostFsWritePayload({
    path: targetPath,
    content: "once",
    target: "node:test",
  });
  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "host.fs.write",
    target: { node: "node:test", path: targetPath },
    payload,
  });
  await router.invoke(
    "host.fs.write",
    { path: targetPath, content: "once" },
    { auth: fullAuth(), target: "node:test", authorization }
  );
  await assert.rejects(
    () => router.invoke(
      "host.fs.write",
      { path: targetPath, content: "once" },
      { auth: fullAuth(), target: "node:test", authorization }
    ),
    (e) => e.error_class === "authorization_replay"
  );
  await router.stop();
  rmFixture(dir);
});

await check("Finding A: write authorization binds exact content digest and rejects modified content", async () => {
  resetAuthorizationStore();
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `payload-digest-${Date.now()}`,
    providerFactory: async () => provider,
  });
  const targetPath = path.join(dir, "content-check.txt");
  const payloadA = buildHostFsWritePayload({
    path: targetPath,
    content: "content A: original safe payload",
    target: "node:test",
  });
  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "host.fs.write",
    target: { node: "node:test", path: targetPath },
    payload: payloadA,
  });

  // Calling with content B must be rejected before executing write
  await assert.rejects(
    () => router.invoke(
      "host.fs.write",
      { path: targetPath, content: "content B: malicious substitute" },
      { auth: fullAuth(), target: "node:test", authorization }
    ),
    (e) => e.error_class === "authorization_payload_mismatch"
  );
  assert.equal(fs.existsSync(targetPath), false);

  // Calling with target or mode mismatch must also be rejected
  await assert.rejects(
    () => router.invoke(
      "host.fs.write",
      { path: targetPath, content: "content A: original safe payload", mode: "append" },
      { auth: fullAuth(), target: "node:test", authorization }
    ),
    (e) => e.error_class === "authorization_payload_mismatch"
  );
  assert.equal(fs.existsSync(targetPath), false);

  await router.stop();
  rmFixture(dir);
});

await check("Finding B: filesystem boundary rejects .. traversal and symlink escape", async () => {
  const dir = fixtureDir();
  const outsideDir = fixtureDir();
  const secretFile = path.join(outsideDir, "secret.txt");
  fs.writeFileSync(secretFile, "outside-secret\n");

  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `fs-boundary-${Date.now()}`,
    providerFactory: async () => provider,
  });

  try {
    // 1. Ordinary .. traversal fails
    const traversalPath = path.join(dir, "..", path.basename(outsideDir), "secret.txt");
    await assert.rejects(
      () => router.invoke(
        "host.fs.read",
        { path: traversalPath },
        { auth: readAuth(), target: "node:test" }
      ),
      (e) => e.error_class === "path_outside_root"
    );

    // 2. Symlink/junction escape test (if platform allows symlink creation)
    let symlinkCreated = false;
    const linkPath = path.join(dir, "link-outside");
    try {
      fs.symlinkSync(outsideDir, linkPath, "junction");
      symlinkCreated = true;
    } catch {
      // Non-privileged Windows environment may disallow symlink/junction creation
    }

    if (symlinkCreated) {
      const escapedTarget = path.join(linkPath, "secret.txt");
      await assert.rejects(
        () => router.invoke(
          "host.fs.read",
          { path: escapedTarget },
          { auth: readAuth(), target: "node:test" }
        ),
        (e) => e.error_class === "path_outside_root"
      );

      // Write to new child via escaping parent must also fail with path_outside_root (even if authorized)
      const escapedNewChild = path.join(linkPath, "new-child.txt");
      const authPayload = buildHostFsWritePayload({
        path: escapedNewChild,
        content: "escape-write",
        target: "node:test",
      });
      const authGrant = grantSideEffectAuthorization({
        principal: "principal:test",
        action_class: "host.fs.write",
        target: { node: "node:test", path: escapedNewChild },
        payload: authPayload,
      });
      await assert.rejects(
        () => router.invoke(
          "host.fs.write",
          { path: escapedNewChild, content: "escape-write" },
          { auth: fullAuth(), target: "node:test", authorization: authGrant }
        ),
        (e) => e.error_class === "path_outside_root"
      );
    }
  } finally {
    await router.stop();
    rmFixture(dir);
    rmFixture(outsideDir);
  }
});

await check("Finding C: host capabilities require authenticated Principal/actor and explicit mandate", async () => {
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `identity-mandate-${Date.now()}`,
    providerFactory: async () => provider,
  });

  try {
    const targetPath = path.join(dir, "hello.txt");

    // Missing both actor and principal
    await assert.rejects(
      () => router.invoke(
        "host.fs.read",
        { path: targetPath },
        { auth: { lockers: { private: { read: true } } }, mandate: "mandate:test", target: "node:test" }
      ),
      (e) => e.error_class === "identity_required"
    );

    // Missing mandate
    await assert.rejects(
      () => router.invoke(
        "host.fs.read",
        { path: targetPath },
        { auth: { lockers: { private: { read: true } }, actor: "admin" }, target: "node:test" }
      ),
      (e) => e.error_class === "mandate_required"
    );

    // Valid identity and mandate succeeds
    const res = await router.invoke(
      "host.fs.read",
      { path: targetPath },
      { auth: readAuth(), target: "node:test" }
    );
    assert.match(res.result_text, /hello-from-fixture/);
    assert.equal(res.trace.actor, "admin");
    assert.equal(res.trace.principal, "principal:test");
    assert.equal(res.trace.mandate, "mandate:cogentia#184");
  } finally {
    await router.stop();
    rmFixture(dir);
  }
});

await check("Finding D: bounded budget check can deterministically deny execution", async () => {
  const dir = fixtureDir();
  const provider = new DesktopCommanderProvider({
    spawn: fakeDesktopCommanderSpawn(),
    timeoutMs: 8_000,
  });
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `budget-${Date.now()}`,
    providerFactory: async () => provider,
  });

  try {
    const targetPath = path.join(dir, "hello.txt");

    // Exhausted budget (remaining: 0) fails closed
    const exhaustedBudget = {
      budget_id: "budget:test-exhausted",
      remaining: 0,
    };
    await assert.rejects(
      () => router.invoke(
        "host.fs.read",
        { path: targetPath },
        { auth: readAuth(), target: "node:test", budget: exhaustedBudget }
      ),
      (e) => e.error_class === "budget_exhausted"
    );

    // Bounded budget with remaining: 1 succeeds once, then exhausts
    const singleBudget = {
      budget_id: "budget:test-single",
      remaining: 1,
    };
    const first = await router.invoke(
      "host.fs.read",
      { path: targetPath },
      { auth: readAuth(), target: "node:test", budget: singleBudget }
    );
    assert.equal(first.trace.status, "ok");
    assert.equal(singleBudget.remaining, 0);

    // Second call is denied
    await assert.rejects(
      () => router.invoke(
        "host.fs.read",
        { path: targetPath },
        { auth: readAuth(), target: "node:test", budget: singleBudget }
      ),
      (e) => e.error_class === "budget_exhausted"
    );
  } finally {
    await router.stop();
    rmFixture(dir);
  }
});

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, test: "host_desktop_commander_provider" }));
process.exit(0);
