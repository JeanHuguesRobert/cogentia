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
const guideLimit = boundedInteger(process.env.COGENTIA_GUIDE_LIMIT, 8, 1, 12);
const guideBudget = boundedInteger(process.env.COGENTIA_GUIDE_BUDGET, 14000, 256, 30000);
const guideQueryLimit = boundedInteger(process.env.COGENTIA_GUIDE_QUERY_LIMIT, 6, 1, 10);
const guidePlannerEnabled = parseBoolean(process.env.COGENTIA_GUIDE_PLANNER, true);
const guidePlannerQueryLimit = boundedInteger(process.env.COGENTIA_GUIDE_PLANNER_QUERY_LIMIT, 5, 1, 8);
const guideModel = process.env.COGENTIA_GUIDE_MODEL || "fractavolta-guide";
const guideInstanceId = process.env.COGENTIA_GUIDE_INSTANCE_ID || "fractavolta-public-guide";
const guideMandate = {
  instance_id: guideInstanceId,
  surface: "web-guide",
  maturity: "infant",
  corpus_view: "public",
  allowed: ["orient", "retrieve", "cite", "explain-public-corpus"],
  forbidden: ["private-view", "mutate", "publish", "unbounded-provider-spend", "owner-impersonation"],
};
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
    mandate: guideMandate,
    context: {
      limit: guideLimit,
      budget: guideBudget,
      query_limit: guideQueryLimit,
      planner_enabled: guidePlannerEnabled,
      planner_query_limit: guidePlannerQueryLimit,
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
  const plan = guidePlannerEnabled ? await guidePlanningRun(question, locale) : guideHeuristicPlan(question, "planner_disabled");
  const retrieval = await guideRetrievalRun(question, plan);
  const chatPayload = {
    model: guideModel,
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      { role: "system", content: guideSystemPrompt(locale) },
      { role: "system", content: guideRetrievalPrompt(locale, retrieval) },
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
    return sendJson(res, 200, guideChatResponse(question, locale, routed.body, retrieval));
  }

  const fallback = await guideFallback(question, locale, routed, retrieval);
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

async function guidePlanningRun(question, locale) {
  const fallback = guideHeuristicPlan(question, "planner_fallback");
  const payload = {
    model: guideModel,
    temperature: 0.15,
    max_tokens: 500,
    messages: [
      { role: "system", content: guidePlannerPrompt(locale) },
      { role: "user", content: question },
    ],
    cogentia: { context: false },
    metadata: {
      surface: "fractavolta-public-guide",
      purpose: "guide_planner",
      locale,
    },
  };

  const routed = await daemonPost("/v1/chat/completions", payload);
  if (!routed.ok) {
    return { ...fallback, planner_error: routed.body?.error?.type || routed.error || "planner_failed" };
  }

  const content = String(routed.body?.choices?.[0]?.message?.content || routed.body?.choices?.[0]?.text || "").trim();
  const parsed = parseGuidePlan(content);
  if (!parsed.queries.length) return { ...fallback, planner_error: "planner_returned_no_queries" };

  const heuristic = guideRetrievalQueries(question);
  const priorityHeuristic = heuristic.filter(query =>
    query !== question && /(public guide|digital twin|trustable|ubiquity)/i.test(query)
  );
  return {
    strategy: "guide-planner-v1",
    source: "magistral",
    objective: parsed.objective || "",
    queries: mergeQueries([
      question,
      ...priorityHeuristic.slice(0, 3),
      ...parsed.queries,
      ...heuristic,
    ]).slice(0, guideQueryLimit),
    notes: parsed.notes,
    raw: content.slice(0, 2000),
  };
}

function guideHeuristicPlan(question, source = "heuristic") {
  return {
    strategy: "guide-planner-v1",
    source,
    objective: "",
    queries: guideRetrievalQueries(question).slice(0, guideQueryLimit),
    notes: [],
  };
}

function guidePlannerPrompt(locale) {
  const language = locale === "fr" ? "French" : "English";
  return [
    `You plan public Cogentia corpus retrieval for the FractaVolta Guide. Use ${language} only when writing notes.`,
    "Return only strict JSON. Do not include markdown.",
    "The Guide is public, read-only, and may search only the public corpus.",
    "Produce high-quality search queries, not an answer.",
    "Prefer concrete corpus terms, proper names, project names, document titles, and conceptual synonyms.",
    "Include both narrow and broad queries when useful.",
    `Return at most ${guidePlannerQueryLimit} queries.`,
    JSON.stringify({
      objective: "short retrieval objective",
      queries: ["query 1", "query 2"],
      notes: ["optional public retrieval note"],
    }),
  ].join("\n");
}

function parseGuidePlan(content) {
  const json = extractJsonObject(content);
  if (!json) return { objective: "", queries: [], notes: [] };
  try {
    const parsed = JSON.parse(json);
    return {
      objective: String(parsed.objective || "").trim(),
      queries: Array.isArray(parsed.queries)
        ? parsed.queries.map(query => String(query || "").trim()).filter(Boolean).slice(0, guidePlannerQueryLimit)
        : [],
      notes: Array.isArray(parsed.notes)
        ? parsed.notes.map(note => String(note || "").trim()).filter(Boolean).slice(0, 5)
        : [],
    };
  } catch {
    return { objective: "", queries: [], notes: [] };
  }
}

function extractJsonObject(content) {
  const clean = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (clean.startsWith("{") && clean.endsWith("}")) return clean;
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return start >= 0 && end > start ? clean.slice(start, end + 1) : "";
}

async function guideRetrievalRun(question, plan = guideHeuristicPlan(question)) {
  const queries = mergeQueries([...(plan.queries || []), ...guideRetrievalQueries(question)]).slice(0, guideQueryLimit);
  const attempts = [];
  const sources = [];
  const context = [];
  const warnings = [];
  const seenSources = new Set();
  let usedTokens = 0;

  for (const query of queries) {
    let pack;
    try {
      pack = await core.callTool("cogentia_context_pack", {
        query,
        mode: "hybrid",
        limit: Math.max(1, Math.min(guideLimit, Math.ceil(guideLimit / 2))),
        budget: Math.max(512, Math.floor(guideBudget / Math.max(1, queries.length))),
        format: "json",
      });
    } catch (error) {
      attempts.push({ query, ok: false, error: error.message });
      continue;
    }

    const packSources = safeSources(pack.sources);
    attempts.push({
      query,
      ok: Boolean(pack.ok),
      count: packSources.length,
      pack_hash: pack.pack_hash,
      source_ids: packSources.map(source => source.source_id),
    });
    warnings.push(...(pack.warnings || []));

    const contextBySource = new Map((Array.isArray(pack.context) ? pack.context : []).map(item => [String(item.source_id || ""), item]));
    for (const source of packSources) {
      if (!source.source_id || seenSources.has(source.source_id)) continue;
      const item = contextBySource.get(source.source_id);
      const text = String(item?.text || "").trim();
      if (!text) continue;
      const estimate = estimateGuideTokens(text);
      if (usedTokens + estimate > guideBudget && context.length) continue;
      seenSources.add(source.source_id);
      sources.push(source);
      context.push({ source_id: source.source_id, text: truncateGuideText(text, Math.max(512, guideBudget - usedTokens)) });
      usedTokens += estimate;
      if (sources.length >= guideLimit || usedTokens >= guideBudget) break;
    }
    if (sources.length >= guideLimit || usedTokens >= guideBudget) break;
  }

  return {
    strategy: "guide-retrieval-run-v1",
    planner: {
      strategy: plan.strategy,
      source: plan.source,
      objective: plan.objective,
      notes: plan.notes || [],
      error: plan.planner_error || undefined,
    },
    query_limit: guideQueryLimit,
    queries,
    attempts,
    sources,
    context,
    warnings: [...new Set(warnings)],
  };
}

function mergeQueries(queries) {
  return [...new Set(queries.map(query => String(query || "").trim()).filter(Boolean))];
}

function guideRetrievalQueries(question) {
  const clean = String(question || "").normalize("NFC").trim().replace(/\s+/g, " ");
  const queries = [clean];
  const lower = clean.toLowerCase();
  const terms = clean.match(/[\p{L}\p{N}_'-]+/gu) || [];
  const keyTerms = terms
    .filter(term => term.length > 2 && !GUIDE_QUERY_STOPWORDS.has(term.toLowerCase()))
    .slice(0, 8);

  if (keyTerms.length) queries.push(keyTerms.join(" "));
  for (const term of keyTerms.filter(term => /[A-Z]/.test(term[0] || ""))) queries.push(term);

  if (/fracta\s*volta|fractavolta|\bfracta\b/.test(lower)) {
    queries.push("FractaVolta", "FractaVolta public Guide", "FractaVolta website");
  }
  if (/(fracta\s*volta|fractavolta|\bfracta\b|guide)/.test(lower) && /digital twin|twin|jumeau/.test(lower)) {
    queries.push("FractaVolta public Guide digital twin", "public Guide digital twin", "digital twin ubiquity");
  }
  if (/cogentia/.test(lower)) {
    queries.push("Cogentia", "Cogentia public corpus", "Cogentia context gateway");
  }
  if (/digital twin|twin|jumeau/.test(lower)) {
    queries.push("digital twin", "public Guide digital twin", "trustable digital twin", "digital twin trust model");
  }
  if (/\bmcp\b|model context protocol/.test(lower)) {
    queries.push("Cogentia MCP", "context gateway MCP");
  }
  if (/magistral|router|openai/.test(lower)) {
    queries.push("Magistral Cogentia boundary", "Cogentia Magistral");
  }

  return [...new Set(queries.map(query => query.trim()).filter(Boolean))];
}

const GUIDE_QUERY_STOPWORDS = new Set([
  "about", "answer", "briefly", "comment", "could", "dans", "does", "explain", "fait",
  "give", "how", "into", "pour", "quoi", "sentence", "short", "tell", "that", "the",
  "this", "what", "when", "where", "which", "with", "would", "une", "quoi",
]);

function guideRetrievalPrompt(locale, retrieval) {
  const intro = locale === "fr"
    ? "Utilise cette recherche publique procedurale avant de repondre."
    : "Use this procedural public retrieval run before answering.";
  const lines = [
    "# Public Guide retrieval run",
    "",
    intro,
    "Treat these passages as supplied public Cogentia context. Cite source_id values.",
    "Do not use numeric citations such as [1]; cite exact source_id values such as [repo:path#L1-L4].",
    `Strategy: ${retrieval.strategy}`,
    "",
    "## Query attempts",
    "",
    ...retrieval.attempts.map((attempt, index) => {
      const status = attempt.ok ? `${attempt.count || 0} sources` : `failed: ${attempt.error || "unknown"}`;
      return `${index + 1}. ${attempt.query} (${status})`;
    }),
    "",
    "## Sources",
    "",
  ];

  retrieval.sources.forEach((source, index) => {
    lines.push(`[${index + 1}] ${source.source_id}`, `Title: ${source.title || source.path}`, `URL: ${source.url || "n/a"}`, "");
  });

  lines.push("## Context", "");
  retrieval.context.forEach((item, index) => {
    lines.push(`### [${index + 1}] ${item.source_id}`, "", item.text, "");
  });
  if (!retrieval.context.length) lines.push("No public context was found by the Guide retrieval run.", "");
  return lines.join("\n");
}

function guideChatResponse(question, locale, completion, retrieval = null) {
  const context = completion?.cogentia_context || {};
  const sources = mergeGuideSources(context.sources, retrieval?.sources);
  const answer = normalizeGuideCitations(
    String(completion?.choices?.[0]?.message?.content || completion?.choices?.[0]?.text || "").trim(),
    sources
  );
  return {
    ok: true,
    service: "fractavolta-guide",
    mode: "conversational",
    mandate: guideMandate,
    question,
    locale,
    answer: answer || guideFallbackText(locale),
    sources,
    context: summarizeGuideContext(context, retrieval),
    warnings: [...new Set([...(context.warnings || []), ...(retrieval?.warnings || [])])],
  };
}

function normalizeGuideCitations(answer, sources) {
  let text = String(answer || "").trim();
  if (!text || !sources.length) return text;
  text = text.replace(/\[(\d+)\]/g, (match, rawIndex) => {
    const source = sources[Number(rawIndex) - 1];
    return source?.source_id ? `[${source.source_id}]` : match;
  });
  if (sources.some(source => text.includes(`[${source.source_id}]`))) return text;
  return `${text}\n\nSources: ${sources.slice(0, 3).map(source => `[${source.source_id}]`).join(" ")}`;
}

async function guideFallback(question, locale, routed, retrieval = null) {
  let pack = null;
  if (retrieval?.sources?.length) {
    pack = retrievalPack(question, retrieval);
  } else {
    try {
      pack = await core.callTool("cogentia_context_pack", {
        query: question,
        mode: "hybrid",
        limit: Math.min(guideLimit, 5),
        budget: Math.min(guideBudget, 6000),
        format: "json",
      });
    } catch {}
  }
  if (pack?.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        service: "fractavolta-guide",
        mode: "extractive_fallback",
        mandate: guideMandate,
        question,
        locale,
        answer: extractiveAnswer(locale, pack),
        sources: safeSources(pack.sources),
        context: summarizeGuideContext(pack, retrieval),
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

function retrievalPack(question, retrieval) {
  return {
    ok: true,
    query: question,
    strategy: retrieval.strategy,
    retrieval_policy_version: retrieval.strategy,
    sources: retrieval.sources,
    context: retrieval.context,
    warnings: retrieval.warnings || [],
  };
}

function guideSystemPrompt(locale) {
  const language = locale === "fr" ? "French" : "English";
  return [
    `You are the public FractaVolta Guide. Answer in ${language}.`,
    "You are a public, low-maturity, read-only instance of the owner-rooted digital twin.",
    "You are not the private owner-facing core and must not pretend to be the owner.",
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

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return !new Set(["0", "false", "no", "off"]).has(String(value).trim().toLowerCase());
}

function summarizeGuideContext(context = {}, retrieval = null) {
  return {
    query: context.query,
    pack_hash: context.pack_hash,
    index_hash: context.index_hash || context.index?.index_hash,
    retrieval_policy_version: context.retrieval_policy_version || context.strategy,
    source_ids: Array.isArray(context.source_ids)
      ? context.source_ids
      : safeSources(context.sources).map(source => source.source_id),
    guide_retrieval: retrieval ? {
      strategy: retrieval.strategy,
      planner: retrieval.planner,
      query_limit: retrieval.query_limit,
      queries: retrieval.queries,
      attempts: retrieval.attempts,
      source_ids: retrieval.sources.map(source => source.source_id),
    } : undefined,
  };
}

function mergeGuideSources(...sourceLists) {
  const merged = [];
  const seen = new Set();
  for (const source of sourceLists.flatMap(safeSources)) {
    if (!source.source_id || seen.has(source.source_id)) continue;
    seen.add(source.source_id);
    merged.push(source);
  }
  return merged.slice(0, 12);
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

function estimateGuideTokens(text) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function truncateGuideText(text, budget) {
  const maxChars = Math.max(512, budget * 4);
  const clean = String(text || "").trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
  return `${slice.slice(0, lastBreak > 256 ? lastBreak + 1 : maxChars).trim()}...`;
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
