#!/usr/bin/env node
// FBF: public MCP discovery must not advertise effectful operations as read-only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMcpCore, MUTATE_TOOLS } from "./lib/cogentia-mcp-core.js";

const names = [
  "cogentia_scheduler_run",
  "cogentia_emit_static",
  "cogentia_publish_registry",
  "cogentia_consolidate_weekly",
];
const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
const fullCore = createMcpCore({
  COGENTIA_MCP_VIEW: "full",
  COGENTIA_ADMIN_TOKEN: "test-only-token",
  COGENTIA_MCP_ALLOW_MUTATE: "1",
});
const rpc = (core, method, params = {}) => core.handleJsonRpc({
  jsonrpc: "2.0", id: 1, method, params,
});
const publicList = (await rpc(publicCore, "tools/list")).result.tools;
const fullList = (await rpc(fullCore, "tools/list")).result.tools;
for (const name of names) {
  assert.ok(MUTATE_TOOLS.has(name), name + " must be categorized as mutating");
  assert.equal(publicList.some(t => t.name === name), false, name + " must be hidden anonymously");
  const full = fullList.find(t => t.name === name);
  assert.ok(full, name + " must remain discoverable under authenticated mutate view");
  assert.equal(full.annotations.readOnlyHint, false, name + " must not claim read-only");
  const denied = await rpc(publicCore, "tools/call", { name, arguments: {} });
  assert.equal(denied.result.isError, true, name);
  assert.equal(denied.result.structuredContent?.error_class, "tier_forbidden", name);
}
// The daemon must also not expose effectful routes on anonymous GET.
const source = readFileSync(new URL("./cogentia.js", import.meta.url), "utf8");
const publicRoutes = source.split("const PUBLIC_DAEMON_GET_ROUTES = new Set([")[1]?.split("]);")[0];
assert.ok(publicRoutes);
for (const route of ["/api/cli/scheduler/run", "/api/ops/emit-static", "/api/ops/publish-registry"]) {
  assert.equal(publicRoutes.includes(JSON.stringify(route)), false, route + " public daemon GET");
}
console.log("FBF MCP public effect boundary: PASS");
