#!/usr/bin/env node
/**
 * Minimal continuation-backed ACP server (inseme#107, part of the
 * "Super ACP" umbrella, inseme#112).
 *
 * Speaks ACP (initialize / session/new / session/prompt) over stdio
 * JSON-RPC, exactly like codex-acp / claude-agent-acp / opencode acp --
 * but instead of calling a vendor LLM SDK, resolves session/prompt by
 * emitting a cogentia.continuation.v2 object and polling until any
 * capable agent (human or AI) resolves it via
 * `cogentia continuation resolve`. Vendor-agnostic by construction: any
 * agent able to run that one CLI command can serve this node.
 *
 * Deliberately minimal: no session/update streaming (inseme#108), no
 * structured error taxonomy beyond a first pass (inseme#109), no
 * capability-surface breadth (inseme#110), no resolver capability
 * matching (inseme#111). Each of those is a separate, independently
 * resumable sub-issue.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cogentiaScript = path.join(root, "scripts", "cogentia.js");

const POLL_INTERVAL_MS = boundedNumber(process.env.CONTINUATION_ACP_POLL_MS, 3_000, 500, 60_000);
const WAIT_TIMEOUT_MS = boundedNumber(process.env.CONTINUATION_ACP_TIMEOUT_MS, 15 * 60_000, 5_000, 24 * 60 * 60_000);
const CONTINUATION_KIND = process.env.CONTINUATION_ACP_KIND || "guide_answer_judgment";

const sessions = new Map(); // sessionId -> { cwd }

function runCogentia(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cogentiaScript, ...args, "--json"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`cogentia ${args[0]} exited ${code}: ${stderr.trim()}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`cogentia ${args[0]} produced non-JSON output: ${stdout.slice(0, 500)}`));
      }
    });
    child.on("error", reject);
  });
}

function extractPromptText(prompt) {
  if (!Array.isArray(prompt)) return "";
  return prompt
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function waitForResolution(continuationId) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const inspected = await runCogentia(["continuation", "inspect", continuationId]);
    const continuation = inspected.continuation;
    if (!continuation) {
      throw acpError(-32603, "Internal error: continuation lookup failed", {
        continuationErrorInfo: "subsystem_error",
        continuationId,
      });
    }
    if (continuation.status === "resolved") return continuation;
    if (continuation.status === "cancelled") {
      throw acpError(-32603, "Continuation was cancelled before resolution", {
        continuationErrorInfo: "cancelled",
        continuationId,
        reason: continuation.resolution?.reason || "(no reason given)",
      });
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw acpError(-32603, "Timed out waiting for a resolver to answer the continuation", {
    continuationErrorInfo: "resolution_timeout",
    continuationId,
    waitedMs: WAIT_TIMEOUT_MS,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function acpError(code, message, data) {
  const err = new Error(message);
  err.acpCode = code;
  err.acpData = data;
  return err;
}

function boundedNumber(value, fallback, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

// --- JSON-RPC stdio transport ---

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    handleLine(line);
  }
});

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handleLine(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = message;
  try {
    const result = await dispatch(method, params);
    if (id !== undefined) send({ jsonrpc: "2.0", id, result });
  } catch (err) {
    if (id !== undefined) {
      send({
        jsonrpc: "2.0",
        id,
        error: {
          code: err.acpCode || -32603,
          message: err.message || "Internal error",
          data: err.acpData || undefined,
        },
      });
    }
  }
}

async function dispatch(method, params) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: 1,
        agentInfo: { name: "cogentia-continuation-acp", title: "Cogentia Continuation (Super ACP, minimal)", version: "0.1.0" },
        agentCapabilities: {
          promptCapabilities: { embeddedContext: false, image: false },
          sessionCapabilities: {},
          mcpCapabilities: { acp: false, http: false, sse: false },
        },
        authMethods: [],
      };
    case "session/new": {
      const sessionId = `ctnacp_${randomUUID()}`;
      sessions.set(sessionId, { cwd: params?.cwd || root });
      return { sessionId };
    }
    case "session/prompt": {
      const { sessionId, prompt } = params || {};
      if (!sessions.has(sessionId)) {
        throw acpError(-32602, "Unknown sessionId", { continuationErrorInfo: "invalid_session" });
      }
      const question = extractPromptText(prompt);
      if (!question) {
        throw acpError(-32602, "session/prompt requires at least one text content block", {
          continuationErrorInfo: "empty_prompt",
        });
      }
      const emitted = await runCogentia([
        "continuation", "emit",
        "--kind", CONTINUATION_KIND,
        "--title", `Super ACP: ${question.slice(0, 80)}`,
        "--question", question,
      ]);
      const continuationId = emitted.continuation?.continuation_id;
      if (!continuationId) {
        throw acpError(-32603, "Failed to emit continuation", { continuationErrorInfo: "emission_failed" });
      }
      const resolved = await waitForResolution(continuationId);
      const answer =
        resolved.resolution?.payload?.answer ||
        resolved.resolution?.reason ||
        resolved.resolution?.decision ||
        "";
      if (!answer) {
        throw acpError(-32603, "Continuation resolved without a usable answer", {
          continuationErrorInfo: "malformed_resolution",
          continuationId,
          resolution: resolved.resolution,
        });
      }
      return { stopReason: "end_turn", _meta: { continuationId }, result: answer };
    }
    default:
      throw acpError(-32601, `Method not found: ${method}`);
  }
}
