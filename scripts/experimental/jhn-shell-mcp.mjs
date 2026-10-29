#!/usr/bin/env node
// Experimental one-tool MCP server for Fracta2. Deliberately separate from
// Cogentia's production MCP service; never expose without transport auth.
// Node.js >= 20. No npm dependencies.
import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { appendFile, open } from "node:fs/promises";
import os from "node:os";

const token = process.env.JHN_SHELL_MCP_TOKEN || "";
if (token.length < 32) throw new Error("JHN_SHELL_MCP_TOKEN must have >=32 characters");
const host = process.env.JHN_SHELL_MCP_HOST || "127.0.0.1";
const port = Number(process.env.JHN_SHELL_MCP_PORT || 8798);
const cwd = process.env.JHN_SHELL_MCP_CWD || "/srv/cogentia/repos";
const audit = process.env.JHN_SHELL_MCP_AUDIT || "/tmp/jhn-shell-mcp.audit.jsonl";
const maxOut = 32 * 1024;
const maxMs = 15_000;
const maxInput = 8192;
const tool = {
  name: "shell_exec",
  description: "Run one bounded Unix shell command on Fracta2 as the dedicated service OS user. Returns exit code, stdout, stderr and auditable invocation ID. Caller must stay within mandate.",
  inputSchema: {
    type: "object",
    properties: { command: { type: "string", minLength: 1, maxLength: 4096 } },
    required: ["command"], additionalProperties: false
  }
};
function authenticated(req) {
  const received = (req.headers.authorization || "").replace(/^Bearer /i, "");
  const a = Buffer.from(received), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
function send(res, status, value, extra = {}) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...extra });
  res.end(JSON.stringify(value));
}
function rpc(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }
async function log(receipt) {
  // Audit is mandatory: fail-closed if a receipt cannot be persisted.
  const fh = await open(audit, "a", 0o600);
  try { await fh.writeFile(JSON.stringify(receipt) + "\n"); }
  finally { await fh.close(); }
}
async function run(command) {
  const id = randomUUID(), started = new Date().toISOString();
  const commandHash = createHash("sha256").update(command).digest("hex");
  const identity = { uid: process.getuid?.(), gid: process.getgid?.(), user: os.userInfo().username, hostname: os.hostname() };
  await log({ id, event: "started", started, command_sha256: commandHash, identity, cwd });
  const env = { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: os.homedir(), LANG: "C.UTF-8" };
  const child = spawn("/bin/sh", ["-c", command], { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let stdout = "", stderr = "", outSize = 0, clipped = false, timedOut = false;
  const collect = (target, buf) => {
    const available = Math.max(0, maxOut - outSize);
    const piece = buf.subarray(0, available);
    outSize += piece.length;
    if (piece.length !== buf.length) clipped = true;
    if (target === "stdout") stdout += piece.toString("utf8");
    else stderr += piece.toString("utf8");
    if (clipped) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
  };
  child.stdout.on("data", b => collect("stdout", b));
  child.stderr.on("data", b => collect("stderr", b));
  const timer = setTimeout(() => {
    timedOut = true;
    try { process.kill(-child.pid, "SIGKILL"); } catch {}
  }, maxMs);
  const outcome = await new Promise(resolve => {
    child.once("error", e => resolve({ code: null, signal: null, error: e.code || "spawn_error" }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  const result = { invocation_id: id, target: "fracta2", identity, cwd,
    exit_code: outcome.code, signal: outcome.signal, error: outcome.error || null,
    timeout: timedOut, output_truncated: clipped, stdout, stderr };
  await log({ id, event: "finished", completed: new Date().toISOString(),
    command_sha256: commandHash, exit_code: outcome.code, signal: outcome.signal,
    timeout: timedOut, output_truncated: clipped, error: outcome.error || null });
  return result;
}
const server = http.createServer(async (req, res) => {
  if (req.url !== "/mcp" || req.method !== "POST") return send(res, 404, { error: "not_found" });
  if (!authenticated(req)) return send(res, 401, { error: "unauthorized" },
    { "www-authenticate": 'Bearer realm="jhn-shell-mcp"' });
  let raw = "";
  try {
    for await (const part of req) {
      raw += part;
      if (raw.length > maxInput) return send(res, 413, { error: "input_too_large" });
    }
    const msg = JSON.parse(raw);
    if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return send(res, 400, rpcError(msg.id ?? null, -32600, "Invalid Request"));
    if (msg.method === "notifications/initialized") { res.writeHead(202); return res.end(); }
    if (msg.method === "initialize") return send(res, 200, rpc(msg.id, {
      protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "jhn-fracta2-shell-minimal", version: "0.1.0" }
    }));
    if (msg.method === "ping") return send(res, 200, rpc(msg.id, {}));
    if (msg.method === "tools/list") return send(res, 200, rpc(msg.id, { tools: [tool] }));
    if (msg.method === "tools/call") {
      if (msg.params?.name !== tool.name) return send(res, 200, rpcError(msg.id, -32602, "Unknown tool"));
      const args = msg.params.arguments;
      const command = args?.command;
      if (!args || Object.keys(args).length !== 1 || typeof command !== "string" || !command.trim() || command.length > 4096)
        return send(res, 200, rpcError(msg.id, -32602, "Invalid command"));
      const result = await run(command);
      return send(res, 200, rpc(msg.id, { content: [{ type: "text", text: JSON.stringify(result) }], isError: result.exit_code !== 0 }));
    }
    return send(res, 200, rpcError(msg.id, -32601, "Method not found"));
  } catch (e) {
    return send(res, 200, rpcError(null, -32603, e.code === "ENOENT" ? "Execution environment unavailable" : "Internal error"));
  }
});
server.listen(port, host, () => console.log("jhn-shell-mcp ready on " + host + ":" + port));
