#!/usr/bin/env node

/*
 * Minimal MCP stdio adapter for the Cogentia Context Gateway.
 * It deliberately has no filesystem or SQLite access.
 */

const SERVER_NAME = "cogentia-mcp";
const SERVER_VERSION = "0.1.0";
const PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOLS = new Set([PROTOCOL_VERSION, "2025-06-18", "2024-11-05"]);
const DAEMON_URL = validateDaemonUrl(process.env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790");
const REQUEST_TIMEOUT_MS = boundedInteger(process.env.COGENTIA_MCP_TIMEOUT_MS, 15000, 1000, 120000);
const requestedView = String(process.env.COGENTIA_MCP_VIEW || "public").toLowerCase();
const adminToken = String(process.env.COGENTIA_ADMIN_TOKEN || "");
const MCP_VIEW = requestedView === "full" && adminToken ? "full" : "public";

const TOOLS = [
  {
    name: "cogentia_search",
    description: "Explore the Cogentia corpus with short, citable search results.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        repo: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        mode: { type: "string", enum: ["keyword", "hybrid", "semantic"] },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_context_pack",
    description: "Build a deterministic, budgeted context pack for a broad corpus question.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        repo: { type: "string" },
        budget: { type: "integer", minimum: 256, maximum: 50000 },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        format: { type: "string", enum: ["json", "markdown"] },
        mode: { type: "string", enum: ["keyword", "hybrid", "semantic"] },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_get_lines",
    description: "Retrieve a bounded, citable line interval from an allowed corpus document.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", minLength: 1, description: "Document reference in repo:path form." },
        start: { type: "integer", minimum: 1 },
        end: { type: "integer", minimum: 1 },
      },
      required: ["ref", "start", "end"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_explain",
    description: "Explain the deterministic retrieval signals for a Cogentia result.",
    inputSchema: {
      type: "object",
      properties: { result_id: { type: "string", minLength: 1 } },
      required: ["result_id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_health",
    description: "Check whether the public Cogentia Context Gateway and its index are available.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

let input = "";
let pending = Promise.resolve();
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  input += chunk;
  let newline;
  while ((newline = input.indexOf("\n")) >= 0) {
    const line = input.slice(0, newline).trim();
    input = input.slice(newline + 1);
    if (line) pending = pending.then(() => handleLine(line));
  }
});
process.stdin.on("end", () => {
  const line = input.trim();
  if (line) pending = pending.then(() => handleLine(line));
  pending.finally(() => process.exit(0));
});
process.stdin.resume();

async function handleLine(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return sendError(null, -32700, "Parse error");
  }
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return sendError(message.id ?? null, -32600, "Invalid Request");
  }
  if (message.id === undefined) return;
  try {
    if (message.method === "initialize") {
      const requested = String(message.params?.protocolVersion || "");
      return sendResult(message.id, {
        protocolVersion: SUPPORTED_PROTOCOLS.has(requested) ? requested : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: "Use context packs for broad questions, search for exploration, and get_lines for targeted verification. Cite source_id values.",
      });
    }
    if (message.method === "ping") return sendResult(message.id, {});
    if (message.method === "tools/list") return sendResult(message.id, { tools: TOOLS });
    if (message.method === "tools/call") {
      const name = String(message.params?.name || "");
      const args = message.params?.arguments || {};
      const data = await callTool(name, args);
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      return sendResult(message.id, {
        content: [{ type: "text", text }],
        ...(typeof data === "object" && data !== null ? { structuredContent: data } : {}),
      });
    }
    return sendError(message.id, -32601, "Method not found");
  } catch (error) {
    return sendResult(message.id, {
      content: [{ type: "text", text: error.message }],
      isError: true,
    });
  }
}

async function callTool(name, args) {
  switch (name) {
    case "cogentia_search":
      requireString(args.query, "query");
      return daemonGet("/api/context/search", {
        q: args.query,
        repo: args.repo,
        limit: boundedOptional(args.limit, 1, 50),
        mode: enumOptional(args.mode, ["keyword", "hybrid", "semantic"], "mode"),
      });
    case "cogentia_context_pack":
      requireString(args.query, "query");
      return daemonGet("/api/context/pack", {
        q: args.query,
        repo: args.repo,
        budget: boundedOptional(args.budget, 256, 50000),
        limit: boundedOptional(args.limit, 1, 50),
        format: enumOptional(args.format, ["json", "markdown"], "format"),
        mode: enumOptional(args.mode, ["keyword", "hybrid", "semantic"], "mode"),
      });
    case "cogentia_get_lines":
      requireString(args.ref, "ref");
      return daemonGet("/api/context/lines", {
        ref: args.ref,
        start: boundedRequired(args.start, 1, Number.MAX_SAFE_INTEGER, "start"),
        end: boundedRequired(args.end, 1, Number.MAX_SAFE_INTEGER, "end"),
      });
    case "cogentia_explain":
      requireString(args.result_id, "result_id");
      return daemonGet("/api/context/explain", { result_id: args.result_id });
    case "cogentia_health":
      return daemonGet("/api/context/health", {});
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function daemonGet(route, params) {
  const url = new URL(route, DAEMON_URL);
  url.searchParams.set("view", MCP_VIEW);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const headers = { Accept: "application/json, text/markdown" };
  if (MCP_VIEW === "full") headers.Authorization = `Bearer ${adminToken}`;
  let response;
  try {
    response = await fetch(url, { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new Error(`Cogentia daemon unavailable at ${DAEMON_URL.origin}: ${error.message}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof body === "object" ? (body.message || body.error) : body;
    throw new Error(`Cogentia daemon returned HTTP ${response.status}: ${detail || "request failed"}`);
  }
  return body;
}

function validateDaemonUrl(value) {
  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) {
    throw new Error("COGENTIA_DAEMON_URL must be an HTTP(S) URL without embedded credentials");
  }
  return url;
}

function sendResult(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function sendError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function requireString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
}

function boundedRequired(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}

function boundedOptional(value, min, max) {
  return value === undefined ? undefined : boundedRequired(value, min, max, "value");
}

function enumOptional(value, allowed, name) {
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  return value;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(parsed, max)) : fallback;
}
