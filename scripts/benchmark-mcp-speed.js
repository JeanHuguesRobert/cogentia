// File: scripts/benchmark-mcp-speed.js
// Description: Benchmark tool execution speed across local PC vs Fracta VPS.

import { performance } from "node:perf_hooks";

const TARGET_URL = process.env.MCP_BENCHMARK_URL || "http://127.0.0.1:8791/mcp";

async function sendMcpCall(name, args = {}) {
  const payload = {
    jsonrpc: "2.0",
    id: String(Date.now()),
    method: "tools/call",
    params: { name, arguments: args },
  };

  const start = performance.now();
  const res = await fetch(TARGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const duration = performance.now() - start;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const isError = data.result?.isError || false;
  return { duration, isError };
}

async function runSpeedBenchmark() {
  const nodeLabel = process.env.NODE_LABEL || "Local PC";
  console.log(`==========================================================================`);
  console.log(`          MCP BENCHMARK RUNNER [${nodeLabel}]                            `);
  console.log(`          Target: ${TARGET_URL}`);
  console.log(`==========================================================================`);

  const benchmarkTools = [
    { name: "cogentia_views_snapshot", args: {} },
    { name: "cogentia_search", args: { query: "Potentics" } },
    { name: "cogentia_guide_resolve", args: { query: "Potentics" } },
    { name: "cogentia_git_verify", args: {} },
    { name: "cogentia_emit_static", args: {} },
    { name: "cogentia_publish_registry", args: {} },
    { name: "cogentia_nav_benchmark", args: {} },
    { name: "cogentia_continuation_list", args: { status: "alive" } },
    { name: "cogentia_health", args: {} },
    { name: "cogentia_continuation_emit", args: { question: "Speed test", subject: "Benchmark" } },
  ];

  console.log(" Tool Name                   | Status | Latency (ms) | Speed Rating");
  console.log("-----------------------------+--------+--------------+------------------");

  let totalMs = 0;
  for (const tool of benchmarkTools) {
    try {
      const { duration, isError } = await sendMcpCall(tool.name, tool.args);
      totalMs += duration;
      const statusStr = isError ? "FAIL" : "PASS";
      const rating = duration < 20 ? "⚡ Ultra Fast (<20ms)" : duration < 100 ? "🚀 Fast (<100ms)" : "🐢 Moderate (>100ms)";
      console.log(` ${tool.name.padEnd(27, " ")} | ${statusStr.padEnd(6, " ")} | ${duration.toFixed(2).padStart(12, " ")} | ${rating}`);
    } catch (err) {
      console.log(` ${tool.name.padEnd(27, " ")} | ERROR  | ${err.message}`);
    }
  }

  console.log("==========================================================================");
  console.log(` Average Latency per Tool Call: ${(totalMs / benchmarkTools.length).toFixed(2)} ms`);
  console.log(` Total Batch Execution Time:    ${totalMs.toFixed(2)} ms`);
  console.log("==========================================================================\n");
}

runSpeedBenchmark();
