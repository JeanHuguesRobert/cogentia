/**
 * Desktop Commander MCP provider adapter (Cogentia #184).
 *
 * Desktop Commander is a replaceable local implementation of host.*
 * capabilities. External agents consume Cogentia semantics, not DC tool
 * names. Provenance recorded from the inspected upstream release:
 *
 *   repo:    https://github.com/wonderwhy-er/DesktopCommanderMCP
 *   npm:     @wonderwhy-er/desktop-commander@0.2.50
 *   commit:  a781f5a4b8cfebac6638bc6fcbd38fca6326be53
 *   license: MIT
 *   transport: MCP stdio (Content-Length JSON-RPC)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpStdioClient } from "./mcp-stdio-client.js";

export const DESKTOP_COMMANDER_UPSTREAM = {
  name: "@wonderwhy-er/desktop-commander",
  version: "0.2.50",
  commit: "a781f5a4b8cfebac6638bc6fcbd38fca6326be53",
  license: "MIT",
  repository: "https://github.com/wonderwhy-er/DesktopCommanderMCP",
  transport: "stdio",
  invocation: ["npx", "-y", "@wonderwhy-er/desktop-commander@0.2.50", "--no-onboarding"],
};

export const HOST_CAPABILITY_MAP = {
  "host.fs.list": {
    upstream: "list_directory",
    effectful: false,
    toArgs: (a) => ({ path: a.path, ...(a.depth != null ? { depth: a.depth } : {}) }),
  },
  "host.fs.read": {
    upstream: "read_file",
    effectful: false,
    toArgs: (a) => ({
      path: a.path,
      ...(a.offset != null ? { offset: a.offset } : {}),
      ...(a.length != null ? { length: a.length } : {}),
    }),
  },
  "host.fs.search": {
    upstream: "start_search",
    effectful: false,
    toArgs: (a) => ({
      path: a.path,
      pattern: a.pattern,
      searchType: a.search_type || a.searchType || "content",
    }),
  },
  "host.fs.write": {
    upstream: "write_file",
    effectful: true,
    toArgs: (a) => ({
      path: a.path,
      content: a.content,
      mode: a.mode || "rewrite",
    }),
  },
  "host.process.run": {
    upstream: "start_process",
    effectful: true,
    toArgs: (a) => ({
      command: a.command,
      ...(a.timeout_ms != null ? { timeout_ms: a.timeout_ms } : {}),
    }),
  },
};

export function defaultDesktopCommanderSpawn(env = process.env) {
  const overrideCmd = String(env.COGENTIA_DC_MCP_COMMAND || "").trim();
  if (overrideCmd) {
    const extra = String(env.COGENTIA_DC_MCP_ARGS || "").trim();
    return {
      command: overrideCmd,
      args: extra ? extra.split(/\s+/) : [],
    };
  }
  const spec = ["npx", "-y", "@wonderwhy-er/desktop-commander@0.2.50", "--no-onboarding"];
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", spec.join(" ")],
    };
  }
  return { command: spec[0], args: spec.slice(1) };
}

export function fakeDesktopCommanderSpawn() {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "fake-dc-mcp.js");
  return { command: process.execPath, args: [script] };
}

function extractToolText(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  const parts = Array.isArray(result.content) ? result.content : [];
  return parts.map((p) => (p && p.text) || "").join("\n");
}

export class DesktopCommanderProvider {
  constructor(options = {}) {
    this.id = "desktop-commander";
    this.options = options;
    this.client = options.client || null;
    this.ownsClient = !options.client;
    this.tools = [];
    this.startedAt = null;
  }

  async start() {
    if (this.client && this.tools.length) return this.diagnostics();
    if (!this.client) {
      const spawnSpec = this.options.spawn || defaultDesktopCommanderSpawn(this.options.env || process.env);
      this.client = new McpStdioClient({
        command: spawnSpec.command,
        args: spawnSpec.args,
        cwd: this.options.cwd,
        env: this.options.env,
        timeoutMs: this.options.timeoutMs || 20_000,
        clientInfo: { name: "cogentia-desktop-commander-provider", version: "0.1.0" },
      });
      this.ownsClient = true;
    }
    await this.client.start();
    this.tools = await this.client.listTools();
    this.startedAt = new Date().toISOString();
    return this.diagnostics();
  }

  diagnostics() {
    return {
      provider: this.id,
      upstream: DESKTOP_COMMANDER_UPSTREAM,
      transport: "stdio",
      started_at: this.startedAt,
      tool_count: this.tools.length,
      tool_names: this.tools.map((t) => t.name),
      initialize: this.client?.initializeResult || null,
      stderr_tail: this.client?.stderrTail?.() || "",
    };
  }

  listNormalizedTools() {
    return this.tools.map((t) => ({
      name: t.name,
      description: t.description || "",
      inputSchema: t.inputSchema || t.input_schema || null,
    }));
  }

  mapCapability(capability) {
    const mapping = HOST_CAPABILITY_MAP[capability];
    if (!mapping) {
      const err = new Error(`unknown_capability: ${capability}`);
      err.error_class = "unknown_capability";
      throw err;
    }
    const found = this.tools.some((t) => t.name === mapping.upstream);
    if (!found) {
      const err = new Error(`unknown_upstream_tool: ${mapping.upstream} (capability ${capability})`);
      err.error_class = "unknown_upstream_tool";
      throw err;
    }
    return mapping;
  }

  async invoke(capability, args = {}) {
    if (!this.client) await this.start();
    const mapping = this.mapCapability(capability);
    const upstreamArgs = mapping.toArgs(args);
    const raw = await this.client.callTool(mapping.upstream, upstreamArgs);
    return {
      ok: true,
      capability,
      provider: this.id,
      upstream_tool: mapping.upstream,
      result_text: extractToolText(raw).slice(0, 16_384),
      structured: raw?.structuredContent || null,
    };
  }

  async stop() {
    if (this.ownsClient && this.client) {
      await this.client.stop();
    }
    this.client = this.ownsClient ? null : this.client;
    this.tools = [];
  }
}
