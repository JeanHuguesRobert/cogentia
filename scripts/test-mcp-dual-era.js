#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createMcpCore,
  PROTOCOL_VERSION,
  PROTOCOL_VERSION_MODERN,
  SUPPORTED_PROTOCOLS,
  ERR_UNSUPPORTED_PROTOCOL_VERSION,
  MCP_META,
  transportFromHttpRequest,
} from "./lib/cogentia-mcp-core.js";

const core = createMcpCore({
  COGENTIA_DAEMON_URL: "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW: "public",
});

const init = await core.handleJsonRpc({
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

const discover = await core.handleJsonRpc({
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

const modernList = await core.handleJsonRpc(
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

const bad = await core.handleJsonRpc({
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

console.log(JSON.stringify({
  ok: true,
  dual_era: true,
  legacy_initialize: PROTOCOL_VERSION,
  modern_discover: PROTOCOL_VERSION_MODERN,
  supported: [...SUPPORTED_PROTOCOLS],
}, null, 2));
