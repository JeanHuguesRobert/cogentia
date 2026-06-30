#!/usr/bin/env node

/*
 * HTTP MCP adapter for the Cogentia Context Gateway.
 * The primary endpoint is POST /mcp with JSON-RPC messages.
 */

import http from "node:http";
import { boundedInteger, createMcpCore, jsonRpcError, mcpToolResult, SERVER_NAME, SERVER_VERSION } from "./lib/cogentia-mcp-core.js";

const core = createMcpCore();
const port = boundedInteger(process.env.PORT || process.env.COGENTIA_MCP_PORT, 8791, 1, 65535);
const host = process.env.COGENTIA_MCP_HOST || "0.0.0.0";
const guideLimit = boundedInteger(process.env.COGENTIA_GUIDE_LIMIT, 6, 1, 12);
const guideBudget = boundedInteger(process.env.COGENTIA_GUIDE_BUDGET, 9000, 256, 30000);
const guideModel = process.env.COGENTIA_GUIDE_MODEL || "fractavolta-guide";
const allowedOrigins = String(process.env.COGENTIA_CORS_ORIGIN || "http://localhost:*")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") return sendNoContent(res, 204);
    if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, await health());
    if (req.method === "HEAD" && req.url === "/health") return sendNoContent(res, 200);
    if (req.method === "GET" && req.url === "/tools") return sendJson(res, 200, { tools: core.tools });
    if (req.method === "GET" && req.url === "/guide/health") return sendJson(res, 200, await guideHealth());
    if (req.method === "POST" && req.url === "/guide/chat") return handleGuideChat(req, res);
    if (req.method === "GET" && req.url === "/sse") return sendSseInfo(req, res);
    if (req.method === "GET" && req.url === "/mcp") return sendSseInfo(req, res);
    if (req.method === "POST" && req.url === "/mcp") return handleMcpPost(req, res);
    if (req.method === "POST" && req.url?.startsWith("/tools/")) return handleToolPost(req, res);
    return sendJson(res, 404, { error: "not_found" });
  } catch (error) {
    return sendJson(res, 500, {
      content: [{ type: "text", text: error.message }],
      isError: true,
    });
  }
});

server.listen(port, host, () => {
  console.error(`Cogentia MCP HTTP server listening on ${host}:${port}`);
  console.error(`Daemon: ${core.daemonUrl.href}`);
  console.error("Endpoints: POST /mcp, GET /mcp, GET /health, GET /tools, POST /tools/{name}");
});

async function health() {
  const daemon = await core.callTool("cogentia_health", {});
  return { ok: true, mcp: SERVER_NAME, version: SERVER_VERSION, daemon };
}

async function guideHealth() {
  const daemon = await core.callTool("cogentia_health", {});
  return {
    ok: true,
    service: "fractavolta-guide",
    public: true,
    model: guideModel,
    context: {
      limit: guideLimit,
      budget: guideBudget,
      daemon,
    },
  };
}

async function handleMcpPost(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, jsonRpcError(null, -32700, "Parse error"));
  }
  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map(message => core.handleJsonRpc(message)))).filter(Boolean);
    if (!responses.length) return sendNoContent(res, 202);
    return sendJson(res, 200, responses);
  }
  const response = await core.handleJsonRpc(payload);
  if (!response) return sendNoContent(res, 202);
  return sendJson(res, 200, response);
}

async function handleToolPost(req, res) {
  const name = decodeURIComponent(String(req.url || "").slice("/tools/".length));
  let args;
  try {
    args = JSON.parse(await readBody(req) || "{}");
  } catch {
    return sendJson(res, 400, { content: [{ type: "text", text: "invalid JSON body" }], isError: true });
  }
  try {
    return sendJson(res, 200, mcpToolResult(await core.callTool(name, args)));
  } catch (error) {
    return sendJson(res, 500, { content: [{ type: "text", text: error.message }], isError: true });
  }
}

async function handleGuideChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req, 32768) || "{}");
  } catch (error) {
    return sendJson(res, error.message === "request_body_too_large" ? 413 : 400, {
      ok: false,
      error: error.message === "request_body_too_large" ? "request_body_too_large" : "invalid_json",
    });
  }
  const question = String(payload.question || payload.q || "").trim();
  if (!question) return sendJson(res, 400, { ok: false, error: "missing_question" });
  if (question.length > 1200) return sendJson(res, 413, { ok: false, error: "question_too_large" });

  const locale = normalizeLocale(payload.locale);
  const chatPayload = {
    model: guideModel,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      { role: "system", content: guideSystemPrompt(locale) },
      { role: "user", content: question },
    ],
    cogentia: {
      repo: "all",
      mode: "hybrid",
      limit: guideLimit,
      budget: guideBudget,
    },
    metadata: {
      surface: "fractavolta-public-guide",
      locale,
    },
  };

  const routed = await daemonPost("/v1/chat/completions", chatPayload);
  if (routed.ok) {
    return sendJson(res, 200, guideChatResponse(question, locale, routed.body));
  }

  const fallback = await guideFallback(question, locale, routed);
  return sendJson(res, fallback.status, fallback.body);
}

async function daemonPost(route, body) {
  const url = new URL(route, core.daemonUrl);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Cogentia-Entry": "public",
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(core.requestTimeoutMs),
    });
  } catch (error) {
    return { ok: false, status: 0, body: null, error: "cogentia_daemon_unavailable", message: error.message };
  }
  const contentType = response.headers.get("content-type") || "";
  const parsed = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, body: parsed };
}

function guideChatResponse(question, locale, completion) {
  const answer = String(completion?.choices?.[0]?.message?.content || completion?.choices?.[0]?.text || "").trim();
  const context = completion?.cogentia_context || {};
  return {
    ok: true,
    service: "fractavolta-guide",
    mode: "conversational",
    question,
    locale,
    answer: answer || guideFallbackText(locale),
    sources: safeSources(context.sources),
    context: summarizeGuideContext(context),
    warnings: context.warnings || [],
  };
}

async function guideFallback(question, locale, routed) {
  let pack = null;
  try {
    pack = await core.callTool("cogentia_context_pack", {
      query: question,
      mode: "hybrid",
      limit: Math.min(guideLimit, 5),
      budget: Math.min(guideBudget, 6000),
      format: "json",
    });
  } catch {}
  if (pack?.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        service: "fractavolta-guide",
        mode: "extractive_fallback",
        question,
        locale,
        answer: extractiveAnswer(locale, pack),
        sources: safeSources(pack.sources),
        context: summarizeGuideContext(pack),
        warnings: [
          "guide_chat_backend_unavailable",
          ...(pack.warnings || []),
        ],
      },
    };
  }
  return {
    status: routed.status || 502,
    body: {
      ok: false,
      service: "fractavolta-guide",
      error: routed.body?.error?.type || routed.error || "guide_chat_failed",
      message: publicErrorMessage(locale),
    },
  };
}

function guideSystemPrompt(locale) {
  const language = locale === "fr" ? "French" : "English";
  return [
    `You are the public FractaVolta Guide. Answer in ${language}.`,
    "You are a public guide, not the private digital twin of the owner.",
    "Use only the supplied public Cogentia context.",
    "Cite source_id values in square brackets for corpus-grounded claims.",
    "If context is insufficient, say what is missing and suggest a next public reading.",
    "Do not claim operational powers, private access, account access, or administrative authority.",
    "Keep the answer concise and useful for a first-time visitor.",
  ].join("\n");
}

function extractiveAnswer(locale, pack) {
  const sources = safeSources(pack.sources).slice(0, 5);
  if (locale === "fr") {
    return [
      "Je n'ai pas pu joindre le moteur conversationnel pour cette reponse.",
      "Voici les meilleures sources publiques du corpus a consulter :",
      ...sources.map((source, index) => `${index + 1}. ${source.title || source.path} [${source.source_id}]`),
    ].join("\n");
  }
  return [
    "The conversational backend is not reachable for this answer.",
    "These are the best public corpus sources to inspect:",
    ...sources.map((source, index) => `${index + 1}. ${source.title || source.path} [${source.source_id}]`),
  ].join("\n");
}

function guideFallbackText(locale) {
  return locale === "fr"
    ? "Je n'ai pas assez de contexte public pour repondre proprement."
    : "I do not have enough public context to answer cleanly.";
}

function publicErrorMessage(locale) {
  return locale === "fr"
    ? "Le Guide public est temporairement indisponible."
    : "The public Guide is temporarily unavailable.";
}

function normalizeLocale(value) {
  const clean = String(value || "en").toLowerCase();
  return clean.startsWith("fr") ? "fr" : "en";
}

function summarizeGuideContext(context = {}) {
  return {
    query: context.query,
    pack_hash: context.pack_hash,
    index_hash: context.index_hash || context.index?.index_hash,
    retrieval_policy_version: context.retrieval_policy_version || context.strategy,
    source_ids: Array.isArray(context.source_ids)
      ? context.source_ids
      : safeSources(context.sources).map(source => source.source_id),
  };
}

function safeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.slice(0, 12).map(source => ({
    source_id: String(source.source_id || ""),
    title: String(source.title || ""),
    repo: String(source.repo || ""),
    path: String(source.path || ""),
    start_line: source.start_line,
    end_line: source.end_line,
    url: String(source.github_url || source.url || ""),
  }));
}

function sendSseInfo(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  sendSse(res, "endpoint", {
    protocolVersion: core.initialize({}).protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    instructions: core.initialize({}).instructions,
    post: "/mcp",
  });
  const keepAlive = setInterval(() => sendSse(res, "keepalive", {}), 30000);
  req.on("close", () => clearInterval(keepAlive));
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    req.setEncoding("utf8");
    req.on("data", chunk => {
      bytes += Buffer.byteLength(chunk, "utf8");
      if (bytes > maxBytes) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendNoContent(res, status) {
  res.writeHead(status);
  res.end();
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = allowedOrigins.some(value => value === "*" || (value.endsWith("*") ? origin.startsWith(value.slice(0, -1)) : origin === value));
  if (!allowed) return;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, MCP-Protocol-Version, Mcp-Session-Id");
}
