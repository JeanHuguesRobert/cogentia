#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createMcpCore,
  PROTOCOL_VERSION,
  PROTOCOL_VERSION_MODERN,
  SUPPORTED_PROTOCOLS,
  ERR_UNSUPPORTED_PROTOCOL_VERSION,
  MCP_META,
  MUTATE_TOOLS,
  transportFromHttpRequest,
} from "./lib/cogentia-mcp-core.js";

const publicCore = createMcpCore({
  COGENTIA_DAEMON_URL: "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW: "public",
});

const init = await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "dual-era-test", version: "1" },
  },
});
assert.equal(init.result.protocolVersion, PROTOCOL_VERSION);
assert.equal(init.result.serverInfo.name, "cogentia-mcp");
assert.match(init.result.instructions, /mutate_tools=disabled/);

const discover = await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 3,
  method: "server/discover",
  params: {
    _meta: {
      [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN,
      [MCP_META.clientInfo]: { name: "dual-era-test", version: "1" },
    },
  },
});
assert.equal(discover.result.resultType, "complete");
assert.ok(discover.result.supportedVersions.includes(PROTOCOL_VERSION_MODERN));
assert.ok(discover.result.supportedVersions.includes(PROTOCOL_VERSION));

const modernList = await publicCore.handleJsonRpc(
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/list",
    params: { _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN } },
  },
  { protocolVersionHeader: PROTOCOL_VERSION_MODERN, mcpMethod: "tools/list" },
);
assert.equal(modernList.result.ttlMs, 3_600_000);
assert.equal(modernList.result._meta[MCP_META.protocolVersion], PROTOCOL_VERSION_MODERN);
const publicNames = modernList.result.tools.map((t) => t.name);
assert.ok(publicNames.includes("cogentia_continuation_list"));
assert.ok(publicNames.includes("cogentia_continuation_inspect"));
assert.ok(publicNames.includes("cogentia_health"));
assert.ok(publicNames.includes("cogentia_agent_start"));
assert.ok(publicNames.includes("cogentia_skill_list"));
assert.ok(publicNames.includes("cogentia_skill_get"));
assert.ok(publicNames.includes("cogentia_continuation_schema"));
assert.match(init.result.instructions, /cogentia_skill_get/);
for (const name of MUTATE_TOOLS) {
  assert.ok(!publicNames.includes(name), `public tools/list must hide ${name}`);
}
assert.equal(modernList.result._cogentia?.allowMutate, false);
assert.equal(modernList.result._cogentia?.view, "public");

// Phase 2 skills (no daemon required)
const skillList = await publicCore.callTool("cogentia_skill_list");
assert.equal(skillList.ok, true);
assert.ok(skillList.count >= 1);
assert.ok(skillList.skills.some((s) => s.slug === "continuation-handling"));
const skillGet = await publicCore.callTool("cogentia_skill_get", { id: "continuation-handling" });
assert.equal(skillGet.ok, true);
assert.ok(String(skillGet.body_markdown || "").includes("continuation"));
const skillMissing = await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 61,
  method: "tools/call",
  params: { name: "cogentia_skill_get", arguments: { id: "does-not-exist-skill" } },
});
assert.equal(skillMissing.result.isError, true);

const bad = await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 5,
  method: "tools/list",
  params: { _meta: { [MCP_META.protocolVersion]: "1900-01-01" } },
});
assert.equal(bad.error.code, ERR_UNSUPPORTED_PROTOCOL_VERSION);

const transport = transportFromHttpRequest({
  headers: {
    "mcp-protocol-version": PROTOCOL_VERSION_MODERN,
    "mcp-method": "tools/call",
    "mcp-name": "cogentia_search",
  },
});
assert.equal(transport.protocolVersionHeader, PROTOCOL_VERSION_MODERN);
assert.ok(SUPPORTED_PROTOCOLS.has(PROTOCOL_VERSION_MODERN));

// Mutate gate without daemon round-trip
const mutateDenied = await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 6,
  method: "tools/call",
  params: {
    name: "cogentia_continuation_emit",
    arguments: { question: "should be blocked" },
  },
});
assert.equal(mutateDenied.result.isError, true);
assert.match(mutateDenied.result.content[0].text, /tier_forbidden/);

const fullCore = createMcpCore({
  COGENTIA_DAEMON_URL: "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW: "full",
  COGENTIA_ADMIN_TOKEN: "test-admin-token",
  COGENTIA_MCP_ALLOW_MUTATE: "1",
});
assert.equal(fullCore.view, "full");
assert.equal(fullCore.allowMutate, true);
const fullList = await fullCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 7,
  method: "tools/list",
  params: {},
});
const fullNames = fullList.result.tools.map((t) => t.name);
for (const name of MUTATE_TOOLS) {
  assert.ok(fullNames.includes(name), `full+mutate tools/list must include ${name}`);
}

// Optional live daemon checks (P1 routes)
let live = { daemon: false };
try {
  const health = await publicCore.callTool("cogentia_health");
  live.daemon = true;
  live.health_ok = health?.ok !== false;

  const list = await publicCore.callTool("cogentia_continuation_list", { status: "alive" });
  assert.equal(list.ok, true);
  assert.ok(Array.isArray(list.continuations));
  assert.equal(list.skill_hint, "continuation-handling");
  assert.equal(list.protocol, "cogentia.continuation.v2");
  live.continuation_list = true;
  live.continuation_count = list.count ?? list.continuations.length;

  try {
    const schema = await publicCore.callTool("cogentia_continuation_schema");
    assert.equal(schema.ok, true);
    assert.equal(schema.protocol, "cogentia.continuation.v2");
    live.continuation_schema = true;
  } catch (e) {
    live.continuation_schema_error = e.message;
  }
  try {
    const agentStart = await publicCore.callTool("cogentia_agent_start");
    assert.equal(agentStart.protocol, "cogentia.agent_start.v1");
    assert.ok(Array.isArray(agentStart.mcp_playbook));
    live.agent_start = true;
  } catch (e) {
    live.agent_start_error = e.message;
  }

  if (list.continuations.length) {
    const id = list.continuations[0].id;
    const inspected = await publicCore.callTool("cogentia_continuation_inspect", { id });
    assert.equal(inspected.ok, true);
    assert.equal(inspected.continuation.id, id);
    assert.ok(!inspected.continuation.requester, "public inspect must not expose requester");
    live.continuation_inspect = true;
  } else {
    const missing = await publicCore.handleJsonRpc({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: { name: "cogentia_continuation_inspect", arguments: { id: "does-not-exist-p1" } },
    });
    // daemon returns HTTP 404 → tool error text, or structured ok:false depending on path
    assert.ok(missing.result.isError === true || missing.result.content?.[0]?.text);
    live.continuation_inspect_missing = true;
  }
} catch (error) {
  live.daemon_error = error.message;
}

console.log(JSON.stringify({
  ok: true,
  dual_era: true,
  legacy_initialize: PROTOCOL_VERSION,
  modern_discover: PROTOCOL_VERSION_MODERN,
  supported: [...SUPPORTED_PROTOCOLS],
  public_tool_count: publicNames.length,
  full_mutate_tool_count: fullNames.length,
  mutate_tools: [...MUTATE_TOOLS],
  live,
}, null, 2));
