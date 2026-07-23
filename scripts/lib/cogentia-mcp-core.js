export const SERVER_NAME = "cogentia-mcp";
export const SERVER_VERSION = "0.2.0";
export const PROTOCOL_VERSION = "2025-11-25";
export const SUPPORTED_PROTOCOLS = new Set([PROTOCOL_VERSION, "2025-06-18", "2024-11-05"]);

export const TOOLS = [
  {
    name: "cogentia_views_snapshot",
    description:
      "Session bootstrap / agent cockpit: compact situational picture (corpus health signals, alive continuations, open issues summary, key Views Store URLs). Prefer this first. Does not dump SQLite vectors or chunk bodies. Implementation lives in cogentia.js.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 40,
          description: "Max alive continuations to list (default 12).",
        },
        include_remote: {
          type: "boolean",
          description: "If true, probe Supabase inventory (slower; needs credentials on daemon host).",
        },
        no_store_probe: {
          type: "boolean",
          description: "If true, skip HTTP probe of the public Views Store API.",
        },
      },
      additionalProperties: false,
    },
  },
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
  {
    name: "cogentia_issue_graph",
    description: "Build a read-only graph of issues and their target documents.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed", "all"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
];

export function createMcpCore(env = process.env) {
  const daemonUrl = validateDaemonUrl(env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790");
  const requestTimeoutMs = boundedInteger(env.COGENTIA_MCP_TIMEOUT_MS, 15000, 1000, 120000);
  const requestedView = String(env.COGENTIA_MCP_VIEW || "public").toLowerCase();
  const adminToken = String(env.COGENTIA_ADMIN_TOKEN || "");
  const view = requestedView === "full" && adminToken ? "full" : "public";

  function initialize(params = {}) {
    const requested = String(params.protocolVersion || "");
    return {
      protocolVersion: SUPPORTED_PROTOCOLS.has(requested) ? requested : PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions:
        "Start with cogentia_views_snapshot for situational awareness (load level/mode, alive work, corpus debt, view URLs). " +
        "Read load.level and load.mode_recommendation before suggesting batch/sleep work. " +
        "Use context packs for broad questions, search for exploration, and get_lines for targeted verification. Cite source_id values. " +
        "MCP is a thin adapter; corpus truth lives in cogentia.js / the daemon.",
    };
  }

  async function handleJsonRpc(message) {
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return jsonRpcError(message?.id ?? null, -32600, "Invalid Request");
    }
    if (message.id === undefined) return null;
    try {
      if (message.method === "initialize") {
        return jsonRpcResult(message.id, initialize(message.params || {}));
      }
      if (message.method === "ping") return jsonRpcResult(message.id, {});
      if (message.method === "tools/list") return jsonRpcResult(message.id, { tools: TOOLS });
      if (message.method === "tools/call") {
        const name = String(message.params?.name || "");
        const args = message.params?.arguments || {};
        const data = await callTool(name, args);
        return jsonRpcResult(message.id, mcpToolResult(data));
      }
      return jsonRpcError(message.id, -32601, "Method not found");
    } catch (error) {
      return jsonRpcResult(message.id, {
        content: [{ type: "text", text: error.message }],
        isError: true,
      });
    }
  }

  async function callTool(name, args = {}) {
    switch (name) {
      case "cogentia_views_snapshot":
        return daemonGet("/api/views/snapshot", {
          limit: boundedOptional(args.limit, 1, 40),
          include_remote: args.include_remote === true ? "1" : undefined,
          no_store_probe: args.no_store_probe === true ? "1" : undefined,
        });
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
      case "cogentia_context_pack_batch":
        if (!Array.isArray(args.queries) || !args.queries.length) throw new Error("queries must be a non-empty array");
        return daemonPost("/api/context/pack-batch", {
          queries: args.queries,
          repo: args.repo,
          budget: boundedOptional(args.budget, 256, 50000),
          limit: boundedOptional(args.limit, 1, 50),
          mode: enumOptional(args.mode, ["keyword", "hybrid", "semantic"], "mode") || "hybrid",
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
        return daemonGet("/api/context/health", { quick: "1" });
      case "cogentia_issue_graph":
        return daemonGet("/api/issues/graph", {
          repo: args.repo || "all",
          state: enumOptional(args.state, ["open", "closed", "all"], "state") || "open",
          limit: boundedOptional(args.limit, 1, 100) || 25,
        });
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async function daemonGet(route, params) {
    const url = new URL(route, daemonUrl);
    url.searchParams.set("view", view);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
    const headers = { Accept: "application/json, text/markdown" };
    if (view === "full") {
      headers.Authorization = `Bearer ${adminToken}`;
    } else {
      headers["X-Cogentia-Entry"] = "public";
    }
    let response;
    try {
      response = await fetch(url, { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(requestTimeoutMs) });
    } catch (error) {
      throw new Error(`Cogentia daemon unavailable at ${daemonUrl.origin}: ${error.message}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = typeof body === "object" ? (body.message || body.error) : body;
      throw new Error(`Cogentia daemon returned HTTP ${response.status}: ${detail || "request failed"}`);
    }
    return body;
  }

  async function daemonPost(route, body) {
    const url = new URL(route, daemonUrl);
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (view === "full") {
      headers.Authorization = `Bearer ${adminToken}`;
    } else {
      headers["X-Cogentia-Entry"] = "public";
    }
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      throw new Error(`Cogentia daemon unavailable at ${daemonUrl.origin}: ${error.message}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const parsed = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = typeof parsed === "object" ? (parsed.message || parsed.error) : parsed;
      throw new Error(`Cogentia daemon returned HTTP ${response.status}: ${detail || "request failed"}`);
    }
    return parsed;
  }

  return {
    daemonUrl,
    requestTimeoutMs,
    view,
    tools: TOOLS,
    initialize,
    handleJsonRpc,
    callTool,
    callPackBatch(queries, options = {}) {
      return callTool("cogentia_context_pack_batch", {
        queries,
        repo: options.repo,
        budget: options.budget,
        limit: options.limit,
        mode: options.mode || "hybrid",
      });
    },
  };
}

export function mcpToolResult(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(typeof data === "object" && data !== null ? { structuredContent: data } : {}),
  };
}

export function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

export function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export function validateDaemonUrl(value) {
  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) {
    throw new Error("COGENTIA_DAEMON_URL must be an HTTP(S) URL without embedded credentials");
  }
  return url;
}

export function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(parsed, max)) : fallback;
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
