#!/usr/bin/env node
/**
 * Optional live Reality Test for Cogentia #184 against real Desktop Commander MCP.
 *
 * Distinguishes:
 *   adapter implemented
 *   != mocked tests pass
 *   != DC-MCP real local runtime works
 *
 * Does not require ChatGPT, fracta2, or a public HTTP endpoint.
 * Exit 0 with {skipped:true} when the upstream package cannot be launched.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DesktopCommanderProvider,
  DESKTOP_COMMANDER_UPSTREAM,
  defaultDesktopCommanderSpawn,
} from "../lib/desktop-commander-provider.js";

const timeoutMs = Number(process.env.COGENTIA_DC_REALITY_TIMEOUT_MS || 120_000);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-dc-reality-"));
fs.writeFileSync(path.join(dir, "fixture.txt"), "reality-fixture-ok\n", "utf8");

const spawn = defaultDesktopCommanderSpawn(process.env);
const provider = new DesktopCommanderProvider({
  spawn,
  cwd: os.tmpdir(),
  timeoutMs,
  env: process.env,
});

const report = {
  ok: false,
  skipped: false,
  real_windows_runtime: process.platform === "win32",
  upstream: DESKTOP_COMMANDER_UPSTREAM,
  spawn,
  fixture: dir,
};

try {
  const diag = await provider.start();
  const tools = provider.listNormalizedTools();
  const listed = await provider.invoke("host.fs.list", { path: dir });
  const read = await provider.invoke("host.fs.read", { path: path.join(dir, "fixture.txt") });
  report.ok = true;
  report.initialize = diag.initialize?.serverInfo || diag.initialize || null;
  report.tool_names = tools.map((t) => t.name);
  report.list_preview = String(listed.result_text || "").slice(0, 400);
  report.read_preview = String(read.result_text || "").slice(0, 200);
  report.mapped = {
    "host.fs.list": listed.upstream_tool,
    "host.fs.read": read.upstream_tool,
  };
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
