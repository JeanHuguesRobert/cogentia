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
 * inseme#108: emits session/update progress notifications while waiting
 * on a continuation, instead of a silent black box. Falls back to plain
 * blocking behaviour (no notifications) when CONTINUATION_ACP_STREAM=0 or
 * the client's initialize params explicitly say it won't consume them --
 * "vraiment tres degrades" cases only, per jhrobert's framing, not the
 * default.
 *
 * Still minimal on: structured error taxonomy beyond a first pass
 * (inseme#109), capability-surface breadth (inseme#110), resolver
 * capability matching (inseme#111). Each of those is a separate,
 * independently resumable sub-issue.
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

const sessions = new Map(); // sessionId -> { cwd, streaming }
const STREAM_DEFAULT = String(process.env.CONTINUATION_ACP_STREAM || "1") !== "0";

// inseme#109: named, exhaustive failure modes for this node, each paired
// with a human-readable template. Every thrown acpError() below uses one
// of these -- never a bare "acp_request_failed"/"Internal error" with no
// discriminant, which is exactly the failure mode that cost an entire
// investigation session (operium#45) to decode by hand.
export const CONTINUATION_ERROR_INFO = Object.freeze({
  SUBSYSTEM_ERROR: "subsystem_error", // cogentia.js's own continuation store errored/returned nothing
  CANCELLED: "cancelled", // a resolver explicitly cancelled the continuation
  RESOLUTION_TIMEOUT: "resolution_timeout", // nobody resolved it within WAIT_TIMEOUT_MS
  MALFORMED_RESOLUTION: "malformed_resolution", // resolved, but no usable answer/decision/reason
  EMISSION_FAILED: "emission_failed", // cogentia continuation emit itself did not return an id
  INVALID_SESSION: "invalid_session", // session/prompt referenced an unknown sessionId
  EMPTY_PROMPT: "empty_prompt", // session/prompt carried no text content block
});

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

async function waitForResolution(sessionId, continuationId, streaming) {
  const startedAt = Date.now();
  const deadline = startedAt + WAIT_TIMEOUT_MS;
  if (streaming) {
    notifyMessage(sessionId, `Waiting on continuation ${continuationId} -- resolve it with:\n` +
      `  cogentia continuation resolve ${continuationId} <result.json>`);
  }
  while (Date.now() < deadline) {
    const inspected = await runCogentia(["continuation", "inspect", continuationId]);
    const continuation = inspected.continuation;
    if (!continuation) {
      throw acpError(-32603, "Internal error: continuation lookup failed", {
        continuationErrorInfo: CONTINUATION_ERROR_INFO.SUBSYSTEM_ERROR,
        continuationId,
      });
    }
    if (continuation.status === "resolved") {
      if (streaming) notifyMessage(sessionId, `Continuation ${continuationId} resolved.`);
      return continuation;
    }
    if (continuation.status === "cancelled") {
      if (streaming) notifyMessage(sessionId, `Continuation ${continuationId} was cancelled.`);
      throw acpError(-32603, "Continuation was cancelled before resolution", {
        continuationErrorInfo: CONTINUATION_ERROR_INFO.CANCELLED,
        continuationId,
        reason: continuation.resolution?.reason || "(no reason given)",
      });
    }
    if (streaming) {
      const elapsedS = Math.round((Date.now() - startedAt) / 1000);
      notifyStatus(sessionId, { continuationId, elapsedS, status: "waiting" });
    }
    await sleep(POLL_INTERVAL_MS);
  }
  if (streaming) notifyMessage(sessionId, `Continuation ${continuationId} timed out unresolved.`);
  throw acpError(-32603, "Timed out waiting for a resolver to answer the continuation", {
    continuationErrorInfo: CONTINUATION_ERROR_INFO.RESOLUTION_TIMEOUT,
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

// Notifications carry no id, per JSON-RPC 2.0 -- a client that doesn't
// consume session/update simply ignores lines it doesn't expect, so these
// are safe to always send; the "basic Q&A fallback" is controlled by the
// streaming flag itself (session-level, decided at session/new time), not
// by clients silently dropping them.
function notify(method, params) {
  send({ jsonrpc: "2.0", method, params });
}

function notifyMessage(sessionId, text) {
  notify("session/update", {
    sessionId,
    update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text } },
  });
}

function notifyStatus(sessionId, meta) {
  notify("session/update", {
    sessionId,
    update: { sessionUpdate: "session_info_update", _meta: { continuation: meta } },
  });
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
      // "vraiment tres degrades" opt-out: a client may declare it will not
      // consume session/update at all via _meta.noStreaming; otherwise
      // streaming defaults on (per-process default from
      // CONTINUATION_ACP_STREAM, overridable per session).
      const streaming = params?._meta?.noStreaming ? false : STREAM_DEFAULT;
      sessions.set(sessionId, { cwd: params?.cwd || root, streaming });
      return { sessionId };
    }
    case "session/prompt": {
      const { sessionId, prompt } = params || {};
      const session = sessions.get(sessionId);
      if (!session) {
        throw acpError(-32602, "Unknown sessionId", { continuationErrorInfo: CONTINUATION_ERROR_INFO.INVALID_SESSION });
      }
      const question = extractPromptText(prompt);
      if (!question) {
        throw acpError(-32602, "session/prompt requires at least one text content block", {
          continuationErrorInfo: CONTINUATION_ERROR_INFO.EMPTY_PROMPT,
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
        throw acpError(-32603, "Failed to emit continuation", { continuationErrorInfo: CONTINUATION_ERROR_INFO.EMISSION_FAILED });
      }
      const resolved = await waitForResolution(sessionId, continuationId, session.streaming);
      const answer =
        resolved.resolution?.payload?.answer ||
        resolved.resolution?.reason ||
        resolved.resolution?.decision ||
        "";
      if (!answer) {
        throw acpError(-32603, "Continuation resolved without a usable answer", {
          continuationErrorInfo: CONTINUATION_ERROR_INFO.MALFORMED_RESOLUTION,
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
