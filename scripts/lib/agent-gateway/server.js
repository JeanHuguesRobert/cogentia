import http from "node:http";
import path from "node:path";
import { loadHostContext } from "./host-context.js";
import { listAdapters, listModels, resolveAdapter } from "./adapter-registry.js";
import { runHeadlessTurn } from "./run-headless.js";
import {
  readJsonBody,
  lastUserMessage,
  newCompletionId,
  sseWrite,
  sseDone,
  openAiError,
  checkBearerAuth,
} from "./util.js";

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

    if (!gate.tryAcquire()) {
      const err = openAiError(
        "rate_limit_error",
        "Too many concurrent requests",
        "concurrency_limit",
        409,
      );
      return jsonResponse(res, err.status, err.body, req);
    }

    const turn = {
      messages,
      prompt: adapter.formatTurn(messages, ctx),
      stream: Boolean(payload.stream),
      cwd,
    };

    try {
      const completionId = newCompletionId();
      const created = Math.floor(Date.now() / 1000);

      if (!turn.stream) {
        const result = await runHeadlessTurn(adapter, turn, ctx);
        if (result.exitCode !== 0 && !adapter.isHeadlessComplete(result.exitCode, result.state)) {
          const err = openAiError("server_error", result.stderr || `child exit ${result.exitCode}`, "child_failed", 502);
          return jsonResponse(res, err.status, err.body, req);
        }
        const content = result.deltas.filter(d => d.content).map(d => d.content).join("");
        return jsonResponse(res, 200, {
          id: completionId,
          object: "chat.completion",
          created,
          model,
          choices: [{
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          }],
        }, req);
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });

      sseWrite(res, {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      });

      const result = await runHeadlessTurn(adapter, turn, ctx, {
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

      const finishReason = result.exitCode === 0 || adapter.isHeadlessComplete(result.exitCode, result.state)
        ? "stop"
        : "error";
      sseWrite(res, {
        id: completionId,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
      });
      sseDone(res);
      res.end();

      if (finishReason === "error") {
        return;
      }
      return;
    } finally {
      gate.release();
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

  return { server, ctx };
}

function jsonResponse(res, status, body, req) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(req) });
  res.end(`${JSON.stringify(body)}\n`);
}

function corsHeaders(req) {
  return {
    "Access-Control-Allow-Origin": req?.headers?.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}