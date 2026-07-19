#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-gh-"));
const registry = process.env.COGENTIA_TEST_REGISTRY
  || path.resolve(root, "..", "JeanHuguesRobert", ".cogentia.json");
const ghJs = path.join(temp, "gh.js");
const ghCmd = path.join(temp, "gh.cmd");
const issueList = [
  {
    number: 18,
    title: "COP reference runtime hardening",
    state: "OPEN",
    stateReason: "",
    updatedAt: "2026-07-18T08:00:00Z",
    closedAt: null,
    url: "https://github.com/JeanHuguesRobert/inseme/issues/18",
    labels: [{ name: "cop" }, { name: "runtime" }],
    author: { login: "JeanHuguesRobert" },
    body: [
      "## Target documents",
      "",
      "- `packages/cop-kernel/PROFILE.md`",
      "- `packages/cop-kernel/README.md`",
      "",
      "## Agent-resumable next step",
      "",
      "Extend the issue graph facade.",
    ].join("\n"),
  },
];

fs.writeFileSync(ghJs, `
const args = process.argv.slice(2);
if (args[0] === "issue" && args[1] === "list") {
  process.stdout.write(${JSON.stringify(JSON.stringify(issueList))});
  process.exit(0);
}
process.stdout.write("[]");
`, "utf8");
fs.writeFileSync(ghCmd, `@echo off\r\nnode "${ghJs}" %*\r\n`, "utf8");

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const daemon = spawn(process.execPath, ["scripts/cogentia.js", "daemon", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    PATH: `${temp}${path.delimiter}${process.env.PATH}`,
    COGENTIA_REGISTRY: registry,
    COGENTIA_DAEMON_VIEW: "full",
    COGENTIA_ADMIN_TOKEN: "testtoken",
    COGENTIA_GH_EXEC: JSON.stringify(["node", ghJs]),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let daemonLog = "";
daemon.stdout.on("data", chunk => { daemonLog += chunk; });
daemon.stderr.on("data", chunk => { daemonLog += chunk; });

try {
  await waitForHealth();
  const response = await fetch(`${base}/api/issues/graph?repo=JeanHuguesRobert/inseme&state=open&limit=5`, {
    headers: { Authorization: "Bearer testtoken" },
  });
  const graph = await response.json();
  assert.equal(response.ok, true, JSON.stringify(graph));
  assert.equal(graph.schema, "cogentia.issue-graph.v1");
  assert.equal(graph.summary.repositories, 1);
  assert.equal(graph.summary.issues, 1);
  assert.equal(graph.summary.resolved_targets, 2);
  assert.equal(graph.summary.unresolved_targets, 0);
  assert.ok(graph.nodes.some(node => node.kind === "issue"));

  const mcp = await runMcp([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "cogentia_issue_graph", arguments: { repo: "JeanHuguesRobert/inseme", state: "open", limit: 5 } } },
  ]);
  assert.equal(mcp[0].result.serverInfo.name, "cogentia-mcp");
  const issueGraphTool = mcp.find(message => message.result?.structuredContent?.schema === "cogentia.issue-graph.v1");
  assert.ok(issueGraphTool, JSON.stringify(mcp, null, 2));
  assert.equal(issueGraphTool.result.structuredContent.summary.issues, 1);

  console.log(JSON.stringify({ ok: true, graph_nodes: graph.nodes.length, graph_edges: graph.edges.length, mcp_tool: "cogentia_issue_graph" }, null, 2));
} finally {
  daemon.kill();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${base}/api/context/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Daemon did not start: ${daemonLog}`);
}

async function runMcp(messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/cogentia-mcp.js"], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${temp}${path.delimiter}${process.env.PATH}`,
        COGENTIA_DAEMON_URL: base,
        COGENTIA_MCP_VIEW: "public",
        COGENTIA_GH_EXEC: JSON.stringify(["node", ghJs]),
        COGENTIA_MCP_TIMEOUT_MS: "60000",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(`MCP exited ${code}: ${stderr}`));
      resolve(stdout.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse));
    });
    child.stdin.end(`${messages.map(message => JSON.stringify(message)).join("\n")}\n`);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
