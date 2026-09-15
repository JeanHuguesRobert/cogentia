/**
 * Minimal MCP stdio JSON-RPC client (Content-Length framing).
 *
 * Cogentia's own MCP adapter speaks newline-delimited JSON. Upstream
 * Desktop Commander (and the official MCP SDK) speak LSP-style
 * Content-Length frames. This client talks to the latter without adding
 * a second MCP SDK dependency.
 */
import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 15_000;

export function encodeMcpFrame(message) {
  const json = JSON.stringify(message);
  const body = Buffer.from(json, "utf8");
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii"),
    body,
  ]);
}

/** MCP SDK 1.x stdio (Desktop Commander 0.2.50) is JSON + newline, not LSP Content-Length. */
export function encodeMcpNdjson(message) {
  return Buffer.from(`${JSON.stringify(message)}\n`, "utf8");
}

export function createMcpFrameParser(onMessage) {
  let buffer = Buffer.alloc(0);
  return function push(chunk) {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    while (buffer.length > 0) {
      const headerEnd = indexOfHeaderEnd(buffer);
      if (headerEnd < 0) {
        const before = buffer.length;
        let consumed = false;
        tryNdjson(buffer, (msg, rest) => {
          buffer = rest;
          consumed = true;
          if (msg) onMessage(msg);
        });
        if (!consumed || buffer.length === before) return;
        continue;
      }
      const header = buffer.subarray(0, headerEnd).toString("ascii");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;
      const body = buffer.subarray(bodyStart, bodyStart + length).toString("utf8");
      buffer = buffer.subarray(bodyStart + length);
      onMessage(JSON.parse(body));
    }
  };
}

function indexOfHeaderEnd(buf) {
  const text = buf.toString("latin1");
  const idx = text.indexOf("\r\n\r\n");
  return idx < 0 ? -1 : Buffer.byteLength(text.slice(0, idx), "latin1");
}

function tryNdjson(buffer, consume) {
  const text = buffer.toString("utf8");
  const nl = text.indexOf("\n");
  if (nl < 0) return;
  const line = text.slice(0, nl).trim();
  const rest = Buffer.from(text.slice(nl + 1), "utf8");
  if (!line) {
    consume(null, rest);
    return;
  }
  if (line.startsWith("{")) {
    consume(JSON.parse(line), rest);
    return;
  }
  consume(null, rest);
}

export class McpStdioClient {
  constructor(options = {}) {
    this.command = options.command;
    this.args = options.args || [];
    this.cwd = options.cwd;
    this.env = options.env;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.clientInfo = options.clientInfo || { name: "cogentia-mcp-stdio-client", version: "0.1.0" };
    this.protocolVersion = options.protocolVersion || "2024-11-05";
    this.framing = options.framing === "content-length" ? "content-length" : "ndjson";
    this.shell = options.shell === true;
    this.child = null;
    this.nextId = 1;
    this.pending = new Map();
    this.initializeResult = null;
    this.stderrChunks = [];
    this.closed = false;
  }

  async start() {
    if (this.child) return this.initializeResult;
    const spawnEnv = { ...process.env, ...(this.env || {}) };
    this.child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: spawnEnv,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: this.shell,
    });
    const parse = createMcpFrameParser((msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.id === undefined || msg.id === null) return;
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      clearTimeout(waiter.timer);
      waiter.resolve(msg);
    });
    this.child.stdout.on("data", parse);
    this.child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      this.stderrChunks.push(text);
      if (this.stderrChunks.length > 40) this.stderrChunks.shift();
    });
    this.child.on("error", (err) => this.failAll(err));
    this.child.on("exit", (code, signal) => {
      this.closed = true;
      if (this.pending.size) {
        this.failAll(new Error(`mcp_stdio_exited: code=${code} signal=${signal}`));
      }
    });
    if (this.child.exitCode !== null) {
      this.closed = true;
      const err = new Error(`mcp_stdio_exited: code=${this.child.exitCode}`);
      err.error_class = "mcp_stdio_exited";
      throw err;
    }
    if (this.closed || this.child.exitCode !== null) {
      const err = new Error(`mcp_stdio_exited: code=${this.child.exitCode}`);
      err.error_class = "mcp_stdio_exited";
      throw err;
    }
    try {
      this.initializeResult = await this.request("initialize", {
        protocolVersion: this.protocolVersion,
        capabilities: {},
        clientInfo: this.clientInfo,
      });
      this.notify("notifications/initialized", {});
      return this.initializeResult;
    } catch (err) {
      await this.stop().catch(() => {});
      const wrapped = new Error(`mcp_initialize_failed: ${err.message}`);
      wrapped.error_class = "mcp_initialize_failed";
      wrapped.cause = err;
      throw wrapped;
    }
  }

  encode(message) {
    return this.framing === "content-length" ? encodeMcpFrame(message) : encodeMcpNdjson(message);
  }

  notify(method, params) {
    if (!this.child || this.closed) return;
    this.child.stdin.write(this.encode({ jsonrpc: "2.0", method, params }));
  }

  request(method, params = {}, timeoutMs = this.timeoutMs) {
    if (!this.child || this.closed) {
      return Promise.reject(Object.assign(new Error("mcp_stdio_not_started"), { error_class: "mcp_stdio_not_started" }));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const err = new Error(`mcp_stdio_timeout: ${method}`);
        err.error_class = "mcp_stdio_timeout";
        reject(err);
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.child.stdin.write(this.encode({ jsonrpc: "2.0", id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    }).then((msg) => {
      if (msg.error) {
        const err = new Error(msg.error.message || `mcp_error:${method}`);
        err.error_class = "mcp_remote_error";
        err.data = msg.error;
        throw err;
      }
      return msg.result;
    });
  }

  async listTools() {
    const result = await this.request("tools/list", {});
    return result?.tools || [];
  }

  async callTool(name, args = {}) {
    return this.request("tools/call", { name, arguments: args });
  }

  failAll(err) {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(err);
    }
    this.pending.clear();
  }

  async stop() {
    if (!this.child) return;
    this.closed = true;
    this.failAll(Object.assign(new Error("mcp_stdio_stopped"), { error_class: "mcp_stdio_stopped" }));
    try {
      this.notify("notifications/cancelled", {});
    } catch {
      // ignore
    }
    const child = this.child;
    this.child = null;
    if (child.exitCode !== null || child.signalCode) {
      for (const stream of [child.stdin, child.stdout, child.stderr]) {
        try { stream.destroy(); } catch { /* ignore */ }
      }
      return;
    }
    await new Promise((resolve) => {
      const done = () => resolve();
      child.once("exit", done);
      try {
        child.stdin.end();
      } catch {
        // ignore
      }
      const killTimer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          // ignore
        }
        for (const stream of [child.stdin, child.stdout, child.stderr]) {
          try { stream.destroy(); } catch { /* ignore */ }
        }
        resolve();
      }, 500);
      child.once("exit", () => clearTimeout(killTimer));
    });
  }

  stderrTail() {
    return this.stderrChunks.join("").slice(-4000);
  }
}
