import http from "node:http";
import path from "node:path";
import { loadHostContext } from "./host-context.js";
import { listAdapters, listModels, resolveAdapter } from "./adapter-registry.js";
import { runHeadlessTurn } from "./run-headless.js";
import { runReplTurn } from "./run-repl-turn.js";
import { ReplSessionRegistry } from "./repl-session-registry.js";
import {
  readJsonBody,
  lastUserMessage,
  newCompletionId,
  sseWrite,
  sseDone,
  openAiError,
  checkBearerAuth,
} from "./util.js";
import {
  readClientSentMs,
  createTimingTrace,
  buildTimingReport,
  timingResponseHeaders,
  TIMING_EXPOSE_HEADERS,
} from "./timing-telemetry.js";

class ConcurrencyGate {
  constructor(max) {
    this.max = max;
    this.active = 0;
  }

  tryAcquire() {
    if (this.active >= this.max) return false;
    this.active += 1;
    return true;
  }

  release() {
    this.active = Math.max(0, this.active - 1);
  }
}

export function createAgentGateway(options = {}) {
  const env = options.env || process.env;
  const ctx = {
    ...loadHostContext(env),
    useMock: env.AGENT_GATEWAY_TEST_MOCK === "1",
  };
  const token = env.AGENT_GATEWAY_TOKEN || "";
  const gate = new ConcurrencyGate(ctx.maxConcurrent);
  const replRegistry = new ReplSessionRegistry({ maxSessions: ctx.maxConcurrent });

  async function handleHealth() {
    const probes = {};
    for (const adapter of listAdapters(ctx)) {
      probes[adapter.id] = await adapter.probe(ctx);
    }
    return {
      ok: true,
      service: "agent-cli-gateway",
      schema: "agent-gateway.health.v1",
      hostname: ctx.hostname,
      platform: ctx.platform,
      repl_sessions: replRegistry.size(),
      adapters: probes,
    };
  }

  async function handleChatCompletions(req, res, payload) {
    const model = String(payload.model || "").trim();
    const adapter = resolveAdapter(model, ctx);
    if (!adapter) {
      const err = openAiError("invalid_request_error", `Unknown model: ${model}`, "model_not_found", 404);
      return jsonResponse(res, err.status, err.body, req);
    }

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const query = lastUserMessage(messages);
    if (!query) {
      const err = openAiError("invalid_request_error", "messages must include a non-empty user message");
      return jsonResponse(res, err.status, err.body, req);
    }

    let cwd;
    try {
      const requested = payload.metadata?.cwd;
      cwd = path.resolve(requested || ctx.defaultCwd);
      if (!ctx.allowAnyCwd) {
        const allowed = ctx.repoRoots.some(root => {
          const rel = path.relative(root, cwd);
          return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
        });
        if (!allowed) {
          const err = openAiError("invalid_request_error", `cwd not allowed: ${cwd}`, "cwd_forbidden", 403);
          return jsonResponse(res, err.status, err.body, req);
        }
      }
    } catch (error) {
      const err = openAiError("invalid_request_error", error.message);
      return jsonResponse(res, err.status, err.body, req);
    }

    const mode = resolveAdapterMode(payload, adapter);
    if (mode === "repl" && !supportsRepl(adapter)) {
      const err = openAiError(
        "invalid_request_error",
        `Adapter ${adapter.id} does not support REPL mode`,
        "repl_unsupported",
      );
      return jsonResponse(res, err.status, err.body, req);
    }

    const turn = {
      messages,
      prompt: adapter.formatTurn(messages, ctx),
      stream: Boolean(payload.stream),
      cwd,
      metadata: payload.metadata || {},
    };

    const clientSentMs = readClientSentMs(req);

    if (mode === "repl") {
      return handleReplCompletions(req, res, {
        adapter,
        model,
        turn,
        sessionId: payload.metadata?.session_id || null,
        clientSentMs,
      });
    }

    if (!gate.tryAcquire()) {
      const err = openAiError(
        "rate_limit_error",
        "Too many concurrent requests",
        "concurrency_limit",
        409,
      );
      return jsonResponse(res, err.status, err.body, req);
    }

    try {
      return await handleHeadlessCompletions(req, res, { adapter, model, turn, clientSentMs });
    } finally {
      gate.release();
    }
  }

  async function handleHeadlessCompletions(req, res, { adapter, model, turn, clientSentMs }) {
    const completionId = newCompletionId();
    const created = Math.floor(Date.now() / 1000);
    const trace = createTimingTrace("headless", clientSentMs);

    if (!turn.stream) {
      const result = await runHeadlessTurn(adapter, turn, ctx, { trace });
      const timing = finishHeadlessTiming(trace, result.timing);
      if (result.exitCode !== 0 && !adapter.isHeadlessComplete(result.exitCode, result.state)) {
        const err = openAiError("server_error", result.stderr || `child exit ${result.exitCode}`, "child_failed", 502);
        return jsonResponse(res, err.status, err.body, req, timing.headers);
      }
      const content = result.deltas.filter(d => d.content).map(d => d.content).join("");
      return jsonResponse(res, 200, {
        id: completionId,
        object: "chat.completion",
        created,
        model,
        metadata: { timing: timing.report },
        choices: [{
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
        }],
      }, req, timing.headers);
    }

    const timingPartial = timingResponseHeaders({
      server_received_ms: trace.receivedMs,
      server_completed_ms: trace.receivedMs,
      total_ms: 0,
      mode: "headless",
      client_sent_ms: clientSentMs ?? undefined,
      rtt_estimate_ms: clientSentMs != null ? trace.receivedMs - clientSentMs : undefined,
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...timingPartial,
      ...corsHeaders(req),
    });

    sseWrite(res, {
      id: completionId,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
    });

    const result = await runHeadlessTurn(adapter, turn, ctx, {
      trace,
      onDelta(delta) {
        if (!delta.content) return;
        sseWrite(res, {
          id: completionId,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: { content: delta.content }, finish_reason: null }],
        });
      },
    });

    const timing = finishHeadlessTiming(trace, result.timing);
    const finishReason = result.exitCode === 0 || adapter.isHeadlessComplete(result.exitCode, result.state)
      ? "stop"
      : "error";
    sseWrite(res, {
      id: completionId,
      object: "chat.completion.chunk",
      created,
      model,
      metadata: { timing: timing.report },
      choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
    });
    sseDone(res);
    res.end();
  }

  async function handleReplCompletions(req, res, { adapter, model, turn, sessionId, clientSentMs }) {
    const completionId = newCompletionId();
    const created = Math.floor(Date.now() / 1000);
    const trace = createTimingTrace("repl", clientSentMs);

    try {
      if (!turn.stream) {
        const result = await runReplTurn(adapter, turn, ctx, replRegistry, {
          sessionId,
          model,
          trace,
        });
        const timing = finishReplTiming(trace, result.timing);
        if (result.error) {
          const err = openAiError("server_error", `REPL turn failed: ${result.reason}`, "repl_failed", 502);
          return jsonResponse(res, err.status, err.body, req, timing.headers);
        }
        const content = result.deltas.filter(d => d.content).map(d => d.content).join("");
        return jsonResponse(res, 200, {
          id: completionId,
          object: "chat.completion",
          created,
          model,
          metadata: {
            session_id: result.sessionId,
            repl_reason: result.reason,
            timing: timing.report,
          },
          choices: [{
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          }],
        }, req, timing.headers);
      }

      const timingPartial = timingResponseHeaders({
        server_received_ms: trace.receivedMs,
        server_completed_ms: trace.receivedMs,
        total_ms: 0,
        mode: "repl",
        client_sent_ms: clientSentMs ?? undefined,
        rtt_estimate_ms: clientSentMs != null ? trace.receivedMs - clientSentMs : undefined,
      });

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...timingPartial,
        ...corsHeaders(req),
      });

      sseWrite(res, {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model,
        metadata: { session_id: sessionId || null },
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      });

      const result = await runReplTurn(adapter, turn, ctx, replRegistry, {
        sessionId,
        model,
        trace,
        onDelta(delta) {
          if (!delta.content) return;
          sseWrite(res, {
            id: completionId,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [{ index: 0, delta: { content: delta.content }, finish_reason: null }],
          });
        },
      });

      const timing = finishReplTiming(trace, result.timing);
      const finishReason = result.error ? "error" : "stop";
      sseWrite(res, {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model,
        metadata: {
          session_id: result.sessionId,
          repl_reason: result.reason,
          timing: timing.report,
        },
        choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
      });
      sseDone(res);
      res.end();
    } catch (error) {
      const timing = finishReplTiming(trace, {});
      if (error?.code && error?.status) {
        const err = openAiError(
          error.status === 409 ? "rate_limit_error" : "invalid_request_error",
          error.message,
          error.code,
          error.status,
        );
        if (!res.headersSent) {
          return jsonResponse(res, err.status, err.body, req, timing.headers);
        }
        res.end();
        return;
      }
      if (!res.headersSent) {
        const err = openAiError("server_error", error.message || "repl error", "repl_failed", 502);
        return jsonResponse(res, err.status, err.body, req, timing.headers);
      }
      res.end();
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, corsHeaders(req));
        res.end();
        return;
      }

      const authError = checkBearerAuth(req, token);
      if (authError) {
        return jsonResponse(res, authError.status, authError.body, req);
      }

      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        return jsonResponse(res, 200, await handleHealth(), req);
      }

      if (req.method === "GET" && url.pathname === "/v1/models") {
        return jsonResponse(res, 200, {
          object: "list",
          data: listModels(ctx),
        }, req);
      }

      if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
        let payload;
        try {
          payload = await readJsonBody(req);
        } catch (error) {
          const err = openAiError(
            "invalid_request_error",
            error.message === "request_body_too_large" ? "Request body is too large" : "Invalid JSON body",
          );
          return jsonResponse(res, err.status, err.body, req);
        }
        return await handleChatCompletions(req, res, payload);
      }

      return jsonResponse(res, 404, { error: { type: "not_found", message: url.pathname } }, req);
    } catch (error) {
      return jsonResponse(res, 500, {
        error: { type: "server_error", message: error.message || "internal error" },
      }, req);
    }
  });

  return { server, ctx, replRegistry };
}

function resolveAdapterMode(payload, adapter) {
  const forced = payload.metadata?.adapter_mode;
  if (forced === "repl" || forced === "headless") return forced;
  if (payload.metadata?.session_id) return "repl";
  return adapter.defaultMode || "headless";
}

function supportsRepl(adapter) {
  return typeof adapter.buildReplInvocation === "function"
    && typeof adapter.writeReplTurn === "function"
    && typeof adapter.getExpectConfig === "function";
}

function finishHeadlessTiming(trace, childTiming = {}) {
  const childMs = childTiming.child_ms ?? 0;
  const report = trace.finish({
    child_ms: childMs,
    first_byte_ms: childTiming.first_byte_ms ?? undefined,
  });
  report.gateway_ms = Math.max(0, report.total_ms - childMs);
  return { report, headers: timingResponseHeaders(report) };
}

function finishReplTiming(trace, replTiming = {}) {
  const report = trace.finish({
    bootstrap_ms: replTiming.bootstrap_ms ?? 0,
    session_reused: replTiming.session_reused ?? false,
    session_spawned: replTiming.session_spawned ?? false,
  });
  const preReplMs = report.repl_acquired_ms ?? 0;
  const postReplMs = report.repl_turn_complete_ms != null
    ? Math.max(0, report.total_ms - report.repl_turn_complete_ms)
    : 0;
  report.gateway_ms = preReplMs + postReplMs;
  return { report, headers: timingResponseHeaders(report) };
}

function jsonResponse(res, status, body, req, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
    ...corsHeaders(req),
  });
  res.end(`${JSON.stringify(body)}\n`);
}

function corsHeaders(req) {
  return {
    "Access-Control-Allow-Origin": req?.headers?.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Agent-Gateway-Client-Sent-Ms",
    "Access-Control-Expose-Headers": TIMING_EXPOSE_HEADERS,
  };
}