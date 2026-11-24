import test from "node:test";
import assert from "node:assert/strict";
import { createMultiMcpProgramRuntime } from "./multimcp-program.mjs";
import { createMcpCore as cogentiaCore } from "./cogentia-mcp-core.js";
import { createMcpCore as ritornuCore } from "../../../inseme/packages/brique-ritornu/src/mcp/core.js";

const create = options => createMultiMcpProgramRuntime({
  providers: {
    cogentia: cogentiaCore({ COGENTIA_MCP_VIEW: "public" }),
    ritornu: ritornuCore({}),
  },
  ...options,
});

test("reads real tool descriptions from two MCP suppliers, not an auxiliary registry", async () => {
  const runtime = create();
  const a = await runtime.search({ query: "pattern" });
  const b = await runtime.search({ query: "ritornu_boundaries" });
  assert.ok(a.some(x => x.provider === "cogentia" &&
    x.name === "cogentia_pattern_list" && x.inputSchema));
  assert.equal(b.length, 1);
  assert.equal(b[0].provider, "ritornu");
  const described = await runtime.describe({provider:"ritornu",name:"ritornu_boundaries"});
  assert.equal(described.description, b[0].description);
  assert.deepEqual(described.inputSchema, b[0].inputSchema);
  await assert.rejects(runtime.describe({
    provider:"ritornu",name:"ritornu_prepare_substack"
  }), /mcp_capability_not_found/);
  assert.ok(!(await runtime.search({query:"ritornu_prepare_substack"})).length);
});

test("one JS program composes actual Cogentia and Ritornu MCP tools", async () => {
  const runtime = create();
  const program = await runtime.execute({
    language: "javascript",
    code: [
      "const patterns = await tools.cogentia.cogentia_pattern_list({});",
      "const [health, boundaries] = await Promise.all([",
      "tools.ritornu.ritornu_health({}), tools.ritornu.ritornu_boundaries({})]);",
      "return { cogentia: typeof patterns, ritornu: typeof health,",
      "boundaries: typeof boundaries };"
    ].join("\n"),
  });
  assert.deepEqual(program.value, {
    cogentia: "object", ritornu: "object", boundaries: "object",
  });
  assert.equal(program.calls, 3);
});

test("host-side authority check applies to each tool request", async () => {
  const seen = [];
  const runtime = create({ authorizeCall: async ({provider, tool}) => {
    seen.push(provider + ":" + tool.name);
    return provider !== "ritornu";
  }});
  await assert.rejects(runtime.execute({
    code: "return await tools.ritornu.ritornu_health({});",
  }), /program_tool_authority_denied/);
  assert.deepEqual(seen, ["ritornu:ritornu_health"]);
});

test("budget, unknown capability and unsupported language are explicit", async () => {
  const runtime = create();
  await assert.rejects(runtime.execute({
    code: "await tools.cogentia.cogentia_pattern_list({}); return await tools.ritornu.ritornu_health({});",
    maxCalls: 1,
  }), /tool_not_available_or_budget_exhausted/);
  await assert.rejects(runtime.execute({
    code: "return await tools.ritornu.ritornu_prepare_substack({url:'https://example.org/p/nope'});",
  }));
  await assert.rejects(runtime.execute({
    language: "inox", code: "return 1",
  }), /language_executor_unavailable:inox/);
});

test("unbounded asynchronous code is stopped by the worker deadline", async () => {
  const runtime = create();
  await assert.rejects(runtime.execute({
    code: "await new Promise(() => {});",
    timeoutMs: 150,
  }), /program_deadline_exceeded/);
});

test("Alan v0.2 uses the same two real MCP suppliers through caller-mediated continuations", async () => {
  const runtime = create();
  const source = [
    "alan 0.2",
    "use std.mcp",
    "extern cogentia.cogentia_pattern_list",
    "  kind tool",
    "  effect read_only",
    "  data public",
    "  policy P1",
    "  input { }",
    "  output { value: any }",
    "end",
    "extern ritornu.ritornu_health",
    "  kind tool",
    "  effect read_only",
    "  data public",
    "  policy P1",
    "  input { }",
    "  output { value: any }",
    "end",
    "fn main",
    "  first = mcp cogentia.cogentia_pattern_list",
    "  second = mcp ritornu.ritornu_health",
    "  return cogentia=$first.value ritornu=$second.value",
    "end",
  ].join("\n");
  const result = await runtime.execute({ language: "alan", code: source });
  assert.equal(result.calls, 2);
  assert.equal(typeof result.value.cogentia, "object");
  assert.equal(typeof result.value.ritornu, "object");
});

test("a mediated ChatGPT capability is a provider contract, not a fictitious MCP catalog export", async () => {
  const calls = [];
  const delegated = {
    async handleJsonRpc(request) {
      if (request.method === "tools/list") {
        return { jsonrpc:"2.0", id:1, result: {tools:[{
          name: "delegate",
          description: "An explicitly mediated public-data task via an injected handler",
          inputSchema: {type:"object", properties:{prompt:{type:"string"}}},
          annotations: {readOnlyHint:true}
        }]} };
      }
      calls.push(request.params);
      return { jsonrpc:"2.0", id:1, result: {structuredContent:{
        ok:true, status:"mocked", message:"synthetic receipt"
      }} };
    },
  };
  const runtime = createMultiMcpProgramRuntime({
    providers:{ chatgpt: delegated },
    authorizeCall: async ({provider, context}) =>
      provider === "chatgpt" && context?.admitted === true,
  });
  const result = await runtime.execute({
    language:"javascript",
    context:{admitted:true},
    code:"return await tools.chatgpt.delegate({prompt:'Test only'});",
  });
  assert.deepEqual(result.value, {ok:true,status:"mocked",message:"synthetic receipt"});
  assert.equal(calls.length,1);
  assert.equal(calls[0].name,"delegate");
  await assert.rejects(runtime.execute({
    code:"return await tools.chatgpt.delegate({prompt:'No mandate'});",
  }), /program_tool_authority_denied/);
});

test("Alan returns deadline if the MCP provider never answers", async () => {
  const provider = {
    async handleJsonRpc(request) {
      if (request.method === "tools/list") return {result:{tools:[{
        name:"never",
        description:"synthetic slow read-only tool",
        inputSchema:{type:"object"},
        annotations:{readOnlyHint:true}
      }]}};
      return new Promise(() => {});
    }
  };
  const runtime = createMultiMcpProgramRuntime({
    providers:{slow:provider}
  });
  const source = [
    "alan 0.2",
    "use std.mcp",
    "extern slow.never",
    "  kind tool", "  effect read_only", "  data public",
    "  policy P1", "  input { }", "  output { value: any }", "end",
    "fn main", "  result = mcp slow.never",
    "  return value=$result.value", "end",
  ].join("\n");
  await assert.rejects(runtime.execute({
    language:"alan",code:source,timeoutMs:150,
  }), /program_deadline_exceeded/);
});

test("Linux sandbox cannot read host files, inherit secrets or open a host listener", async () => {
  const { createServer } = await import("node:net");
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  let accepted = 0;
  server.on("connection", socket => { accepted++; socket.destroy(); });
  try {
    const runtime = create();
    const checked = await runtime.execute({
      language: "javascript",
      code: [
        // Deliberately reach the host-realm tool closure's Function constructor.
        // This confirms the isolation does not rely on vm's context boundary.
        "const p = tools.cogentia.cogentia_pattern_list.constructor('return process')();",
        "const fs = p.getBuiltinModule('node:fs');",
        "const net = p.getBuiltinModule('node:net');",
        "let hostRead = false;",
        "try { fs.readFileSync('/srv/cogentia/repos/cogentia/AGENTS.md'); hostRead = true; } catch {}",
        "const reachable = await new Promise(resolve => {",
        "  const s = net.connect(" + port + ", '127.0.0.1');",
        "  s.once('connect', () => {s.destroy();resolve(true)});",
        "  s.once('error', () => resolve(false));",
        "});",
        "return { hostRead, reachable, noSecrets: !p.env.COGENTIA_MCP_JHN_TOKEN,",
        "  fsDenied: !p.permission.has('fs.read', '/srv/cogentia/repos/cogentia/AGENTS.md'),",
        "  networkDenied: !p.permission.has('net') };",
      ].join("\n"),
    });
    assert.deepEqual(checked.value, {
      hostRead: false, reachable: false, noSecrets: true,
      fsDenied: true, networkDenied: true,
    });
    assert.equal(accepted, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("late host authorization cannot dispatch an MCP call after program expiry", async () => {
  let executions = 0;
  const provider = {
    async handleJsonRpc(request) {
      if (request.method === "tools/list") return {result:{tools:[{
        name:"read", annotations:{readOnlyHint:true}, inputSchema:{type:"object"}
      }]}};
      executions++;
      return { result: { structuredContent:{ok:true} } };
    }
  };
  const runtime = createMultiMcpProgramRuntime({
    providers:{slow: provider},
    authorizeCall: () => new Promise(resolve => setTimeout(() => resolve(true), 240)),
  });
  await assert.rejects(runtime.execute({
    code: "return await tools.slow.read({});",
    timeoutMs: 100,
  }), /program_deadline_exceeded/);
  await new Promise(resolve => setTimeout(resolve, 260));
  assert.equal(executions, 0);
});

test("catching an exhausted-budget error does not inflate the count of admitted calls", async () => {
  const runtime = create();
  const value = await runtime.execute({
    language:"javascript",
    maxCalls:1,
    code: [
      "await tools.cogentia.cogentia_pattern_list({});",
      "try { await tools.ritornu.ritornu_health({}); } catch {}",
      "return 'completed_after_denial';",
    ].join("\n"),
  });
  assert.equal(value.value,"completed_after_denial");
  assert.equal(value.calls,1);
});
