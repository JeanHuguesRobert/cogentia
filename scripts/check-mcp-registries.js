#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createRegistryAwareMcpCore, REGISTRY_TOOLS } from "./lib/cogentia-mcp-registries.js";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("content-type", "application/json");
  if (url.pathname === "/api/registries/list") {
    return res.end(JSON.stringify({ ok: true, count: 1, registries: [{ id: "registry:test", name: "Test" }] }));
  }
  if (url.pathname === "/api/registries/check") {
    return res.end(JSON.stringify({ ok: true, registry_count: 1, relation_count: 0, issues: [], warnings: [] }));
  }
  if (url.pathname === "/api/registries/show") {
    return res.end(JSON.stringify({ ok: true, registry: { id: url.searchParams.get("id"), name: "Test" } }));
  }
  if (url.pathname === "/api/registries/related") {
    return res.end(JSON.stringify({ ok: true, id: url.searchParams.get("id"), direction: url.searchParams.get("direction") || "both", relations: [] }));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});
server.listen(0, "127.0.0.1");
await once(server, "listening");

try {
  const address = server.address();
  const core = createRegistryAwareMcpCore({ COGENTIA_DAEMON_URL: `http://127.0.0.1:${address.port}` });

  const listed = await core.handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  const names = listed.result.tools.map(t => t.name);
  for (const tool of REGISTRY_TOOLS) assert.ok(names.includes(tool.name));

  const call = await core.handleJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "cogentia_registry_show", arguments: { id: "registry:test" } },
  });
  assert.equal(call.result.isError, undefined);
  assert.equal(call.result.structuredContent.data.registry.id, "registry:test");

  const direct = await core.callTool("cogentia_registries_check", {});
  assert.equal(direct.ok, true);
  assert.equal(direct.registry_count, 1);

  console.log(JSON.stringify({ ok: true, status: "passed", tools: REGISTRY_TOOLS.map(t => t.name) }, null, 2));
} finally {
  server.close();
}
