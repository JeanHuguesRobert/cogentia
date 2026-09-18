// File: scripts/test-mcp-live.js
// Description: Live test client calling all 18 Cogentia MCP tools with valid arguments.

const MCP_URL = "http://127.0.0.1:8791/mcp";

async function sendMcp(method, params = {}) {
  const payload = {
    jsonrpc: "2.0",
    id: String(Date.now()),
    method,
    params,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runFast18ToolTest() {
  console.log("🚀 Testing All 18 Cogentia MCP Tools at http://127.0.0.1:8791/mcp...\n");

  const initRes = await sendMcp("initialize", { protocolVersion: "2025-11-25" });
  console.log(`Server Info: ${initRes.result.serverInfo.name} v${initRes.result.serverInfo.version}`);

  const listRes = await sendMcp("tools/list");
  const tools = listRes.result.tools || [];
  console.log(`Discovered Tools Count: ${tools.length} / 18\n`);

  const testCalls = [
    { name: "cogentia_views_snapshot", args: {} },
    { name: "cogentia_search", args: { query: "Potentics" } },
    { name: "cogentia_context_pack", args: { query: "ERP" } },
    { name: "cogentia_get_lines", args: { ref: "cogentia:docs/cogentia-mcp.md", start: 1, end: 5 } },
    { name: "cogentia_explain", args: { result_id: "res_demo_001" } },
    { name: "cogentia_health", args: {} },
    { name: "cogentia_issue_graph", args: { repo: "cogentia", limit: 5 } },
    { name: "cogentia_guide_resolve", args: { query: "ERP" } },
    { name: "cogentia_git_verify", args: {} },
    { name: "cogentia_emit_static", args: {} },
    { name: "cogentia_publish_registry", args: {} },
    { name: "cogentia_nav_benchmark", args: {} },
    { name: "cogentia_continuation_list", args: { status: "alive" } },
    { name: "cogentia_issues_list", args: { repo: "cogentia", state: "open" } },
    { name: "cogentia_continuation_inspect", args: { id: "ctn_demo" } },
    { name: "cogentia_continuation_resolve", args: { id: "ctn_demo", decision: "Approved", reason: "Test run" } },
    { name: "cogentia_continuation_emit", args: { question: "Approve MCP test run?", subject: "MCP" } },
    { name: "cogentia_issues_sync", args: { repo: "cogentia", state: "open" } },
  ];

  let passed = 0;
  for (let i = 0; i < testCalls.length; i++) {
    const tc = testCalls[i];
    try {
      const callRes = await sendMcp("tools/call", {
        name: tc.name,
        arguments: tc.args,
      });

      const isError = callRes.result?.isError || false;
      const content = callRes.result?.content?.[0]?.text || JSON.stringify(callRes.result);
      const snippet = content.slice(0, 65).replace(/\n/g, " ");

      if (!isError) passed++;
      console.log(`[${String(i + 1).padStart(2, " ")}/18] ${tc.name.padEnd(28, " ")} => ${isError ? "FAIL" : "PASS"} (${snippet})`);
    } catch (err) {
      console.log(`[${String(i + 1).padStart(2, " ")}/18] ${tc.name.padEnd(28, " ")} => ERROR (${err.message})`);
    }
  }

  console.log(`\n==========================================================================`);
  console.log(`Summary: ${passed} / ${testCalls.length} Operational MCP Tools PASSED`);
  console.log(`==========================================================================`);
}

runFast18ToolTest().catch(err => {
  console.error("❌ Test Runner Error:", err);
  process.exit(1);
});
