#!/usr/bin/env node

/*
 * HTTP MCP adapter for the Cogentia Context Gateway.
 * The primary endpoint is POST /mcp with JSON-RPC messages.
 */

import http from "node:http";
import { boundedInteger, createMcpCore, jsonRpcError, mcpToolResult, SERVER_NAME, SERVER_VERSION } from "./lib/cogentia-mcp-core.js";

const core = createMcpCore();
const port = boundedInteger(process.env.PORT || process.env.COGENTIA_MCP_PORT, 8791, 1, 65535);
const host = process.env.COGENTIA_MCP_HOST || "0.0.0.0";
const allowedOrigins = String(process.env.COGENTIA_CORS_ORIGIN || "http://localhost:*")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") return sendNoContent(res, 204);
    if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, await health());
    if (req.method === "HEAD" && req.url === "/health") return sendNoContent(res, 200);
    if (req.method === "GET" && req.url === "/tools") return sendJson(res, 200, { tools: core.tools });
    if (req.method === "GET" && req.url === "/sse") return sendSseInfo(req, res);
    if (req.method === "GET" && req.url === "/mcp") return sendSseInfo(req, res);
    if (req.method === "POST" && req.url === "/mcp") return handleMcpPost(req, res);
    if (req.method === "POST" && req.url?.startsWith("/tools/")) return handleToolPost(req, res);
    return sendJson(res, 404, { error: "not_found" });
  } catch (error) {
    return sendJson(res, 500, {
      content: [{ type: "text", text: error.message }],
      isError: true,
    });
  }
});

server.listen(port, host, () => {
  console.error(`Cogentia MCP HTTP server listening on ${host}:${port}`);
  console.error(`Daemon: ${core.daemonUrl.href}`);
  console.error("Endpoints: POST /mcp, GET /mcp, GET /health, GET /tools, POST /tools/{name}");
});

async function health() {
  const daemon = await core.callTool("cogentia_health", {});
  return { ok: true, mcp: SERVER_NAME, version: SERVER_VERSION, daemon };
}

async function handleMcpPost(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, jsonRpcError(null, -32700, "Parse error"));
  }
  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map(message => core.handleJsonRpc(message)))).filter(Boolean);
    if (!responses.length) return sendNoContent(res, 202);
    return sendJson(res, 200, responses);
  }
  const response = await core.handleJsonRpc(payload);
  if (!response) return sendNoContent(res, 202);
  return sendJson(res, 200, response);
}

async function handleToolPost(req, res) {
  const name = decodeURIComponent(String(req.url || "").slice("/tools/".length));
  let args;
  try {
    args = JSON.parse(await readBody(req) || "{}");
  } catch {
    return sendJson(res, 400, { content: [{ type: "text", text: "invalid JSON body" }], isError: true });
  }
  try {
    return sendJson(res, 200, mcpToolResult(await core.callTool(name, args)));
  } catch (error) {
    return sendJson(res, 500, { content: [{ type: "text", text: error.message }], isError: true });
  }
}

function sendSseInfo(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  sendSse(res, "endpoint", {
    protocolVersion: core.initialize({}).protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    instructions: core.initialize({}).instructions,
    post: "/mcp",
  });
  const keepAlive = setInterval(() => sendSse(res, "keepalive", {}), 30000);
  req.on("close", () => clearInterval(keepAlive));
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendNoContent(res, status) {
  res.writeHead(status);
  res.end();
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = allowedOrigins.some(value => value === "*" || (value.endsWith("*") ? origin.startsWith(value.slice(0, -1)) : origin === value));
  if (!allowed) return;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, MCP-Protocol-Version, Mcp-Session-Id");
}
