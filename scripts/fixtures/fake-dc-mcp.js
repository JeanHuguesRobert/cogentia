#!/usr/bin/env node
/**
 * Deterministic fake Desktop Commander MCP server (stdio, Content-Length).
 * Used by Cogentia #184 unit/integration tests. Not the real upstream.
 */
import fs from "node:fs";
import path from "node:path";
import { createMcpFrameParser, encodeMcpFrame } from "../lib/mcp-stdio-client.js";

const failInit = /^(1|true|yes)$/i.test(String(process.env.FAKE_DC_FAIL_INIT || ""));
const callLogPath = process.env.FAKE_DC_CALL_LOG || "";
const calls = [];

const TOOLS = [
  {
    name: "list_directory",
    description: "List a directory",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, depth: { type: "number" } },
      required: ["path"],
    },
  },
  {
    name: "read_file",
    description: "Read a file",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, offset: { type: "number" }, length: { type: "number" } },
      required: ["path"],
    },
  },
  {
    name: "start_search",
    description: "Search files",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        pattern: { type: "string" },
        searchType: { type: "string" },
      },
      required: ["path", "pattern"],
    },
  },
  {
    name: "write_file",
    description: "Write a file",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
        mode: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "start_process",
    description: "Start a process",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "get_config",
    description: "Raw upstream config — must not leak as a Cogentia tool",
    inputSchema: { type: "object", properties: {} },
  },
];

function send(msg) {
  process.stdout.write(encodeMcpFrame(msg));
}

function textResult(text, extra = {}) {
  return {
    content: [{ type: "text", text }],
    structuredContent: extra,
  };
}

function handleCall(name, args = {}) {
  calls.push({ name, args });
  if (callLogPath) {
    fs.appendFileSync(callLogPath, `${JSON.stringify({ name, args })}\n`);
  }
  if (name === "list_directory") {
    const dir = args.path;
    const entries = fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`)
      : [];
    return textResult(entries.join("\n"), { entries, path: dir });
  }
  if (name === "read_file") {
    const content = fs.readFileSync(args.path, "utf8");
    return textResult(content, { path: args.path, bytes: content.length });
  }
  if (name === "start_search") {
    const hits = [];
    const root = args.path;
    const pattern = String(args.pattern || "");
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.name.includes(pattern) || (ent.isFile() && fs.readFileSync(full, "utf8").includes(pattern))) {
          hits.push(full);
        }
      }
    }
    walk(root);
    return textResult(hits.join("\n"), { hits, pattern });
  }
  if (name === "write_file") {
    fs.writeFileSync(args.path, args.content ?? "", "utf8");
    return textResult(`wrote ${args.path}`, { path: args.path });
  }
  if (name === "start_process") {
    return textResult(`started: ${args.command}`, { command: args.command, pid: 4242 });
  }
  if (name === "get_config") {
    return textResult("{}", { blockedCommands: [] });
  }
  throw new Error(`unknown tool ${name}`);
}

const parse = createMcpFrameParser((msg) => {
  if (!msg || msg.id === undefined || msg.id === null) return;
  try {
    if (msg.method === "initialize") {
      if (failInit) {
        send({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: "forced initialize failure" } });
        return;
      }
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: msg.params?.protocolVersion || "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "fake-desktop-commander", version: "test" },
        },
      });
      return;
    }
    if (msg.method === "tools/list") {
      send({ jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } });
      return;
    }
    if (msg.method === "tools/call") {
      const name = msg.params?.name;
      const args = msg.params?.arguments || {};
      const result = handleCall(name, args);
      send({ jsonrpc: "2.0", id: msg.id, result });
      return;
    }
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
  } catch (err) {
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: err.message } });
  }
});

process.stdin.on("data", parse);
process.stdin.on("end", () => process.exit(0));
process.stdin.resume();
