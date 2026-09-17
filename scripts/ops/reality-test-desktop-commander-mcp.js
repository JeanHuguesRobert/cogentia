#!/usr/bin/env node
/**
 * Live Cogentia-MCP Reality Test for #184 against real Desktop Commander.
 *
 *   external MCP core (deterministic)
 *     → cogentia_host_fs_*
 *     → COP / router / #171
 *     → DesktopCommanderProvider
 *     → real DC-MCP stdio
 *     → Windows fixture
 *
 * Prefers an already-extracted dist/index.js. Does not expose DC on the network.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMcpCore, PRIVATE_READ_TOOLS, MUTATE_TOOLS } from "../lib/cogentia-mcp-core.js";
import { createHostCapabilityRouter } from "../lib/host-capability-router.js";
import {
  DesktopCommanderProvider,
  DESKTOP_COMMANDER_UPSTREAM,
  defaultDesktopCommanderSpawn,
  discoverExtractedDesktopCommander,
} from "../lib/desktop-commander-provider.js";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  buildHostFsWritePayload,
} from "../lib/side-effect-authorization.js";

const timeoutMs = Number(process.env.COGENTIA_DC_REALITY_TIMEOUT_MS || 60_000);
const target = process.env.COGENTIA_HOST_NODE_ID || "node:local";

const extracted = discoverExtractedDesktopCommander(process.env);
const spawn = defaultDesktopCommanderSpawn(process.env);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-dc-mcp-"));
fs.writeFileSync(path.join(dir, "fixture.txt"), "reality-fixture-ok\n", "utf8");

const provider = new DesktopCommanderProvider({
  spawn,
  cwd: os.tmpdir(),
  timeoutMs,
  env: { ...process.env, DESKTOP_COMMANDER_DISABLE_TELEMETRY: "1" },
});

const report = {
  ok: false,
  skipped: false,
  real_windows_runtime: process.platform === "win32",
  cogentia_mcp_end_to_end: false,
  effectful_executed: false,
  unauthorized_write_blocked: false,
  lifecycle_restart: false,
  raw_dc_tools_on_public_surface: null,
  extracted,
  spawn,
  upstream: DESKTOP_COMMANDER_UPSTREAM,
  fixture: dir,
  target,
};

try {
  await provider.start();
  const router = createHostCapabilityRouter({
    fsRoot: dir,
    cacheKey: `live-mcp-${Date.now()}`,
    providerFactory: async () => provider,
    target,
    env: { ...process.env, COGENTIA_HOST_FS_ROOT: dir, DESKTOP_COMMANDER_DISABLE_TELEMETRY: "1" },
  });

  const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" }, { hostRouter: router });
  const publicList = await publicCore.handleJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  const publicNames = publicList.result.tools.map((t) => t.name);
  const leaked = ["list_directory", "read_file", "write_file", "start_process", "get_config"].filter((n) =>
    publicNames.includes(n)
  );
  const hostOnPublic = [...PRIVATE_READ_TOOLS, ...MUTATE_TOOLS].filter((n) => publicNames.includes(n));
  report.raw_dc_tools_on_public_surface = leaked;
  report.host_tools_on_public_surface = hostOnPublic;
  if (leaked.length || hostOnPublic.includes("cogentia_host_fs_read")) {
    throw new Error(`public tools/list leaked ${JSON.stringify({ leaked, hostOnPublic })}`);
  }

  const core = createMcpCore(
    {
      COGENTIA_MCP_VIEW: "full",
      COGENTIA_ADMIN_TOKEN: "admin-test",
      COGENTIA_MCP_ALLOW_MUTATE: "1",
    },
    { hostRouter: router }
  );

  const listed = await core.callTool("cogentia_host_fs_list", { path: dir, target, provider: "desktop-commander" });
  const read = await core.callTool("cogentia_host_fs_read", {
    path: path.join(dir, "fixture.txt"),
    target,
    provider: "desktop-commander",
  });
  report.cogentia_mcp_end_to_end = true;
  report.list = {
    upstream_tool: listed.upstream_tool,
    preview: String(listed.result_text || "").slice(0, 400),
    trace: listed.trace,
  };
  report.read = {
    upstream_tool: read.upstream_tool,
    preview: String(read.result_text || "").slice(0, 200),
    trace_capability: read.trace?.capability,
    trace_provider: read.trace?.provider,
    trace_target: read.trace?.target,
  };
  if (!String(read.result_text || "").includes("reality-fixture-ok")) {
    throw new Error("Cogentia-MCP read did not return fixture content");
  }

  resetAuthorizationStore();
  const deniedPath = path.join(dir, "should-not-exist.txt");
  try {
    await core.callTool("cogentia_host_fs_write", {
      path: deniedPath,
      content: "blocked",
      target,
      provider: "desktop-commander",
    });
    throw new Error("unauthorized write unexpectedly succeeded");
  } catch (err) {
    if (err.error_class !== "authorization_missing") throw err;
    report.unauthorized_write_blocked = true;
    report.unauthorized_error_class = err.error_class;
  }
  if (fs.existsSync(deniedPath)) {
    throw new Error("unauthorized write created a file");
  }

  const writePath = path.join(dir, "authorized.txt");
  const payload = buildHostFsWritePayload({
    path: writePath,
    content: "authorized-live-write",
    target,
  });
  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "host.fs.write",
    target: { node: target, path: writePath },
    payload,
  });
  const written = await core.callTool("cogentia_host_fs_write", {
    path: writePath,
    content: "authorized-live-write",
    target,
    provider: "desktop-commander",
    side_effect_authorization: authorization,
  });
  report.effectful_executed = written.ok === true;
  report.write = {
    upstream_tool: written.upstream_tool,
    file_exists: fs.existsSync(writePath),
    content: fs.existsSync(writePath) ? fs.readFileSync(writePath, "utf8") : null,
    authorization_id: written.trace?.authorization_id || null,
  };
  if (report.write.content !== "authorized-live-write") {
    throw new Error("authorized write did not persist expected content");
  }

  try {
    await core.callTool("cogentia_host_fs_write", {
      path: writePath,
      content: "authorized-live-write",
      target,
      provider: "desktop-commander",
      side_effect_authorization: authorization,
    });
    throw new Error("authorization replay unexpectedly succeeded");
  } catch (err) {
    if (err.error_class !== "authorization_replay") throw err;
    report.authorization_replay_blocked = true;
  }

  await provider.stop();
  const reread = await core.callTool("cogentia_host_fs_read", {
    path: path.join(dir, "fixture.txt"),
    target,
    provider: "desktop-commander",
  });
  if (!String(reread.result_text || "").includes("reality-fixture-ok")) {
    throw new Error("post-restart Cogentia-MCP read did not return fixture content");
  }
  report.lifecycle_restart = true;
  report.reread_upstream_tool = reread.upstream_tool;

  report.ok = true;
  await router.stop();
} catch (err) {
  const msg = String(err.message || err);
  const skippable = /ENOENT|EINVAL|mcp_initialize_failed|mcp_stdio_timeout|npx/i.test(msg);
  report.ok = false;
  report.skipped = skippable;
  report.error = msg;
  report.error_class = err.error_class || null;
  report.stderr_tail = provider.client?.stderrTail?.() || "";
} finally {
  await provider.stop().catch(() => {});
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    report.fixture_cleanup = "deferred";
  }
}

console.log(JSON.stringify(report, null, 2));
if (!report.ok && !report.skipped) process.exit(1);
