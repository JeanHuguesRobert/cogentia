#!/usr/bin/env node
import assert from "node:assert/strict";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

const publicCore = createMcpCore({
  COGENTIA_DAEMON_URL: "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW: "public",
});
const publicList = await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
});
const publicNames = publicList.result.tools.map((t) => t.name);
assert.equal(publicNames.includes("operium_calendar_list"), false, "anonymous catalogue must omit calendar.list");

const projection = {
  schema: "operium.calendar.projection.v1",
  not_an_executor: true,
  summary: { total: 1, active: 1 },
  items: [{ id: "job:heartbeat:operium-node" }],
};

const core = createMcpCore({
  COGENTIA_DAEMON_URL: "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW: "full",
  COGENTIA_ADMIN_TOKEN: "test-admin-token",
}, {
  listOperiumCalendar: async (args) => {
    assert.equal(args.node_id, "resource://fracta");
    return projection;
  },
});

const listed = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list",
});
assert.ok(listed.result.tools.some((t) => t.name === "operium_calendar_list"));

const called = await core.callTool("operium_calendar_list", { node_id: "resource://fracta" });
assert.equal(called.schema, "operium.calendar.projection.v1");
assert.equal(called.not_an_executor, true);

console.log(JSON.stringify({
  ok: true,
  tests: ["public_omits_calendar_list", "full_lists_and_calls"],
}, null, 2));
