#!/usr/bin/env node

/*
 * Minimal MCP stdio adapter for the Cogentia Context Gateway.
 * It deliberately has no filesystem or SQLite access.
 */

import { createMcpCore, jsonRpcError } from "./lib/cogentia-mcp-core.js";

const core = createMcpCore();

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
    return send(jsonRpcError(null, -32700, "Parse error"));
  }
  const response = await core.handleJsonRpc(message);
  if (response) send(response);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
