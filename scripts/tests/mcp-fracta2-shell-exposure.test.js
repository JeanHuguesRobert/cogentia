import test from "node:test";
import assert from "node:assert/strict";
import { createMcpCore } from "../lib/cogentia-mcp-core.js";

const NAME = "cogentia_fracta2_shell_probe";
const env = {
  COGENTIA_MCP_VIEW: "public",
  COGENTIA_MCP_JHN_MUTATE: "1",
  COGENTIA_MCP_JHN_TOKEN: "test-only-jhn-token",
};

test("anonymous MCP tools/list excludes Fracta2 shell probe", async () => {
  const core = createMcpCore(env);
  const response = await core.handleJsonRpc({
    jsonrpc: "2.0", id: 1, method: "tools/list", params: {},
  }, { headers: {} });
  assert.ok(response.result);
  assert.equal(response.result.tools.some(tool => tool.name === NAME), false);
});

test("JHN-attested MCP tools/list includes Fracta2 shell probe", async () => {
  const core = createMcpCore(env);
  const response = await core.handleJsonRpc({
    jsonrpc: "2.0", id: 2, method: "tools/list", params: {},
  }, { headers: {
    authorization: "Bearer test-only-jhn-token",
    "x-cogentia-actor": "agent:jhn",
  } });
  assert.ok(response.result);
  assert.equal(response.result.tools.some(tool => tool.name === NAME), true);
});

test("invalid JHN credential does not expose Fracta2 shell probe", async () => {
  const core = createMcpCore(env);
  const response = await core.handleJsonRpc({
    jsonrpc: "2.0", id: 3, method: "tools/list", params: {},
  }, { headers: {
    authorization: "Bearer wrong",
    "x-cogentia-actor": "agent:jhn",
  } });
  assert.ok(response.result);
  assert.equal(response.result.tools.some(tool => tool.name === NAME), false);
});
