import { createMcpCore } from "./cogentia-mcp-core.js";
import { wrapToolResult, wrapToolError, extractCorrelation } from "./cogentia-mcp-envelope.js";

const REGISTRY_TOOLS = [
  {
    name: "cogentia_registries_list",
    description: "List distributed Corpus registries discovered from source-local *.registry.yaml descriptors. Optional facet/value filters provide multidimensional views. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        facet: { type: "string", description: "Facet name, e.g. authority, topology, visibility, function, substrate." },
        value: { type: "string", description: "Facet value to match." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_registries_check",
    description: "Validate the distributed Registry Graph: schema errors, duplicate registry ids, relation warnings. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_registry_show",
    description: "Return one registry descriptor by stable registry id, including authority, topology, record kinds, facets and declared relations. Read-only.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", minLength: 1 } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_registry_related",
    description: "Return typed incoming/outgoing Registry Graph relations for one registry id. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1 },
        direction: { type: "string", enum: ["in", "out", "both"] },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

function buildUrl(base, pathname, args = {}) {
  const url = new URL(pathname, base);
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

async function fetchJson(url, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${data?.error || data?.status || "registry request failed"}`);
      error.error_class = response.status === 404 ? "not_found" : response.status === 409 ? "conflict" : "tool_failed";
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function mcpResult(toolName, data, message, view) {
  const wrapped = wrapToolResult(toolName, data, {
    protocolEra: "legacy",
    view,
    correlation: extractCorrelation(message?.params?._meta || message?._meta || {}),
  });
  return {
    jsonrpc: "2.0",
    id: message.id ?? null,
    result: {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: wrapped,
    },
  };
}

function mcpError(toolName, error, message, view) {
  const wrapped = wrapToolError(toolName, error, {
    protocolEra: "legacy",
    view,
    correlation: extractCorrelation(message?.params?._meta || message?._meta || {}),
  });
  return {
    jsonrpc: "2.0",
    id: message.id ?? null,
    result: {
      isError: true,
      content: [{ type: "text", text: String(error?.message || error) }],
      structuredContent: wrapped,
    },
  };
}

export function createRegistryAwareMcpCore(env = process.env, extras = {}) {
  const base = createMcpCore(env, extras);
  const daemonUrl = String(env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790");
  const timeoutMs = Math.max(1000, Math.min(120000, Number(env.COGENTIA_MCP_TIMEOUT_MS || 60000)));

  async function callRegistryTool(name, args = {}) {
    if (name === "cogentia_registries_list") return fetchJson(buildUrl(daemonUrl, "/api/registries/list", args), timeoutMs);
    if (name === "cogentia_registries_check") return fetchJson(buildUrl(daemonUrl, "/api/registries/check"), timeoutMs);
    if (name === "cogentia_registry_show") return fetchJson(buildUrl(daemonUrl, "/api/registries/show", { id: args.id }), timeoutMs);
    if (name === "cogentia_registry_related") return fetchJson(buildUrl(daemonUrl, "/api/registries/related", { id: args.id, direction: args.direction || "both" }), timeoutMs);
    return null;
  }

  return {
    ...base,
    async callTool(name, args = {}, options = {}) {
      if (REGISTRY_TOOLS.some(tool => tool.name === name)) return callRegistryTool(name, args);
      return base.callTool(name, args, options);
    },
    async handleJsonRpc(message, transport = {}) {
      if (message?.method === "tools/list") {
        const response = await base.handleJsonRpc(message, transport);
        if (response?.result?.tools) {
          const annotated = REGISTRY_TOOLS.map((tool) => ({
            ...tool,
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              openWorldHint: false,
            },
          }));
          response.result.tools = [...response.result.tools, ...annotated];
        }
        return response;
      }
      if (message?.method === "tools/call" && REGISTRY_TOOLS.some(tool => tool.name === message?.params?.name)) {
        const name = message.params.name;
        try {
          const data = await callRegistryTool(name, message.params.arguments || {});
          return mcpResult(name, data, message, base.view || "public");
        } catch (error) {
          return mcpError(name, error, message, base.view || "public");
        }
      }
      return base.handleJsonRpc(message, transport);
    },
  };
}

export { REGISTRY_TOOLS };
