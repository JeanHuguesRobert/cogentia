import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createMcpCore } from "./cogentia-mcp-core.js";

test("John projects public Context Search through the existing MCP backend, with receipts and unchanged isolation", async () => {
  const calls = [];
  let wrongView = false;
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    calls.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), auth: req.headers.authorization, entry: req.headers["x-cogentia-entry"] });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, view: wrongView ? "full" : "public", results: [{ id: "privai:ccc#L1-L2", snippet: "fixture" }] }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const env = { COGENTIA_DAEMON_URL: `http://127.0.0.1:${server.address().port}`, COGENTIA_MCP_VIEW: "public" };
    const core = createMcpCore(env);
    const args = { prompt: "CCC", capability: "corpus.search", exposure: "read_only", max_steps: 3, max_tool_calls: 1 };
    const direct = await core.callTool("cogentia_search", {query:"CCC",limit:8,mode:"keyword"});
    const result = await core.callTool("cogentia_john_run", args);
    assert.equal(result.ok, true, JSON.stringify(result.failure));
    assert.deepEqual(JSON.parse(result.text), direct);
    assert.deepEqual(calls[0], calls[1]);
    assert.deepEqual(calls[1].params, {view:"public",q:"CCC",limit:"8",mode:"keyword"});
    assert.equal(calls[1].auth, undefined);
    assert.equal(calls[1].entry, "public");
    assert.equal(result.accounting.tool_calls_count, 1);
    assert.equal(result.accounting.internal_effects, 0);
    assert.equal(result.accounting.external_effects, 0);
    assert.equal(result.accounting.ithaca_returned, true);
    assert.ok(result.events.some(e => e.type === "john.tool.receipt" && e.data.capability === "corpus.search" && e.data.status === "completed"));
    const denied = await core.callTool("cogentia_john_run", {...args,handler:{id:"capability.once",kind:"capability_once",allowed_capabilities:[]}});
    assert.equal(denied.ok,false);
    assert.equal(calls.length,2);
    const full = createMcpCore({...env,COGENTIA_MCP_VIEW:"full",COGENTIA_ADMIN_TOKEN:"fixture"});
    const privateResult = await full.callTool("cogentia_john_run",args);
    assert.equal(privateResult.ok,false);
    assert.equal(privateResult.failure.code,"read_only_capability_unavailable");
    assert.equal(calls.length,2);
    wrongView = true;
    const rejected = await core.callTool("cogentia_john_run",args);
    assert.equal(rejected.ok,false);
    assert.equal(rejected.accounting.tool_calls_count,1);
    assert.equal(calls.length,3);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
